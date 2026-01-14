/*
  # Add Party Association to User Profiles

  ## Overview
  This migration adds party association to user profiles, allowing retailer users
  to be linked to specific parties while admin users have no party association.

  ## Changes Made

  ### 1. Schema Changes
  - Add `party_id` column to `user_profiles` table
    - Type: `uuid` (references parties table)
    - Nullable: Yes (null for admin users)
    - Foreign key constraint to `parties` table with CASCADE on delete

  ### 2. Constraints
  - Foreign key: `party_id` references `parties(id)`
  - On delete: CASCADE (if party is deleted, associated users are removed)

  ### 3. Important Notes
  - Admin users will have `party_id = NULL`
  - Retailer users should have a valid `party_id`
  - Existing users will have `party_id = NULL` by default
*/

-- Add party_id column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'party_id'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN party_id uuid REFERENCES parties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_party_id ON user_profiles(party_id);

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.party_id IS 'Foreign key to parties table. NULL for admin users, required for retailer users.';
