import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const wishlist = new Hono();

// Get user's wishlist
wishlist.get('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: wishlistItems, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        designs(
          *,
          design_colors(*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(wishlistItems);
  } catch (error) {
    console.error('Get wishlist error:', error);
    return c.json({ error: 'Failed to fetch wishlist' }, 500);
  }
});

// Add item to wishlist
wishlist.post('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const { design_id } = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    if (!design_id) {
      return c.json({ error: 'Design ID is required' }, 400);
    }

    const { data: wishlistItem, error } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: user.id,
        design_id
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(wishlistItem, 201);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return c.json({ error: 'Failed to add to wishlist' }, 500);
  }
});

// Remove item from wishlist
wishlist.delete('/:id', authenticateUser, async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Delete wishlist item error:', error);
    return c.json({ error: 'Failed to remove item from wishlist' }, 500);
  }
});

export default wishlist;
