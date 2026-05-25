-- ============================================================================
-- Migration 20: Make role_id nullable on user_profiles
-- role_id was made NOT NULL in migration 03, but the multi-tenant registration
-- flow creates the auth user AFTER seeding tenant roles. The trigger fires
-- during createUser() before the profile update (step 8) can supply role_id.
-- Making it nullable lets the trigger insert succeed; registerTenant step 8
-- immediately updates it with the correct Admin role.
-- ============================================================================

ALTER TABLE user_profiles ALTER COLUMN role_id DROP NOT NULL;

-- Re-create trigger function to also set role_id from metadata when present
-- (covers the registerTenant flow which passes role_id via user_metadata)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id uuid;
  v_role_id   uuid;
BEGIN
  v_tenant_id := COALESCE(
    (NEW.raw_app_meta_data->>'tenant_id')::uuid,
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );

  v_role_id := (NEW.raw_user_meta_data->>'role_id')::uuid;  -- NULL for regular signups

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    tenant_id,
    role_id,
    is_active,
    can_order_individual_sizes
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_tenant_id,
    v_role_id,
    true,
    COALESCE((NEW.raw_user_meta_data->>'can_order_individual_sizes')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE
    SET
      tenant_id  = EXCLUDED.tenant_id,
      role_id    = COALESCE(EXCLUDED.role_id, user_profiles.role_id),
      is_active  = EXCLUDED.is_active,
      full_name  = EXCLUDED.full_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
