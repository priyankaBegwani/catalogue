-- ============================================================================
-- Fix Missing role_id for Existing Users
-- ============================================================================
-- This migration ensures all users have a valid role_id assigned
-- Fixes login issues where profile is null due to missing role_id
-- ============================================================================

-- First, check if there are any users without role_id
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM user_profiles
  WHERE role_id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE NOTICE 'Found % users without role_id. Fixing...', missing_count;
  ELSE
    RAISE NOTICE 'All users have role_id assigned';
  END IF;
END $$;

-- Assign default Retailer role to any users without role_id
UPDATE user_profiles
SET role_id = (SELECT id FROM user_roles WHERE role_name = 'Retailer' LIMIT 1)
WHERE role_id IS NULL;

-- Verify all users now have role_id
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM user_profiles
  WHERE role_id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Still have % users without role_id!', missing_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All users now have role_id assigned';
  END IF;
END $$;

-- Show user role distribution
SELECT 
  ur.role_name,
  COUNT(up.id) as user_count
FROM user_profiles up
LEFT JOIN user_roles ur ON up.role_id = ur.id
GROUP BY ur.role_name
ORDER BY user_count DESC;
