import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired,
  validateUUID,
  executeQuery,
  getOneOrFail,
  cacheMiddleware,
  cache
} from '../utils/index.js';

const router = express.Router();

// Get all transport options
router.get('/', 
  authenticateUser, 
  cacheMiddleware(600), // Cache for 10 minutes
  asyncHandler(async (req, res) => {
    const transportOptions = await executeQuery(
      supabaseAdmin
        .from('transport')
        .select('*')
        .order('created_at', { ascending: false }),
      'Failed to fetch transport options'
    );

    res.json({ transportOptions });
  })
);

// Export to Excel - must come before /:id route
router.get('/export/excel',
  (req, res, next) => {
    console.log('=== EXCEL EXPORT REQUEST RECEIVED ===');
    console.log('Headers:', req.headers.authorization ? 'Authorization header present' : 'NO Authorization header');
    console.log('Auth header value:', req.headers.authorization?.substring(0, 30));
    next();
  },
  authenticateUser,
  asyncHandler(async (req, res) => {
    console.log('=== AFTER AUTHENTICATION ===');
    console.log('User ID:', req.user?.id);
    console.log('User email:', req.user?.email);
    console.log('Timestamp:', new Date().toISOString());
    
    try {
      const transportOptions = await executeQuery(
        supabaseAdmin
          .from('transport')
          .select('*')
          .order('created_at', { ascending: false }),
        'Failed to fetch transport options for export'
      );

      console.log('Transport records fetched:', transportOptions?.length || 0);

      // If no data, return empty array with proper structure
      if (!transportOptions || transportOptions.length === 0) {
        console.log('No transport data found, returning empty array');
        return res.json({ data: [] });
      }

      // Format data for Excel
      const excelData = transportOptions.map(transport => ({
        'Transport Name': transport.transport_name,
        'Description': transport.description || '',
        'Address': transport.address || '',
        'Phone Number': transport.phone_number || '',
        'Email ID': transport.email_id || '',
        'GST Number': transport.gst_number || '',
        'State': transport.state || '',
        'District': transport.district || '',
        'City': transport.city || '',
        'Pincode': transport.pincode || '',
        'Created Date': new Date(transport.created_at).toLocaleDateString()
      }));
      
      console.log('Excel data formatted successfully, rows:', excelData.length);
      console.log('Sample row:', JSON.stringify(excelData[0]));
      console.log('Sending response...');
      
      res.json({ data: excelData });
      console.log('Response sent successfully');
    } catch (error) {
      console.error('ERROR in Excel export:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  })
);

// Export to PDF - must come before /:id route
router.get('/export/pdf',
  (req, res, next) => {
    console.log('=== PDF EXPORT REQUEST RECEIVED ===');
    console.log('Headers:', req.headers.authorization ? 'Authorization header present' : 'NO Authorization header');
    console.log('Auth header value:', req.headers.authorization?.substring(0, 30));
    next();
  },
  authenticateUser,
  asyncHandler(async (req, res) => {
    console.log('=== AFTER PDF AUTHENTICATION ===');
    console.log('User ID:', req.user?.id);
    console.log('User email:', req.user?.email);
    console.log('Timestamp:', new Date().toISOString());
    
    const transportOptions = await executeQuery(
      supabaseAdmin
        .from('transport')
        .select('*')
        .order('created_at', { ascending: false }),
      'Failed to fetch transport options for export'
    );

    console.log('Transport records fetched for PDF:', transportOptions?.length || 0);

    // Format data for PDF
    const pdfData = transportOptions.map(transport => ({
      transport_name: transport.transport_name,
      description: transport.description || '',
      address: transport.address || '',
      phone_number: transport.phone_number || '',
      email_id: transport.email_id || '',
      gst_number: transport.gst_number || '',
      state: transport.state || '',
      district: transport.district || '',
      city: transport.city || '',
      pincode: transport.pincode || '',
      created_at: new Date(transport.created_at).toLocaleDateString()
    }));
    
    console.log('PDF data formatted successfully, rows:', pdfData.length);
    console.log('Sending PDF response...');
    res.json({ data: pdfData });
    console.log('PDF response sent successfully');
  })
);

// Get single transport option
router.get('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Transport ID');

    const transport = await getOneOrFail(
      supabaseAdmin
        .from('transport')
        .select('*')
        .eq('id', id),
      'Transport option not found'
    );

    res.json({ transport });
  })
);

// Create new transport option
router.post('/', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { 
      transport_name, 
      description, 
      address, 
      phone_number, 
      email_id,
      gst_number, 
      state, 
      district, 
      city, 
      pincode 
    } = req.body;

    validateRequired(req.body, ['transport_name']);

    const { data: transport, error } = await supabaseAdmin
      .from('transport')
      .insert([
        {
          transport_name,
          description: description || '',
          address: address || '',
          phone_number: phone_number || '',
          email_id: email_id || '',
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
      if (error.code === '23505') {
        if (error.message.includes('transport_name')) {
          throw new AppError('Transport name already exists', 400);
        }
        throw new AppError('Duplicate key error: ' + error.message, 400);
      }
      throw new AppError('Failed to create transport option', 500, { dbError: error.message });
    }

    // Invalidate cache
    cache.delete('cache:/api/transport');
    cache.delete('cache:/api/orders/transport');

    res.status(201).json({
      message: 'Transport option created successfully',
      transport
    });
  })
);

// Update transport option
router.put('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      transport_name, 
      description, 
      address, 
      phone_number, 
      email_id,
      gst_number, 
      state, 
      district, 
      city, 
      pincode 
    } = req.body;

    validateUUID(id, 'Transport ID');
    validateRequired(req.body, ['transport_name']);

    const { data: transport, error } = await supabaseAdmin
      .from('transport')
      .update({
        transport_name,
        description: description || '',
        address: address || '',
        phone_number: phone_number || '',
        email_id: email_id || '',
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
      if (error.code === '23505') {
        throw new AppError('Transport name already exists', 400);
      }
      throw new AppError('Failed to update transport option', 500, { dbError: error.message });
    }

    // Invalidate cache
    cache.delete('cache:/api/transport');
    cache.delete('cache:/api/orders/transport');

    res.json({
      message: 'Transport option updated successfully',
      transport
    });
  })
);

// Delete transport option
router.delete('/:id', 
  authenticateUser, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    validateUUID(id, 'Transport ID');

    await executeQuery(
      supabaseAdmin
        .from('transport')
        .delete()
        .eq('id', id),
      'Failed to delete transport option'
    );

    // Invalidate cache
    cache.delete('cache:/api/transport');
    cache.delete('cache:/api/orders/transport');

    res.json({ message: 'Transport option deleted successfully' });
  })
);

export default router;