import express from 'express';
import { supabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery,
  cache
} from '../utils/index.js';

const router = express.Router();

// Get all party associations for a user
router.get('/user/:userId', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    validateUUID(userId, 'User ID');

    // Only admins or the user themselves can view associations
    if (req.profile.id !== userId && req.profile?.user_roles?.role_name !== 'Admin') {
      throw new AppError('Access denied', 403);
    }

    const associations = await executeQuery(
      supabaseAdmin
        .from('user_party_associations')
        .select('*, parties(id, party_id, name, city, state)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      'Failed to fetch party associations'
    );

    res.json({ associations });
  })
);

// Add party association for a user
router.post('/', 
  authenticateUser, 
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { user_id, party_id } = req.body;

    validateRequired(req.body, ['user_id', 'party_id']);
    validateUUID(user_id, 'User ID');
    validateUUID(party_id, 'Party ID');

    // Verify user exists
    const { data: user } = await supabaseAdmin
      .from('user_profiles')
      .select('id, user_roles(role_name)')
      .eq('id', user_id)
      .single();

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify party exists
    const { data: party } = await supabaseAdmin
      .from('parties')
      .select('id')
      .eq('id', party_id)
      .single();

    if (!party) {
      throw new AppError('Party not found', 404);
    }

    // Create association
    const association = await executeQuery(
      supabaseAdmin
        .from('user_party_associations')
        .insert([
          {
            user_id,
            party_id,
            created_by: req.user.id
          }
        ])
        .select('*, parties(id, party_id, name, city, state)')
        .single(),
      'Failed to create party association'
    );

    // Invalidate cache
    cache.delete(`user_parties:${user_id}`);

    res.status(201).json({
      message: 'Party association created successfully',
      association
    });
  })
);

// Add multiple party associations for a user
router.post('/bulk', 
  authenticateUser, 
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { user_id, party_ids } = req.body;

    validateRequired(req.body, ['user_id', 'party_ids']);
    validateUUID(user_id, 'User ID');

    if (!Array.isArray(party_ids) || party_ids.length === 0) {
      throw new AppError('party_ids must be a non-empty array', 400);
    }

    // Validate all party IDs
    party_ids.forEach(id => validateUUID(id, 'Party ID'));

    // Create associations
    const associationsData = party_ids.map(party_id => ({
      user_id,
      party_id,
      created_by: req.user.id
    }));

    const associations = await executeQuery(
      supabaseAdmin
        .from('user_party_associations')
        .insert(associationsData)
        .select('*, parties(id, party_id, name, city, state)'),
      'Failed to create party associations'
    );

    // Invalidate cache
    cache.delete(`user_parties:${user_id}`);

    res.status(201).json({
      message: `${associations.length} party association(s) created successfully`,
      associations
    });
  })
);

// Delete party association
router.delete('/:id', 
  authenticateUser, 
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Association ID');

    // Get association to invalidate cache
    const { data: association } = await supabaseAdmin
      .from('user_party_associations')
      .select('user_id')
      .eq('id', id)
      .single();

    await executeQuery(
      supabaseAdmin
        .from('user_party_associations')
        .delete()
        .eq('id', id),
      'Failed to delete party association'
    );

    // Invalidate cache
    if (association) {
      cache.delete(`user_parties:${association.user_id}`);
    }

    res.json({ message: 'Party association deleted successfully' });
  })
);

// Delete all associations for a user and party
router.delete('/user/:userId/party/:partyId', 
  authenticateUser, 
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { userId, partyId } = req.params;

    validateUUID(userId, 'User ID');
    validateUUID(partyId, 'Party ID');

    await executeQuery(
      supabaseAdmin
        .from('user_party_associations')
        .delete()
        .eq('user_id', userId)
        .eq('party_id', partyId),
      'Failed to delete party association'
    );

    // Invalidate cache
    cache.delete(`user_parties:${userId}`);

    res.json({ message: 'Party association deleted successfully' });
  })
);

export default router;
