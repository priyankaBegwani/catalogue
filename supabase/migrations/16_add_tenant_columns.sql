-- ============================================================================
-- Migration 16: Add tenant_id and is_active to existing tables
-- All existing rows are assigned to the default tenant.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- user_profiles: add tenant_id and is_active
-- ----------------------------------------------------------------------------

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill existing rows
UPDATE user_profiles
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Remove default so future inserts must supply it explicitly
ALTER TABLE user_profiles ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE user_profiles ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);

-- ----------------------------------------------------------------------------
-- user_roles: add tenant_id, fix unique constraint to be per-tenant
-- ----------------------------------------------------------------------------

ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

-- Backfill
UPDATE user_roles
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE user_roles ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE user_roles ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);

-- Drop old global unique constraint and replace with per-tenant one
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_tenant_role_name ON user_roles(tenant_id, role_name);

-- ----------------------------------------------------------------------------
-- Update the default tenant's plan_id to the Starter plan
-- (so getTenantContext returns a valid plan row)
-- ----------------------------------------------------------------------------

UPDATE tenants
SET plan_id = (SELECT id FROM plans WHERE name = 'Starter' LIMIT 1)
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND plan_id IS NULL;
