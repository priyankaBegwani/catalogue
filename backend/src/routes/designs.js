import express from 'express';
import { supabase, config } from '../config.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { deleteFromWasabi, generateSignedGetUrl } from '../config/wasabi.js';
import { deleteFromSupabase, generateSupabaseSignedGetUrl } from '../config/supabaseStorage.js';
import { deleteFromLocalStorage } from '../config/localStorage.js';

const router = express.Router();

// Helper function to convert image URLs to signed URLs
async function convertToSignedUrls(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return imageUrls;

  // Only generate signed URLs for storage types that require it
  if (config.storageType !== 'cdn' && config.storageType !== 'supabase') {
    return imageUrls;
  }

  const signedUrls = [];
  for (const imageUrl of imageUrls) {
    try {
      const urlParts = imageUrl.split('/');
      const keyStartIndex = urlParts.findIndex(part => part === 'designs');
      
      if (keyStartIndex !== -1) {
        const key = urlParts.slice(keyStartIndex).join('/');
        if (config.storageType === 'cdn') {
          const signedUrl = await generateSignedGetUrl(key, 3600);
          signedUrls.push(signedUrl);
        } else if (config.storageType === 'supabase') {
          const signedUrl = await generateSupabaseSignedGetUrl(key, 3600);
          signedUrls.push(signedUrl);
        } else {
          signedUrls.push(imageUrl);
        }
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

router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('design_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/styles', authenticateUser, async (req, res) => {
  try {
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(styles);
  } catch (error) {
    console.error('Get styles error:', error);
    res.status(500).json({ error: 'Failed to fetch styles' });
  }
});

router.get('/fabric-types', optionalAuth, async (req, res) => {
  try {
    const { data: fabricTypes, error } = await supabase
      .from('fabric_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(fabricTypes);
  } catch (error) {
    console.error('Get fabric types error:', error);
    res.status(500).json({ error: 'Failed to fetch fabric types' });
  }
});

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category_id, fabric_type_id, active_only } = req.query;
    const isAuthenticated = !!req.user;

    let query = supabase
      .from('designs')
      .select(`
        *,
        design_colors (
          id,
          color_name,
          color_code,
          price,
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
      .order('created_at', { ascending: false });

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (fabric_type_id) {
      query = query.eq('fabric_type_id', fabric_type_id);
    }

    // Filter only active designs for catalogue view
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data: designs, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Convert image URLs to signed URLs for all designs
    const designsWithSignedUrls = await Promise.all(
      designs.map(async (design) => ({
        ...design,
        design_colors: await Promise.all(
          (design.design_colors || []).map(async (color) => ({
            ...color,
            image_urls: await convertToSignedUrls(color.image_urls)
          }))
        )
      }))
    );

    // Hide prices for non-authenticated users
    if (!isAuthenticated) {
      const sanitizedDesigns = designsWithSignedUrls.map(design => ({
        ...design,
        design_colors: design.design_colors?.map(color => ({
          ...color,
          price: null,
          stock_quantity: null,
          size_quantities: null
        }))
      }));
      return res.json(sanitizedDesigns);
    }

    res.json(designsWithSignedUrls);
  } catch (error) {
    console.error('Get designs error:', error);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
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
          price,
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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    // Hide prices for non-authenticated users
    if (!isAuthenticated) {
      const sanitizedDesign = {
        ...design,
        design_colors: design.design_colors?.map(color => ({
          ...color,
          price: null,
          stock_quantity: null,
          size_quantities: null
        }))
      };
      return res.json(sanitizedDesign);
    }

    res.json(design);
  } catch (error) {
    console.error('Get design error:', error);
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});

router.post('/', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { design_no, name, description, category_id, style_id, fabric_type_id, available_sizes, colors } = req.body;

    if (!design_no || !name) {
      return res.status(400).json({ error: 'Design number and name are required' });
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
        available_sizes: available_sizes || [],
        created_by: req.user.id
      })
      .select()
      .single();

    if (designError) {
      return res.status(400).json({ error: designError.message });
    }

    if (colors && colors.length > 0) {
      const colorInserts = colors.map(color => ({
        design_id: design.id,
        color_name: color.color_name,
        color_code: color.color_code || null,
        price: color.price || 0,
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
        return res.status(400).json({ error: colorsError.message });
      }
    }

    const { data: fullDesign } = await supabase
      .from('designs')
      .select(`
        *,
        design_colors (*)
      `)
      .eq('id', design.id)
      .single();

    res.status(201).json(fullDesign);
  } catch (error) {
    console.error('Create design error:', error);
    res.status(500).json({ error: 'Failed to create design' });
  }
});

router.put('/:id', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { design_no, name, description, category_id, style_id, fabric_type_id, available_sizes, is_active } = req.body;

    const updateData = {};
    if (design_no !== undefined) updateData.design_no = design_no;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (style_id !== undefined) updateData.style_id = style_id || null;
    if (fabric_type_id !== undefined) updateData.fabric_type_id = fabric_type_id || null;
    if (available_sizes !== undefined) updateData.available_sizes = available_sizes;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: design, error } = await supabase
      .from('designs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        design_colors (*)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(design);
  } catch (error) {
    console.error('Update design error:', error);
    res.status(500).json({ error: 'Failed to update design' });
  }
});

router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // First, fetch the design with all its colors and images
    const { data: design, error: fetchError } = await supabase
      .from('designs')
      .select(`
        *,
        design_colors (
          id,
          image_urls
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message });
    }

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    // Delete all images from storage
    if (design.design_colors && design.design_colors.length > 0) {
      for (const color of design.design_colors) {
        if (color.image_urls && color.image_urls.length > 0) {
          for (const imageUrl of color.image_urls) {
            try {
              // Extract key from URL
              const urlParts = imageUrl.split('/');
              const keyStartIndex = urlParts.findIndex(part => part === 'designs');
              
              if (keyStartIndex !== -1) {
                const key = urlParts.slice(keyStartIndex).join('/');
                
                // Delete from appropriate storage
                switch (config.storageType) {
                  case 'cdn':
                    await deleteFromWasabi(key);
                    console.log(`Deleted from Wasabi: ${key}`);
                    break;
                  case 'supabase':
                    await deleteFromSupabase(key);
                    console.log(`Deleted from Supabase: ${key}`);
                    break;
                  case 'local':
                    await deleteFromLocalStorage(key);
                    console.log(`Deleted from local storage: ${key}`);
                    break;
                }
              }
            } catch (deleteError) {
              console.error(`Failed to delete image ${imageUrl}:`, deleteError);
              // Continue with other images even if one fails
            }
          }
        }
      }
    }

    // Now delete the design from database (cascade will delete colors)
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Design and associated images deleted successfully' });
  } catch (error) {
    console.error('Delete design error:', error);
    res.status(500).json({ error: 'Failed to delete design' });
  }
});

