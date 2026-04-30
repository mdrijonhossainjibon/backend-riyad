import { Request, Response, NextFunction } from 'express';

// Validation error response helper
export const validationError = (res: Response, message: string, field?: string) => {
  return res.status(400).json({
    success: false,
    error: 'Validation Error',
    message,
    field,
    statusCode: 400
  });
};

// Not found error response helper
export const notFoundError = (res: Response, resource: string) => {
  return res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `${resource} not found`,
    statusCode: 404
  });
};

// Unauthorized error response helper
export const unauthorizedError = (res: Response, message: string = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message,
    statusCode: 401
  });
};

// Forbidden error response helper
export const forbiddenError = (res: Response, message: string = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message,
    statusCode: 403
  });
};

// Server error response helper
export const serverError = (res: Response, message: string = 'Internal server error') => {
  return res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message,
    statusCode: 500
  });
};

// Success response helper
export const successResponse = (res: Response, data: any, message: string = 'Success', statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    statusCode
  });
};

// Created response helper (201)
export const createdResponse = (res: Response, data: any, message: string = 'Created successfully') => {
  return successResponse(res, data, message, 201);
};

// Validate required fields middleware
export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(field => {
      const value = req.body[field] ?? req.query[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return validationError(res, `Missing required fields: ${missing.join(', ')}`);
    }

    next();
  };
};

// Validate userId middleware - ensures userId is present
export const validateUserId = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.body.userId ?? req.query.userId;
  
  if (!userId) {
    return validationError(res, 'userId is required', 'userId');
  }
  
  next();
};
