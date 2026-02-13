import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── WORKSPACE ────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo-clinic' },
    update: {},
    create: {
      slug: 'demo-clinic',
      businessName: 'Demo Wellness Clinic',
      address: '123 Health St, San Francisco, CA 94102',
      timezone: 'America/Los_Angeles',
      contactEmail: 'hello@democlinic.com',
      isActive: true,
    },
  });
  console.log('✅ Workspace:', workspace.businessName);

  // ─── OWNER ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: 'owner@demo.com',
      passwordHash,
      fullName: 'Demo Owner',
      role: 'OWNER',
      permissions: {},
    },
  });
  console.log('✅ Owner:', owner.email, '/ password: demo1234');

  // ─── STAFF USER ───────────────────────────────────────────────────────────
  const staff = await prisma.user.upsert({
    where: { email: 'staff@demo.com' },
    update: {},
    create: {
      workspaceId: workspace.id,
      email: 'staff@demo.com',
      passwordHash,
      fullName: 'Demo Staff',
      role: 'STAFF',
      permissions: {},
    },
  });
  console.log('✅ Staff:', staff.email, '/ password: demo1234');

  // ─── SERVICE TYPES ────────────────────────────────────────────────────────
  const services = [
    { name: 'Initial Consultation', description: '60-min comprehensive health assessment', durationMinutes: 60, location: 'Room A' },
    { name: 'Follow-up Visit', description: '30-min progress check-in', durationMinutes: 30, location: 'Room A' },
    { name: 'Massage Therapy', description: 'Full body relaxation massage', durationMinutes: 60, location: 'Room B' },
    { name: 'Acupuncture Session', description: 'Traditional acupuncture treatment', durationMinutes: 45, location: 'Room C' },
  ];

  const createdServices = [];
  for (const s of services) {
    const svc = await prisma.serviceType.upsert({
      where: { id: `seed-${workspace.id}-${s.name}`.slice(0, 36) },
      update: {},
      create: { id: crypto.randomUUID(), workspaceId: workspace.id, ...s },
    });
    createdServices.push(svc);
  }
  console.log(`✅ ${createdServices.length} service types`);

  // ─── AVAILABILITY ─────────────────────────────────────────────────────────
  await prisma.availabilityRule.deleteMany({ where: { workspaceId: workspace.id } });
  const availability = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
    { dayOfWeek: 5, startTime: '09:00', endTime: '15:00' }, // Friday
  ];
  await prisma.availabilityRule.createMany({
    data: availability.map(a => ({ workspaceId: workspace.id, ...a })),
  });
  console.log('✅ Availability rules set');

  // ─── CONTACTS ─────────────────────────────────────────────────────────────
  const contactData = [
    { name: 'Alice Johnson', email: 'alice@example.com', phone: '+14155551001', status: 'BOOKED' as const, source: 'booking_page' },
    { name: 'Bob Martinez', email: 'bob@example.com', phone: '+14155551002', status: 'NEW' as const, source: 'contact_form' },
    { name: 'Carol Williams', email: 'carol@example.com', phone: '+14155551003', status: 'CONTACTED' as const, source: 'booking_page' },
    { name: 'David Chen', email: 'david@example.com', phone: '+14155551004', status: 'COMPLETED' as const, source: 'referral' },
    { name: 'Emma Davis', email: 'emma@example.com', phone: '+14155551005', status: 'BOOKED' as const, source: 'booking_page' },
    { name: 'Frank Thompson', email: 'frank@example.com', phone: null, status: 'NEW' as const, source: 'contact_form' },
    { name: 'Grace Lee', email: 'grace@example.com', phone: '+14155551007', status: 'NEW' as const, source: 'contact_form' },
    { name: 'Henry Wilson', email: 'henry@example.com', phone: '+14155551008', status: 'COMPLETED' as const, source: 'booking_page' },
  ];

  const contacts = [];
  for (const c of contactData) {
    const contact = await prisma.contact.upsert({
      where: { id: `seed-${workspace.id}-${c.email}`.slice(0, 36) },
      update: {},
      create: {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        status: c.status,
        source: c.source,
      },
    });
    contacts.push(contact);
  }
  console.log(`✅ ${contacts.length} contacts`);

  // ─── BOOKINGS ─────────────────────────────────────────────────────────────
  const now = new Date();
  const bookingData = [
    { contactIdx: 0, serviceIdx: 0, hoursFromNow: 2, status: 'CONFIRMED' as const },
    { contactIdx: 4, serviceIdx: 2, hoursFromNow: 4, status: 'CONFIRMED' as const },
    { contactIdx: 2, serviceIdx: 1, hoursFromNow: 26, status: 'PENDING' as const },
    { contactIdx: 3, serviceIdx: 3, hoursFromNow: -48, status: 'COMPLETED' as const },
    { contactIdx: 7, serviceIdx: 0, hoursFromNow: -72, status: 'COMPLETED' as const },
    { contactIdx: 1, serviceIdx: 1, hoursFromNow: 50, status: 'PENDING' as const },
  ];

  for (const b of bookingData) {
    const sched = new Date(now.getTime() + b.hoursFromNow * 60 * 60 * 1000);
    // Round to nearest hour
    sched.setMinutes(0, 0, 0);
    const service = createdServices[b.serviceIdx];
    await prisma.booking.create({
      data: {
        workspaceId: workspace.id,
        contactId: contacts[b.contactIdx].id,
        serviceTypeId: service.id,
        scheduledAt: sched,
        durationMinutes: service.durationMinutes,
        status: b.status,
        location: service.location || null,
      },
    });
  }
  console.log(`✅ ${bookingData.length} bookings`);

  // ─── CONVERSATIONS ────────────────────────────────────────────────────────
  for (const contact of contacts.slice(0, 5)) {
    const existing = await prisma.conversation.findFirst({
      where: { workspaceId: workspace.id, contactId: contact.id },
    });
    if (existing) continue;

    const tags = ['New Lead'];
    if (contact.status === 'BOOKED') tags.push('Booking Confirmed');
    if (contact.status === 'COMPLETED') {
      tags.length = 0;
      tags.push('Booking Confirmed');
    }

    const conv = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        channel: 'EMAIL',
        status: 'ACTIVE',
        tags,
        automationPaused: false,
        lastMessageAt: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
      },
    });

    // Add some messages
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv.id,
          direction: 'OUTBOUND',
          senderType: 'SYSTEM',
          content: `Welcome to Demo Wellness Clinic, ${contact.name}! We're excited to work with you. Click here to book your first appointment.`,
          isAutomated: true,
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        },
        ...(contact.status === 'BOOKED' ? [{
          conversationId: conv.id,
          direction: 'OUTBOUND' as const,
          senderType: 'SYSTEM' as const,
          content: 'Your appointment has been confirmed! We look forward to seeing you.',
          isAutomated: true,
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        }] : []),
      ],
    });
  }
  console.log('✅ Conversations and messages');

  // ─── INVENTORY ────────────────────────────────────────────────────────────
  const inventoryData = [
    { name: 'Disposable Gloves (Box)', quantity: 5, threshold: 10, unit: 'boxes', vendorEmail: 'vendor@supplies.com' },
    { name: 'Massage Oil (500ml)', quantity: 3, threshold: 5, unit: 'bottles', vendorEmail: 'vendor@supplies.com' },
    { name: 'Paper Towels', quantity: 0, threshold: 5, unit: 'rolls', vendorEmail: 'vendor@supplies.com' },
    { name: 'Sterilization Wipes', quantity: 20, threshold: 10, unit: 'packs' },
    { name: 'Acupuncture Needles', quantity: 2, threshold: 10, unit: 'packs', vendorEmail: 'acusupplies@medical.com' },
    { name: 'Pillow Cases', quantity: 15, threshold: 8, unit: 'pieces' },
  ];

  for (const item of inventoryData) {
    await prisma.inventoryItem.create({
      data: { workspaceId: workspace.id, ...item },
    });
  }
  console.log(`✅ ${inventoryData.length} inventory items`);

  // ─── FORM TEMPLATES ───────────────────────────────────────────────────────
  const intakeTemplate = await prisma.formTemplate.create({
    data: {
      workspaceId: workspace.id,
      name: 'New Patient Intake Form',
      type: 'INTAKE',
      fields: [
        { id: 'f1', label: 'Date of Birth', type: 'date', required: true },
        { id: 'f2', label: 'Primary Health Concern', type: 'textarea', required: true },
        { id: 'f3', label: 'Current Medications', type: 'textarea', required: false },
        { id: 'f4', label: 'Allergies', type: 'text', required: false },
        { id: 'f5', label: 'Emergency Contact Name', type: 'text', required: true },
        { id: 'f6', label: 'Emergency Contact Phone', type: 'phone', required: true },
      ],
    },
  });

  // Create some pending submissions
  for (const contact of contacts.slice(0, 3)) {
    await prisma.formSubmission.create({
      data: {
        workspaceId: workspace.id,
        formTemplateId: intakeTemplate.id,
        contactId: contact.id,
        data: {},
        status: 'PENDING',
      },
    });
  }

  // One completed submission
  await prisma.formSubmission.create({
    data: {
      workspaceId: workspace.id,
      formTemplateId: intakeTemplate.id,
      contactId: contacts[3].id,
      data: { f1: '1985-06-15', f2: 'Back pain', f5: 'Jane Doe', f6: '+14155559999' },
      status: 'COMPLETED',
      completedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Form templates and submissions');

  // ─── AUTOMATION RULES ─────────────────────────────────────────────────────
  const automations = [
    {
      name: 'Welcome Email on Contact Creation',
      triggerEvent: 'contact_created',
      actionType: 'send_email',
      actionConfig: { template: 'welcome' },
      isActive: true,
    },
    {
      name: 'Create Conversation on New Contact',
      triggerEvent: 'contact_created',
      actionType: 'create_conversation',
      actionConfig: {},
      isActive: true,
    },
    {
      name: 'Tag New Lead',
      triggerEvent: 'contact_created',
      actionType: 'add_tag',
      actionConfig: { tag: 'New Lead' },
      isActive: true,
    },
    {
      name: 'Booking Confirmation Email',
      triggerEvent: 'booking_created',
      actionType: 'send_email',
      actionConfig: { template: 'booking_confirmation' },
      isActive: true,
    },
    {
      name: 'Tag Booking Confirmed',
      triggerEvent: 'booking_created',
      actionType: 'add_tag',
      actionConfig: { tag: 'Booking Confirmed' },
      isActive: true,
    },
    {
      name: '24h Booking Reminder',
      triggerEvent: 'booking_24h_before',
      actionType: 'send_email',
      actionConfig: { template: 'booking_reminder' },
      isActive: true,
    },
  ];

  for (const rule of automations) {
    await prisma.automationRule.create({
      data: { workspaceId: workspace.id, ...rule },
    });
  }
  console.log(`✅ ${automations.length} automation rules`);

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login credentials:');
  console.log('  Email:    owner@demo.com');
  console.log('  Password: demo1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
