import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { getResendClient, getFromEmail } from '../services/email.service';

// ─── TEMPLATES ───────────────────────────────────────────────────────────────
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

// ─── SUBMISSIONS ─────────────────────────────────────────────────────────────
export async function getSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, contactId, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { workspace: { id: req.user!.workspaceId } };
    if (status && status !== 'ALL') where.status = status;
    if (contactId) where.contactId = contactId;

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        include: {
          formTemplate: { select: { id: true, name: true, type: true, fields: true } },
          contact:      { select: { id: true, name: true, email: true } },
          booking:      { select: { id: true, scheduledAt: true, serviceType: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit as string),
      }),
      prisma.formSubmission.count({ where }),
    ]);
    return successResponse(res, submissions, 200, { total });
  } catch (err) { next(err); }
}

function buildFormEmailHtml(params: {
  contactName: string; businessName: string;
  formName: string; formLink: string; fields: any[];
}) {
  const preview = params.fields.slice(0, 5).map(f =>
    `<div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
       <span style="color:#6b7280;font-size:13px;">${f.label}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}</span>
       <span style="float:right;color:#9ca3af;font-size:12px;">${
         f.type === 'multiselect' ? 'Multiple choice' :
         f.type === 'select'      ? 'Dropdown'        :
         f.type === 'checkbox'    ? 'Checkbox'        :
         f.type === 'textarea'    ? 'Long answer'     : 'Text'
       }</span>
     </div>`
  ).join('');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,sans-serif;">
<div style="max-width:560px;margin:40px auto;padding:0 16px;">
  <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px;text-align:center;">
      <p style="color:rgba(255,255,255,0.7);margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Form Request</p>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">${params.formName}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;margin:0 0 20px;">Hi <strong>${params.contactName}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
        <strong>${params.businessName}</strong> has sent you a form to complete. 
        It only takes a few minutes.
      </p>
      ${params.fields.length > 0 ? `
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#374151;font-size:13px;font-weight:600;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Form Fields</p>
        ${preview}
        ${params.fields.length > 5 ? `<p style="color:#9ca3af;font-size:12px;margin:8px 0 0;">+${params.fields.length - 5} more fields</p>` : ''}
      </div>` : ''}
      <div style="text-align:center;">
        <a href="${params.formLink}" 
           style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:600;font-size:15px;">
          Open Form →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
        Sent by ${params.businessName} · Powered by CareOps
      </p>
    </div>
  </div>
</div></body></html>`;
}

export async function createSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { formTemplateId, contactId, bookingId, serviceTypeId } = req.body;
    const workspaceId = req.user!.workspaceId;

    const [template, contact, workspace] = await Promise.all([
      prisma.formTemplate.findFirst({ where: { id: formTemplateId, workspaceId } }),
      prisma.contact.findFirst({ where: { id: contactId, workspaceId } }),
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { businessName: true } }),
    ]);
    if (!template) return errorResponse(res, 'Form template not found', 404);
    if (!contact)  return errorResponse(res, 'Contact not found', 404);

    const submission = await prisma.formSubmission.create({
      data: {
        workspace:    { connect: { id: workspaceId } },
        formTemplate: { connect: { id: formTemplateId } },
        contact:      { connect: { id: contactId } },
        booking:     bookingId     ? { connect: { id: bookingId } }     : undefined,
        serviceType: serviceTypeId ? { connect: { id: serviceTypeId } } : undefined,
        data: {}, status: 'PENDING',
      },
      include: {
        formTemplate: { select: { id: true, name: true } },
        contact:      { select: { id: true, name: true, email: true } },
      },
    });

    // Tag conversation
    const conv = await prisma.conversation.findFirst({ where: { workspaceId, contactId } });
    if (conv && !conv.tags.includes('Form Pending')) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { tags: { push: 'Form Pending' } },
      });
    }

    // ── Send email ────────────────────────────────────────────────────────────
    if (contact.email) {
      try {
        const resend = await getResendClient(workspaceId);
        if (resend) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const formLink = `${frontendUrl}/forms/${submission.id}`;
          await resend.emails.send({
            from:    await getFromEmail(workspaceId),
            to:      contact.email,
            subject: `${workspace?.businessName || 'CareOps'} sent you a form: ${template.name}`,
            html:    buildFormEmailHtml({
              contactName:  contact.name,
              businessName: workspace?.businessName || 'CareOps',
              formName:     template.name,
              formLink,
              fields:       (template.fields as any[]) || [],
            }),
          });
        }
      } catch (e) { console.error('Form email error:', e); }
    }

    return successResponse(res, submission, 201);
  } catch (err) { next(err); }
}

export async function completeSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const submission = await prisma.formSubmission.findFirst({
      where: { id: req.params.id, workspace: { id: req.user!.workspaceId } },
    });
    if (!submission) return errorResponse(res, 'Submission not found', 404);

    const updated = await prisma.formSubmission.update({
      where: { id: submission.id },
      data: { status: 'COMPLETED', completedAt: new Date(), data: req.body.data || submission.data },
      include: {
        formTemplate: { select: { id: true, name: true, fields: true } },
        contact:      { select: { id: true, name: true, email: true } },
      },
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

// ─── PUBLIC (no auth) — contact fills in the form ────────────────────────────
export async function getPublicSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const submission = await prisma.formSubmission.findUnique({
      where: { id: req.params.id },
      include: {
        formTemplate: { select: { name: true, type: true, fields: true } },
        contact:      { select: { name: true } },
        workspace:    { select: { businessName: true } },
      },
    });
    if (!submission) return errorResponse(res, 'Form not found', 404);
    return successResponse(res, submission);
  } catch (err) { next(err); }
}

export async function submitPublicForm(req: Request, res: Response, next: NextFunction) {
  try {
    const submission = await prisma.formSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) return errorResponse(res, 'Form not found', 404);
    if (submission.status === 'COMPLETED') return errorResponse(res, 'Form already submitted', 400);

    await prisma.formSubmission.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', completedAt: new Date(), data: req.body.data || {} },
    });

    // Clear tag
    const conv = await prisma.conversation.findFirst({
      where: { workspaceId: submission.workspaceId, contactId: submission.contactId },
    });
    if (conv) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { tags: conv.tags.filter((t: string) => t !== 'Form Pending') },
      });
    }
    return successResponse(res, { message: 'Form submitted successfully' });
  } catch (err) { next(err); }
}
