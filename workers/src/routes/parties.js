import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const parties = new Hono();

// Get all parties
parties.get('/', authenticateUser, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: parties, error } = await supabase
      .from('parties')
      .select('*')
      .order('name');

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(parties);
  } catch (error) {
    console.error('Get parties error:', error);
    return c.json({ error: 'Failed to fetch parties' }, 500);
  }
});

// Create party (admin only)
parties.post('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const partyData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: party, error } = await supabase
      .from('parties')
      .insert(partyData)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(party, 201);
  } catch (error) {
    console.error('Create party error:', error);
    return c.json({ error: 'Failed to create party' }, 500);
  }
});

// Update party (admin only)
parties.put('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const updateData = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: party, error } = await supabase
      .from('parties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(party);
  } catch (error) {
    console.error('Update party error:', error);
    return c.json({ error: 'Failed to update party' }, 500);
  }
});

// Delete party (admin only)
parties.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('parties')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Party deleted successfully' });
  } catch (error) {
    console.error('Delete party error:', error);
    return c.json({ error: 'Failed to delete party' }, 500);
  }
});

export default parties;
