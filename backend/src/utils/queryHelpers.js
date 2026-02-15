/**
 * Database query helper utilities
 */

import { supabase } from '../config.js';
import { AppError } from './errorHandler.js';

/**
 * Execute query with error handling
 */
export const executeQuery = async (queryBuilder, errorMessage = 'Database query failed') => {
  const { data, error } = await queryBuilder;
  
  if (error) {
    throw new AppError(errorMessage, 500, { dbError: error.message });
  }
  
  return data;
};

/**
 * Get single record or throw 404
 */
export const getOneOrFail = async (queryBuilder, errorMessage = 'Record not found') => {
  const { data, error } = await queryBuilder.maybeSingle();
  
  if (error) {
    throw new AppError('Database query failed', 500, { dbError: error.message });
  }
  
  if (!data) {
    throw new AppError(errorMessage, 404);
  }
  
  return data;
};

/**
 * Batch insert with transaction support
 */
export const batchInsert = async (table, records, chunkSize = 100) => {
  const results = [];
  
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from(table)
      .insert(chunk)
      .select();
    
    if (error) {
      throw new AppError(`Batch insert failed at chunk ${i / chunkSize + 1}`, 500, { dbError: error.message });
    }
    
    results.push(...data);
  }
  
  return results;
};

/**
 * Build dynamic filters for queries
 */
export const applyFilters = (query, filters) => {
  let modifiedQuery = query;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        modifiedQuery = modifiedQuery.in(key, value);
      } else if (typeof value === 'object' && value.operator) {
        // Support operators like { operator: 'gte', value: 10 }
        modifiedQuery = modifiedQuery[value.operator](key, value.value);
      } else {
        modifiedQuery = modifiedQuery.eq(key, value);
      }
    }
  });
  
  return modifiedQuery;
};
