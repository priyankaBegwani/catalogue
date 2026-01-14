import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/size-sets', authenticateUser, async (req, res) => {
  try {
    const { data: sizeSets, error } = await supabase
      .from('size_sets')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(sizeSets);
  } catch (error) {
    console.error('Get size sets error:', error);
    res.status(500).json({ error: 'Failed to fetch size sets' });
  }
});

router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        design:designs!cart_items_design_id_fkey (
          id,
          design_no,
          name,
          description,
          available_sizes,
          category:design_categories!designs_category_id_fkey (
            id,
            name,
            slug
          )
        ),
        color:design_colors!cart_items_color_id_fkey (
          id,
          color_name,
          color_code,
          price,
          in_stock,
          stock_quantity,
          image_urls
        ),
        size_set:size_sets!cart_items_size_set_id_fkey (
          id,
          name,
          sizes
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(cartItems);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to fetch cart items' });
  }
});

router.post('/', authenticateUser, async (req, res) => {
  try {
    const { design_id, color_id, size, size_set_id, quantity } = req.body;

    if (!design_id || !color_id) {
      return res.status(400).json({ error: 'Design ID and Color ID are required' });
    }

    // Determine if this is a set order (retailer) or per-size order (guest)
    const isSetOrder = !!size_set_id;
    const userRole = req.profile?.role;

    // Validation based on user role
    if (userRole === 'retailer' && !isSetOrder) {
      return res.status(400).json({ error: 'Retailers must order by size sets' });
    }
    if (userRole === 'guest' && isSetOrder) {
      return res.status(400).json({ error: 'Guests must order per size' });
    }

    // Build query to check for existing item
    let existingQuery = supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('design_id', design_id)
      .eq('color_id', color_id)
      .eq('is_set_order', isSetOrder);

    if (isSetOrder) {
      existingQuery = existingQuery.eq('size_set_id', size_set_id);
    } else {
      existingQuery = existingQuery.eq('size', size || '');
    }

    const { data: existingItem, error: checkError } = await existingQuery.maybeSingle();

    if (checkError) {
      return res.status(500).json({ error: checkError.message });
    }

    if (existingItem) {
      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + (quantity || 1) })
        .eq('id', existingItem.id)
        .select(`
          *,
          design:designs!cart_items_design_id_fkey (*),
          color:design_colors!cart_items_color_id_fkey (*),
          size_set:size_sets!cart_items_size_set_id_fkey (*)
        `)
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      return res.json(updatedItem);
    }

    // Insert new cart item
    const insertData = {
      user_id: req.user.id,
      design_id,
      color_id,
      is_set_order: isSetOrder,
      quantity: quantity || 1
    };

    if (isSetOrder) {
      insertData.size_set_id = size_set_id;
      insertData.size = ''; // Empty for set orders
    } else {
      insertData.size = size || '';
      insertData.size_set_id = null;
    }

    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .insert(insertData)
      .select(`
        *,
        design:designs!cart_items_design_id_fkey (*),
        color:design_colors!cart_items_color_id_fkey (*),
        size_set:size_sets!cart_items_size_set_id_fkey (*)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(cartItem);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select(`
        *,
        design:designs!cart_items_design_id_fkey (*),
        color:design_colors!cart_items_color_id_fkey (*)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(cartItem);
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

router.delete('/', authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
