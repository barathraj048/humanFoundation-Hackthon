import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// ─── TEMPLATES ────────────────────────────────────────────────────────────────
export async function getTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await prisma.formTemplate.findMany({
      where: { workspaceId: req.user!.workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, templates);
  } catch (err) { next(err); }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, type, fields } = req.body;
    const template = await prisma.formTemplate.create({
      data: { workspaceId: req.user!.workspaceId, name, type: type || 'INTAKE', fields: fields || [] },
    });
    return successResponse(res, template, 201);
  } catch (err) { next(err); }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await prisma.formTemplate.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!template) return errorResponse(res, 'Template not found', 404);
    const updated = await prisma.formTemplate.update({
      where: { id: template.id },
      data: { name: req.body.name, type: req.body.type, fields: req.body.fields, isActive: req.body.isActive },
    });
    return successResponse(res, updated);
  } catch (err) { next(err); }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await prisma.formTemplate.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!template) return errorResponse(res, 'Template not found', 404);
    await prisma.formTemplate.update({ where: { id: template.id }, data: { isActive: false } });
    return successResponse(res, { message: 'Template deleted' });
  } catch (err) { next(err); }
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────────────────
export async function getSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, contactId, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Filter via workspace relation
    const where: any = { workspace: { id: req.user!.workspaceId } };
    if (status && status !== 'ALL') where.status = status;
    if (contactId) where.contactId = contactId;

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        include: {
          formTemplate: { select: { id: true, name: true, type: true } },
          contact: { select: { id: true, name: true, email: true } },
          booking: { select: { id: true, scheduledAt: true, serviceType: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.formSubmission.count({ where }),
    ]);
    return successResponse(res, submissions, 200, { total });
  } catch (err) { next(err); }
}

export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { formTemplateId, contactId, bookingId, serviceTypeId, data } = req.body;

    const template = await prisma.formTemplate.findFirst({
      where: { id: formTemplateId, workspaceId: req.user!.workspaceId },
    });
    if (!template) return errorResponse(res, 'Form template not found', 404);

    // Create via relation (workspaceId inferred via workspace connect)
    const submission = await prisma.formSubmission.create({
      data: {
        workspace: { connect: { id: req.user!.workspaceId } },
        formTemplate: { connect: { id: formTemplateId } },
        contact: { connect: { id: contactId } },
        booking: bookingId ? { connect: { id: bookingId } } : undefined,
        serviceType: serviceTypeId ? { connect: { id: serviceTypeId } } : undefined,
        data: data || {},
        status: 'PENDING',
      },
      include: {
        formTemplate: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
      },
    });

    // Add tag to conversation
    const conv = await prisma.conversation.findFirst({
      where: { workspaceId: req.user!.workspaceId, contactId },
    });
    if (conv && !conv.tags.includes('Form Pending')) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { tags: { push: 'Form Pending' } },
      });
    }
    return successResponse(res, submission, 201);
  } catch (err) { next(err); }
}

export async function completeSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    // Find via workspace relation
    const submission = await prisma.formSubmission.findFirst({
      where: { id: req.params.id, workspace: { id: req.user!.workspaceId } },
    });
    if (!submission) return errorResponse(res, 'Submission not found', 404);

    const updated = await prisma.formSubmission.update({
      where: { id: submission.id },
      data: { status: 'COMPLETED', completedAt: new Date(), data: req.body.data || submission.data },
    });

    const conv = await prisma.conversation.findFirst({
      where: { workspaceId: req.user!.workspaceId, contactId: submission.contactId },
    });
    if (conv) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { tags: conv.tags.filter((t: string) => t !== 'Form Pending') },
      });
    }
    return successResponse(res, updated);
  } catch (err) { next(err); }
}

export async function getSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const submission = await prisma.formSubmission.findFirst({
      where: { id: req.params.id, workspace: { id: req.user!.workspaceId } },
      include: {
        formTemplate: true,
        contact: true,
        booking: { include: { serviceType: { select: { name: true } } } },
      },
    });
    if (!submission) return errorResponse(res, 'Submission not found', 404);
    return successResponse(res, submission);
  } catch (err) { next(err); }
}
