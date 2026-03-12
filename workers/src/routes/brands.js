import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser, optionalAuth, requireAdmin } from '../middleware/auth.js';

const brands = new Hono();

// Get all brands
brands.get('/', optionalAuth, async (c) => {
  try {
    const { getSupabaseAdmin } = await import('../config.js');
    const supabase = getSupabaseAdmin(c.env);

    const { data: brands, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Brands error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(brands || []);
  } catch (error) {
    console.error('Get brands error:', error);
    return c.json({ error: 'Failed to fetch brands' }, 500);
  }
});

// Get brand by ID
brands.get('/:id', optionalAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const supabase = getSupabase(c.env);

    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !brand) {
      return c.json({ error: 'Brand not found' }, 404);
    }

    return c.json(brand);
  } catch (error) {
    console.error('Get brand error:', error);
    return c.json({ error: 'Failed to fetch brand' }, 500);
  }
});

// Create brand (admin only)
brands.post('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const brandData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: brand, error } = await supabase
      .from('brands')
      .insert(brandData)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(brand, 201);
  } catch (error) {
    console.error('Create brand error:', error);
    return c.json({ error: 'Failed to create brand' }, 500);
  }
});

// Update brand (admin only)
brands.put('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const updateData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: brand, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(brand);
  } catch (error) {
    console.error('Update brand error:', error);
    return c.json({ error: 'Failed to update brand' }, 500);
  }
});

// Delete brand (admin only)
brands.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Delete brand error:', error);
    return c.json({ error: 'Failed to delete brand' }, 500);
  }
});

export default brands;
