-- Migration 26: Assisted onboarding full flow
-- Adds preview tokens, payment tracking, status machine, export log

-- Extend onboarding_assistance_requests
ALTER TABLE onboarding_assistance_requests
  ADD COLUMN IF NOT EXISTS status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','preview_ready','changes_requested','payment_pending','paid','complete')),
  ADD COLUMN IF NOT EXISTS superadmin_notes    TEXT,
  ADD COLUMN IF NOT EXISTS preview_token       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS preview_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preview_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS change_request_note TEXT,

  -- Payment fields
  ADD COLUMN IF NOT EXISTS setup_fee_paise     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_advance_paise INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_advance_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_final_order_id   TEXT,
  ADD COLUMN IF NOT EXISTS advance_paid_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_paid_at       TIMESTAMPTZ,

  -- Completion
  ADD COLUMN IF NOT EXISTS published_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exported_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ,

  -- Superadmin who is handling this request
  ADD COLUMN IF NOT EXISTS assigned_to         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index for fast status queries in platform admin
CREATE INDEX IF NOT EXISTS idx_assist_status   ON onboarding_assistance_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assist_token    ON onboarding_assistance_requests(preview_token) WHERE preview_token IS NOT NULL;

-- Preview page visits log (so superadmin can see if user opened the link)
CREATE TABLE IF NOT EXISTS preview_visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES onboarding_assistance_requests(id) ON DELETE CASCADE,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent  TEXT
);
