import express from 'express';
import { config, supabase, supabaseAdmin } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'retailer', party_id } = req.body;

    if (!email || !password || !full_name || !username) {
      return res.status(400).json({ error: 'Username, email, password, and full name are required' });
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

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name,
        role,
        party_id: party_id || null
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update user_profiles with username and email for login lookup
    await supabaseAdmin
      .from('user_profiles')
      .update({ 
        username: username,
        email: email 
      })
      .eq('id', data.user.id);

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
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    // Check if input is email or username
    const isEmail = email.includes('@');
    let loginEmail = email;

    // If username provided, look up the email
    if (!isEmail) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('username', email)
        .maybeSingle();

      if (profileError || !profile) {
        // Record failed login attempt
        await supabase
          .from('login_history')
          .insert({
            user_id: null,
            login_time: new Date().toISOString(),
            ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            status: 'failed'
          });
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      loginEmail = profile.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });
  console.log(" error while login >>>", error);
    if (error) {
      // Record failed login attempt
      await supabase
        .from('login_history')
        .insert({
          user_id: null,
          login_time: new Date().toISOString(),
          ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'],
          status: 'failed'
        });
      
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

    // Update last_login_at in user_profiles
    await supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    // Record successful login in login_history
    await supabase
      .from('login_history')
      .insert({
        user_id: data.user.id,
        login_time: new Date().toISOString(),
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        status: 'success'
      });

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

    // Update the most recent login record with logout time
    await supabase
      .from('login_history')
      .update({ logout_time: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('logout_time', null)
      .order('login_time', { ascending: false })
      .limit(1);

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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, is_active')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      return res.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    const rawFrontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
    const normalizedFrontendUrl = rawFrontendUrl.replace(/\/+$/, '');
    const frontendUrlWithScheme = /^https?:\/\//i.test(normalizedFrontendUrl)
      ? normalizedFrontendUrl
      : `https://${normalizedFrontendUrl}`;

    let redirectTo;
    try {
      redirectTo = new URL('/reset-password', frontendUrlWithScheme).toString();
    } catch (e) {
      console.error('Invalid FRONTEND_URL for password reset redirect:', rawFrontendUrl, e);
      return res.status(500).json({ error: 'Password reset is not configured correctly' });
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    res.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { access_token, password } = req.body;

    if (!access_token || !password) {
      return res.status(400).json({ error: 'Access token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('Missing Supabase config (supabaseUrl/supabaseAnonKey) for reset-password');
      return res.status(500).json({ error: 'Password reset is not configured correctly' });
    }

    // Create a Supabase client with the user's access token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    });

    const { data, error } = await userSupabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error('Reset password error:', error);
      return res.status(400).json({ error: error.message || 'Invalid or expired reset token' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/verify-reset-token', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('Missing Supabase config (supabaseUrl/supabaseAnonKey) for verify-reset-token');
      return res.status(500).json({ error: 'Password reset is not configured correctly' });
    }

    // Create a Supabase client with the user's access token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    });

    const { data, error } = await userSupabase.auth.getUser();

    if (error || !data.user) {
      return res.status(400).json({ error: error?.message || 'Invalid or expired token' });
    }

    res.json({ valid: true, email: data.user.email });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

export default router;
