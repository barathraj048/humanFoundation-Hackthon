import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(err.message));
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json(errorResponse('Database error'));
  }

  // Default error
  res.status(500).json(errorResponse('Internal server error'));
};