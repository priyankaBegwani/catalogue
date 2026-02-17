-- Fix existing users: Populate username and email in user_profiles from auth.users
-- This is needed for users created before the username feature was added

-- Step 1: Update user_profiles with email from auth.users
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id
AND up.email IS NULL;

-- Step 2: Update user_profiles with username from user_metadata
UPDATE user_profiles up
SET username = au.raw_user_meta_data->>'username'
FROM auth.users au
WHERE up.id = au.id
AND up.username IS NULL
AND au.raw_user_meta_data->>'username' IS NOT NULL;

-- Step 3: For users without username in metadata, generate one from email
UPDATE user_profiles up
SET username = SPLIT_PART(au.email, '@', 1)
FROM auth.users au
WHERE up.id = au.id
AND up.username IS NULL;

-- Step 4: Handle duplicate usernames by appending user ID
UPDATE user_profiles
SET username = username || '_' || SUBSTRING(id::text, 1, 8)
WHERE id IN (
  SELECT id FROM (
    SELECT id, username, 
           ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
    FROM user_profiles
    WHERE username IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Verification: Check all users have username and email
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as users_with_username,
  COUNT(email) as users_with_email,
  COUNT(*) - COUNT(username) as missing_username,
  COUNT(*) - COUNT(email) as missing_email
FROM user_profiles;

-- Show users without username or email (should be empty after running above)
SELECT id, full_name, email, username, created_at
FROM user_profiles
WHERE username IS NULL OR email IS NULL
ORDER BY created_at DESC;
