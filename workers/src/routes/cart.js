import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const cart = new Hono();

// Get user's cart
cart.get('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        design_colors(
          *,
          designs(*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(cartItems);
  } catch (error) {
    console.error('Get cart error:', error);
    return c.json({ error: 'Failed to fetch cart' }, 500);
  }
});

// Add item to cart
cart.post('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const { design_color_id, quantity, size } = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    if (!design_color_id || !quantity) {
      return c.json({ error: 'Design color and quantity are required' }, 400);
    }

    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .insert({
        user_id: user.id,
        design_color_id,
        quantity,
        size: size || null
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(cartItem, 201);
  } catch (error) {
    console.error('Add to cart error:', error);
    return c.json({ error: 'Failed to add to cart' }, 500);
  }
});

// Update cart item
cart.put('/:id', authenticateUser, async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const { quantity, size } = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const updateData = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (size !== undefined) updateData.size = size;

    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(cartItem);
  } catch (error) {
    console.error('Update cart error:', error);
    return c.json({ error: 'Failed to update cart item' }, 500);
  }
});

// Delete cart item
cart.delete('/:id', authenticateUser, async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Delete cart item error:', error);
    return c.json({ error: 'Failed to remove item from cart' }, 500);
  }
});

// Clear cart
cart.delete('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    return c.json({ error: 'Failed to clear cart' }, 500);
  }
});

export default cart;
