import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { checkBookingConflict } from '../services/booking.service';
import { createCalendarEvent } from '../services/calendar.service';
import { triggerAutomation } from '../services/automation.service';

// GET /api/bookings
export async function getBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, from, to, contactId, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { workspaceId: req.user!.workspaceId };
    if (status && status !== 'ALL') where.status = status;
    if (from) where.scheduledAt = { ...where.scheduledAt, gte: new Date(from as string) };
    if (to) where.scheduledAt = { ...where.scheduledAt, lte: new Date(to as string) };
    if (contactId) where.contactId = contactId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, email: true, phone: true } },
          serviceType: { select: { id: true, name: true, durationMinutes: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.booking.count({ where }),
    ]);

    return successResponse(res, bookings, 200, { total, page: parseInt(page as string) });
  } catch (err) { next(err); }
}

// GET /api/bookings/:id
export async function getBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
      include: {
        contact: true,
        serviceType: true,
      },
    });
    if (!booking) return errorResponse(res, 'Booking not found', 404);
    return successResponse(res, booking);
  } catch (err) { next(err); }
}

// POST /api/bookings
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user!.workspaceId;
    const { serviceTypeId, scheduledAt, contactId, notes, location } = req.body;

    const serviceType = await prisma.serviceType.findFirst({
      where: { id: serviceTypeId, workspaceId, isActive: true },
    });
    if (!serviceType) return errorResponse(res, 'Service type not found', 404);

    const scheduledDate = new Date(scheduledAt);
    const hasConflict = await checkBookingConflict(
      workspaceId, scheduledDate, serviceType.durationMinutes
    );
    if (hasConflict) return errorResponse(res, 'Time slot is no longer available', 409);

    const booking = await prisma.booking.create({
      data: {
        workspaceId,
        contactId,
        serviceTypeId,
        scheduledAt: scheduledDate,
        durationMinutes: serviceType.durationMinutes,
        status: 'CONFIRMED',
        notes: notes || null,
        location: location || serviceType.location || null,
      },
      include: {
        contact: true,
        serviceType: true,
      },
    });

    // Create calendar event async
    createCalendarEvent(workspaceId, {
      ...booking,
      contact: booking.contact,
      serviceType: booking.serviceType,
    }).then(eventId => {
      if (eventId) {
        prisma.booking.update({
          where: { id: booking.id },
          data: { calendarEventId: eventId },
        }).catch(console.error);
      }
    });

    // Update contact status to BOOKED
    await prisma.contact.update({
      where: { id: contactId },
      data: { status: 'BOOKED' },
    });

    // Trigger automation
    await triggerAutomation(workspaceId, 'booking_created', {
      bookingId: booking.id,
      contactId: booking.contactId,
    });

    return successResponse(res, booking, 201);
  } catch (err) { next(err); }
}

// PUT /api/bookings/:id/status
export async function updateBookingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;

    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!booking) return errorResponse(res, 'Booking not found', 404);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        serviceType: { select: { id: true, name: true } },
      },
    });

    // Update contact status when booking is completed
    if (status === 'COMPLETED') {
      await prisma.contact.update({
        where: { id: booking.contactId },
        data: { status: 'COMPLETED' },
      });
    }

    return successResponse(res, updated);
  } catch (err) { next(err); }
}

// PUT /api/bookings/:id
export async function updateBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
      include: { serviceType: true },
    });
    if (!booking) return errorResponse(res, 'Booking not found', 404);

    const { scheduledAt, notes, location } = req.body;

    if (scheduledAt) {
      const newDate = new Date(scheduledAt);
      const hasConflict = await checkBookingConflict(
        req.user!.workspaceId,
        newDate,
        booking.serviceType.durationMinutes,
        booking.id
      );
      if (hasConflict) return errorResponse(res, 'Time slot is not available', 409);
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        notes: notes !== undefined ? notes : undefined,
        location: location !== undefined ? location : undefined,
      },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        serviceType: { select: { id: true, name: true, durationMinutes: true } },
      },
    });

    return successResponse(res, updated);
  } catch (err) { next(err); }
}

// DELETE /api/bookings/:id
export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!booking) return errorResponse(res, 'Booking not found', 404);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' },
    });

    return successResponse(res, { message: 'Booking cancelled' });
  } catch (err) { next(err); }
}
