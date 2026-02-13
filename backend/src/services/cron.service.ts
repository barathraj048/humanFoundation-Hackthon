import cron from 'node-cron';
import prisma from '../config/prisma';
import { triggerAutomation } from './automation.service';
import { sendInventoryAlertEmail } from './email.service';
import { addHours, subHours } from 'date-fns';

export function startCronJobs() {
  console.log('⏰ Starting cron jobs...');

  // Run every hour: Send 24h booking reminders
  cron.schedule('0 * * * *', async () => {
    console.log('🔔 Checking 24h reminders...');
    await send24HReminders();
  });

  // Run every day at 9am: Check inventory
  cron.schedule('0 9 * * *', async () => {
    console.log('📦 Checking inventory levels...');
    await checkInventoryAlerts();
  });

  // Run every day at 8am: Check overdue forms
  cron.schedule('0 8 * * *', async () => {
    console.log('📋 Checking overdue forms...');
    await checkOverdueForms();
  });

  // Auto-tag "At Risk" contacts (no reply 72h)
  cron.schedule('0 */6 * * *', async () => {
    await tagAtRiskContacts();
  });

  console.log('✅ Cron jobs started');
}

async function send24HReminders() {
  const now = new Date();
  const in24h = addHours(now, 24);
  const in25h = addHours(now, 25);

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      scheduledAt: { gte: in24h, lt: in25h },
    },
    select: { id: true, workspaceId: true, contactId: true },
  });

  for (const booking of upcomingBookings) {
    await triggerAutomation(booking.workspaceId, 'booking_24h_before', {
      bookingId: booking.id,
      contactId: booking.contactId,
    });
  }
}

async function checkInventoryAlerts() {
  // Find workspaces with low stock
  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      quantity: { lte: prisma.inventoryItem.fields.threshold },
    },
    include: {
      workspace: { select: { businessName: true } },
    },
  });

  // Group by vendor email
  const vendorMap = new Map<string, typeof lowStockItems>();

  for (const item of lowStockItems) {
    if (!item.vendorEmail) continue;
    const existing = vendorMap.get(item.vendorEmail) || [];
    vendorMap.set(item.vendorEmail, [...existing, item]);
  }

  for (const [vendorEmail, items] of vendorMap) {
    const businessName = items[0]?.workspace.businessName || 'Business';
    await sendInventoryAlertEmail(vendorEmail, {
      businessName,
      items: items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        threshold: i.threshold,
        unit: i.unit || undefined,
      })),
    });
  }
}

async function checkOverdueForms() {
  const threeDaysAgo = subHours(new Date(), 72);

  const overdueForms = await prisma.formSubmission.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lte: threeDaysAgo },
    },
    include: {
      workspace: { select: { businessName: true } },
      contact: { select: { name: true, email: true } },
      formTemplate: { select: { name: true } },
    },
    take: 50,
  });

  for (const form of overdueForms) {
    if (!form.contact.email) continue;
    await triggerAutomation(form.workspaceId, 'form_pending_3d', {
      contactId: form.contactId,
      formSubmissionId: form.id,
    });
  }
}

async function tagAtRiskContacts() {
  const seventyTwoHoursAgo = subHours(new Date(), 72);

  // Find active conversations where last message was inbound, over 72h ago
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
