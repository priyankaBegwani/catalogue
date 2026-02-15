import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery,
  getOneOrFail,
  cacheMiddleware,
  cache
} from '../utils/index.js';

const router = express.Router();

// Get all transport options
router.get('/', 
  authenticateUser, 
  cacheMiddleware(600), // Cache for 10 minutes
  asyncHandler(async (req, res) => {
    const transportOptions = await executeQuery(
      supabase
        .from('transport')
        .select('*')
        .order('created_at', { ascending: false }),
      'Failed to fetch transport options'
    );

    res.json({ transportOptions });
  })
);

// Get single transport option
router.get('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Transport ID');

    const transport = await getOneOrFail(
      supabase
        .from('transport')
        .select('*')
        .eq('id', id),
      'Transport option not found'
    );

    res.json({ transport });
  })
);

// Create new transport option
router.post('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { 
      transport_name, 
      description, 
      address, 
      phone_number, 
      gst_number, 
      state, 
      district, 
      city, 
      pincode 
    } = req.body;

    validateRequired(req.body, ['transport_name']);

    const { data: transport, error } = await supabase
      .from('transport')
      .insert([
        {
          transport_name,
          description: description || '',
          address: address || '',
          phone_number: phone_number || '',
          gst_number: gst_number || '',
          state: state || '',
          district: district || '',
          city: city || '',
          pincode: pincode || ''
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('transport_name')) {
          throw new AppError('Transport name already exists', 400);
        }
        throw new AppError('Duplicate key error: ' + error.message, 400);
      }
      throw new AppError('Failed to create transport option', 500, { dbError: error.message });
    }

    // Invalidate cache
    cache.delete('cache:/api/transport');
    cache.delete('cache:/api/orders/transport');

    res.status(201).json({
      message: 'Transport option created successfully',
      transport
    });
  })
);

// Update transport option
router.put('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      transport_name, 
      description, 
      address, 
      phone_number, 
      gst_number, 
      state, 
      district, 
      city, 
      pincode 
    } = req.body;

    validateUUID(id, 'Transport ID');
    validateRequired(req.body, ['transport_name']);

    const { data: transport, error } = await supabase
      .from('transport')
      .update({
        transport_name,
        description: description || '',
        address: address || '',
        phone_number: phone_number || '',
        gst_number: gst_number || '',
        state: state || '',
        district: district || '',
        city: city || '',
        pincode: pincode || ''
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Transport name already exists', 400);
      }
      throw new AppError('Failed to update transport option', 500, { dbError: error.message });
    }

    // Invalidate cache
    cache.delete('cache:/api/transport');
    cache.delete('cache:/api/orders/transport');

    res.json({
      message: 'Transport option updated successfully',
      transport
    });
  })
);

// Delete transport option
router.delete('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Transport ID');

    await executeQuery(
      supabase
        .from('transport')
        .delete()
        .eq('id', id),
      'Failed to delete transport option'
    );

    // Invalidate cache
    cache.delete('cache:/api/transport');
    cache.delete('cache:/api/orders/transport');

    res.json({ message: 'Transport option deleted successfully' });
  })
);

export default router;