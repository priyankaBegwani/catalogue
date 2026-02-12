-- Create login_history table to track user login/logout events
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON login_history(status);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all login history
CREATE POLICY "Admins can view all login history"
ON login_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Policy: Users can view their own login history
CREATE POLICY "Users can view own login history"
ON login_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: System can insert login records
CREATE POLICY "System can insert login history"
ON login_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: System can update logout time
CREATE POLICY "System can update logout time"
ON login_history
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add comment to table
COMMENT ON TABLE login_history IS 'Tracks user login and logout events for security and analytics';
