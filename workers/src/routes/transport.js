import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const transport = new Hono();

// Get all transport options
transport.get('/', authenticateUser, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: transportOptions, error } = await supabase
      .from('transport_options')
      .select('*')
      .order('name');

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(transportOptions);
  } catch (error) {
    console.error('Get transport options error:', error);
    return c.json({ error: 'Failed to fetch transport options' }, 500);
  }
});

// Create transport option (admin only)
transport.post('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const transportData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: transportOption, error } = await supabase
      .from('transport_options')
      .insert(transportData)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(transportOption, 201);
  } catch (error) {
    console.error('Create transport option error:', error);
    return c.json({ error: 'Failed to create transport option' }, 500);
  }
});

// Update transport option (admin only)
transport.put('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const updateData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: transportOption, error } = await supabase
      .from('transport_options')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(transportOption);
  } catch (error) {
    console.error('Update transport option error:', error);
    return c.json({ error: 'Failed to update transport option' }, 500);
  }
});

// Delete transport option (admin only)
transport.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('transport_options')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Transport option deleted successfully' });
  } catch (error) {
    console.error('Delete transport option error:', error);
    return c.json({ error: 'Failed to delete transport option' }, 500);
  }
});

export default transport;
