-- ============================================================================
-- Add party_id to orders table for Distributor workflow
-- ============================================================================
-- This migration adds party_id reference to orders table
-- Allows Distributors to select which party they are ordering for
-- ============================================================================

-- Add party_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES parties(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_party_id ON orders(party_id);

-- Add comment
COMMENT ON COLUMN orders.party_id IS 'Reference to the party this order is for (used by Distributors ordering on behalf of parties)';

-- For existing orders, try to match party_name to actual parties
UPDATE orders
SET party_id = (
  SELECT id FROM parties 
  WHERE parties.name = orders.party_name 
  LIMIT 1
)
WHERE party_id IS NULL AND party_name IS NOT NULL;
