# Security Implementation Guide

## Proper RLS with User Context

This guide shows how to implement proper RLS security instead of bypassing it.

## Step 1: Add User Context Helper

Update `workers/src/config.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

export function getConfig(env) {
  return {
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
    supabaseServiceKey: env.VITE_SUPABASE_SERVICE_KEY,
    r2PublicUrl: env.R2_PUBLIC_URL
  };
}

// Anonymous/public client
export function getSupabase(env) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
}

// Admin client (bypasses RLS) - use sparingly
export function getSupabaseAdmin(env) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// NEW: Client with user context (enforces RLS)
export function getSupabaseWithAuth(env, userToken) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

## Step 2: Update Design Endpoints

### Create Design (Proper RLS)

```javascript
designs.post('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const { design_no, name, description, category_id, style_id, fabric_type_id, brand_id, available_sizes, whatsapp_image_url, colors } = await c.req.json();
    
    // Get user's JWT token
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const user = c.get('user');
    
    // Use client with user context (RLS enforced)
    const { getSupabaseWithAuth } = await import('../config.js');
    const supabase = getSupabaseWithAuth(c.env, token);

    if (!design_no || !name) {
      return c.json({ error: 'Design number and name are required' }, 400);
    }

    // RLS policy will check:
    // 1. User is authenticated (via JWT)
    // 2. User is admin (via user_profiles.role)
    // 3. User is active (via user_profiles.is_active)
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
        created_by: user.id
      })
      .select()
      .single();

    if (designError) {
      console.error('Design insert error:', designError);
      return c.json({ error: designError.message }, 400);
    }

    // Insert colors with same user context
    if (colors && colors.length > 0) {
      const colorInserts = colors.map(color => ({
        design_id: design.id,
        color_name: color.color_name,
        color_code: color.color_code || '#000000',
        price: color.price || 0,
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
        // Rollback - delete the design
        await supabase.from('designs').delete().eq('id', design.id);
        return c.json({ error: colorsError.message }, 400);
      }
    }

    // Fetch full design with relations
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
```

### Get Designs (Admin Client for Performance)

```javascript
designs.get('/', authenticateUser, async (c) => {
  try {
    const { category_id, fabric_type_id, brand_id, style_id, active_only } = c.req.query();
    
    // Use admin client for reads (faster, middleware already checked auth)
    const { getSupabaseAdmin } = await import('../config.js');
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

    return c.json(designs);
  } catch (error) {
    console.error('Get designs error:', error);
    return c.json({ error: 'Failed to fetch designs' }, 500);
  }
});
```

### Update Design (Proper RLS)

```javascript
designs.put('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    const { design_no, name, description, category_id, style_id, fabric_type_id, brand_id, available_sizes, whatsapp_image_url, is_active } = await c.req.json();
    
    // Get user's JWT token
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    
    // Use client with user context (RLS enforced)
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
    if (is_active !== undefined) updateData.is_active = is_active;

    // RLS policy will verify user can update
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
```

### Delete Design (Proper RLS)

```javascript
designs.delete('/:id', authenticateUser, requireAdmin, async (c) => {
  try {
    const { id } = c.req.param();
    
    // Get user's JWT token
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    
    // Use client with user context (RLS enforced)
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

    // RLS policy will verify user can delete
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
```

## When to Use Each Client

### Use `getSupabaseAdmin(env)` for:
- ✅ Public endpoints (categories, styles, fabric types)
- ✅ Read operations after authentication check (performance)
- ✅ System operations (cleanup, migrations)

### Use `getSupabaseWithAuth(env, token)` for:
- ✅ Create operations (designs, users, orders)
- ✅ Update operations (designs, users, orders)
- ✅ Delete operations (designs, users, orders)
- ✅ Any operation that modifies sensitive data

### Use `getSupabase(env)` for:
- ✅ Truly public endpoints (no auth required)
- ✅ Health checks
- ✅ Public data that RLS allows anonymous access

## Benefits of Proper RLS

1. **Defense-in-Depth**: Even if middleware fails, database protects data
2. **Audit Trail**: Database logs show which user performed action
3. **Compliance**: Meets security standards requiring database-level security
4. **Future-Proof**: If you add direct Supabase access later, it's already secure
5. **Debugging**: RLS errors help catch authorization bugs

## Migration Path

If you want to migrate from current (admin client) to proper RLS:

1. **Phase 1**: Add `getSupabaseWithAuth` helper
2. **Phase 2**: Update write operations (POST/PUT/DELETE) to use user context
3. **Phase 3**: Test thoroughly
4. **Phase 4**: Keep read operations with admin client (performance)

This gives you the best of both worlds: security for writes, performance for reads.
