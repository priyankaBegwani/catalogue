-- ============================================================================
-- Migration 18: Tenant RLS helper functions
-- These are used by migration 19 (tenant_settings) and future tenant-scoped
-- RLS policies. They read tenant_id from the JWT app_metadata claim.
-- ============================================================================

-- Returns the tenant_id from the current user's JWT app_metadata.
-- Falls back to user_metadata for compatibility with older tokens.
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid,
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );
$$;

-- Returns true if the current user has the Admin role in their tenant.
CREATE OR REPLACE FUNCTION auth_is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN user_roles ur ON ur.id = up.role_id
    WHERE up.id = auth.uid()
      AND ur.role_name = 'Admin'
      AND ur.tenant_id = auth_tenant_id()
  );
$$;
