import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { checkBookingConflict, getAvailableSlots, findOrCreateContact } from '../services/booking.service';
import { triggerAutomation } from '../services/automation.service';
import { setHours, setMinutes, parseISO } from 'date-fns';

// GET /api/public/:slug/info
export async function getPublicInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        businessName: true,
        address: true,
        isActive: true,
      },
    });

    if (!workspace) return errorResponse(res, 'Workspace not found', 404);
    if (!workspace.isActive) return errorResponse(res, 'Booking is not available yet', 403);

    const serviceTypes = await prisma.serviceType.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        location: true,
      },
      orderBy: { name: 'asc' },
    });

    return successResponse(res, { workspace, serviceTypes });
  } catch (err) { next(err); }
}

// GET /api/public/:slug/availability
// Query: ?date=2024-12-01&serviceTypeId=xxx
export async function getPublicAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const { date, serviceTypeId } = req.query;

    if (!date || !serviceTypeId) {
      return errorResponse(res, 'date and serviceTypeId are required', 400);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!workspace || !workspace.isActive) {
      return errorResponse(res, 'Workspace not found or inactive', 404);
    }

    // Validate service type belongs to workspace
    const serviceType = await prisma.serviceType.findFirst({
      where: {
        id: serviceTypeId as string,
        workspaceId: workspace.id,
        isActive: true,
      },
    });

    if (!serviceType) return errorResponse(res, 'Service type not found', 404);

    const requestedDate = new Date(date as string);
    // Set to midnight to avoid timezone issues
    requestedDate.setHours(0, 0, 0, 0);

    // Check if the date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      return successResponse(res, { slots: [], date });
    }

    const slots = await getAvailableSlots(
      workspace.id,
      requestedDate,
      serviceTypeId as string
    );

    return successResponse(res, { slots, date });
  } catch (err) { next(err); }
}

// POST /api/public/:slug/book
export async function publicBook(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const { serviceTypeId, scheduledAt, contact, notes } = req.body;

    if (!serviceTypeId || !scheduledAt || !contact?.name) {
      return errorResponse(res, 'serviceTypeId, scheduledAt, and contact.name are required', 400);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, isActive: true, businessName: true },
    });

    if (!workspace || !workspace.isActive) {
      return errorResponse(res, 'Workspace not found or not active', 404);
    }

    // Validate service type
    const serviceType = await prisma.serviceType.findFirst({
      where: { id: serviceTypeId, workspaceId: workspace.id, isActive: true },
    });
    if (!serviceType) return errorResponse(res, 'Service type not found', 404);

    const scheduledDate = new Date(scheduledAt);

    // Check for booking conflicts
    const hasConflict = await checkBookingConflict(
      workspace.id,
      scheduledDate,
      serviceType.durationMinutes
    );
    if (hasConflict) {
      return errorResponse(res, 'This time slot is no longer available. Please choose another time.', 409);
    }

    // Find or create contact
    const dbContact = await findOrCreateContact(
      workspace.id,
      {
        name: contact.name,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
      },
      'booking_page'
    );

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        workspaceId: workspace.id,
        contactId: dbContact.id,
        serviceTypeId: serviceType.id,
        scheduledAt: scheduledDate,
        durationMinutes: serviceType.durationMinutes,
        status: 'CONFIRMED',
        location: serviceType.location || null,
        notes: notes || null,
      },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        serviceType: { select: { id: true, name: true, durationMinutes: true } },
      },
    });

    // Update contact status
    await prisma.contact.update({
      where: { id: dbContact.id },
      data: { status: 'BOOKED' },
    });

    // Check if contact is new (was just created)
    const isNewContact = dbContact.createdAt.getTime() > Date.now() - 5000;

    if (isNewContact) {
      // Trigger welcome + create conversation for new contacts
      await triggerAutomation(workspace.id, 'contact_created', {
        contactId: dbContact.id,
      });
    }

    // Always trigger booking confirmation
    await triggerAutomation(workspace.id, 'booking_created', {
      bookingId: booking.id,
      contactId: dbContact.id,
    });

    return successResponse(res, {
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        serviceName: booking.serviceType.name,
        durationMinutes: booking.durationMinutes,
        contactName: booking.contact.name,
        contactEmail: booking.contact.email,
      },
      message: 'Booking confirmed! Check your email for details.',
    }, 201);
  } catch (err) { next(err); }
}
