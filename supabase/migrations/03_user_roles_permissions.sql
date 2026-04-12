-- ============================================================================
-- User Roles and Permissions System
-- ============================================================================
-- This migration creates a comprehensive role-based access control system
-- with predefined roles and granular permissions
-- ============================================================================

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL UNIQUE,
  role_description text,
  permissions jsonb NOT NULL DEFAULT '{}',
  is_system_role boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index on role_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);

-- Add comment for documentation
COMMENT ON TABLE user_roles IS 'Stores user roles and their associated permissions';
COMMENT ON COLUMN user_roles.role_name IS 'Unique name of the role';
COMMENT ON COLUMN user_roles.permissions IS 'JSON object containing all permissions for this role';
COMMENT ON COLUMN user_roles.is_system_role IS 'Whether this is a system-defined role that cannot be deleted';

-- Insert default roles with comprehensive permissions
INSERT INTO user_roles (role_name, role_description, permissions, is_system_role) VALUES
(
  'Admin',
  'Full system access with all permissions',
  '{
    "dashboard": {"view": true, "edit": true},
    "parties": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "import": true},
    "transport": {"view": true, "create": true, "edit": true, "delete": true, "export": true, "import": true},
    "designs": {"view": true, "create": true, "edit": true, "delete": true, "upload": true},
    "orders": {"view": true, "create": true, "edit": true, "delete": true, "fulfill": true, "cancel": true},
    "users": {"view": true, "create": true, "edit": true, "delete": true, "manage_roles": true},
    "pricing": {"view": true, "edit": true},
    "reports": {"view": true, "export": true},
    "settings": {"view": true, "edit": true}
  }'::jsonb,
  true
),
(
  'Staff',
  'Order fulfillment and basic operations',
  '{
    "dashboard": {"view": true, "edit": false},
    "parties": {"view": true, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "transport": {"view": true, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "designs": {"view": true, "create": false, "edit": false, "delete": false, "upload": false},
    "orders": {"view": true, "create": false, "edit": true, "delete": false, "fulfill": true, "cancel": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false, "manage_roles": false},
    "pricing": {"view": true, "edit": false},
    "reports": {"view": true, "export": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb,
  true
),
(
  'Wholesaler',
  'Wholesale customer with ordering capabilities',
  '{
    "dashboard": {"view": true, "edit": false},
    "parties": {"view": false, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "transport": {"view": false, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "designs": {"view": true, "create": false, "edit": false, "delete": false, "upload": false},
    "orders": {"view": true, "create": true, "edit": false, "delete": false, "fulfill": false, "cancel": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false, "manage_roles": false},
    "pricing": {"view": true, "edit": false},
    "reports": {"view": false, "export": false},
    "settings": {"view": true, "edit": false}
  }'::jsonb,
  true
),
(
  'Distributor',
  'Takes orders on behalf of customers',
  '{
    "dashboard": {"view": true, "edit": false},
    "parties": {"view": true, "create": true, "edit": true, "delete": false, "export": true, "import": false},
    "transport": {"view": true, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "designs": {"view": true, "create": false, "edit": false, "delete": false, "upload": false},
    "orders": {"view": true, "create": true, "edit": true, "delete": false, "fulfill": false, "cancel": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false, "manage_roles": false},
    "pricing": {"view": true, "edit": false},
    "reports": {"view": true, "export": true},
    "settings": {"view": true, "edit": false}
  }'::jsonb,
  true
),
(
  'Sales',
  'Sales team with customer and order management',
  '{
    "dashboard": {"view": true, "edit": false},
    "parties": {"view": true, "create": true, "edit": true, "delete": false, "export": true, "import": true},
    "transport": {"view": true, "create": true, "edit": true, "delete": false, "export": false, "import": false},
    "designs": {"view": true, "create": false, "edit": false, "delete": false, "upload": false},
    "orders": {"view": true, "create": true, "edit": true, "delete": false, "fulfill": false, "cancel": true},
    "users": {"view": true, "create": false, "edit": false, "delete": false, "manage_roles": false},
    "pricing": {"view": true, "edit": false},
    "reports": {"view": true, "export": true},
    "settings": {"view": true, "edit": false}
  }'::jsonb,
  true
),
(
  'Retailer',
  'Standard retail customer with basic ordering capabilities',
  '{
    "dashboard": {"view": true, "edit": false},
    "parties": {"view": false, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "transport": {"view": false, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "designs": {"view": true, "create": false, "edit": false, "delete": false, "upload": false},
    "orders": {"view": true, "create": true, "edit": false, "delete": false, "fulfill": false, "cancel": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false, "manage_roles": false},
    "pricing": {"view": true, "edit": false},
    "reports": {"view": false, "export": false},
    "settings": {"view": true, "edit": false}
  }'::jsonb,
  true
),
(
  'Guest',
  'Guest user with limited view-only access',
  '{
    "dashboard": {"view": true, "edit": false},
    "parties": {"view": false, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "transport": {"view": false, "create": false, "edit": false, "delete": false, "export": false, "import": false},
    "designs": {"view": true, "create": false, "edit": false, "delete": false, "upload": false},
    "orders": {"view": true, "create": false, "edit": false, "delete": false, "fulfill": false, "cancel": false},
    "users": {"view": false, "create": false, "edit": false, "delete": false, "manage_roles": false},
    "pricing": {"view": true, "edit": false},
    "reports": {"view": false, "export": false},
    "settings": {"view": false, "edit": false}
  }'::jsonb,
  true
)
ON CONFLICT (role_name) DO NOTHING;

-- Add role_id column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES user_roles(id);

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON user_profiles(role_id);

-- Add comment
COMMENT ON COLUMN user_profiles.role_id IS 'Reference to the user role defining permissions';

-- ============================================================================
-- MIGRATE EXISTING USERS TO NEW ROLE SYSTEM
-- ============================================================================

-- Update existing users to assign role_id based on their current role
UPDATE user_profiles
SET role_id = (
  SELECT id FROM user_roles 
  WHERE role_name = CASE 
    WHEN user_profiles.role = 'admin' THEN 'Admin'
    WHEN user_profiles.role = 'retailer' THEN 'Retailer'
    WHEN user_profiles.role = 'guest' THEN 'Guest'
    ELSE 'Retailer'  -- Default fallback
  END
)
WHERE role_id IS NULL;

-- Make role_id NOT NULL after migration (all users should have a role)
ALTER TABLE user_profiles ALTER COLUMN role_id SET NOT NULL;

-- Deprecate the old role field by removing the CHECK constraint
-- Keep the field for now but it's no longer the source of truth
ALTER TABLE user_profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE user_profiles ALTER COLUMN role DROP DEFAULT;

-- Update comment to indicate the field is deprecated
COMMENT ON COLUMN user_profiles.role IS 'DEPRECATED: Use role_id instead. This field is kept for backward compatibility only.';
