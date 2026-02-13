import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';

// GET /api/automations/rules
export async function getRules(req: Request, res: Response, next: NextFunction) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { workspaceId: req.user!.workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return successResponse(res, rules);
  } catch (err) { next(err); }
}

// PUT /api/automations/rules/:id
export async function updateRule(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await prisma.automationRule.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!rule) return errorResponse(res, 'Rule not found', 404);

    const updated = await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        name: req.body.name,
        isActive: req.body.isActive,
        actionConfig: req.body.actionConfig,
        delayMinutes: req.body.delayMinutes,
      },
    });
    return successResponse(res, updated);
  } catch (err) { next(err); }
}

// POST /api/automations/rules
export async function createRule(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, triggerEvent, actionType, actionConfig, delayMinutes } = req.body;

    const rule = await prisma.automationRule.create({
      data: {
        workspaceId: req.user!.workspaceId,
        name,
        triggerEvent,
        actionType,
        actionConfig: actionConfig || {},
        delayMinutes: delayMinutes || 0,
        isActive: true,
      },
    });
    return successResponse(res, rule, 201);
  } catch (err) { next(err); }
}

// DELETE /api/automations/rules/:id
export async function deleteRule(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await prisma.automationRule.findFirst({
      where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    });
    if (!rule) return errorResponse(res, 'Rule not found', 404);

    await prisma.automationRule.delete({ where: { id: rule.id } });
    return successResponse(res, { message: 'Rule deleted' });
  } catch (err) { next(err); }
}

// GET /api/automations/logs
export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', status } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { workspaceId: req.user!.workspaceId };
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.automationLog.findMany({
        where,
        include: {
          automationRule: { select: { name: true, triggerEvent: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.automationLog.count({ where }),
    ]);

    return successResponse(res, logs, 200, { total });
  } catch (err) { next(err); }
}
