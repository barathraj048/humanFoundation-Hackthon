import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import prisma from '../config/prisma';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        workspaceId: string;
        userId: string;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, workspaceId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return errorResponse(res, 'Account not found or inactive', 401);
    }

    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    };

    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'OWNER') {
    return errorResponse(res, 'Owner access required', 403);
  }
  next();
}
