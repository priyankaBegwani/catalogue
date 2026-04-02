-- Add grade column to parties table
ALTER TABLE parties ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add comment to the column
COMMENT ON COLUMN parties.grade IS 'Business grade of the party (A+, A, B, C, D)';
