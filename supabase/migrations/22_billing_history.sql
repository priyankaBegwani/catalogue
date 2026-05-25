-- Migration 22: billing_history table for Razorpay payment records
-- Tracks every successful subscription payment per tenant

CREATE TABLE IF NOT EXISTS billing_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  razorpay_order_id   TEXT NOT NULL,
  razorpay_payment_id TEXT,
  plan_name           TEXT NOT NULL,
  period              TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  amount_paise        INTEGER NOT NULL,   -- amount in paise (INR × 100)
  status              TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'failed', 'refunded')),
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_history_tenant ON billing_history(tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_history_order ON billing_history(razorpay_order_id);
