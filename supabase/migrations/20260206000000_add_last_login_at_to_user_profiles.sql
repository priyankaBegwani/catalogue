-- Add last_login_at column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Create index for better query performance on inactive users
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login_at 
ON user_profiles(last_login_at);

-- Update existing users to have last_login_at set to their updated_at
UPDATE user_profiles
SET last_login_at = updated_at
WHERE last_login_at IS NULL;

-- Add comment to column
COMMENT ON COLUMN user_profiles.last_login_at IS 'Timestamp of the user''s last login';
