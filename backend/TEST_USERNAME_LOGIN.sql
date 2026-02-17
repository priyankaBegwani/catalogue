-- Test Username Login Setup
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if username and email columns exist and have data
SELECT 
  id,
  full_name,
  username,
  email,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- Expected: All users should have both username and email populated

-- 2. Test username lookup (replace 'test_username' with an actual username from above)
SELECT email 
FROM user_profiles 
WHERE username = 'test_username';

-- Expected: Should return the email address for that username

-- 3. Check for NULL values
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as with_username,
  COUNT(email) as with_email,
  COUNT(*) - COUNT(username) as missing_username,
  COUNT(*) - COUNT(email) as missing_email
FROM user_profiles;

-- Expected: missing_username and missing_email should both be 0

-- 4. Check for duplicate usernames
SELECT 
  username,
  COUNT(*) as count
FROM user_profiles
WHERE username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1;

-- Expected: No results (no duplicates)

-- 5. Verify username is stored correctly (case-sensitive check)
-- Replace 'your_username' with the username you're trying to login with
SELECT 
  username,
  email,
  CASE 
    WHEN username = 'your_username' THEN 'EXACT MATCH'
    WHEN LOWER(username) = LOWER('your_username') THEN 'CASE MISMATCH'
    ELSE 'NO MATCH'
  END as match_status
FROM user_profiles
WHERE LOWER(username) = LOWER('your_username');

-- Expected: Should show 'EXACT MATCH' for case-sensitive match

-- 6. Check auth.users metadata to see if username is stored there
SELECT 
  id,
  email,
  raw_user_meta_data->>'username' as metadata_username,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- This shows what's in auth.users metadata

-- 7. Cross-check user_profiles with auth.users
SELECT 
  up.id,
  up.username as profile_username,
  up.email as profile_email,
  au.email as auth_email,
  au.raw_user_meta_data->>'username' as metadata_username
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- Expected: profile_email should match auth_email
-- profile_username should be populated
