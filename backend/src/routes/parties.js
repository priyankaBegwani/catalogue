import express from 'express';
import { supabaseAdmin, supabase } from '../config.js';
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

// Get all parties
router.get('/', 
  authenticateUser, 
  cacheMiddleware(300), // Cache for 5 minutes
  asyncHandler(async (req, res) => {
    const parties = await executeQuery(
      supabaseAdmin
        .from('parties')
        .select(`*`)
        .order('created_at', { ascending: false }),
      'Failed to fetch parties'
    );

    res.json({ parties });
  })
);

// Get single party
router.get('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Party ID');

    const party = await getOneOrFail(
      supabaseAdmin
        .from('parties')
        .select(`*`)
        .eq('id', id),
      'Party not found'
    );

    res.json({ party });
  })
);

// Create new party
router.post('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { 
      name, 
      description, 
      address, 
      city, 
      state, 
      pincode, 
      phone_number,
      gst_number
    } = req.body;

    validateRequired(req.body, ['name']);

    const party = await executeQuery(
      supabaseAdmin
        .from('parties')
        .insert([
          {
            name,
            description: description || '',
            address: address || '',
            city: city || '',
            state: state || '',
            pincode: pincode || '',
            phone_number: phone_number || '',
            gst_number: gst_number || '',
            created_by: req.user.id
          }
        ])
        .select(`*`)
        .single(),
      'Failed to create party'
    );

    // Invalidate cache
    cache.delete('cache:/api/parties');
    cache.delete('cache:/api/orders/parties');

    res.status(201).json({
      message: 'Party created successfully',
      party
    });
  })
);

// Update party
router.put('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      name, 
      description, 
      address, 
      city, 
      state, 
      pincode, 
      phone_number,
      gst_number
    } = req.body;

    validateUUID(id, 'Party ID');
    validateRequired(req.body, ['name']);

    const party = await executeQuery(
      supabase
        .from('parties')
        .update({
          name,
          description: description || '',
          address: address || '',
          city: city || '',
          state: state || '',
          pincode: pincode || '',
          phone_number: phone_number || '',
          gst_number: gst_number || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`*`)
        .single(),
      'Failed to update party'
    );

    // Invalidate cache
    cache.delete('cache:/api/parties');
    cache.delete('cache:/api/orders/parties');

    res.json({
      message: 'Party updated successfully',
      party
    });
  })
);

// Delete party
router.delete('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Party ID');

    // First check if there are any users associated with this party
    const { data: users, error: userCheckError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('party_id', id);

    if (userCheckError) {
      throw new AppError('Failed to check party dependencies', 500, { dbError: userCheckError.message });
    }

    if (users && users.length > 0) {
      const userList = users.map(u => `${u.full_name} (${u.email})`).join(', ');
      throw new AppError(
        `Cannot delete party. It has ${users.length} associated user(s): ${userList}. Please reassign or delete these users first.`,
        400
      );
    }

    // Check for any other dependencies (orders, etc.)
    // Note: Skip order check for now if orders table doesn't exist or has different structure
    let hasOrders = false;
    try {
      const { data: orders, error: orderCheckError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('party_id', id)
        .limit(1);

      if (orderCheckError) {
        // Don't fail the deletion if orders table doesn't exist
      } else if (orders && orders.length > 0) {
        hasOrders = true;
      }
    } catch (err) {
      // Don't fail the deletion if orders table doesn't exist
    }

    if (hasOrders) {
      throw new AppError(
        'Cannot delete party. It has associated orders. Please delete the orders first or archive the party instead.',
        400
      );
    }

    // If no dependencies, proceed with deletion
    const { error } = await supabaseAdmin
      .from('parties')
      .delete()
      .eq('id', id);

    if (error) {
      // Handle specific database errors
      if (error.code === '23503') {
        throw new AppError(
          'Cannot delete party due to database constraints. The party may have associated records.',
          400
        );
      }
      throw new AppError('Failed to delete party', 500, { dbError: error.message });
    }

    // Invalidate cache
    cache.delete('cache:/api/parties');
    cache.delete('cache:/api/orders/parties');

    res.json({ message: 'Party deleted successfully' });
  })
);

export default router;