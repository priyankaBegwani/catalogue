import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired, 
  validateEmail, 
  validateRole,
  validateUUID,
  executeQuery,
  getOneOrFail,
  cacheMiddleware,
  cache
} from '../utils/index.js';

const router = express.Router();

router.get('/', 
  authenticateUser, 
  requireAdmin, 
  cacheMiddleware(300), // Cache for 5 minutes
  asyncHandler(async (req, res) => {
    const users = await executeQuery(
      supabase
        .from('user_profiles')
        .select('*, parties!user_profiles_party_id_fkey(name)')
        .order('created_at', { ascending: false }),
      'Failed to fetch users'
    );

    res.json(users);
  })
);

router.post('/', 
  authenticateUser, 
  requireAdmin, 
  asyncHandler(async (req, res) => {
    const { email, password, full_name, role, party_id } = req.body;

    // Validate required fields
    validateRequired(req.body, ['email', 'password', 'full_name', 'role']);
    validateEmail(email);
    validateRole(role);

    // Business logic validation
    if (role === 'retailer' && !party_id) {
      throw new AppError('Party is required for retailer users', 400);
    }

    if (role === 'admin' && party_id) {
      throw new AppError('Admin users cannot be associated with a party', 400);
    }

    // Create user in auth system
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        party_id: party_id || null
      }
    });

    if (authError) {
      throw new AppError(authError.message, 400);
    }

    // Get created profile
    const profile = await getOneOrFail(
      supabaseAdmin
        .from('user_profiles')
        .select('*, parties!user_profiles_party_id_fkey(name)')
        .eq('id', authData.user.id),
      'User profile not found after creation'
    ).catch(async (error) => {
      // Rollback: delete auth user if profile fetch fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw error;
    });

    // Invalidate users cache
    cache.delete('cache:/api/users');

    res.status(201).json(profile);
  })
);

router.patch('/:id', 
  authenticateUser, 
  requireAdmin, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { full_name, is_active, party_id } = req.body;

    validateUUID(id, 'User ID');

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (is_active !== undefined) updates.is_active = is_active;
    if (party_id !== undefined) updates.party_id = party_id;

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updates.updated_at = new Date().toISOString();

    const profile = await executeQuery(
      supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      'Failed to update user'
    );

    // Invalidate caches
    cache.delete('cache:/api/users');
    cache.delete(`user_profile:${id}`);

    res.json(profile);
  })
);

router.delete('/:id', 
  authenticateUser, 
  requireAdmin, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'User ID');

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    // Check if user exists
    const userProfile = await getOneOrFail(
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id),
      'User not found'
    );

    // Delete user from authentication system
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authDeleteError) {
      throw new AppError(authDeleteError.message, 400);
    }

    // Verify deletion from user_profiles
    const { data: deletedProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // If profile still exists, manually delete it
    if (deletedProfile) {
      await executeQuery(
        supabase
          .from('user_profiles')
          .delete()
          .eq('id', id),
        'User deleted from auth but profile cleanup failed'
      );
    }

    // Invalidate caches
    cache.delete('cache:/api/users');
    cache.delete(`user_profile:${id}`);

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name
      }
    });
  })
);

// GET /api/users/login-history - Get recent login history
router.get('/login-history', 
  authenticateUser, 
  requireAdmin, 
  cacheMiddleware(60), // Cache for 1 minute
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100

    const loginHistory = await executeQuery(
      supabase
        .from('login_history')
        .select(`
          id,
          user_id,
          login_time,
          logout_time,
          ip_address,
          user_agent,
          status,
          user_profiles!login_history_user_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .order('login_time', { ascending: false })
        .limit(limit),
      'Failed to fetch login history'
    );

    // Format the response
    const formattedHistory = loginHistory.map(record => ({
      id: record.id,
      user_id: record.user_id,
      login_time: record.login_time,
      logout_time: record.logout_time,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      status: record.status,
      user: record.user_profiles ? {
        id: record.user_profiles.id,
        email: record.user_profiles.email,
        full_name: record.user_profiles.full_name,
        role: record.user_profiles.role
      } : null
    }));

    res.json(formattedHistory);
  })
);

// GET /api/users/inactive - Get inactive users
router.get('/inactive', 
  authenticateUser, 
  requireAdmin, 
  cacheMiddleware(600), // Cache for 10 minutes
  asyncHandler(async (req, res) => {
    const days = Math.max(parseInt(req.query.days) || 30, 1); // Min 1 day
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const users = await executeQuery(
      supabase
        .from('user_profiles')
        .select('*, parties!user_profiles_party_id_fkey(name)')
        .or(`last_login_at.is.null,last_login_at.lt.${cutoffDate.toISOString()}`)
        .order('last_login_at', { ascending: true, nullsFirst: false }),
      'Failed to fetch inactive users'
    );

    res.json(users);
  })
);

export default router;
