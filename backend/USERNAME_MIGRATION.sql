-- Migration: Add username column to user_profiles table
-- Date: 2026-02-17
-- Purpose: Support username-based login alongside email

-- Step 1: Add username column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Add unique constraint on username
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_username_key UNIQUE (username);

-- Step 3: Create index on username for faster lookups during login
CREATE INDEX IF NOT EXISTS idx_user_profiles_username 
ON user_profiles(username);

-- Step 4: Add email column if it doesn't exist (for reference)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 5: Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON user_profiles(email);

-- Step 6: Update existing users with temporary usernames (optional)
-- You may want to manually set usernames for existing users
-- Example: UPDATE user_profiles SET username = 'user_' || id WHERE username IS NULL;

-- Step 7: Make username NOT NULL after all users have usernames (optional, run later)
-- ALTER TABLE user_profiles ALTER COLUMN username SET NOT NULL;

-- Verification queries:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_profiles' AND column_name IN ('username', 'email');

-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'user_profiles';
