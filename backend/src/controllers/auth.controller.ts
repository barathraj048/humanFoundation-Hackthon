import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { registerSchema, loginSchema } from '../utils/validators';
import { AppError } from '../middleware/errorHandler';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, businessName } = registerSchema.parse(req.body);

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(400, 'Email already registered');
    }

    // Create workspace + owner in transaction
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          businessName,
          slug: businessName.toLowerCase().replace(/\s+/g, '-')
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
          role: 'OWNER',
          workspaceId: workspace.id
        },
        select: {
          id: true,
          email: true,
          role: true,
          workspaceId: true
        }
      });

      return { user, workspace };
    });

    const token = generateToken({
      userId: result.user.id,
      workspaceId: result.workspace.id
    });

    res.status(201).json(successResponse({
      user: result.user,
      workspace: result.workspace,
      token
    }));
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { workspace: true }
    });

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new AppError(401, 'Account is inactive');
    }

    const token = generateToken({
      userId: user.id,
      workspaceId: user.workspaceId
    });

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId
      },
      workspace: user.workspace,
      token
    }));
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { workspace: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        workspace: true
      }
    });

    res.json(successResponse({ user }));
  } catch (error) {
    next(error);
  }
};