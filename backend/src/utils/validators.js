/**
 * Request validation utilities
 */

import { AppError } from './errorHandler.js';

/**
 * Validate required fields in request body
 */
export const validateRequired = (data, fields) => {
  const missing = fields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      { missingFields: missing }
    );
  }
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }
};

/**
 * Validate role
 */
export const validateRole = (role) => {
  const validRoles = ['admin', 'retailer'];
  if (!validRoles.includes(role)) {
    throw new AppError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
  }
};

/**
 * Validate UUID format
 */
export const validateUUID = (id, fieldName = 'ID') => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new AppError(`Invalid ${fieldName} format`, 400);
  }
};

/**
 * Sanitize pagination parameters
 */
export const sanitizePagination = (query) => {
  const limit = Math.min(parseInt(query.limit) || 50, 100); // Max 100 items
  const offset = parseInt(query.offset) || 0;
  
  return { limit, offset };
};
