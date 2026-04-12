-- ============================================================================
-- Update Role Permissions - Add Catalogue Module
-- ============================================================================
-- This migration adds catalogue permissions to all roles
-- Catalogue is visible to Retailer, Wholesaler, Distributor, Sales, Guest
-- Designs page is only for Admin and Staff
-- ============================================================================

-- Update Admin role - has both catalogue and designs access
UPDATE user_roles
SET permissions = jsonb_set(
  permissions,
  '{catalogue}',
  '{"view": true, "order": true}'::jsonb
)
WHERE role_name = 'Admin';

-- Update Staff role - has both catalogue and designs access
UPDATE user_roles
SET permissions = jsonb_set(
  permissions,
  '{catalogue}',
  '{"view": true, "order": true}'::jsonb
)
WHERE role_name = 'Staff';

-- Update Wholesaler role - has catalogue but NOT designs
UPDATE user_roles
SET permissions = jsonb_set(
  jsonb_set(
    permissions,
    '{catalogue}',
    '{"view": true, "order": true}'::jsonb
  ),
  '{designs}',
  '{"view": false, "create": false, "edit": false, "delete": false, "upload": false}'::jsonb
)
WHERE role_name = 'Wholesaler';

-- Update Distributor role - has catalogue but NOT designs
UPDATE user_roles
SET permissions = jsonb_set(
  jsonb_set(
    permissions,
    '{catalogue}',
    '{"view": true, "order": true}'::jsonb
  ),
  '{designs}',
  '{"view": false, "create": false, "edit": false, "delete": false, "upload": false}'::jsonb
)
WHERE role_name = 'Distributor';

-- Update Sales role - has catalogue but NOT designs
UPDATE user_roles
SET permissions = jsonb_set(
  jsonb_set(
    permissions,
    '{catalogue}',
    '{"view": true, "order": true}'::jsonb
  ),
  '{designs}',
  '{"view": false, "create": false, "edit": false, "delete": false, "upload": false}'::jsonb
)
WHERE role_name = 'Sales';

-- Update Retailer role - has catalogue but NOT designs
UPDATE user_roles
SET permissions = jsonb_set(
  jsonb_set(
    permissions,
    '{catalogue}',
    '{"view": true, "order": true}'::jsonb
  ),
  '{designs}',
  '{"view": false, "create": false, "edit": false, "delete": false, "upload": false}'::jsonb
)
WHERE role_name = 'Retailer';

-- Update Guest role - has catalogue view only, NOT designs
UPDATE user_roles
SET permissions = jsonb_set(
  jsonb_set(
    permissions,
    '{catalogue}',
    '{"view": true, "order": false}'::jsonb
  ),
  '{designs}',
  '{"view": false, "create": false, "edit": false, "delete": false, "upload": false}'::jsonb
)
WHERE role_name = 'Guest';

-- Verify the updates
SELECT role_name, permissions->'catalogue' as catalogue_permissions, permissions->'designs' as designs_permissions
FROM user_roles
ORDER BY role_name;
