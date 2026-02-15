import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery
} from '../utils/index.js';

const router = express.Router();

router.get('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const wishlistItems = await executeQuery(
      supabase
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
        .order('created_at', { ascending: false }),
      'Failed to fetch wishlist items'
    );

    res.json(wishlistItems);
  })
);

router.post('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { design_id } = req.body;

    validateRequired(req.body, ['design_id']);
    validateUUID(design_id, 'Design ID');

    // Check if already in wishlist
    const { data: existingItem } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('design_id', design_id)
      .maybeSingle();

    if (existingItem) {
      throw new AppError('Item already in wishlist', 400);
    }

    const wishlistItem = await executeQuery(
      supabase
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
        .single(),
      'Failed to add item to wishlist'
    );

    res.status(201).json(wishlistItem);
  })
);

router.delete('/:design_id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { design_id } = req.params;

    validateUUID(design_id, 'Design ID');

    await executeQuery(
      supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', req.user.id)
        .eq('design_id', design_id),
      'Failed to remove item from wishlist'
    );

    res.json({ message: 'Item removed from wishlist' });
  })
);

export default router;
