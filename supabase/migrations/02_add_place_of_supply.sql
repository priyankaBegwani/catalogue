-- ============================================================================
-- Add place_of_supply field to parties table
-- ============================================================================
-- This migration adds a new field to store the place of supply for each party
-- Place of supply is used for GST and tax calculations
-- ============================================================================

-- Add place_of_supply column to parties table
ALTER TABLE parties ADD COLUMN IF NOT EXISTS place_of_supply text;

-- Add comment for documentation
COMMENT ON COLUMN parties.place_of_supply IS 'Place of supply for GST/tax purposes';
