import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*, parties!user_profiles_party_id_fkey(name)')
      .order('created_at', { ascending: false });
   console.log(" users ::::",users);
     console.log(" error ::::",error);
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role, party_id } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['admin', 'retailer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (role === 'retailer' && !party_id) {
      return res.status(400).json({ error: 'Party is required for retailer users' });
    }

    if (role === 'admin' && party_id) {
      return res.status(400).json({ error: 'Admin users cannot be associated with a party' });
    }

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
    console.log(" authError ::::",authError);
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    console.log(" authData ::::",authData);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*, parties!user_profiles_party_id_fkey(name)')
      .eq('id', authData.user.id)
      .maybeSingle();
    console.log(" profileError ::::",profileError);
    console.log(" profile ::::",profile);
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: profileError.message });
    }

    res.status(201).json(profile);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, is_active, party_id } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (is_active !== undefined) updates.is_active = is_active;
    if (party_id !== undefined) updates.party_id = party_id;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(profile);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const { data: userProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message });
    }

    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user from authentication system (this will cascade to user_profiles via trigger)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authDeleteError) {
      console.error('Auth delete error:', authDeleteError);
      return res.status(400).json({ error: authDeleteError.message });
    }

    // Verify deletion from user_profiles
    const { data: deletedProfile, error: profileDeleteError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // If profile still exists, manually delete it
    if (deletedProfile) {
      const { error: manualDeleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (manualDeleteError) {
        console.error('Manual profile delete error:', manualDeleteError);
        return res.status(400).json({ error: 'User deleted from auth but profile cleanup failed' });
      }
    }

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