router.post('/:id/colors', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { color_name, color_code, price, in_stock, stock_quantity, size_quantities, image_urls } = req.body;

    if (!color_name) {
      return res.status(400).json({ error: 'Color name is required' });
    }

    const { data: color, error } = await supabase
      .from('design_colors')
      .insert({
        design_id: id,
        color_name,
        color_code: color_code || null,
        price: price || 0,
        in_stock: in_stock !== undefined ? in_stock : true,
        stock_quantity: stock_quantity || 0,
        size_quantities: size_quantities || { S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 },
        image_urls: image_urls || []
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(color);
  } catch (error) {
    console.error('Add color error:', error);
    res.status(500).json({ error: 'Failed to add color' });
  }
});

router.put('/colors/:colorId', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { colorId } = req.params;
    const { color_name, color_code, price, in_stock, stock_quantity, size_quantities, image_urls } = req.body;

    const updateData = {};
    if (color_name !== undefined) updateData.color_name = color_name;
    if (color_code !== undefined) updateData.color_code = color_code;
    if (price !== undefined) updateData.price = price;
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

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(color);
  } catch (error) {
    console.error('Update color error:', error);
    res.status(500).json({ error: 'Failed to update color' });
  }
});

router.delete('/colors/:colorId', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { colorId } = req.params;

    // First, fetch the color with its images
    const { data: color, error: fetchError } = await supabase
      .from('design_colors')
      .select('id, image_urls')
      .eq('id', colorId)
      .single();

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message });
    }

    if (!color) {
      return res.status(404).json({ error: 'Color not found' });
    }

    // Delete all images from storage
    if (color.image_urls && color.image_urls.length > 0) {
      for (const imageUrl of color.image_urls) {
        try {
          // Extract key from URL
          const urlParts = imageUrl.split('/');
          const keyStartIndex = urlParts.findIndex(part => part === 'designs');
          
          if (keyStartIndex !== -1) {
            const key = urlParts.slice(keyStartIndex).join('/');
            
            // Delete from appropriate storage
            switch (config.storageType) {
              case 'cdn':
                await deleteFromWasabi(key);
                console.log(`Deleted from Wasabi: ${key}`);
                break;
              case 'supabase':
                await deleteFromSupabase(key);
                console.log(`Deleted from Supabase: ${key}`);
                break;
              case 'local':
                await deleteFromLocalStorage(key);
                console.log(`Deleted from local storage: ${key}`);
                break;
            }
          }
        } catch (deleteError) {
          console.error(`Failed to delete image ${imageUrl}:`, deleteError);
          // Continue with other images even if one fails
        }
      }
    }

    // Now delete the color from database
    const { error } = await supabase
      .from('design_colors')
      .delete()
      .eq('id', colorId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Color and associated images deleted successfully' });
  } catch (error) {
    console.error('Delete color error:', error);
    res.status(500).json({ error: 'Failed to delete color' });
  }
});

export default router;
