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

export default router;
