import { Hono } from 'hono';
import { getSupabase, getSupabaseAdmin } from '../config.js';
import { authenticateUser, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { deleteFromR2, getPublicUrl } from '../lib/r2.js';

const designs = new Hono();

// Helper function to convert image URLs to signed URLs
function convertToSignedUrls(env, imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return imageUrls;

  const signedUrls = [];
  for (const imageUrl of imageUrls) {
    try {
      const urlParts = imageUrl.split('/');
      const keyStartIndex = urlParts.findIndex(part => part === 'designs');
      
      if (keyStartIndex !== -1) {
        const key = urlParts.slice(keyStartIndex).join('/');
        const publicUrl = getPublicUrl(env, key);
        signedUrls.push(publicUrl);
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

designs.get('/categories', optionalAuth, async (c) => {
  try {
    const { getSupabaseAdmin } = await import('../config.js');
    const supabase = getSupabaseAdmin(c.env);
    
    const { data: categories, error } = await supabase
      .from('design_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Categories error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(categories || []);
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

designs.get('/styles', optionalAuth, async (c) => {
  try {
    const { category_id } = c.req.query();
    const { getSupabaseAdmin } = await import('../config.js');
    const supabase = getSupabaseAdmin(c.env);

    let query = supabase
      .from('design_styles')
      .select('*')
      .eq('is_active', true);

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: styles, error } = await query.order('name');

    if (error) {
      console.error('Styles error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(styles || []);
  } catch (error) {
    console.error('Get styles error:', error);
    return c.json({ error: 'Failed to fetch styles' }, 500);
  }
});

designs.get('/fabric-types', optionalAuth, async (c) => {
  try {
    const { getSupabaseAdmin } = await import('../config.js');
    const supabase = getSupabaseAdmin(c.env);
    
    const { data: fabricTypes, error } = await supabase
      .from('fabric_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Fabric types error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(fabricTypes || []);
  } catch (error) {
    console.error('Get fabric types error:', error);
    return c.json({ error: 'Failed to fetch fabric types' }, 500);
  }
});

designs.get('/', optionalAuth, async (c) => {
  try {
    const { category_id, fabric_type_id, brand_id, style_id, active_only } = c.req.query();
    const user = c.get('user');
    const isAuthenticated = !!user;
    
    // Use admin client for reads (bypasses RLS for performance)
    // Middleware already checked authentication
    const supabase = getSupabaseAdmin(c.env);

    let query = supabase
      .from('designs')
      .select(`
        *,
        design_categories(id, name),
        design_styles(id, name),
        fabric_types(id, name),
        brands(id, name),
        design_colors(*)
      `);

    if (category_id) query = query.eq('category_id', category_id);
    if (fabric_type_id) query = query.eq('fabric_type_id', fabric_type_id);
    if (brand_id) query = query.eq('brand_id', brand_id);
    if (style_id) query = query.eq('style_id', style_id);
    if (active_only === 'true') query = query.eq('is_active', true);

    const { data: designs, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    // Convert image URLs to signed URLs for authenticated users
    if (isAuthenticated && designs) {
      designs.forEach(design => {
        if (design.design_colors) {
          design.design_colors.forEach(color => {
            if (color.image_urls) {
              color.image_urls = convertToSignedUrls(c.env, color.image_urls);
            }
          });
        }
      });
    }

    return c.json(designs);
  } catch (error) {
    console.error('Get designs error:', error);
    return c.json({ error: 'Failed to fetch designs' }, 500);
  }
});

designs.get('/:id', optionalAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const isAuthenticated = !!user;
    
    // Use admin client for reads (bypasses RLS for performance)
    const supabase = getSupabaseAdmin(c.env);

    const { data: design, error } = await supabase
      .from('designs')
      .select(`
        *,
        design_categories(id, name),
        design_styles(id, name),
        fabric_types(id, name),
        brands(id, name),
        design_colors(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !design) {
      return c.json({ error: 'Design not found' }, 404);
    }

    // Convert image URLs to signed URLs for authenticated users
    if (isAuthenticated && design.design_colors) {
      design.design_colors.forEach(color => {
        if (color.image_urls) {
          color.image_urls = convertToSignedUrls(c.env, color.image_urls);
        }
      });
    }

    return c.json(design);
  } catch (error) {
    console.error('Get design error:', error);
    return c.json({ error: 'Failed to fetch design' }, 500);
  }
});

designs.post('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const { design_no, name, description, category_id, style_id, fabric_type_id, brand_id, available_sizes, whatsapp_image_url, price, colors } = await c.req.json();
    const user = c.get('user');
    const { getSupabaseAdmin } = await import('../config.js');
    const supabase = getSupabaseAdmin(c.env);

    if (!design_no || !name) {
      return c.json({ error: 'Design number and name are required' }, 400);
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
        whatsapp_image_url: whatsapp_image_url || null,
        price: price || 0,
        created_by: user.id
      })
      .select()
      .single();

    if (designError) {
      console.error('Design insert error:', designError);
      return c.json({ error: designError.message }, 400);
    }

    if (colors && colors.length > 0) {
      const colorInserts = colors.map(color => ({
        design_id: design.id,
        color_name: color.color_name,
        color_code: color.color_code || '#000000',
        in_stock: color.in_stock !== undefined ? color.in_stock : true,
        stock_quantity: color.stock_quantity || 0,
        size_quantities: color.size_quantities || {},
        video_urls: color.video_urls || [],
        image_urls: color.image_urls || []
      }));

      const { error: colorsError } = await supabase
        .from('design_colors')
        .insert(colorInserts);

      if (colorsError) {
        console.error('Colors insert error:', colorsError);
        await supabase.from('designs').delete().eq('id', design.id);
        return c.json({ error: colorsError.message }, 400);
      }
    }

    const { data: fullDesign } = await supabase
      .from('designs')
      .select(`
        *,
        design_categories(id, name),
        design_styles(id, name),
        fabric_types(id, name),
        brands(id, name),
        design_colors(*)
      `)
      .eq('id', design.id)
      .single();

    return c.json(fullDesign, 201);
  } catch (error) {
    console.error('Create design error:', error);
    return c.json({ error: 'Failed to create design' }, 500);
  }
});

designs.put('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const { design_no, name, description, category_id, style_id, fabric_type_id, brand_id, available_sizes, whatsapp_image_url, price, is_active } = await c.req.json();
    
    // Use user context (RLS enforced)
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const { getSupabaseWithAuth } = await import('../config.js');
    const supabase = getSupabaseWithAuth(c.env, token);

    const updateData = {};
    if (design_no !== undefined) updateData.design_no = design_no;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (style_id !== undefined) updateData.style_id = style_id;
    if (fabric_type_id !== undefined) updateData.fabric_type_id = fabric_type_id;
    if (brand_id !== undefined) updateData.brand_id = brand_id;
    if (whatsapp_image_url !== undefined) updateData.whatsapp_image_url = whatsapp_image_url;
    if (available_sizes !== undefined) updateData.available_sizes = available_sizes;
    if (price !== undefined) updateData.price = price;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: design, error } = await supabase
      .from('designs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Design update error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json(design);
  } catch (error) {
    console.error('Update design error:', error);
    return c.json({ error: 'Failed to update design' }, 500);
  }
});

designs.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    
    // Use user context (RLS enforced)
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const { getSupabaseWithAuth } = await import('../config.js');
    const supabase = getSupabaseWithAuth(c.env, token);

    // Fetch design with colors and images
    const { data: design, error: fetchError } = await supabase
      .from('designs')
      .select(`
        *,
        design_colors(id, image_urls, video_urls)
      `)
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !design) {
      return c.json({ error: 'Design not found' }, 404);
    }

    // Delete images from R2
    if (design.design_colors) {
      for (const color of design.design_colors) {
        if (color.image_urls && color.image_urls.length > 0) {
          for (const imageUrl of color.image_urls) {
            try {
              const urlParts = imageUrl.split('/');
              const keyStartIndex = urlParts.findIndex(part => part === 'designs');
              
              if (keyStartIndex !== -1) {
                const key = urlParts.slice(keyStartIndex).join('/');
                await deleteFromR2(c.env, key);
              }
            } catch (deleteError) {
              console.error(`Failed to delete image ${imageUrl}:`, deleteError);
            }
          }
        }
      }
    }

    // Delete design from database (cascade will delete colors)
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Design deleted successfully' });
  } catch (error) {
    console.error('Delete design error:', error);
    return c.json({ error: 'Failed to delete design' }, 500);
  }
});

// Color management endpoints
designs.post('/:id/colors', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const { color_name, color_code, in_stock, stock_quantity, size_quantities, image_urls, video_urls } = await c.req.json();
    
    // Use user context (RLS enforced)
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const { getSupabaseWithAuth } = await import('../config.js');
    const supabase = getSupabaseWithAuth(c.env, token);

    if (!color_name) {
      return c.json({ error: 'Color name is required' }, 400);
    }

    const { data: color, error } = await supabase
      .from('design_colors')
      .insert({
        design_id: id,
        color_name,
        color_code: color_code || '#000000',
        in_stock: in_stock !== undefined ? in_stock : true,
        stock_quantity: stock_quantity || 0,
        size_quantities: size_quantities || {},
        image_urls: image_urls || [],
        video_urls: video_urls || []
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(color, 201);
  } catch (error) {
    console.error('Add color error:', error);
    return c.json({ error: 'Failed to add color' }, 500);
  }
});

designs.put('/:id/colors/:colorId', authenticateUser, requireAdmin, async (c) => {
  try {
    const { colorId } = c.req.param();
    const { color_name, color_code, in_stock, stock_quantity, size_quantities, image_urls, video_urls } = await c.req.json();
    const supabase = getSupabase(c.env);

    const updateData = {};
    if (color_name !== undefined) updateData.color_name = color_name;
    if (color_code !== undefined) updateData.color_code = color_code;
    if (in_stock !== undefined) updateData.in_stock = in_stock;
    if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
    if (size_quantities !== undefined) updateData.size_quantities = size_quantities;
    if (image_urls !== undefined) updateData.image_urls = image_urls;
    if (video_urls !== undefined) updateData.video_urls = video_urls;

    const { data: color, error } = await supabase
      .from('design_colors')
      .update(updateData)
      .eq('id', colorId)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json(color);
  } catch (error) {
    console.error('Update color error:', error);
    return c.json({ error: 'Failed to update color' }, 500);
  }
});

designs.delete('/:id/colors/:colorId', authenticateUser, requireAdmin, async (c) => {
  try {
    const { colorId } = c.req.param();
    
    // Use user context (RLS enforced)
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const { getSupabaseWithAuth } = await import('../config.js');
    const supabase = getSupabaseWithAuth(c.env, token);

    // Fetch color with images
    const { data: color, error: fetchError } = await supabase
      .from('design_colors')
      .select('id, image_urls')
      .eq('id', colorId)
      .maybeSingle();

    if (fetchError || !color) {
      return c.json({ error: 'Color not found' }, 404);
    }

    // Delete images from R2
    if (color.image_urls && color.image_urls.length > 0) {
      for (const imageUrl of color.image_urls) {
        try {
          const urlParts = imageUrl.split('/');
          const keyStartIndex = urlParts.findIndex(part => part === 'designs');
          
          if (keyStartIndex !== -1) {
            const key = urlParts.slice(keyStartIndex).join('/');
            await deleteFromR2(c.env, key);
          }
        } catch (deleteError) {
          console.error(`Failed to delete image ${imageUrl}:`, deleteError);
        }
      }
    }

    // Delete color from database
    const { error } = await supabase
      .from('design_colors')
      .delete()
      .eq('id', colorId);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Color deleted successfully' });
  } catch (error) {
    console.error('Delete color error:', error);
    return c.json({ error: 'Failed to delete color' }, 500);
  }
});

export default designs;
