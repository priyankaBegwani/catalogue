import { Hono } from 'hono';
import { getSupabaseWithAuth } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const orders = new Hono();

// Get all orders (admin) or user's orders
orders.get('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const profile = c.get('profile');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          design_colors(
            *,
            designs(*)
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Non-admin users can only see their own orders
    if (profile.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    const { data: orders, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// Get order by ID
orders.get('/:id', authenticateUser, async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const profile = c.get('profile');
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          design_colors(
            *,
            designs(*)
          )
        )
      `)
      .eq('id', id);

    // Non-admin users can only see their own orders
    if (profile.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    return c.json({ error: 'Failed to fetch order' }, 500);
  }
});

// Create order
orders.post('/', authenticateUser, async (c) => {
  try {
    const user = c.get('user');
    const { items, shipping_address, transport_option_id, notes } = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    if (!items || items.length === 0) {
      return c.json({ error: 'Order must contain at least one item' }, 400);
    }

    // Calculate total
    let total = 0;
    for (const item of items) {
      total += item.price * item.quantity;
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: total,
        shipping_address,
        transport_option_id: transport_option_id || null,
        notes: notes || '',
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      return c.json({ error: orderError.message }, 400);
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      design_color_id: item.design_color_id,
      quantity: item.quantity,
      size: item.size || null,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      return c.json({ error: itemsError.message }, 400);
    }

    return c.json(order, 201);
  } catch (error) {
    console.error('Create order error:', error);
    return c.json({ error: 'Failed to create order' }, 500);
  }
});

// Update order status (admin only)
orders.patch('/:id/status', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const { status } = await c.req.json();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    return c.json({ error: 'Failed to update order status' }, 500);
  }
});

// Delete order (admin only)
orders.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseWithAuth(c.env, token);

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    return c.json({ error: 'Failed to delete order' }, 500);
  }
});

export default orders;
