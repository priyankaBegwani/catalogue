import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { deleteFromR2 } from '../config/r2.js';
import { convertToSignedUrls, extractR2Key } from '../utils/imageUrls.js';
import { asyncHandler, AppError } from '../utils/index.js';

const router = express.Router();

const WORK_TYPE_OPTIONS = ['plain', 'printed', 'emboidered', 'chikankari', 'shaded', 'handwork'];
const OCCASION_OPTIONS = ['festive', 'casual', 'wedding', 'office wear', 'daily wear'];
const COLLECTION_OPTIONS = ['summer collection', 'winter collection', 'puja collection', 'eid collection'];

function normalizeMonthYear(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  if (typeof value !== 'string') {
    throw new AppError('design_month_year must be in YYYY-MM format', 400);
  }

  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new AppError('design_month_year must be in YYYY-MM format', 400);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new AppError('design_month_year must be a valid month in YYYY-MM format', 400);
  }

  return `${match[1]}-${match[2]}-01`;
}

function validateEnumField(value, allowedValues, fieldName) {
  if (value === undefined || value === null || value === '') return;
  if (!allowedValues.includes(value)) {
    throw new AppError(`Invalid ${fieldName} value`, 400);
  }
}

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
    is_active,
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
        is_active,
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
          is_active,
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
  if (req.profile?.user_roles?.role_name !== 'Admin') {
    throw new AppError('Admin access required', 403);
  }

  const {
    design_no,
    name,
    description,
    department,
    tags,
    work_type,
    occasion,
    collection,
    design_month_year,
    category_id,
    style_id,
    fabric_type_id,
    brand_id,
    available_sizes,
    price,
    colors
  } = req.body;

  if (!design_no || !name) {
    throw new AppError('Design number and name are required', 400);
  }

  validateEnumField(work_type, WORK_TYPE_OPTIONS, 'work_type');
  validateEnumField(occasion, OCCASION_OPTIONS, 'occasion');
  validateEnumField(collection, COLLECTION_OPTIONS, 'collection');
  const normalizedDesignMonthYear = normalizeMonthYear(design_month_year);

  const { data: design, error: designError } = await supabase
    .from('designs')
    .insert({
      design_no,
      name,
      description: description || '',
      department: department || null,
      tags: Array.isArray(tags) ? tags : [],
      work_type: work_type || null,
      occasion: occasion || null,
      collection: collection || null,
      design_month_year: normalizedDesignMonthYear,
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
  if (req.profile?.user_roles?.role_name !== 'Admin') {
    throw new AppError('Admin access required', 403);
  }

  const { id } = req.params;
  const {
    design_no,
    name,
    description,
    department,
    tags,
    work_type,
    occasion,
    collection,
    design_month_year,
    category_id,
    style_id,
    fabric_type_id,
    brand_id,
    available_sizes,
    price,
    is_active
  } = req.body;

  validateEnumField(work_type, WORK_TYPE_OPTIONS, 'work_type');
  validateEnumField(occasion, OCCASION_OPTIONS, 'occasion');
  validateEnumField(collection, COLLECTION_OPTIONS, 'collection');
  const normalizedDesignMonthYear = normalizeMonthYear(design_month_year);

  const updateData = {};
  if (design_no !== undefined) updateData.design_no = design_no;
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (department !== undefined) updateData.department = department || null;
  if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
  if (work_type !== undefined) updateData.work_type = work_type || null;
  if (occasion !== undefined) updateData.occasion = occasion || null;
  if (collection !== undefined) updateData.collection = collection || null;
  if (normalizedDesignMonthYear !== undefined) updateData.design_month_year = normalizedDesignMonthYear;
  if (category_id !== undefined) updateData.category_id = category_id;
  if (style_id !== undefined) updateData.style_id = style_id || null;
  if (fabric_type_id !== undefined) updateData.fabric_type_id = fabric_type_id || null;
  if (brand_id !== undefined) updateData.brand_id = brand_id || null;
  if (available_sizes !== undefined) updateData.available_sizes = available_sizes;
  if (price !== undefined) updateData.price = price;
  if (is_active !== undefined) updateData.is_active = is_active;
  const { is_archived } = req.body;
  if (is_archived !== undefined) updateData.is_archived = is_archived;

  if (is_active !== undefined || is_archived !== undefined) {
    console.log('[Design API] Update status request received', {
      designId: id,
      is_active,
      is_archived,
      requestedBy: req.user?.id,
    });
  }

  const { data: updatedDesignStatus, error } = await supabaseAdmin
    .from('designs')
    .update(updateData)
    .eq('id', id)
    .select('id, is_active, is_archived')
    .maybeSingle();

  if (error) {
    if (is_active !== undefined || is_archived !== undefined) {
      console.error('[Design API] Failed to update design status', {
        designId: id,
        is_active,
        is_archived,
        requestedBy: req.user?.id,
        error: error.message,
      });
    }
    throw new AppError(error.message, 400);
  }

  if ((is_active !== undefined || is_archived !== undefined) && !updatedDesignStatus) {
    console.error('[Design API] Design status update matched no rows', {
      designId: id,
      is_active,
      is_archived,
      requestedBy: req.user?.id,
    });
    throw new AppError('Design not found or status update was not permitted', 404);
  }

  const { data: design, error: fetchError } = await supabase
    .from('designs')
    .select(DESIGN_WITH_COLORS_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    if (is_active !== undefined || is_archived !== undefined) {
      console.error('[Design API] Failed to fetch design after status update', {
        designId: id,
        requestedBy: req.user?.id,
        error: fetchError.message,
      });
    }
    throw new AppError(fetchError.message, 400);
  }
  if (!design) throw new AppError('Design not found', 404);

  if (is_active !== undefined || is_archived !== undefined) {
    console.log('[Design API] Design status updated successfully', {
      designId: id,
      is_active: updatedDesignStatus?.is_active ?? design.is_active,
      is_archived: updatedDesignStatus?.is_archived ?? design.is_archived,
      requestedBy: req.user?.id,
    });
  }
  res.json(design);
}));

