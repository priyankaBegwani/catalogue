-- ============================================================================
-- Migration 17: Update handle_new_user trigger for multi-tenancy
-- Reads tenant_id from user_metadata set during createUser() so the profile
-- row is correctly associated with the new tenant on registration.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Prefer app_metadata (set by admin API), fall back to user_metadata
  v_tenant_id := COALESCE(
    (NEW.raw_app_meta_data->>'tenant_id')::uuid,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid  -- default tenant for manual signups
  );

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    tenant_id,
    is_active,
    can_order_individual_sizes
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_tenant_id,
    true,
    COALESCE((NEW.raw_user_meta_data->>'can_order_individual_sizes')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE
    SET
      tenant_id  = EXCLUDED.tenant_id,
      is_active  = EXCLUDED.is_active,
      full_name  = EXCLUDED.full_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
