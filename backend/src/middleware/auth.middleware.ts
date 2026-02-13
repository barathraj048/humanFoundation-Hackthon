import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import prisma from '../config/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        id: string;
        email: string;
        role: string;
        workspaceId: string;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, workspaceId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return errorResponse(res, 'Account not found or inactive', 401);
    }

    req.user = {
      ...payload,
      id: user.id,
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

export function requireWorkspace(workspaceId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.workspaceId !== workspaceId) {
      return errorResponse(res, 'Access denied', 403);
    }
    next();
  };
}
