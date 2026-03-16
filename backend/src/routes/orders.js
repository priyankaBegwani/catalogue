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
    let query = supabase
      .from('orders')
      .select(`
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
      `);

    // If user is not admin, only show their orders
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
    
    let query = supabase
      .from('orders')
      .select(`
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
      `)
      .eq('id', id);

    // If user is not admin, only show their orders
    if (req.profile?.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const order = await executeQuery(
      query.single(),
      'Order not found'
    );

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
      remarks
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

    // Fetch the complete order with items
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
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
      `)
      .eq('id', order.id)
      .single();

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
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { 
      party_name, 
      date_of_order,
      expected_delivery_date,
      transport,
      remarks,
      order_items,
      order_remarks
    } = req.body;

    if (!party_name || !order_items || !Array.isArray(order_items) || order_items.length === 0) {
      // Check if we have valid order items OR valid order remarks
      const hasValidOrderRemarks = order_remarks && Array.isArray(order_remarks) && 
        order_remarks.some(remark => remark && remark.trim().length > 0);
      
      if (!hasValidOrderRemarks) {
        return res.status(400).json({ error: 'Party name and either order items or order remarks are required' });
      }
    }

    // Validate order items only if they exist and are not empty
    if (order_items && Array.isArray(order_items) && order_items.length > 0) {
      // Filter out empty items
      const validItems = order_items.filter(item => 
        item.design_number && item.color && item.sizes_quantities && 
        Array.isArray(item.sizes_quantities) && item.sizes_quantities.length > 0
      );
      
      // Validate each valid item
      for (const item of validItems) {
        // Validate sizes_quantities array
        for (const sq of item.sizes_quantities) {
          if (!sq.size || !sq.quantity || sq.quantity <= 0) {
            return res.status(400).json({ error: 'Each size must have a valid quantity greater than 0' });
          }
        }
      }
      
      // Update order_items to only include valid items
      req.body.order_items = validItems;
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: req.user.id,
          party_name,
          date_of_order: date_of_order || new Date().toISOString().split('T')[0],
          expected_delivery_date: expected_delivery_date || null,
          transport: transport || '',
          remarks: remarks || ''
        }
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    let createdItems = [];
    
    // Create order items only if we have valid items
    if (req.body.order_items && req.body.order_items.length > 0) {
      const orderItemsData = req.body.order_items.map(item => ({
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
        console.error('Order items creation error:', itemsError);
        // Rollback order creation
        await supabase.from('orders').delete().eq('id', order.id);
        return res.status(500).json({ error: 'Failed to create order items' });
      }
      
      createdItems = items || [];
    }

    // Create order remarks if provided
    if (order_remarks && Array.isArray(order_remarks) && order_remarks.length > 0) {
      const remarksToCreate = order_remarks
        .filter(remark => remark && remark.trim())
        .map(remark => ({
          order_id: order.id,
          remark: remark.trim()
        }));

      if (remarksToCreate.length > 0) {
        const { error: remarksError } = await supabase
          .from('order_remarks')
          .insert(remarksToCreate);

        if (remarksError) {
          console.error('Order remarks creation error:', remarksError);
          // Don't fail the entire order creation for remarks
        }
      }
    }

    // Fetch the complete order with remarks
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
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
      `)
      .eq('id', order.id)
      .single();

    res.status(201).json({
      message: 'Order created successfully',
      order: completeOrder || {
        ...order,
        order_items: createdItems
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order with items
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      party_name, 
      date_of_order,
      expected_delivery_date,
      transport,
      remarks,
      status,
      order_items,
      order_remarks
    } = req.body;

    if (!party_name || !order_items || !Array.isArray(order_items) || order_items.length === 0) {
      // Check if we have valid order items OR valid order remarks
      const hasValidOrderRemarks = order_remarks && Array.isArray(order_remarks) && 
        order_remarks.some(remark => remark && remark.trim().length > 0);
      
      if (!hasValidOrderRemarks) {
        return res.status(400).json({ error: 'Party name and either order items or order remarks are required' });
      }
    }

    // Validate order items only if they exist and are not empty
    if (order_items && Array.isArray(order_items) && order_items.length > 0) {
      // Filter out empty items
      const validItems = order_items.filter(item => 
        item.design_number && item.color && item.sizes_quantities && 
        Array.isArray(item.sizes_quantities) && item.sizes_quantities.length > 0
      );
      
      // Validate each valid item
      for (const item of validItems) {
        // Validate sizes_quantities array
        for (const sq of item.sizes_quantities) {
          if (!sq.size || !sq.quantity || sq.quantity <= 0) {
            return res.status(400).json({ error: 'Each size must have a valid quantity greater than 0' });
          }
        }
      }
      
      // Update order_items to only include valid items
      req.body.order_items = validItems;
    }

    // Update order
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
      console.error('Order update error:', orderError);
      return res.status(500).json({ error: 'Failed to update order' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found or you do not have permission to update it' });
    }

    // Delete existing order items
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id);

    if (deleteError) {
      console.error('Order items deletion error:', deleteError);
      return res.status(500).json({ error: 'Failed to update order items' });
    }

    let createdItems = [];
    
    // Create new order items only if we have valid items
    if (req.body.order_items && req.body.order_items.length > 0) {
      const orderItemsData = req.body.order_items.map(item => ({
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
        console.error('Order items creation error:', itemsError);
        return res.status(500).json({ error: 'Failed to create order items' });
      }
      
      createdItems = items || [];
    }

    // Delete existing order remarks
    const { error: deleteRemarksError } = await supabase
      .from('order_remarks')
      .delete()
      .eq('order_id', id);

    if (deleteRemarksError) {
      console.error('Order remarks deletion error:', deleteRemarksError);
      // Don't fail the entire order update for remarks
    }

    // Create new order remarks if provided
    if (order_remarks && Array.isArray(order_remarks) && order_remarks.length > 0) {
      const remarksToCreate = order_remarks
        .filter(remark => remark && remark.trim())
        .map(remark => ({
          order_id: id,
          remark: remark.trim()
        }));

      if (remarksToCreate.length > 0) {
        const { error: remarksError } = await supabase
          .from('order_remarks')
          .insert(remarksToCreate);

        if (remarksError) {
          console.error('Order remarks creation error:', remarksError);
          // Don't fail the entire order update for remarks
        }
      }
    }

    // Fetch the complete order with remarks
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
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
      `)
      .eq('id', id)
      .single();

    res.json({
      message: 'Order updated successfully',
      order: completeOrder || {
        ...order,
        order_items: createdItems
      }
    });
  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add items to existing order (for substitute designs)
router.post('/:id/items', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    // Validate items
    const validItems = items.filter(item =>
      item.design_number && item.color &&
      item.sizes_quantities && Array.isArray(item.sizes_quantities) &&
      item.sizes_quantities.length > 0
    );

    if (validItems.length === 0) {
      return res.status(400).json({ error: 'No valid items provided' });
    }

    for (const item of validItems) {
      for (const sq of item.sizes_quantities) {
        if (!sq.size || !sq.quantity || sq.quantity <= 0) {
          return res.status(400).json({ error: 'Each size must have a valid quantity greater than 0' });
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
      return res.status(404).json({ error: 'Order not found or access denied' });
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
      // Try without is_substitute if column doesn't exist
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
        console.error('Order items insert error:', fallbackError);
        return res.status(500).json({ error: 'Failed to add items to order' });
      }
      return res.status(201).json({ message: 'Items added to order', items: fallbackItems });
    }

    res.status(201).json({ message: 'Items added to order', items: newItems });
  } catch (error) {
    console.error('Add order items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a single order item (admin only)
router.delete('/:orderId/items/:itemId', authenticateUser, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    if (req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete order items' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();
    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)
      .eq('order_id', orderId);

    if (error) {
      console.error('Delete order item error:', error);
      return res.status(500).json({ error: 'Failed to delete order item' });
    }

    res.json({ message: 'Order item deleted successfully' });
  } catch (error) {
    console.error('Delete order item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order item sizes (for removing a specific size) - admin only
router.patch('/:orderId/items/:itemId', authenticateUser, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { sizes_quantities } = req.body;

    if (req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update order items' });
    }

    if (!sizes_quantities || !Array.isArray(sizes_quantities)) {
      return res.status(400).json({ error: 'sizes_quantities array is required' });
    }

    const { data, error } = await supabase
      .from('order_items')
      .update({ sizes_quantities })
      .eq('id', itemId)
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Update order item error:', error);
      return res.status(500).json({ error: 'Failed to update order item' });
    }

    res.json({ message: 'Order item updated', item: data });
  } catch (error) {
    console.error('Update order item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete order (cascades to order_items)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Order deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete order' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Order deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;