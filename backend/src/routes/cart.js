import express from 'express';
import { supabase, config } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery,
  cacheMiddleware
} from '../utils/index.js';
import { generateSignedGetUrl } from '../config/wasabi.js';

const router = express.Router();

// Helper function to convert image URLs to signed URLs
async function convertToSignedUrls(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return imageUrls;

  // Only generate signed URLs for CDN storage type
  if (config.storageType !== 'cdn') {
    return imageUrls;
  }

  const signedUrls = [];
  for (const imageUrl of imageUrls) {
    try {
      const urlParts = imageUrl.split('/');
      const keyStartIndex = urlParts.findIndex(part => part === 'designs');
      
      if (keyStartIndex !== -1) {
        const key = urlParts.slice(keyStartIndex).join('/');
        const signedUrl = await generateSignedGetUrl(key, 3600);
        signedUrls.push(signedUrl);
      } else {
        signedUrls.push(imageUrl);
      }
    } catch (error) {
      console.error(`Failed to generate signed URL for ${imageUrl}:`, error);
      signedUrls.push(imageUrl);
    }
  }
  return signedUrls;
}

router.get('/size-sets', 
  authenticateUser, 
  cacheMiddleware(600), // Cache for 10 minutes
  asyncHandler(async (req, res) => {
    const sizeSets = await executeQuery(
      supabase
        .from('size_sets')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      'Failed to fetch size sets'
    );

    res.json(sizeSets);
  })
);

router.get('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const cartItems = await executeQuery(
      supabase
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
        .order('created_at', { ascending: false }),
      'Failed to fetch cart items'
    );

    // Convert image URLs to signed URLs for each cart item
    const cartItemsWithSignedUrls = await Promise.all(
      cartItems.map(async (item) => ({
        ...item,
        color: item.color ? {
          ...item.color,
          image_urls: await convertToSignedUrls(item.color.image_urls)
        } : item.color
      }))
    );

    res.json(cartItemsWithSignedUrls);
  })
);

router.post('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { design_id, color_id, size, size_set_id, quantity } = req.body;

    validateRequired(req.body, ['design_id', 'color_id']);
    validateUUID(design_id, 'Design ID');
    validateUUID(color_id, 'Color ID');

    // Determine if this is a set order or per-size order
    const isSetOrder = !!size_set_id;

    // Validate that either size or size_set_id is provided (but not both)
    if (isSetOrder && size) {
      throw new AppError('Cannot specify both size and size_set_id', 400);
    }
    if (!isSetOrder && !size) {
      throw new AppError('Must specify either size or size_set_id', 400);
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

    const { data: existingItem } = await existingQuery.maybeSingle();

    if (existingItem) {
      const updatedItem = await executeQuery(
        supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + (quantity || 1) })
          .eq('id', existingItem.id)
          .select(`
            *,
            design:designs!cart_items_design_id_fkey (*),
            color:design_colors!cart_items_color_id_fkey (*),
            size_set:size_sets!cart_items_size_set_id_fkey (*)
          `)
          .single(),
        'Failed to update cart item'
      );

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

    const cartItem = await executeQuery(
      supabase
        .from('cart_items')
        .insert(insertData)
        .select(`
          *,
          design:designs!cart_items_design_id_fkey (*),
          color:design_colors!cart_items_color_id_fkey (*),
          size_set:size_sets!cart_items_size_set_id_fkey (*)
        `)
        .single(),
      'Failed to add item to cart'
    );

    res.status(201).json(cartItem);
  })
);

router.put('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    validateUUID(id, 'Cart item ID');
    validateRequired(req.body, ['quantity']);

    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    const cartItem = await executeQuery(
      supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select(`
          *,
          design:designs!cart_items_design_id_fkey (*),
          color:design_colors!cart_items_color_id_fkey (*)
        `)
        .single(),
      'Failed to update cart item'
    );

    res.json(cartItem);
  })
);

router.delete('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Cart item ID');

    await executeQuery(
      supabase
        .from('cart_items')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id),
      'Failed to remove item from cart'
    );

    res.json({ message: 'Item removed from cart' });
  })
);

router.delete('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    await executeQuery(
      supabase
        .from('cart_items')
        .delete()
        .eq('user_id', req.user.id),
      'Failed to clear cart'
    );

    res.json({ message: 'Cart cleared' });
  })
);

export default router;
