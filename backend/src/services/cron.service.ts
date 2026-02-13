import cron from 'node-cron';
import prisma from '../config/prisma';
import { triggerAutomation } from './automation.service';
import { sendInventoryAlertEmail } from './email.service';
import { addHours, subHours } from 'date-fns';

export function startCronJobs() {
  console.log('⏰ Starting cron jobs...');

  // Every hour: Send 24h booking reminders
  cron.schedule('0 * * * *', async () => {
    await send24HReminders();
  });

  // Every day at 9am: Check inventory
  cron.schedule('0 9 * * *', async () => {
    await checkInventoryAlerts();
  });

  // Every day at 8am: Check overdue forms
  cron.schedule('0 8 * * *', async () => {
    await checkOverdueForms();
  });

  // Every 6h: Tag at-risk contacts
  cron.schedule('0 */6 * * *', async () => {
    await tagAtRiskContacts();
  });

  console.log('✅ Cron jobs started');
}

async function send24HReminders() {
  const now = new Date();
  const in24h = addHours(now, 24);
  const in25h = addHours(now, 25);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      scheduledAt: { gte: in24h, lt: in25h },
    },
    select: { id: true, workspaceId: true, contactId: true },
  });

  for (const booking of bookings) {
    await triggerAutomation(booking.workspaceId, 'booking_24h_before', {
      bookingId: booking.id,
      contactId: booking.contactId,
    });
  }
}

async function checkInventoryAlerts() {
  const allItems = await prisma.inventoryItem.findMany({
    include: { workspace: { select: { businessName: true } } },
  });

  // Group low-stock items by vendor email
  const vendorMap = new Map<string, typeof allItems>();
  for (const item of allItems) {
    if (item.quantity > item.threshold) continue; // only alert on low/zero stock
    if (!item.vendorEmail) continue;
    const existing = vendorMap.get(item.vendorEmail) || [];
    vendorMap.set(item.vendorEmail, [...existing, item]);
  }

  for (const [vendorEmail, items] of vendorMap) {
    await sendInventoryAlertEmail(vendorEmail, {
      businessName: items[0]?.workspace.businessName || 'Business',
      items: items.map(i => ({ name: i.name, quantity: i.quantity, threshold: i.threshold, unit: i.unit || undefined })),
    });
  }
}

async function checkOverdueForms() {
  const threeDaysAgo = subHours(new Date(), 72);

  // Get pending forms using workspace relation
  const overdueForms = await prisma.formSubmission.findMany({
    where: { status: 'PENDING', createdAt: { lte: threeDaysAgo } },
    select: {
      id: true,
      contactId: true,
      workspace: { select: { id: true } },
    },
    take: 50,
  });

  for (const form of overdueForms) {
    await triggerAutomation(form.workspace.id, 'form_pending_3d', {
      contactId: form.contactId,
      formSubmissionId: form.id,
    });
  }
}

async function tagAtRiskContacts() {
  const seventyTwoHoursAgo = subHours(new Date(), 72);

  const atRiskConversations = await prisma.conversation.findMany({
    where: {
      status: 'ACTIVE',
      automationPaused: false,
      lastMessageAt: { lte: seventyTwoHoursAgo },
      tags: { hasSome: ['New Lead'] },
    },
    select: { id: true, tags: true },
    take: 100,
  });

  for (const conv of atRiskConversations) {
    if (!conv.tags.includes('At Risk')) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { tags: { push: 'At Risk' } },
      });
    }
  }
}
