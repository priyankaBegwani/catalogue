-- ============================================================================
-- Migration 21: Subscription enforcement
-- - Extend trial period default to 30 days
-- - Add subscription period tracking columns
-- - Grace period: 3 days after trial/subscription ends before full freeze
-- ============================================================================

-- Add subscription tracking columns
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_period text
    CHECK (subscription_period IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end  timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;

-- Change trial default from 14 days to 30 days for new tenants
ALTER TABLE tenants
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');

-- Extend existing trial tenants to 30 days if they were seeded with 14-day default
-- (safe to run multiple times — only touches tenants still within their original trial)
UPDATE tenants
SET trial_ends_at = created_at + interval '30 days'
WHERE subscription_status = 'trial'
  AND trial_ends_at IS NOT NULL
  AND trial_ends_at < created_at + interval '30 days';

-- Default tenant is always active (dev/demo)
UPDATE tenants
SET
  subscription_status = 'active',
  trial_ends_at        = NULL,
  current_period_end   = '2099-12-31'::timestamptz
WHERE id = '00000000-0000-0000-0000-000000000001';
