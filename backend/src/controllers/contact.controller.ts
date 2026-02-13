import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { triggerAutomation } from '../services/automation.service';

export async function getContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, search, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { workspaceId: req.user!.workspaceId };
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit as string) }),
      prisma.contact.count({ where }),
    ]);
    return successResponse(res, contacts, 200, { total });
  } catch (err) { next(err); }
}

export async function getContact(req: Request, res: Response, next: NextFunction) {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
      include: {
        bookings: { include: { serviceType: { select: { name: true } } }, orderBy: { scheduledAt: 'desc' }, take: 5 },
        conversations: { take: 1 },
      },
    });
    if (!contact) return errorResponse(res, 'Contact not found', 404);
    return successResponse(res, contact);
  } catch (err) { next(err); }
}

export async function createContact(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.user!.workspaceId;
    const { name, email, phone, source, notes } = req.body;
    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        name,
        email: email || null,
        phone: phone || null,
        source: source || 'manual',
        notes: notes || null,
      },
    });
    await triggerAutomation(workspaceId, 'contact_created', { contactId: contact.id });
    return successResponse(res, contact, 201);
  } catch (err) { next(err); }
}

export async function updateContact(req: Request, res: Response, next: NextFunction) {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!contact) return errorResponse(res, 'Contact not found', 404);
    const updated = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        status: req.body.status,
        notes: req.body.notes,
      },
    });
    return successResponse(res, updated);
  } catch (err) { next(err); }
}

export async function deleteContact(req: Request, res: Response, next: NextFunction) {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!contact) return errorResponse(res, 'Contact not found', 404);
    await prisma.contact.delete({ where: { id: contact.id } });
    return successResponse(res, { message: 'Contact deleted' });
  } catch (err) { next(err); }
}
