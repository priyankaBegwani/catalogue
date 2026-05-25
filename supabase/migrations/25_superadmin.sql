-- Migration 25: Superadmin + assistance request improvements

-- Add superadmin flag to user_profiles
-- Superadmin is cross-tenant, has access to internal tools, bypasses tenant isolation
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- Extend onboarding_assistance_requests with catalog details
-- (replacing the old simple WhatsApp-only form)
ALTER TABLE onboarding_assistance_requests
  ADD COLUMN IF NOT EXISTS contact_name      TEXT,
  ADD COLUMN IF NOT EXISTS call_time         TEXT,         -- preferred call time
  ADD COLUMN IF NOT EXISTS catalog_size      TEXT CHECK (catalog_size IN ('small', 'medium', 'large', 'enterprise')),
  ADD COLUMN IF NOT EXISTS data_links        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS uploaded_file_urls JSONB  NOT NULL DEFAULT '[]';
-- catalog_size: small=<100, medium=100-500, large=500-2000, enterprise=2000+

-- Internal tool runs: tracks superadmin tool usage per tenant
CREATE TABLE IF NOT EXISTS internal_tool_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_by          UUID NOT NULL,   -- superadmin user id
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  tool            TEXT NOT NULL CHECK (tool IN ('image_restructure', 'design_completion')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  input_summary   JSONB NOT NULL DEFAULT '{}',   -- files, row counts etc
  output_summary  JSONB NOT NULL DEFAULT '{}',   -- inserted, failed, skipped etc
  ai_used         BOOLEAN NOT NULL DEFAULT false,
  ai_cost_usd     NUMERIC(10,4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internal_runs_tenant ON internal_tool_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_runs_superadmin ON internal_tool_runs(run_by, created_at DESC);
