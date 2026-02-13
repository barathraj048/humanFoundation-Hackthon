import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';

// GET /api/workspaces/me (alias for current workspace)
export async function getWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.user!.workspaceId },
    });
    if (!workspace) return errorResponse(res, 'Workspace not found', 404);
    return successResponse(res, { workspace });
  } catch (err) { next(err); }
}

// PUT /api/workspaces/:id
export async function updateWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        businessName: req.body.businessName,
        address: req.body.address,
        timezone: req.body.timezone,
        contactEmail: req.body.contactEmail || null,
      },
    });
    return successResponse(res, { workspace });
  } catch (err) { next(err); }
}

// PUT /api/workspaces/:id/activate
export async function activateWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { isActive: true },
    });
    return successResponse(res, { workspace });
  } catch (err) { next(err); }
}

// POST /api/workspaces/:id/service-types
export async function createServiceType(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const serviceType = await prisma.serviceType.create({
      data: {
        workspaceId: id,
        name: req.body.name,
        description: req.body.description || null,
        durationMinutes: req.body.durationMinutes,
        location: req.body.location || null,
      },
    });
    return successResponse(res, { serviceType }, 201);
  } catch (err) { next(err); }
}

// GET /api/workspaces/:id/service-types
export async function getServiceTypes(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const serviceTypes = await prisma.serviceType.findMany({
      where: { workspaceId: id, isActive: true },
      orderBy: { name: 'asc' },
    });
    return successResponse(res, serviceTypes);
  } catch (err) { next(err); }
}

// PUT /api/workspaces/:id/service-types/:stId
export async function updateServiceType(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, stId } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const serviceType = await prisma.serviceType.update({
      where: { id: stId },
      data: {
        name: req.body.name,
        description: req.body.description,
        durationMinutes: req.body.durationMinutes,
        location: req.body.location,
        isActive: req.body.isActive,
      },
    });
    return successResponse(res, { serviceType });
  } catch (err) { next(err); }
}

// DELETE /api/workspaces/:id/service-types/:stId
export async function deleteServiceType(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, stId } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    await prisma.serviceType.update({
      where: { id: stId },
      data: { isActive: false },
    });
    return successResponse(res, { message: 'Service type deactivated' });
  } catch (err) { next(err); }
}

// POST /api/workspaces/:id/availability
export async function setAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const rules = req.body as Array<{ dayOfWeek: number; startTime: string; endTime: string }>;

    // Delete existing rules and recreate
    await prisma.$transaction([
      prisma.availabilityRule.deleteMany({ where: { workspaceId: id } }),
      prisma.availabilityRule.createMany({
        data: rules.map(r => ({
          workspaceId: id,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          isActive: true,
        })),
      }),
    ]);

    const availability = await prisma.availabilityRule.findMany({
      where: { workspaceId: id },
    });

    return successResponse(res, availability);
  } catch (err) { next(err); }
}

// GET /api/workspaces/:id/availability
export async function getAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const rules = await prisma.availabilityRule.findMany({
      where: { workspaceId: id, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
    return successResponse(res, rules);
  } catch (err) { next(err); }
}

// PUT /api/workspaces/:id/integrations
export async function upsertIntegration(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const { type, provider, config } = req.body;

    const integration = await prisma.integration.upsert({
      where: { workspaceId_type: { workspaceId: id, type } },
      update: { provider, config, isActive: true },
      create: { workspaceId: id, type, provider, config },
    });

    return successResponse(res, { integration });
  } catch (err) { next(err); }
}

// GET /api/workspaces/:id/integrations
export async function getIntegrations(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const integrations = await prisma.integration.findMany({
      where: { workspaceId: id },
      select: { id: true, type: true, provider: true, isActive: true, createdAt: true },
    });
    return successResponse(res, integrations);
  } catch (err) { next(err); }
}

// POST /api/workspaces/:id/invite
export async function inviteStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId || req.user!.role !== 'OWNER') {
      return errorResponse(res, 'Owner access required', 403);
    }

    const { email, password, fullName, permissions } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse(res, 'Email already in use', 409);

    const tempPassword = password || Math.random().toString(36).slice(-8) + 'Aa1!';
    const passwordHash = await hashPassword(tempPassword);

    const staff = await prisma.user.create({
      data: {
        workspaceId: id,
        email,
        passwordHash,
        fullName: fullName || null,
        role: 'STAFF',
        permissions: permissions || {},
      },
    });

    return successResponse(res, {
      user: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        tempPassword: password ? undefined : tempPassword,
      },
    }, 201);
  } catch (err) { next(err); }
}

// GET /api/workspaces/:id/team
export async function getTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id !== req.user!.workspaceId) return errorResponse(res, 'Access denied', 403);

    const users = await prisma.user.findMany({
      where: { workspaceId: id, isActive: true },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(res, users);
  } catch (err) { next(err); }
}
