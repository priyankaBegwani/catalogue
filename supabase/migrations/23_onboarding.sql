-- Migration 23: Onboarding system
-- Tables: onboarding_progress, onboarding_assistance_requests,
--         import_jobs, import_failures, invitations

-- Add onboarding_complete flag to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- Track per-tenant onboarding wizard state
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  current_step     INTEGER NOT NULL DEFAULT 3,
  completed_steps  INTEGER[] NOT NULL DEFAULT '{}',
  start_method     TEXT CHECK (start_method IN ('import', 'assisted', 'fresh')),
  is_complete      BOOLEAN NOT NULL DEFAULT false,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assisted-onboarding support requests
CREATE TABLE IF NOT EXISTS onboarding_assistance_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_number     TEXT,
  notes               TEXT,
  preferred_callback  TEXT,
  file_urls           TEXT[] NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import job tracking (designs / parties / transport)
CREATE TABLE IF NOT EXISTS import_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by     UUID,
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('designs', 'parties', 'transport')),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'complete', 'failed', 'partial')),
  total_rows     INTEGER NOT NULL DEFAULT 0,
  inserted_rows  INTEGER NOT NULL DEFAULT 0,
  updated_rows   INTEGER NOT NULL DEFAULT 0,
  failed_rows    INTEGER NOT NULL DEFAULT 0,
  skipped_rows   INTEGER NOT NULL DEFAULT 0,
  column_mapping JSONB,
  file_name      TEXT,
  error_summary  TEXT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual row failures per import job
CREATE TABLE IF NOT EXISTS import_failures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_index     INTEGER NOT NULL,
  row_data      JSONB NOT NULL,
  error_message TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team invitations (token-based, WhatsApp-shareable links)
CREATE TABLE IF NOT EXISTS invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invited_by   UUID,
  email        TEXT NOT NULL,
  name         TEXT,
  role_name    TEXT NOT NULL DEFAULT 'Staff',
  token        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at   TIMESTAMPTZ NOT NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant    ON onboarding_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_tenant   ON import_jobs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_failures_job  ON import_failures(job_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token    ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant   ON invitations(tenant_id, status);

-- Set default tenant as already onboarded so it doesn't redirect
UPDATE tenants SET onboarding_complete = true
WHERE id = '00000000-0000-0000-0000-000000000001';
