/**
 * Subscription billing routes — Razorpay integration
 *
 * POST /api/subscription/create-order   — creates a Razorpay order for a plan
 * POST /api/subscription/verify         — verifies payment + activates subscription
 * POST /webhook/razorpay                — Razorpay webhook (auto-renewal events)
 */

import express from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import { invalidateSubscriptionCache } from '../middleware/checkSubscription.js';
import { cache } from '../utils/cache.js';

const router = express.Router();

// Initialise Razorpay lazily so missing keys don't crash startup
function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Plan prices in paise (INR × 100)
const PLAN_PRICES = {
  Starter:    { monthly: 99900,  yearly: 999000  },  // ₹999 / ₹9990
  Growth:     { monthly: 249900, yearly: 2499000 },  // ₹2499 / ₹24990
  Enterprise: { monthly: 499900, yearly: 4999000 },  // ₹4999 / ₹49990
};

const PLAN_DURATION_MONTHS = { monthly: 1, yearly: 12 };

// ---------------------------------------------------------------------------
// POST /api/subscription/create-order
// Creates a Razorpay order. Requires admin auth.
// Body: { plan_name: 'Starter'|'Growth'|'Enterprise', period: 'monthly'|'yearly' }
// ---------------------------------------------------------------------------
router.post('/create-order', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { plan_name, period } = req.body;

    if (!plan_name || !period) {
      return res.status(400).json({ success: false, message: 'plan_name and period are required' });
    }
    if (!['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ success: false, message: 'period must be monthly or yearly' });
    }

    const prices = PLAN_PRICES[plan_name];
    if (!prices) {
      return res.status(400).json({ success: false, message: `Unknown plan: ${plan_name}` });
    }

    const amount = prices[period];
    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `sub_${req.tenantId}_${Date.now()}`,
      notes: {
        tenant_id: req.tenantId,
        plan_name,
        period,
      },
    });

    res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        plan_name,
        period,
        key_id: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/subscription/verify
// Verifies Razorpay payment signature and activates the subscription.
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_name, period }
// ---------------------------------------------------------------------------
router.post('/verify', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan_name,
      period,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment fields' });
    }

    // Verify HMAC-SHA256 signature — prevents spoofed confirmations
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ success: false, message: 'Razorpay not configured' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Idempotency — check if this order was already applied
    const cacheKey = `processed_order:${razorpay_order_id}`;
    if (cache.get(cacheKey)) {
      return res.json({ success: true, message: 'Already activated (duplicate callback)' });
    }

    // Activate subscription
    const months = PLAN_DURATION_MONTHS[period] ?? 1;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    // Resolve plan_id
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('name', plan_name)
      .single();

    const updates = {
      subscription_status: 'active',
      subscription_period: period,
      plan_id: plan?.id,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      grace_period_ends_at: null,
    };

    const { error } = await supabaseAdmin
      .from('tenants')
      .update(updates)
      .eq('id', req.tenantId);

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to activate subscription' });
    }

    // Record payment in billing history
    await supabaseAdmin.from('billing_history').insert({
      tenant_id: req.tenantId,
      razorpay_order_id,
      razorpay_payment_id,
      plan_name,
      period,
      amount_paise: PLAN_PRICES[plan_name]?.[period] ?? 0,
      status: 'paid',
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
    });

    invalidateSubscriptionCache(req.tenantId);
    cache.set(cacheKey, true, 86400); // prevent duplicate processing for 24h

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        plan_name,
        period,
        valid_until: periodEnd.toISOString(),
      },
    });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/subscription/billing-history
// Returns the last 12 billing records for this tenant.
// ---------------------------------------------------------------------------
router.get('/billing-history', authenticateUser, requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('billing_history')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false })
    .limit(12);

  res.json({ success: true, data: data ?? [] });
});

// ---------------------------------------------------------------------------
// POST /webhook/razorpay  (registered separately in server.js, no auth middleware)
// Handles Razorpay webhook events (payment.captured, subscription.activated, etc.)
// Verifies with webhook secret.
// ---------------------------------------------------------------------------
export async function razorpayWebhookHandler(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // req.body is a raw Buffer from express.raw middleware
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      if (signature !== expected) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const parsed = JSON.parse(rawBody);
    const event = parsed.event;
    const payload = parsed.payload;

    // payment.captured — a one-time payment completed
    if (event === 'payment.captured') {
      const payment = payload?.payment?.entity;
      const notes = payment?.notes ?? {};
      const tenantId = notes.tenant_id;
      const planName = notes.plan_name;
      const period = notes.period;

      if (tenantId && planName && period) {
        const months = PLAN_DURATION_MONTHS[period] ?? 1;
        const now = new Date();
        const periodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

        await supabaseAdmin.from('tenants').update({
          subscription_status: 'active',
          subscription_period: period,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          grace_period_ends_at: null,
        }).eq('id', tenantId);

        invalidateSubscriptionCache(tenantId);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Razorpay webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export default router;
