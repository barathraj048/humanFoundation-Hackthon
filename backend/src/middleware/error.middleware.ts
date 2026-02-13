import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({ success: false, error: messages });
  }

  // Prisma errors
  const prismaErr = err as any;
  if (prismaErr.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'A record with this value already exists' });
  }
  if (prismaErr.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
