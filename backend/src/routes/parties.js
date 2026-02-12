import express from 'express';
import { supabaseAdmin, supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Get all parties
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data: parties, error } = await supabaseAdmin
      .from('parties')
      .select(`*`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Parties fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch parties' });
    }

    res.json({ parties });
  } catch (error) {
    console.error('Parties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single party
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: party, error } = await supabaseAdmin
      .from('parties')
      .select(`
        *
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Party fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch party' });
    }

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    res.json({ party });
  } catch (error) {
    console.error('Party fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new party
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      address, 
      city, 
      state, 
      pincode, 
      phone_number,
      gst_number
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Party name is required' });
    }
    console.log("req.user.id in parties>>>>>>>>>>>>>", req.user.id);
    const { data: party, error } = await supabaseAdmin
      .from('parties')
      .insert([
        {
          name,
          description: description || '',
          address: address || '',
          city: city || '',
          state: state || '',
          pincode: pincode || '',
          phone_number: phone_number || '',
          gst_number: gst_number || '',
          created_by: req.user.id
        }
      ])
      .select(`
        *
      `)
      .single();

    if (error) {
      console.error('Party creation error:', error);
      return res.status(500).json({ error: 'Failed to create party' });
    }

    res.status(201).json({
      message: 'Party created successfully',
      party
    });
  } catch (error) {
    console.error('Party creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update party
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      address, 
      city, 
      state, 
      pincode, 
      phone_number,
      gst_number
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Party name is required' });
    }

    const { data: party, error } = await supabase
      .from('parties')
      .update({
        name,
        description: description || '',
        address: address || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
        phone_number: phone_number || '',
        gst_number: gst_number || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *
      `)
      .single();

    if (error) {
      console.error('Party update error:', error);
      return res.status(500).json({ error: 'Failed to update party' });
    }

    if (!party) {
      return res.status(404).json({ error: 'Party not found or you do not have permission to update it' });
    }

    res.json({
      message: 'Party updated successfully',
      party
    });
  } catch (error) {
    console.error('Party update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete party
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // First check if there are any users associated with this party
    console.log('Checking dependencies for party ID:', id);
    const { data: users, error: userCheckError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('party_id', id);

    if (userCheckError) {
      console.error('User check error:', userCheckError);
      console.error('Error details:', JSON.stringify(userCheckError, null, 2));
      return res.status(500).json({ error: 'Failed to check party dependencies' });
    }

    console.log('Found users:', users);

    if (users && users.length > 0) {
      const userList = users.map(u => `${u.full_name} (${u.email})`).join(', ');
      return res.status(400).json({ 
        error: `Cannot delete party. It has ${users.length} associated user(s): ${userList}. Please reassign or delete these users first.` 
      });
    }

    // Check for any other dependencies (orders, etc.)
    // Note: Skip order check for now if orders table doesn't exist or has different structure
    let hasOrders = false;
    try {
      const { data: orders, error: orderCheckError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('party_id', id)
        .limit(1);

      if (orderCheckError) {
        console.log('Order check failed (table might not exist or different structure):', orderCheckError.message);
        // Don't fail the deletion if orders table doesn't exist
      } else if (orders && orders.length > 0) {
        hasOrders = true;
      }
    } catch (err) {
      console.log('Order check exception:', err.message);
      // Don't fail the deletion if orders table doesn't exist
    }

    if (hasOrders) {
      return res.status(400).json({ 
        error: 'Cannot delete party. It has associated orders. Please delete the orders first or archive the party instead.' 
      });
    }

    // If no dependencies, proceed with deletion
    const { error } = await supabaseAdmin
      .from('parties')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Party deletion error:', error);
      
      // Handle specific database errors
      if (error.code === '23503') {
        return res.status(400).json({ 
          error: 'Cannot delete party due to database constraints. The party may have associated records.' 
        });
      }
      
      return res.status(500).json({ error: 'Failed to delete party' });
    }

    res.json({ message: 'Party deleted successfully' });
  } catch (error) {
    console.error('Party deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;