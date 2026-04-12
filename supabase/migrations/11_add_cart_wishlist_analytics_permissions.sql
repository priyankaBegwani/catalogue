-- ============================================================================
-- Add Cart & Wishlist Analytics Permissions
-- ============================================================================
-- This migration adds analytics permissions for viewing cart and wishlist data
-- Only Admin and Staff roles should have access to this feature
-- ============================================================================

-- Update Admin role - add analytics permissions
UPDATE user_roles
SET permissions = jsonb_set(
  permissions,
  '{analytics}',
  '{"view_carts": true, "view_wishlists": true, "message_users": true}'::jsonb
)
WHERE role_name = 'Admin';

-- Update Staff role - add analytics permissions
UPDATE user_roles
SET permissions = jsonb_set(
  permissions,
  '{analytics}',
  '{"view_carts": true, "view_wishlists": true, "message_users": true}'::jsonb
)
WHERE role_name = 'Staff';

-- Verify the updates
SELECT 
  role_name, 
  permissions->'analytics' as analytics_permissions
FROM user_roles
WHERE role_name IN ('Admin', 'Staff')
ORDER BY role_name;
