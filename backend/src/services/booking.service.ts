import prisma from '../config/prisma';
import { AppError } from '../utils/response';
import { addMinutes, format, setHours, setMinutes, parseISO, isBefore, isAfter } from 'date-fns';

export async function checkBookingConflict(
  workspaceId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeBookingId?: string
): Promise<boolean> {
  const endTime = addMinutes(scheduledAt, durationMinutes);

  const conflicting = await prisma.booking.findFirst({
    where: {
      workspaceId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      AND: [
        { scheduledAt: { lt: endTime } },
        {
          // scheduledAt + durationMinutes > new scheduledAt
          // We check: existing.scheduledAt + existing.duration > new.scheduledAt
          // Approximate via: existing.scheduledAt > new.scheduledAt - maxDuration
          scheduledAt: { gte: addMinutes(scheduledAt, -480) },
        },
      ],
    },
    include: {
      serviceType: { select: { durationMinutes: true } },
    },
  });

  if (!conflicting) return false;

  // Precise check: does the existing booking overlap?
  const existingEnd = addMinutes(conflicting.scheduledAt, conflicting.serviceType.durationMinutes);
  const newEnd = addMinutes(scheduledAt, durationMinutes);

  return (
    scheduledAt < existingEnd &&
    newEnd > conflicting.scheduledAt
  );
}

export async function getAvailableSlots(
  workspaceId: string,
  date: Date,
  serviceTypeId: string
): Promise<string[]> {
  const dayOfWeek = date.getDay(); // 0=Sun ... 6=Sat

  // Get availability rule for this day
  const rule = await prisma.availabilityRule.findFirst({
    where: { workspaceId, dayOfWeek, isActive: true },
  });

  if (!rule) return [];

  const serviceType = await prisma.serviceType.findUnique({
    where: { id: serviceTypeId },
    select: { durationMinutes: true },
  });

  if (!serviceType) return [];

  // Generate slots based on duration
  const slots: string[] = [];
  const [startH, startM] = rule.startTime.split(':').map(Number);
  const [endH, endM] = rule.endTime.split(':').map(Number);

  let current = setMinutes(setHours(new Date(date), startH), startM);
  const end = setMinutes(setHours(new Date(date), endH), endM);

  while (isBefore(addMinutes(current, serviceType.durationMinutes), end) ||
         addMinutes(current, serviceType.durationMinutes).getTime() === end.getTime()) {
    const slotStr = format(current, 'HH:mm');
    const hasConflict = await checkBookingConflict(
      workspaceId,
      current,
      serviceType.durationMinutes
    );

    if (!hasConflict) {
      slots.push(slotStr);
    }

    current = addMinutes(current, serviceType.durationMinutes);
  }

  return slots;
}

export async function findOrCreateContact(
  workspaceId: string,
  contactData: { name: string; email?: string; phone?: string },
  source = 'booking'
) {
  if (contactData.email) {
    const existing = await prisma.contact.findFirst({
      where: { workspaceId, email: contactData.email },
    });
    if (existing) {
      // Update name/phone if provided
      return prisma.contact.update({
        where: { id: existing.id },
        data: {
          name: contactData.name || existing.name,
          phone: contactData.phone || existing.phone || undefined,
        },
      });
    }
  }

  return prisma.contact.create({
    data: {
      workspaceId,
      name: contactData.name,
      email: contactData.email || null,
      phone: contactData.phone || null,
      source,
      status: 'NEW',
    },
  });
}
