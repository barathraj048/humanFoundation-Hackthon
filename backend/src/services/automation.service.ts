import prisma from '../config/prisma';
import { sendWelcomeEmail, sendBookingConfirmationEmail, sendBookingReminderEmail } from './email.service';
import { randomUUID } from 'crypto';

export type TriggerEvent =
  | 'contact_created'
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_24h_before'
  | 'form_pending_3d'
  | 'inventory_below_threshold';

export interface AutomationContext {
  contactId?: string;
  bookingId?: string;
  formSubmissionId?: string;
}

export async function triggerAutomation(workspaceId: string, event: TriggerEvent, context: AutomationContext) {
  const rules = await prisma.automationRule.findMany({
    where: { workspaceId, triggerEvent: event, isActive: true },
  });
  if (rules.length === 0) return;

  if (context.contactId) {
    const conversation = await prisma.conversation.findFirst({
      where: { workspaceId, contactId: context.contactId, status: 'ACTIVE' },
    });
    if (conversation?.automationPaused) return;
  }

  for (const rule of rules) {
    await executeRule(workspaceId, rule, event, context);
  }
}

async function executeRule(workspaceId: string, rule: any, event: TriggerEvent, context: AutomationContext) {
  let status = 'SUCCESS';
  let error: string | undefined;

  try {
    const actionConfig = rule.actionConfig as Record<string, any>;
    if (rule.actionType === 'send_email') await handleSendEmailAction(workspaceId, event, context, actionConfig);
    else if (rule.actionType === 'add_tag') await handleAddTagAction(workspaceId, context, actionConfig);
    else if (rule.actionType === 'create_conversation') await handleCreateConversationAction(workspaceId, context);
  } catch (err: any) {
    status = 'FAILED';
    error = err.message;
  }

  // Create log via relations to avoid workspaceId direct issue
  await prisma.automationLog.create({
    data: {
      workspace: { connect: { id: workspaceId } },
      automationRule: { connect: { id: rule.id } },
      triggerEvent: event,
      entityId: context.contactId || context.bookingId || null,
      status: status as any,
      error: error || null,
    },
  });
}

async function handleSendEmailAction(workspaceId: string, event: TriggerEvent, context: AutomationContext, config: Record<string, any>) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { businessName: true, address: true, slug: true },
  });
  if (!workspace) return;

  if (event === 'contact_created' && context.contactId) {
    const contact = await prisma.contact.findUnique({ where: { id: context.contactId }, select: { name: true, email: true } });
    if (!contact?.email) return;

    await sendWelcomeEmail(workspaceId, contact.email, {
      contactName: contact.name,
      businessName: workspace.businessName,
      bookingLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/book/${workspace.slug}`,
    });

    const conversation = await prisma.conversation.findFirst({ where: { workspaceId, contactId: context.contactId } });
    if (conversation) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          senderType: 'SYSTEM',
          content: `Welcome email sent to ${contact.email}`,
          isAutomated: true,
        },
      });
    }
  }

  if (event === 'booking_created' && context.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: context.bookingId },
      include: {
        contact: { select: { name: true, email: true } },
        serviceType: { select: { name: true, durationMinutes: true } },
      },
    });
    if (!booking?.contact.email) return;

    await sendBookingConfirmationEmail(workspaceId, booking.contact.email, {
      contactName: booking.contact.name,
      businessName: workspace.businessName,
      serviceName: booking.serviceType.name,
      scheduledAt: booking.scheduledAt,
      durationMinutes: booking.serviceType.durationMinutes,
      address: workspace.address || undefined,
    });
  }

  if (event === 'booking_24h_before' && context.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: context.bookingId },
      include: { contact: { select: { name: true, email: true } }, serviceType: { select: { name: true } } },
    });
    if (!booking?.contact.email) return;

    await sendBookingReminderEmail(workspaceId, booking.contact.email, {
      contactName: booking.contact.name,
      businessName: workspace.businessName,
      serviceName: booking.serviceType.name,
      scheduledAt: booking.scheduledAt,
      address: workspace.address || undefined,
    });
  }
}

async function handleAddTagAction(workspaceId: string, context: AutomationContext, config: Record<string, any>) {
  if (!context.contactId) return;
  const tag = config.tag as string;
  if (!tag) return;
  const conversation = await prisma.conversation.findFirst({ where: { workspaceId, contactId: context.contactId } });
  if (conversation && !conversation.tags.includes(tag)) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { tags: { push: tag } } });
  }
}

async function handleCreateConversationAction(workspaceId: string, context: AutomationContext) {
  if (!context.contactId) return;
  const existing = await prisma.conversation.findFirst({ where: { workspaceId, contactId: context.contactId } });
  if (!existing) {
    await prisma.conversation.create({
      data: { workspaceId, contactId: context.contactId, channel: 'EMAIL', tags: ['New Lead'] },
    });
  }
}

export async function seedDefaultAutomations(workspaceId: string) {
  const defaults = [
    { name: 'Welcome Email', triggerEvent: 'contact_created', actionType: 'send_email', actionConfig: { template: 'welcome' } },
    { name: 'Create Contact Conversation', triggerEvent: 'contact_created', actionType: 'create_conversation', actionConfig: {} },
    { name: 'New Lead Tag', triggerEvent: 'contact_created', actionType: 'add_tag', actionConfig: { tag: 'New Lead' } },
    { name: 'Booking Confirmation Email', triggerEvent: 'booking_created', actionType: 'send_email', actionConfig: { template: 'booking_confirmation' } },
    { name: 'Booking Confirmed Tag', triggerEvent: 'booking_created', actionType: 'add_tag', actionConfig: { tag: 'Booking Confirmed' } },
    { name: 'Booking Reminder', triggerEvent: 'booking_24h_before', actionType: 'send_email', actionConfig: { template: 'booking_reminder' } },
  ];
  for (const rule of defaults) {
    await prisma.automationRule.create({ data: { ...rule, workspaceId, isActive: true } });
  }
}
