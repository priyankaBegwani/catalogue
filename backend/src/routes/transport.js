import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Get all transport options
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data: transportOptions, error } = await supabase
      .from('transport')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Transport options fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch transport options' });
    }

    res.json({ transportOptions });
  } catch (error) {
    console.error('Transport options error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single transport option
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: transport, error } = await supabase
      .from('transport')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Transport fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch transport option' });
    }

    if (!transport) {
      return res.status(404).json({ error: 'Transport option not found' });
    }

    res.json({ transport });
  } catch (error) {
    console.error('Transport fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new transport option
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { 
      transport_name, 
      description, 
      address, 
      phone_number, 
      gst_number, 
      state, 
      district, 
      city, 
      pincode 
    } = req.body;

    if (!transport_name) {
      return res.status(400).json({ error: 'Transport name is required' });
    }

    const { data: transport, error } = await supabase
      .from('transport')
      .insert([
        {
          transport_name,
          description: description || '',
          address: address || '',
          phone_number: phone_number || '',
          gst_number: gst_number || '',
          state: state || '',
          district: district || '',
          city: city || '',
          pincode: pincode || ''
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Transport creation error:', error);
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('transport_name')) {
          return res.status(400).json({ error: 'Transport name already exists' });
        }
        return res.status(400).json({ error: 'Duplicate key error: ' + error.message });
      }
      return res.status(500).json({ error: 'Failed to create transport option: ' + error.message });
    }

    res.status(201).json({
      message: 'Transport option created successfully',
      transport
    });
  } catch (error) {
    console.error('Transport creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transport option
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      transport_name, 
      description, 
      address, 
      phone_number, 
      gst_number, 
      state, 
      district, 
      city, 
      pincode 
    } = req.body;

    if (!transport_name) {
      return res.status(400).json({ error: 'Transport name is required' });
    }

    const { data: transport, error } = await supabase
      .from('transport')
      .update({
        transport_name,
        description: description || '',
        address: address || '',
        phone_number: phone_number || '',
        gst_number: gst_number || '',
        state: state || '',
        district: district || '',
        city: city || '',
        pincode: pincode || ''
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Transport update error:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Transport name already exists' });
      }
      return res.status(500).json({ error: 'Failed to update transport option' });
    }

    if (!transport) {
      return res.status(404).json({ error: 'Transport option not found' });
    }

    res.json({
      message: 'Transport option updated successfully',
      transport
    });
  } catch (error) {
    console.error('Transport update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transport option
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('transport')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Transport deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete transport option' });
    }

    res.json({ message: 'Transport option deleted successfully' });
  } catch (error) {
    console.error('Transport deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;