import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const locations = new Hono();

// Get all locations
locations.get('/', authenticateUser, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    return c.json({ error: 'Failed to fetch locations' }, 500);
  }
});

// Create location (admin only)
locations.post('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const locationData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: location, error } = await supabase
      .from('locations')
      .insert(locationData)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(location, 201);
  } catch (error) {
    console.error('Create location error:', error);
    return c.json({ error: 'Failed to create location' }, 500);
  }
});

// Update location (admin only)
locations.put('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const updateData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: location, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// Delete location (admin only)
locations.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    return c.json({ error: 'Failed to delete location' }, 500);
  }
});

export default locations;
