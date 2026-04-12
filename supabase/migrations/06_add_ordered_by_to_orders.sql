-- ============================================================================
-- Add ordered_by_user_id to orders table
-- ============================================================================
-- This migration adds tracking for which distributor/agent placed the order
-- Allows Admin to specify who is ordering on behalf of a party
-- ============================================================================

-- Add ordered_by_user_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ordered_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_ordered_by_user_id ON orders(ordered_by_user_id);

-- Add comment
COMMENT ON COLUMN orders.ordered_by_user_id IS 'Reference to the user (distributor/agent) who placed this order on behalf of the party. NULL if ordered by the party directly.';

-- For existing orders, set ordered_by_user_id to the user_id if they are a Distributor
UPDATE orders
SET ordered_by_user_id = user_id
WHERE ordered_by_user_id IS NULL 
  AND user_id IN (
    SELECT id FROM user_profiles 
    WHERE role_id IN (
      SELECT id FROM user_roles WHERE role_name = 'Distributor'
    )
  );
