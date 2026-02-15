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

    // Transform cart items to order items
    const orderItemsData = cartItems.map(item => ({
      order_id: order.id,
      design_number: item.design?.design_no || '',
      color: item.color?.color_name || '',
      sizes_quantities: item.sizes_quantities || []
    }));

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