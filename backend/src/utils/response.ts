import { Response } from 'express';

export function successResponse<T>(res: Response, data: T, statusCode = 200, meta?: object) {
  return res.status(statusCode).json({ success: true, data, ...(meta && { meta }) });
}

export function errorResponse(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}

export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}
