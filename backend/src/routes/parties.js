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
    const userRole = req.profile?.user_roles?.role_name;
    const userId = req.profile?.id;

    let parties;

    // Admin can see all parties
    if (userRole === 'Admin') {
      parties = await executeQuery(
        supabaseAdmin
          .from('parties')
          .select(`*`)
          .order('created_at', { ascending: false }),
        'Failed to fetch parties'
      );
    } 
    // Distributor can only see their associated parties
    else if (userRole === 'Distributor') {
      // Get party IDs associated with this user
      const { data: associations } = await supabaseAdmin
        .from('user_party_associations')
        .select('party_id')
        .eq('user_id', userId);

      if (!associations || associations.length === 0) {
        return res.json({ parties: [] });
      }

      const partyIds = associations.map(a => a.party_id);

      parties = await executeQuery(
        supabaseAdmin
          .from('parties')
          .select(`*`)
          .in('id', partyIds)
          .order('created_at', { ascending: false }),
        'Failed to fetch parties'
      );
    }
    // Other roles (Sales, Staff, etc.) can see all parties
    else {
      parties = await executeQuery(
        supabaseAdmin
          .from('parties')
          .select(`*`)
          .order('created_at', { ascending: false }),
        'Failed to fetch parties'
      );
    }

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
      district,
      state, 
      pincode, 
      phone_number,
      email_id,
      gst_number,
      grade,
      preferred_transport_1,
      preferred_transport_2,
      default_discount,
      place_of_supply
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
            district: district || '',
            state: state || '',
            pincode: pincode || '',
            phone_number: phone_number || '',
            email_id: email_id || '',
            gst_number: gst_number || '',
            grade: grade || '',
            preferred_transport_1: preferred_transport_1 || null,
            preferred_transport_2: preferred_transport_2 || null,
            default_discount: default_discount || null,
            place_of_supply: place_of_supply || '',
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
      district,
      state, 
      pincode, 
      phone_number,
      email_id,
      gst_number,
      grade,
      preferred_transport_1,
      preferred_transport_2,
      default_discount
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
          district: district || '',
          state: state || '',
          pincode: pincode || '',
          phone_number: phone_number || '',
          email_id: email_id || '',
          gst_number: gst_number || '',
          grade: grade || '',
          preferred_transport_1: preferred_transport_1 || null,
          preferred_transport_2: preferred_transport_2 || null,
          default_discount: default_discount || null,
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

// POST /api/parties/bulk — import up to 500 parties at once
router.post('/bulk',
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { parties } = req.body;
    if (!Array.isArray(parties) || parties.length === 0) {
      throw new AppError('parties array is required', 400);
    }
    if (parties.length > 500) {
      throw new AppError('Maximum 500 parties per batch', 400);
    }

    const inserted = [];
    const updated  = [];
    const errors   = [];

    // Fetch existing names for duplicate detection (case-insensitive)
    const names = parties.map(p => (p.name || '').trim().toLowerCase()).filter(Boolean);
    const { data: existing } = await supabaseAdmin
      .from('parties')
      .select('id, name')
      .in('name', names);

    const existingMap = new Map(
      (existing ?? []).map(p => [p.name.toLowerCase(), p.id])
    );

    const toInsert = [];
    const toUpdate = [];

    for (let i = 0; i < parties.length; i++) {
      const p = parties[i];
      const name = (p.name || '').trim();
      if (!name) {
        errors.push({ row: i + 1, error: 'name is required', data: p });
        continue;
      }
      const row = {
        name,
        description:  p.description  || '',
        address:      p.address       || '',
        city:         p.city          || '',
        district:     p.district      || '',
        state:        p.state         || '',
        pincode:      p.pincode        || '',
        phone_number: p.phone_number  || p.phone || '',
        email_id:     p.email_id      || p.email || '',
        gst_number:   p.gst_number    || p.gst_no || '',
        grade:        p.grade         || '',
        place_of_supply: p.place_of_supply || '',
        created_by:   req.user.id,
      };
      const existingId = existingMap.get(name.toLowerCase());
      if (existingId) {
        toUpdate.push({ id: existingId, ...row });
      } else {
        toInsert.push(row);
      }
    }

    // Batch insert
    if (toInsert.length > 0) {
      const CHUNK = 100;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        const { data, error } = await supabaseAdmin
          .from('parties')
          .insert(chunk)
          .select('id');
        if (error) {
          chunk.forEach((r, idx) => errors.push({ row: i + idx + 1, error: error.message, data: r }));
        } else {
          inserted.push(...(data ?? []));
        }
      }
    }

    // Batch update
    for (const row of toUpdate) {
      const { id, ...fields } = row;
      const { error } = await supabaseAdmin
        .from('parties')
        .update(fields)
        .eq('id', id);
      if (error) {
        errors.push({ row: -1, error: error.message, data: row });
      } else {
        updated.push({ id });
      }
    }

    cache.delete('cache:/api/parties');
    cache.delete('cache:/api/orders/parties');

    res.json({
      success: true,
      inserted: inserted.length,
      updated:  updated.length,
      failed:   errors.length,
      errors,
    });
  })
);

export default router;