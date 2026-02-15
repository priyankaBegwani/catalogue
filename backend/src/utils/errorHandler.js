/**
 * Centralized error handling utilities
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to eliminate try-catch boilerplate
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Centralized error response handler
 */
export const errorResponse = (res, error, defaultMessage = 'Operation failed') => {
  const statusCode = error.statusCode || 500;
  const message = error.message || defaultMessage;
  
  console.error(`Error [${statusCode}]:`, message, error.details || '');
  
  return res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && error.details && { details: error.details })
  });
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    console.error('Error Stack:', err.stack);
  }

  res.status(err.statusCode).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
