import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name, role = 'retailer', party_id } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
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

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        party_id: party_id || null
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    res.status(201).json({
      user: data.user,
      session: null,
      profile
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
  console.log(" error while login >>>", error);
    if (error) {
      return res.status(401).json({ error: error.message });
    }

    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }
 console.log(" error while login in userprofile >>>", profileError);
    res.json({
      user: data.user,
      session: data.session,
      profile
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', authenticateUser, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.replace('Bearer ', '');

    await supabase.auth.admin.signOut(token);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', authenticateUser, async (req, res) => {
  try {
    // Return real user data from the authenticated session
    // req.user and req.profile are set by the authenticateUser middleware
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        created_at: req.user.created_at
      },
      profile: {
        id: req.profile.id,
        email: req.profile.email,
        full_name: req.profile.full_name,
        role: req.profile.role,
        party_id: req.profile.party_id,
        is_active: req.profile.is_active,
        created_at: req.profile.created_at,
        updated_at: req.profile.updated_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
