import { Hono } from 'hono';
import { getSupabaseWithAuth, getSupabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const users = new Hono();

// Get all users (admin only)
users.get('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);
    
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Get user by ID
users.get('/:id', authenticateUser, async (c) => {
  try {
    const { id } = c.req.param();
    const profile = c.get('profile');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    // Users can only view their own profile unless they're admin
    if (profile.role !== 'admin' && profile.id !== id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// Update user
users.put('/:id', authenticateUser, async (c) => {
  try {
    const { id } = c.req.param();
    const profile = c.get('profile');
    const updateData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    // Users can only update their own profile unless they're admin
    if (profile.role !== 'admin' && profile.id !== id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Prevent non-admins from changing role or party_id
    if (profile.role !== 'admin') {
      delete updateData.role;
      delete updateData.party_id;
      delete updateData.is_active;
    }

    const { data: user, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Delete user (admin only)
users.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// Toggle user active status (admin only)
users.patch('/:id/toggle-active', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    // Get current status
    const { data: user } = await supabase
      .from('user_profiles')
      .select('is_active')
      .eq('id', id)
      .single();

    // Toggle status
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({ is_active: !user.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(updatedUser);
  } catch (error) {
    console.error('Toggle active error:', error);
    return c.json({ error: 'Failed to toggle user status' }, 500);
  }
});

// Change password
users.post('/:id/change-password', authenticateUser, async (c) => {
  try {
    const { id } = c.req.param();
    const profile = c.get('profile');
    const { currentPassword, newPassword } = await c.req.json();

    // Users can only change their own password unless they're admin
    if (profile.role !== 'admin' && profile.id !== id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: 'New password must be at least 6 characters' }, 400);
    }

    const supabaseAdmin = getSupabaseAdmin(c.env);

    // Admin can change any password without current password
    if (profile.role === 'admin') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: newPassword
      });

      if (error) {
        return c.json({ error: error.message }, 400);
      }

      return c.json({ message: 'Password changed successfully' });
    }

    // Regular users must provide current password
    if (!currentPassword) {
      return c.json({ error: 'Current password is required' }, 400);
    }

    // Verify current password by attempting to sign in
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('id', id)
      .single();

    const supabase = getSupabase(c.env);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: currentPassword
    });

    if (signInError) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Update password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

export default users;
