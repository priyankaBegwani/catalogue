import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/brands - Get all brands (public can see active, admin sees all)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const isAuthenticated = !!req.user;
    const isAdmin = req.profile?.role === 'admin';

    let query = supabase
      .from('brands')
      .select('*')
      .order('display_order', { ascending: true });

    // Non-admin users only see active brands
    if (!isAdmin) {
      query = query.eq('is_active', true);
    }

    const { data: brands, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(brands);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// GET /api/brands/:id - Get single brand
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// POST /api/brands - Create new brand (admin only)
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { name, description, logo_url, is_active, display_order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const { data: brand, error } = await supabase
      .from('brands')
      .insert({
        name,
        description,
        logo_url,
        is_active: is_active !== undefined ? is_active : true,
        display_order: display_order || 0,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Brand name already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(brand);
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// PUT /api/brands/:id - Update brand (admin only)
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo_url, is_active, display_order } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data: brand, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Brand name already exists' });
      }
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// DELETE /api/brands/:id - Delete brand (admin only)
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if brand is used by any designs
    const { count } = await supabase
      .from('designs')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id);

    if (count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete brand. It is used by ${count} design(s)` 
      });
    }

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

export default router;
