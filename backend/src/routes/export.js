import express from 'express';
import { supabaseAdmin } from '../config.js';
import { authenticateUser } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Tight rate limit — export is a heavy operation
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many export requests. Please try again later.' },
});

router.use(authenticateUser);
router.use(exportLimiter);

// GET /api/export/designs
router.get('/designs', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('designs')
    .select(`
      design_no, name, description, price, work_type, occasion, collection,
      available_sizes, tags, is_active, design_month_year,
      design_categories(name),
      design_styles(name),
      fabric_types(name),
      brands(name),
      design_colors(color_name, color_code, in_stock, size_quantities, image_urls)
    `)
    .order('design_no');

  if (error) return res.status(500).json({ error: 'Failed to export designs' });
  res.json({ success: true, count: data.length, data });
});

// GET /api/export/parties
router.get('/parties', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('parties')
    .select(`
      party_id, name, address, city, district, state, pincode,
      phone_number, email_id, grade, transport_name,
      preferred_transport_1, preferred_transport_2, default_discount,
      party_phone_numbers(phone_number, contact_name, designation, is_default)
    `)
    .order('name');

  if (error) return res.status(500).json({ error: 'Failed to export parties' });
  res.json({ success: true, count: data.length, data });
});

// GET /api/export/transport
router.get('/transport', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('transport')
    .select('transport_name, email_id, created_at')
    .order('transport_name');

  if (error) return res.status(500).json({ error: 'Failed to export transport' });
  res.json({ success: true, count: data.length, data });
});

export default router;
