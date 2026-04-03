import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery,
  cacheMiddleware
} from '../utils/index.js';

const router = express.Router();

// Shared select query for fetching complete orders
const ORDER_SELECT = `
  *,
  order_items (
    id,
    design_number,
    color,
    sizes_quantities
  ),
  order_remarks (
    id,
    remark,
    created_at
  )
`;

/**
 * Validate and filter order items + remarks.
 * Returns { validItems, hasValidRemarks }.
 * Throws AppError(400) when neither items nor remarks are present.
 */
function validateOrderPayload({ party_name, order_items, order_remarks }) {
  const hasValidRemarks = Array.isArray(order_remarks) &&
    order_remarks.some(r => r && String(r).trim().length > 0);

  let validItems = [];
  if (Array.isArray(order_items) && order_items.length > 0) {
    validItems = order_items.filter(item =>
      item.design_number && item.color &&
      Array.isArray(item.sizes_quantities) && item.sizes_quantities.length > 0
    );
    for (const item of validItems) {
      for (const sq of item.sizes_quantities) {
        if (!sq.size || !sq.quantity || sq.quantity <= 0) {
          throw new AppError('Each size must have a valid quantity greater than 0', 400);
        }
      }
    }
  }

  if (!party_name || (validItems.length === 0 && !hasValidRemarks)) {
    throw new AppError('Party name and either order items or order remarks are required', 400);
  }

  return { validItems, hasValidRemarks };
}

/**
 * Insert order remarks (non-critical — logs errors but does not throw).
 */
async function insertOrderRemarks(orderId, order_remarks) {
  if (!Array.isArray(order_remarks)) return;
  const remarksToCreate = order_remarks
    .filter(r => r && String(r).trim())
    .map(r => ({ order_id: orderId, remark: String(r).trim() }));
  if (remarksToCreate.length === 0) return;

  const { error } = await supabase.from('order_remarks').insert(remarksToCreate);
  if (error) console.error('Order remarks creation error:', error);
}

/**
 * Fetch the complete order with items + remarks.
 */
async function fetchCompleteOrder(orderId) {
  const { data } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .single();
  return data;
}

// Get transport options for dropdown
router.get('/transport', 
  authenticateUser, 
  cacheMiddleware(600), // Cache for 10 minutes
  asyncHandler(async (req, res) => {
    const transportOptions = await executeQuery(
      supabase
        .from('transport')
        .select('*')
        .order('transport_name'),
      'Failed to fetch transport options'
    );

    res.json({ transportOptions });
  })
);

// Get parties for dropdown
router.get('/parties', 
  authenticateUser, 
  cacheMiddleware(600), // Cache for 10 minutes
  asyncHandler(async (req, res) => {
    const parties = await executeQuery(
      supabase
        .from('parties')
        .select('id, party_id, name')
        .order('name'),
      'Failed to fetch parties'
    );

    res.json({ parties });
  })
);

// Get designs for dropdown
router.get('/designs', 
  authenticateUser, 
  cacheMiddleware(300), // Cache for 5 minutes
  asyncHandler(async (req, res) => {
    const designsData = await executeQuery(
      supabase
        .from('designs')
        .select(`
          design_number,
          itemtype!designs_item_type_id_fkey(itemtype),
          colors!designs_color_id_fkey(id, color_name, primary_color)
        `)
        .order('design_number'),
      'Failed to fetch designs'
    );

    // Group designs by design_number with their available colors
    const groupedDesigns = designsData.reduce((acc, design) => {
      const key = design.design_number;
      if (!acc[key]) {
        acc[key] = {
          design_number: design.design_number,
          item_type: design.itemtype?.itemtype,
          colors: []
        };
      }
      if (design.colors && !acc[key].colors.find(c => c.id === design.colors.id)) {
        acc[key].colors.push(design.colors);
      }
      return acc;
    }, {});

    const designsList = Object.values(groupedDesigns);
    res.json({ designs: designsList });
  })
);

// Get orders with order items (role-based access)
router.get('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    let query = supabase.from('orders').select(ORDER_SELECT);

    if (req.profile?.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const orders = await executeQuery(
      query.order('created_at', { ascending: false }),
      'Failed to fetch orders'
    );

    res.json({ orders });
  })
);

// Get single order with items
router.get('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateUUID(id, 'Order ID');
    
    let query = supabase.from('orders').select(ORDER_SELECT).eq('id', id);

    if (req.profile?.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const order = await executeQuery(query.single(), 'Order not found');
    res.json(order);
  })
);