router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile?.user_roles?.role_name !== 'Admin') {
    throw new AppError('Admin access required', 403);
  }

  const { id } = req.params;

  console.log('[Design API] Delete design request received', {
    designId: id,
    requestedBy: req.user?.id,
  });

  const { data: design, error: fetchError } = await supabase
    .from('designs')
    .select('*, design_colors (id, image_urls)')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('[Design API] Failed to fetch design before delete', {
      designId: id,
      requestedBy: req.user?.id,
      error: fetchError.message,
    });
    throw new AppError(fetchError.message, 400);
  }
  if (!design) throw new AppError('Design not found', 404);

  // Delete all images from R2 in parallel (non-blocking per-image errors)
  if (design.design_colors?.length > 0) {
    const allImageUrls = design.design_colors.flatMap(c => c.image_urls || []);
    await deleteImagesFromR2(allImageUrls);
  }

  const { error } = await supabaseAdmin.from('designs').delete().eq('id', id);
  if (error) {
    console.error('[Design API] Failed to delete design', {
      designId: id,
      requestedBy: req.user?.id,
      error: error.message,
    });
    throw new AppError(error.message, 400);
  }

  console.log('[Design API] Design deleted successfully', {
    designId: id,
    requestedBy: req.user?.id,
  });

  res.json({ message: 'Design and associated images deleted successfully' });
}));

router.post('/:id/colors', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile?.user_roles?.role_name !== 'Admin') {
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
  if (req.profile?.user_roles?.role_name !== 'Admin') {
    throw new AppError('Admin access required', 403);
  }

  const { colorId } = req.params;
  const { color_name, color_code, in_stock, stock_quantity, size_quantities, image_urls, is_active } = req.body;

  const updateData = {};
  if (color_name !== undefined) updateData.color_name = color_name;
  if (color_code !== undefined) updateData.color_code = color_code;
  if (in_stock !== undefined) updateData.in_stock = in_stock;
  if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
  if (size_quantities !== undefined) updateData.size_quantities = size_quantities;
  if (image_urls !== undefined) updateData.image_urls = image_urls;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (is_active !== undefined) {
    console.log('[Design API] Update color status request received', {
      colorId,
      is_active,
      requestedBy: req.user?.id,
    });
  }

  const { data: updatedColorStatus, error } = await supabaseAdmin
    .from('design_colors')
    .update(updateData)
    .eq('id', colorId)
    .select('id, design_id, is_active')
    .maybeSingle();

  if (error) {
    if (is_active !== undefined) {
      console.error('[Design API] Failed to update color status', {
        colorId,
        is_active,
        requestedBy: req.user?.id,
        error: error.message,
      });
    }
    throw new AppError(error.message, 400);
  }

  if (is_active !== undefined && !updatedColorStatus) {
    console.error('[Design API] Color status update matched no rows', {
      colorId,
      is_active,
      requestedBy: req.user?.id,
    });
    throw new AppError('Color not found or status update was not permitted', 404);
  }

  const { data: color, error: fetchError } = await supabase
    .from('design_colors')
    .select('*')
    .eq('id', colorId)
    .maybeSingle();

  if (fetchError) {
    if (is_active !== undefined) {
      console.error('[Design API] Failed to fetch color after status update', {
        colorId,
        requestedBy: req.user?.id,
        error: fetchError.message,
      });
    }
    throw new AppError(fetchError.message, 400);
  }
  if (!color) throw new AppError('Color not found', 404);

  if (is_active !== undefined) {
    console.log('[Design API] Color status updated successfully', {
      colorId,
      designId: updatedColorStatus?.design_id ?? color.design_id,
      is_active: updatedColorStatus?.is_active ?? color.is_active,
      requestedBy: req.user?.id,
    });
  }
  res.json(color);
}));

