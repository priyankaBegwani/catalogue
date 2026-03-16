import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { deleteFromR2 } from '../config/r2.js';
import { convertToSignedUrls, extractR2Key } from '../utils/imageUrls.js';
import { asyncHandler, AppError } from '../utils/index.js';

const router = express.Router();

// Shared select for design with all relations
const DESIGN_WITH_COLORS_SELECT = `
  *,
  design_colors (
    id,
    design_id,
    color_name,
    color_code,
    in_stock,
    stock_quantity,
    size_quantities,
    image_urls,
    created_at,
    updated_at
  )
`;

/**
 * Delete all R2 images for an array of image URLs. Logs errors but does not throw.
 */
async function deleteImagesFromR2(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;
  await Promise.allSettled(
    imageUrls.map(async (url) => {
      const key = extractR2Key(url);
      if (key) await deleteFromR2(key);
    })
  );
}

router.get('/categories', optionalAuth, asyncHandler(async (req, res) => {
  const { data: categories, error } = await supabase
    .from('design_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw new AppError(error.message, 500);
  res.json(categories);
}));

router.get('/styles', authenticateUser, asyncHandler(async (req, res) => {
  const { category_id } = req.query;

  let query = supabase
    .from('design_styles')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (category_id) {
    query = query.eq('category_id', category_id);
  }

  const { data: styles, error } = await query;
  if (error) throw new AppError(error.message, 500);
  res.json(styles);
}));

router.get('/fabric-types', optionalAuth, asyncHandler(async (req, res) => {
  const { data: fabricTypes, error } = await supabase
    .from('fabric_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw new AppError(error.message, 500);
  res.json(fabricTypes);
}));

// Search endpoint - optimized for fast searching across all fields
router.get('/search', optionalAuth, asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.json([]);
  }

  const searchTerm = `%${q.toLowerCase().trim()}%`;

  const { data: designs, error } = await supabase
    .from('designs')
    .select(`
      *,
      category:design_categories(id, name),
      fabric_type:fabric_types(id, name),
      brand:brands(id, name),
      design_colors(*)
    `)
    .or(`design_no.ilike.${searchTerm},name.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new AppError(error.message, 500);

  const lowerQ = q.toLowerCase().trim();
  const filteredDesigns = (designs || []).filter(design => {
    if (design.design_no?.toLowerCase().includes(lowerQ) ||
        design.name?.toLowerCase().includes(lowerQ) ||
        design.description?.toLowerCase().includes(lowerQ)) {
      return true;
    }
    if (design.category?.name?.toLowerCase().includes(lowerQ)) return true;
    if (design.brand?.name?.toLowerCase().includes(lowerQ)) return true;
    if (design.fabric_type?.name?.toLowerCase().includes(lowerQ)) return true;
    if (design.design_colors?.some(color => 
      color.color_name?.toLowerCase().includes(lowerQ)
    )) return true;
    return false;
  });

  const designsWithSignedUrls = filteredDesigns.map(design => ({
    ...design,
    design_colors: design.design_colors?.map(color => ({
      ...color,
      image_urls: convertToSignedUrls(color.image_urls || []),
      video_urls: color.video_urls || []
    })) || []
  }));

  res.json(designsWithSignedUrls);
}));

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { category_id, fabric_type_id, brand_id, style_id, active_only, created_month } = req.query;
  const isAuthenticated = !!req.user;

    let query = supabase
      .from('designs')
      .select(`
        *,
        design_colors (
          id,
          color_name,
          color_code,
          in_stock,
          stock_quantity,
          size_quantities,
          image_urls,
          created_at,
          updated_at
        ),
        category:design_categories!designs_category_id_fkey (
          id,
          name,
          slug
        ),
        style:design_styles!designs_style_id_fkey (
          id,
          name,
          description,
          category_id
        ),
        fabric_type:fabric_types!designs_fabric_type_id_fkey (
          id,
          name,
          description
        ),
        brand:brands (
          id,
          name,
          description,
          logo_url
        ),
        created_by:user_profiles!designs_created_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (fabric_type_id) {
      query = query.eq('fabric_type_id', fabric_type_id);
    }

    if (brand_id) {
      query = query.eq('brand_id', brand_id);
    }

    if (style_id) {
      query = query.eq('style_id', style_id);
    }

    if (created_month) {
      const monthStr = String(created_month);
      const match = monthStr.match(/^(\d{4})-(\d{2})$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid created_month format. Use YYYY-MM' });
      }

      const year = Number(match[1]);
      const month = Number(match[2]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Invalid created_month value. Use YYYY-MM' });
      }

      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    }

    // Filter only active designs for catalogue view
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data: designs, error } = await query;
    if (error) throw new AppError(error.message, 500);

    // Convert image URLs to signed URLs for all designs (synchronous — no await needed)
    const designsWithSignedUrls = designs.map(design => ({
      ...design,
      design_colors: (design.design_colors || []).map(color => ({
        ...color,
        image_urls: convertToSignedUrls(color.image_urls)
      }))
    }));

    // Hide prices for non-authenticated users
    if (!isAuthenticated) {
      const sanitizedDesigns = designsWithSignedUrls.map(design => ({
        ...design,
        price: null,
        design_colors: design.design_colors?.map(color => ({
          ...color,
          stock_quantity: null,
          size_quantities: null
        }))
      }));
      return res.json(sanitizedDesigns);
    }

    res.json(designsWithSignedUrls);
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAuthenticated = !!req.user;

    const { data: design, error } = await supabase
      .from('designs')
      .select(`
        *,
        design_colors (
          id,
          color_name,
          color_code,
          in_stock,
          stock_quantity,
          size_quantities,
          image_urls,
          created_at,
          updated_at
        ),
        category:design_categories!designs_category_id_fkey (
          id,
          name,
          slug
        ),
        style:design_styles!designs_style_id_fkey (
          id,
          name,
          description,
          category_id
        ),
        fabric_type:fabric_types!designs_fabric_type_id_fkey (
          id,
          name,
          description
        ),
        created_by:user_profiles!designs_created_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    if (!design) throw new AppError('Design not found', 404);

    // Hide prices for non-authenticated users
    if (!isAuthenticated) {
      const sanitizedDesign = {
        ...design,
        price: null,
        design_colors: design.design_colors?.map(color => ({
          ...color,
          stock_quantity: null,
          size_quantities: null
        }))
      };
      return res.json(sanitizedDesign);
    }

    res.json(design);
}));

router.post('/', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { design_no, name, description, category_id, style_id, fabric_type_id, brand_id, available_sizes, price, colors } = req.body;

  if (!design_no || !name) {
    throw new AppError('Design number and name are required', 400);
  }

  const { data: design, error: designError } = await supabase
    .from('designs')
    .insert({
      design_no,
      name,
      description: description || '',
      category_id: category_id || null,
      style_id: style_id || null,
      fabric_type_id: fabric_type_id || null,
      brand_id: brand_id || null,
      available_sizes: available_sizes || [],
      price: price || 0,
      created_by: req.user.id
    })
    .select()
    .single();

  if (designError) throw new AppError(designError.message, 400);

  if (colors && colors.length > 0) {
    const colorInserts = colors.map(color => ({
      design_id: design.id,
      color_name: color.color_name,
      color_code: color.color_code || null,
      in_stock: color.in_stock !== undefined ? color.in_stock : true,
      stock_quantity: color.stock_quantity || 0,
      size_quantities: color.size_quantities || { S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 },
      image_urls: color.image_urls || []
    }));

    const { error: colorsError } = await supabase
      .from('design_colors')
      .insert(colorInserts);

    if (colorsError) {
      await supabase.from('designs').delete().eq('id', design.id);
      throw new AppError(colorsError.message, 400);
    }
  }

  const { data: fullDesign } = await supabase
    .from('designs')
    .select(DESIGN_WITH_COLORS_SELECT)
    .eq('id', design.id)
    .single();

  res.status(201).json(fullDesign);
}));

router.put('/:id', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { id } = req.params;
  const { design_no, name, description, category_id, style_id, fabric_type_id, brand_id, available_sizes, price, is_active } = req.body;

  const updateData = {};
  if (design_no !== undefined) updateData.design_no = design_no;
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (category_id !== undefined) updateData.category_id = category_id;
  if (style_id !== undefined) updateData.style_id = style_id || null;
  if (fabric_type_id !== undefined) updateData.fabric_type_id = fabric_type_id || null;
  if (brand_id !== undefined) updateData.brand_id = brand_id || null;
  if (available_sizes !== undefined) updateData.available_sizes = available_sizes;
  if (price !== undefined) updateData.price = price;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data: design, error } = await supabase
    .from('designs')
    .update(updateData)
    .eq('id', id)
    .select(DESIGN_WITH_COLORS_SELECT)
    .single();

  if (error) throw new AppError(error.message, 400);
  res.json(design);
}));

router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { id } = req.params;

  const { data: design, error: fetchError } = await supabase
    .from('designs')
    .select('*, design_colors (id, image_urls)')
    .eq('id', id)
    .single();

  if (fetchError) throw new AppError(fetchError.message, 400);
  if (!design) throw new AppError('Design not found', 404);

  // Delete all images from R2 in parallel (non-blocking per-image errors)
  if (design.design_colors?.length > 0) {
    const allImageUrls = design.design_colors.flatMap(c => c.image_urls || []);
    await deleteImagesFromR2(allImageUrls);
  }

  const { error } = await supabase.from('designs').delete().eq('id', id);
  if (error) throw new AppError(error.message, 400);

  res.json({ message: 'Design and associated images deleted successfully' });
}));

router.post('/:id/colors', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { id } = req.params;
  const { color_name, color_code, in_stock, stock_quantity, size_quantities, image_urls } = req.body;

  if (!color_name) throw new AppError('Color name is required', 400);

  const { data: color, error } = await supabase
    .from('design_colors')
    .insert({
      design_id: id,
      color_name,
      color_code: color_code || null,
      in_stock: in_stock !== undefined ? in_stock : true,
      stock_quantity: stock_quantity || 0,
      size_quantities: size_quantities || { S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 },
      image_urls: image_urls || []
    })
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  res.status(201).json(color);
}));

router.put('/colors/:colorId', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { colorId } = req.params;
  const { color_name, color_code, in_stock, stock_quantity, size_quantities, image_urls } = req.body;

  const updateData = {};
  if (color_name !== undefined) updateData.color_name = color_name;
  if (color_code !== undefined) updateData.color_code = color_code;
  if (in_stock !== undefined) updateData.in_stock = in_stock;
  if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
  if (size_quantities !== undefined) updateData.size_quantities = size_quantities;
  if (image_urls !== undefined) updateData.image_urls = image_urls;

  const { data: color, error } = await supabase
    .from('design_colors')
    .update(updateData)
    .eq('id', colorId)
    .select()
    .single();

  if (error) throw new AppError(error.message, 400);
  res.json(color);
}));

router.delete('/colors/:colorId', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { colorId } = req.params;

  const { data: color, error: fetchError } = await supabase
    .from('design_colors')
    .select('id, image_urls')
    .eq('id', colorId)
    .single();

  if (fetchError) throw new AppError(fetchError.message, 400);
  if (!color) throw new AppError('Color not found', 404);

  await deleteImagesFromR2(color.image_urls);

  const { error } = await supabase
    .from('design_colors')
    .delete()
    .eq('id', colorId);

  if (error) throw new AppError(error.message, 400);
  res.json({ message: 'Color and associated images deleted successfully' });
}));

export default router;
