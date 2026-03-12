import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const admin = new Hono();

// Get dashboard stats
admin.get('/stats', authenticateUser, requireAdmin, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    // Get counts
    const [
      { count: usersCount },
      { count: designsCount },
      { count: ordersCount },
      { count: partiesCount }
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('designs').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('parties').select('*', { count: 'exact', head: true })
    ]);

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return c.json({
      users: usersCount || 0,
      designs: designsCount || 0,
      orders: ordersCount || 0,
      parties: partiesCount || 0,
      recentOrders: recentOrders || []
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// Get all categories (admin)
admin.get('/categories', authenticateUser, requireAdmin, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: categories, error } = await supabase
      .from('design_categories')
      .select('*')
      .order('name');

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// Create category
admin.post('/categories', authenticateUser, requireAdmin, async (c) => {
  try {
    const categoryData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: category, error } = await supabase
      .from('design_categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(category, 201);
  } catch (error) {
    console.error('Create category error:', error);
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// Update category
admin.put('/categories/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const updateData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: category, error } = await supabase
      .from('design_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ error: 'Failed to update category' }, 500);
  }
});

// Delete category
admin.delete('/categories/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('design_categories')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

// Similar CRUD operations for styles and fabric types
admin.get('/styles', authenticateUser, requireAdmin, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: styles, error } = await supabase
      .from('design_styles')
      .select('*, design_categories(name)')
      .order('name');

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(styles);
  } catch (error) {
    console.error('Get styles error:', error);
    return c.json({ error: 'Failed to fetch styles' }, 500);
  }
});

admin.post('/styles', authenticateUser, requireAdmin, async (c) => {
  try {
    const styleData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: style, error } = await supabase
      .from('design_styles')
      .insert(styleData)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(style, 201);
  } catch (error) {
    console.error('Create style error:', error);
    return c.json({ error: 'Failed to create style' }, 500);
  }
});

admin.get('/fabric-types', authenticateUser, requireAdmin, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: fabricTypes, error } = await supabase
      .from('fabric_types')
      .select('*')
      .order('name');

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(fabricTypes);
  } catch (error) {
    console.error('Get fabric types error:', error);
    return c.json({ error: 'Failed to fetch fabric types' }, 500);
  }
});

admin.post('/fabric-types', authenticateUser, requireAdmin, async (c) => {
  try {
    const fabricTypeData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: fabricType, error } = await supabase
      .from('fabric_types')
      .insert(fabricTypeData)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(fabricType, 201);
  } catch (error) {
    console.error('Create fabric type error:', error);
    return c.json({ error: 'Failed to create fabric type' }, 500);
  }
});

export default admin;