router.delete('/colors/:colorId', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile?.user_roles?.role_name !== 'Admin') {
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

// POST /api/designs/bulk - Bulk insert/update designs
router.post('/bulk', authenticateUser, asyncHandler(async (req, res) => {
  if (req.profile?.user_roles?.role_name !== 'Admin') {
    throw new AppError('Admin access required', 403);
  }

  const { designs } = req.body;
  if (!Array.isArray(designs) || designs.length === 0) {
    throw new AppError('Designs array is required', 400);
  }

  const MAX_BULK_SIZE = 500;
  if (designs.length > MAX_BULK_SIZE) {
    throw new AppError(`Maximum ${MAX_BULK_SIZE} designs allowed per batch. Split into multiple requests.`, 400);
  }

  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  const BATCH_SIZE = 100; // Process in smaller chunks for upsert logic

  // Get all existing design numbers for quick lookup
  const { data: existingDesigns } = await supabase
    .from('designs')
    .select('id, design_no');

  const existingByDesignNo = new Map();
  existingDesigns?.forEach(d => {
    if (d.design_no) {
      existingByDesignNo.set(d.design_no.toLowerCase(), d.id);
    }
  });

  // Process in batches
  for (let i = 0; i < designs.length; i += BATCH_SIZE) {
    const batch = designs.slice(i, i + BATCH_SIZE);

    const designsToInsert = [];
    const designsToUpdate = [];

    for (const designData of batch) {
      try {
        // Validate required fields
        if (!designData.design_no || !designData.name) {
          results.errors.push(`Design missing design_no or name: ${JSON.stringify(designData)}`);
          results.skipped++;
          continue;
        }

        // Normalize data
        const normalized = {
          design_no: String(designData.design_no).trim(),
          name: String(designData.name).trim(),
          description: designData.description ? String(designData.description) : '',
          department: designData.department || null,
          tags: Array.isArray(designData.tags) ? designData.tags : 
                (designData.tags ? String(designData.tags).split(',').map(s => s.trim()) : []),
          work_type: designData.work_type || null,
          occasion: designData.occasion || null,
          collection: designData.collection || null,
          design_month_year: designData.design_month_year || null,
          category_id: designData.category_id || null,
          style_id: designData.style_id || null,
          fabric_type_id: designData.fabric_type_id || null,
          brand_id: designData.brand_id || null,
          available_sizes: Array.isArray(designData.available_sizes) ? designData.available_sizes :
                          (designData.available_sizes ? String(designData.available_sizes).split(',').map(s => s.trim()) : []),
          price: Number(designData.price) || 0,
          created_by: req.user.id,
          updated_by: req.user.id,
        };

        const existingId = existingByDesignNo.get(normalized.design_no.toLowerCase());
        if (existingId) {
          designsToUpdate.push({ ...normalized, id: existingId });
        } else {
          designsToInsert.push(normalized);
        }
      } catch (err) {
        results.errors.push(`Error processing design ${designData.design_no || 'unknown'}: ${err.message}`);
        results.skipped++;
      }
    }

    // Bulk insert new designs
    if (designsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('designs')
        .insert(designsToInsert)
        .select('id, design_no');

      if (insertError) {
        results.errors.push(`Bulk insert failed: ${insertError.message}`);
        results.skipped += designsToInsert.length;
      } else {
        results.inserted += inserted.length;
        // Update lookup map with newly inserted
        inserted.forEach(d => {
          existingByDesignNo.set(d.design_no.toLowerCase(), d.id);
        });
      }
    }

    // Bulk update existing designs (one by one for updates, or use a batch approach)
    for (const design of designsToUpdate) {
      const { error: updateError } = await supabase
        .from('designs')
        .update({
          name: design.name,
          description: design.description,
          department: design.department,
          tags: design.tags,
          work_type: design.work_type,
          occasion: design.occasion,
          collection: design.collection,
          design_month_year: design.design_month_year,
          category_id: design.category_id,
          style_id: design.style_id,
          fabric_type_id: design.fabric_type_id,
          brand_id: design.brand_id,
          available_sizes: design.available_sizes,
          price: design.price,
          updated_by: req.user.id,
        })
        .eq('id', design.id);

      if (updateError) {
        results.errors.push(`Failed to update ${design.design_no}: ${updateError.message}`);
        results.skipped++;
      } else {
        results.updated++;
      }
    }
  }

  res.json({
    success: results.errors.length === 0,
    ...results,
    total: designs.length,
  });
}));

export default router;
