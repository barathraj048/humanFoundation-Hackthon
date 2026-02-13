import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { successResponse, errorResponse, AppError } from '../utils/response';
import { slugify } from '../utils/slug';
import { seedDefaultAutomations } from '../services/automation.service';

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, businessName, fullName } = req.body;

    // Check email unique
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse(res, 'Email already in use', 409);

    // Generate slug
    let slug = slugify(businessName);
    const slugExists = await prisma.workspace.findUnique({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

    const passwordHash = await hashPassword(password);

    // Transaction: create workspace + owner user
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          slug,
          businessName,
          isActive: false,
        },
      });

      const user = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          email,
          passwordHash,
          fullName: fullName || null,
          role: 'OWNER',
          permissions: {},
        },
      });

      return { workspace, user };
    });

    // Seed default automations async (don't block response)
    seedDefaultAutomations(result.workspace.id).catch(console.error);

    const token = signToken({
      userId: result.user.id,
      workspaceId: result.workspace.id,
      role: result.user.role,
    });

    return successResponse(res, {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        workspaceId: result.user.workspaceId,
      },
      workspace: result.workspace,
      token,
    }, 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspace: true,
      },
    });

    if (!user) return errorResponse(res, 'Invalid email or password', 401);
    if (!user.isActive) return errorResponse(res, 'Account is inactive', 401);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) return errorResponse(res, 'Invalid email or password', 401);

    const token = signToken({
      userId: user.id,
      workspaceId: user.workspaceId,
      role: user.role,
    });

    return successResponse(res, {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        workspaceId: user.workspaceId,
      },
      workspace: user.workspace,
      token,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, fullName: true, role: true, workspaceId: true,
        workspace: true,
      },
    });

    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/change-password
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return errorResponse(res, 'User not found', 404);

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) return errorResponse(res, 'Current password is incorrect', 400);

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return successResponse(res, { message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}
