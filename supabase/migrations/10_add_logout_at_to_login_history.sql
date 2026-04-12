-- ============================================================================
-- Add logout_at Column to login_history Table
-- ============================================================================
-- This migration adds a logout_at timestamp column to track when users log out
-- ============================================================================

-- Add logout_at column if it doesn't exist
ALTER TABLE login_history 
ADD COLUMN IF NOT EXISTS logout_at timestamptz;

-- Add index for faster queries on logout_at
CREATE INDEX IF NOT EXISTS idx_login_history_logout_at ON login_history(logout_at);

-- Add comment for documentation
COMMENT ON COLUMN login_history.logout_at IS 'Timestamp when user logged out (null if still logged in or session expired)';

-- Show table structure
\d login_history;
