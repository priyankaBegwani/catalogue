-- Add email_id column to parties table
ALTER TABLE parties ADD COLUMN IF NOT EXISTS email_id TEXT;

-- Add comment to the column
COMMENT ON COLUMN parties.email_id IS 'Email address of the party';