// Checkout - Create order from cart items
router.post('/checkout', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { 
      party_name, 
      expected_delivery_date,
      transport,
      remarks,
      discount_tier,
      discount_percentage
    } = req.body;

    validateRequired(req.body, ['party_name']);

    // Get user's cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        design:designs!cart_items_design_id_fkey (
          design_no
        ),
        color:design_colors!cart_items_color_id_fkey (
          color_name
        ),
        size_set:size_sets!cart_items_size_set_id_fkey (
          id,
          name,
          sizes
        )
      `)
      .eq('user_id', req.user.id);

    if (cartError) {
      throw new AppError('Failed to fetch cart items', 500, { dbError: cartError.message });
    }

    if (!cartItems || cartItems.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    // Generate order number (ORD-YYYYMMDD-XXXXX)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const order_number = `ORD-${dateStr}-${randomNum}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number,
          user_id: req.user.id,
          party_name,
          date_of_order: new Date().toISOString().split('T')[0],
          expected_delivery_date: expected_delivery_date || null,
          transport: transport || '',
          remarks: remarks || '',
          discount_tier: discount_tier || null,
          discount_percentage: discount_percentage || null,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // Transform cart items to order items.
    // We preserve what the user ordered by tracking:
    // - Whether items came from size sets or individual sizes
    // - The size set name if applicable
    // - All sizes and quantities
    // We group by design_number + color + size_set_name to keep set orders separate from individual orders
    const grouped = new Map();

    for (const item of cartItems) {
      const design_number = item.design?.design_no || '';
      const color = item.color?.color_name || '';
      const is_from_size_set = item.is_set_order || false;
      const size_set_name = is_from_size_set ? (item.size_set?.name || '') : '';
      
      // Group by design + color + size_set_name to keep set orders separate
      const key = `${design_number}__${color}__${size_set_name}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          order_id: order.id,
          design_number,
          color,
          is_from_size_set,
          size_set_name,
          sizes_quantities: []
        });
      }

      const group = grouped.get(key);

      const rowQty = Number(item.quantity) || 0;
      if (rowQty <= 0) continue;

      if (item.is_set_order) {
        const sizes = Array.isArray(item.size_set?.sizes) ? item.size_set.sizes : [];
        for (const size of sizes) {
          if (!size) continue;
          group.sizes_quantities.push({ size, quantity: rowQty });
        }
      } else {
        const size = item.size || '';
        if (size) {
          group.sizes_quantities.push({ size, quantity: rowQty });
        }
      }
    }

    // Merge duplicate sizes within a grouped item
    const orderItemsData = Array.from(grouped.values()).map(group => {
      const merged = new Map();
      for (const sq of group.sizes_quantities) {
        const prev = merged.get(sq.size) || 0;
        merged.set(sq.size, prev + (Number(sq.quantity) || 0));
      }
      return {
        order_id: group.order_id,
        design_number: group.design_number,
        color: group.color,
        // TODO: Uncomment these fields after applying migration 20260310000003_add_size_set_info_to_order_items.sql
        // is_from_size_set: group.is_from_size_set,
        // size_set_name: group.size_set_name || null,
        sizes_quantities: Array.from(merged.entries())
          .filter(([, qty]) => qty > 0)
          .map(([size, quantity]) => ({ size, quantity }))
      };
    });

    // Create order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData)
      .select();

    if (itemsError) {
      // Rollback order creation
      await supabase.from('orders').delete().eq('id', order.id);
      throw new AppError('Failed to create order items', 500, { dbError: itemsError.message });
    }

    // Clear user's cart after successful order creation
    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id);

    if (clearCartError) {
      console.error('Cart clear error:', clearCartError);
      // Don't fail the order creation if cart clearing fails
    }

    const completeOrder = await fetchCompleteOrder(order.id);

    res.status(201).json({
      message: 'Order created successfully from cart',
      order: completeOrder || {
        ...order,
        order_items: items
      }
    });
  })
);

// Create new order with items
router.post('/', authenticateUser, asyncHandler(async (req, res) => {
  const { party_name, date_of_order, expected_delivery_date, transport, remarks, order_items, order_remarks } = req.body;

  const { validItems } = validateOrderPayload({ party_name, order_items, order_remarks });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: req.user.id,
      party_name,
      date_of_order: date_of_order || new Date().toISOString().split('T')[0],
      expected_delivery_date: expected_delivery_date || null,
      transport: transport || '',
      remarks: remarks || ''
    }])
    .select()
    .single();

  if (orderError) {
    throw new AppError('Failed to create order', 500, { dbError: orderError.message });
  }

  let createdItems = [];

  if (validItems.length > 0) {
    const orderItemsData = validItems.map(item => ({
      order_id: order.id,
      design_number: item.design_number,
      color: item.color,
      sizes_quantities: item.sizes_quantities
    }));

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData)
      .select();

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      throw new AppError('Failed to create order items', 500, { dbError: itemsError.message });
    }
    createdItems = items || [];
  }

  await insertOrderRemarks(order.id, order_remarks);

  const completeOrder = await fetchCompleteOrder(order.id);

  res.status(201).json({
    message: 'Order created successfully',
    order: completeOrder || { ...order, order_items: createdItems }
  });
}));

// Update order with items
router.put('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { party_name, date_of_order, expected_delivery_date, transport, remarks, status, order_items, order_remarks } = req.body;

  const { validItems } = validateOrderPayload({ party_name, order_items, order_remarks });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      party_name,
      date_of_order: date_of_order || new Date().toISOString().split('T')[0],
      expected_delivery_date: expected_delivery_date || null,
      transport: transport || '',
      remarks: remarks || '',
      status: status || 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (orderError) {
    throw new AppError('Failed to update order', 500, { dbError: orderError.message });
  }
  if (!order) {
    throw new AppError('Order not found or you do not have permission to update it', 404);
  }

  // Delete existing items and remarks in parallel
  const [deleteItemsResult, deleteRemarksResult] = await Promise.all([
    supabase.from('order_items').delete().eq('order_id', id),
    supabase.from('order_remarks').delete().eq('order_id', id)
  ]);

  if (deleteItemsResult.error) {
    throw new AppError('Failed to update order items', 500, { dbError: deleteItemsResult.error.message });
  }
  if (deleteRemarksResult.error) {
    console.error('Order remarks deletion error:', deleteRemarksResult.error);
  }

  let createdItems = [];

  if (validItems.length > 0) {
    const orderItemsData = validItems.map(item => ({
      order_id: id,
      design_number: item.design_number,
      color: item.color,
      sizes_quantities: item.sizes_quantities
    }));

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData)
      .select();

    if (itemsError) {
      throw new AppError('Failed to create order items', 500, { dbError: itemsError.message });
    }
    createdItems = items || [];
  }

  await insertOrderRemarks(id, order_remarks);

  const completeOrder = await fetchCompleteOrder(id);

  res.json({
    message: 'Order updated successfully',
    order: completeOrder || { ...order, order_items: createdItems }
  });
}));

// Add items to existing order (for substitute designs)
router.post('/:id/items', authenticateUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items array is required', 400);
  }

  const validItems = items.filter(item =>
    item.design_number && item.color &&
    Array.isArray(item.sizes_quantities) && item.sizes_quantities.length > 0
  );

  if (validItems.length === 0) {
    throw new AppError('No valid items provided', 400);
  }

  for (const item of validItems) {
    for (const sq of item.sizes_quantities) {
      if (!sq.size || !sq.quantity || sq.quantity <= 0) {
        throw new AppError('Each size must have a valid quantity greater than 0', 400);
      }
    }
  }

  // Verify order exists and user has access
  let orderQuery = supabase.from('orders').select('id').eq('id', id);
  if (req.profile?.role !== 'admin') {
    orderQuery = orderQuery.eq('user_id', req.user.id);
  }
  const { data: order, error: orderError } = await orderQuery.single();
  if (orderError || !order) {
    throw new AppError('Order not found or access denied', 404);
  }

  const orderItemsData = validItems.map(item => ({
    order_id: id,
    design_number: item.design_number,
    color: item.color,
    sizes_quantities: item.sizes_quantities,
    is_substitute: true
  }));

  const { data: newItems, error: insertError } = await supabase
    .from('order_items')
    .insert(orderItemsData)
    .select();

  if (insertError) {
    // Fallback without is_substitute if column doesn't exist
    const fallbackData = validItems.map(item => ({
      order_id: id,
      design_number: item.design_number,
      color: item.color,
      sizes_quantities: item.sizes_quantities
    }));
    const { data: fallbackItems, error: fallbackError } = await supabase
      .from('order_items')
      .insert(fallbackData)
      .select();
    if (fallbackError) {
      throw new AppError('Failed to add items to order', 500, { dbError: fallbackError.message });
    }
    return res.status(201).json({ message: 'Items added to order', items: fallbackItems });
  }

  res.status(201).json({ message: 'Items added to order', items: newItems });
}));

// Delete a single order item (admin only)
router.delete('/:orderId/items/:itemId', authenticateUser, asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;

  if (req.profile?.role !== 'admin') {
    throw new AppError('Only admins can delete order items', 403);
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single();
  if (orderError || !order) {
    throw new AppError('Order not found', 404);
  }

  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)
    .eq('order_id', orderId);

  if (error) {
    throw new AppError('Failed to delete order item', 500, { dbError: error.message });
  }

  res.json({ message: 'Order item deleted successfully' });
}));

// Update order item sizes (for removing a specific size) - admin only
router.patch('/:orderId/items/:itemId', authenticateUser, asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const { sizes_quantities } = req.body;

  if (req.profile?.role !== 'admin') {
    throw new AppError('Only admins can update order items', 403);
  }

  if (!sizes_quantities || !Array.isArray(sizes_quantities)) {
    throw new AppError('sizes_quantities array is required', 400);
  }

  const { data, error } = await supabase
    .from('order_items')
    .update({ sizes_quantities })
    .eq('id', itemId)
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to update order item', 500, { dbError: error.message });
  }

  res.json({ message: 'Order item updated', item: data });
}));

// Delete order (cascades to order_items)
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) {
    throw new AppError('Failed to delete order', 500, { dbError: error.message });
  }

  res.json({ message: 'Order deleted successfully' });
}));

export default router;