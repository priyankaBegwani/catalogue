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
    const { data: wishlistItems, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        designs (
          id,
          design_no,
          name,
          description,
          category_id,
          style_id,
          fabric_type_id,
          brand_id,
          available_sizes,
          whatsapp_image_url,
          price,
          is_active,
          design_colors (
            id,
            design_id,
            color_name,
            color_code,
            in_stock,
            size_quantities,
            image_urls
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist items:', error);
      throw new AppError('Failed to fetch wishlist items', 500, { dbError: error.message });
    }

    console.log(`Fetched ${wishlistItems?.length || 0} wishlist items for user ${req.user.id}`);
    res.json(wishlistItems || []);
  })
);

router.post('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { design_id } = req.body;

    validateRequired(req.body, ['design_id']);
    validateUUID(design_id, 'Design ID');

    // Check if already in wishlist
    const { data: existingItem, error: checkError } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('design_id', design_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing wishlist item:', checkError);
      throw new AppError('Failed to check wishlist', 500, { dbError: checkError.message });
    }

    if (existingItem) {
      throw new AppError('Item already in wishlist', 400);
    }

    // Insert into wishlist
    const { data: wishlistItem, error: insertError } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: req.user.id,
        design_id
      })
      .select(`
        *,
        designs (
          id,
          design_no,
          name,
          description,
          category_id,
          style_id,
          fabric_type_id,
          brand_id,
          available_sizes,
          whatsapp_image_url,
          price,
          is_active,
          design_colors (
            id,
            design_id,
            color_name,
            color_code,
            in_stock,
            size_quantities,
            image_urls
          )
        )
      `)
      .single();

    if (insertError) {
      console.error('Error inserting wishlist item:', insertError);
      throw new AppError('Failed to add item to wishlist', 500, { dbError: insertError.message });
    }

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
