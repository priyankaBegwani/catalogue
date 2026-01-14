import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data: wishlistItems, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        design:designs!wishlist_items_design_id_fkey (
          id,
          design_no,
          name,
          description,
          available_sizes,
          is_active,
          category:design_categories!designs_category_id_fkey (
            id,
            name,
            slug
          ),
          design_colors (
            id,
            color_name,
            color_code,
            price,
            in_stock,
            stock_quantity,
            image_urls
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(wishlistItems);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist items' });
  }
});

router.post('/', authenticateUser, async (req, res) => {
  try {
    const { design_id } = req.body;

    if (!design_id) {
      return res.status(400).json({ error: 'Design ID is required' });
    }

    const { data: existingItem, error: checkError } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('design_id', design_id)
      .maybeSingle();

    if (checkError) {
      return res.status(500).json({ error: checkError.message });
    }

    if (existingItem) {
      return res.status(400).json({ error: 'Item already in wishlist' });
    }

    const { data: wishlistItem, error } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: req.user.id,
        design_id
      })
      .select(`
        *,
        design:designs!wishlist_items_design_id_fkey (
          *,
          design_colors (*)
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add item to wishlist' });
  }
});

router.delete('/:design_id', authenticateUser, async (req, res) => {
  try {
    const { design_id } = req.params;

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', req.user.id)
      .eq('design_id', design_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove item from wishlist' });
  }
});

export default router;
