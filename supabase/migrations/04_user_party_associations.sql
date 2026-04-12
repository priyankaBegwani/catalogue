-- ============================================================================
-- User Party Associations for Distributors
-- ============================================================================
-- This migration creates a many-to-many relationship between users and parties
-- Allows Distributor users to be associated with multiple parties
-- ============================================================================

-- Create user_party_associations junction table
CREATE TABLE IF NOT EXISTS user_party_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  UNIQUE(user_id, party_id)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_party_associations_user_id ON user_party_associations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_party_associations_party_id ON user_party_associations(party_id);

-- Add comments
COMMENT ON TABLE user_party_associations IS 'Many-to-many relationship between users (especially Distributors) and parties they can order for';
COMMENT ON COLUMN user_party_associations.user_id IS 'Reference to the user (typically a Distributor)';
COMMENT ON COLUMN user_party_associations.party_id IS 'Reference to the party the user can order for';

-- Migrate existing single party_id relationships to the new system
-- For users who already have a party_id, create an association
INSERT INTO user_party_associations (user_id, party_id, created_by)
SELECT id, party_id, id
FROM user_profiles
WHERE party_id IS NOT NULL
ON CONFLICT (user_id, party_id) DO NOTHING;

-- Add comment to party_id field indicating it's deprecated for multi-party users
COMMENT ON COLUMN user_profiles.party_id IS 'DEPRECATED for Distributors: Use user_party_associations table. Still used for single-party users like Retailers.';
