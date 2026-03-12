import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { getConfig, getSupabase, getSupabaseAdmin } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const auth = new Hono();

auth.post('/signup', async (c) => {
  try {
    const { username, email, password, full_name, role = 'retailer', party_id } = await c.req.json();

    if (!email || !password || !full_name || !username) {
      return c.json({ error: 'Username, email, password, and full name are required' }, 400);
    }

    if (!['admin', 'retailer'].includes(role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }

    if (role === 'retailer' && !party_id) {
      return c.json({ error: 'Party is required for retailer users' }, 400);
    }

    if (role === 'admin' && party_id) {
      return c.json({ error: 'Admin users cannot be associated with a party' }, 400);
    }

    const supabaseAdmin = getSupabaseAdmin(c.env);

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return c.json({ error: 'Username already exists' }, 400);
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
      return c.json({ error: error.message }, 400);
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

    return c.json({
      user: data.user,
      session: null,
      profile
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Username/Email and password are required' }, 400);
    }

    const supabase = getSupabase(c.env);
    const req = c.req;

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
            ip_address: req.header('cf-connecting-ip') || req.header('x-forwarded-for') || '',
            user_agent: req.header('user-agent'),
            status: 'failed'
          });
        return c.json({ error: 'Invalid username or password' }, 401);
      }

      loginEmail = profile.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });

    if (error) {
      // Record failed login attempt
      await supabase
        .from('login_history')
        .insert({
          user_id: null,
          login_time: new Date().toISOString(),
          ip_address: req.header('cf-connecting-ip') || req.header('x-forwarded-for') || '',
          user_agent: req.header('user-agent'),
          status: 'failed'
        });
      
      return c.json({ error: error.message }, 401);
    }

    let { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile.is_active) {
      return c.json({ error: 'User account is inactive' }, 403);
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
        ip_address: req.header('cf-connecting-ip') || req.header('x-forwarded-for') || '',
        user_agent: req.header('user-agent'),
        status: 'success'
      });

    return c.json({
      user: data.user,
      session: data.session,
      profile
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

auth.post('/logout', authenticateUser, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const user = c.get('user');
    const supabase = getSupabase(c.env);

    // Update the most recent login record with logout time
    await supabase
      .from('login_history')
      .update({ logout_time: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('logout_time', null)
      .order('login_time', { ascending: false })
      .limit(1);

    await supabase.auth.admin.signOut(token);

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

auth.get('/me', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const profile = c.get('profile');

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        party_id: profile.party_id,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user info' }, 500);
  }
});

auth.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const supabaseAdmin = getSupabaseAdmin(c.env);
    const supabase = getSupabase(c.env);

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, is_active')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      return c.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    if (!profile.is_active) {
      return c.json({ error: 'User account is inactive' }, 403);
    }

    const rawFrontendUrl = (c.env.FRONTEND_URL || 'http://localhost:5173').trim();
    const normalizedFrontendUrl = rawFrontendUrl.replace(/\/+$/, '');
    const frontendUrlWithScheme = /^https?:\/\//i.test(normalizedFrontendUrl)
      ? normalizedFrontendUrl
      : `https://${normalizedFrontendUrl}`;

    let redirectTo;
    try {
      redirectTo = new URL('/reset-password', frontendUrlWithScheme).toString();
    } catch (e) {
      console.error('Invalid FRONTEND_URL for password reset redirect:', rawFrontendUrl, e);
      return c.json({ error: 'Password reset is not configured correctly' }, 500);
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      console.error('Password reset error:', error);
      return c.json({ error: 'Failed to send reset email' }, 500);
    }

    return c.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'Failed to process password reset request' }, 500);
  }
});

auth.post('/reset-password', async (c) => {
  try {
    const { access_token, password } = await c.req.json();

    if (!access_token || !password) {
      return c.json({ error: 'Access token and new password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    const config = getConfig(c.env);

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('Missing Supabase config (supabaseUrl/supabaseAnonKey) for reset-password');
      return c.json({ error: 'Password reset is not configured correctly' }, 500);
    }

    // Create a Supabase client with the user's access token
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
      return c.json({ error: error.message || 'Invalid or expired reset token' }, 400);
    }

    return c.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'Failed to reset password' }, 500);
  }
});

auth.post('/verify-reset-token', async (c) => {
  try {
    const { access_token } = await c.req.json();

    if (!access_token) {
      return c.json({ error: 'Access token is required' }, 400);
    }

    const config = getConfig(c.env);

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error('Missing Supabase config (supabaseUrl/supabaseAnonKey) for verify-reset-token');
      return c.json({ error: 'Password reset is not configured correctly' }, 500);
    }

    // Create a Supabase client with the user's access token
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
      return c.json({ error: error?.message || 'Invalid or expired token' }, 400);
    }

    return c.json({ valid: true, email: data.user.email });
  } catch (error) {
    console.error('Verify token error:', error);
    return c.json({ error: 'Failed to verify token' }, 500);
  }
});

export default auth;
