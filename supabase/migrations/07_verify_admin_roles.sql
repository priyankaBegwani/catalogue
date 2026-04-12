-- ============================================================================
-- Verify and Fix Admin Role Assignments
-- ============================================================================
-- This migration ensures all existing admin users have proper role_id assigned
-- Run this to fix any users that might have been missed in the initial migration
-- ============================================================================

-- Check if any users have NULL role_id and fix them
UPDATE user_profiles
SET role_id = (
  SELECT id FROM user_roles 
  WHERE role_name = CASE 
    WHEN user_profiles.role = 'admin' THEN 'Admin'
    WHEN user_profiles.role = 'retailer' THEN 'Retailer'
    WHEN user_profiles.role = 'guest' THEN 'Guest'
    ELSE 'Retailer'
  END
)
WHERE role_id IS NULL;

-- Verify all users have role_id assigned
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM user_profiles
  WHERE role_id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE NOTICE 'WARNING: % users still have NULL role_id', missing_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All users have role_id assigned';
  END IF;
END $$;

-- Show summary of role assignments
SELECT 
  ur.role_name,
  COUNT(up.id) as user_count
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
GROUP BY ur.role_name
ORDER BY user_count DESC;
