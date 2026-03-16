-- Add is_substitute column to order_items to track substitute design items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_substitute boolean DEFAULT false;

COMMENT ON COLUMN order_items.is_substitute IS 'True if this item was added as a substitute for an unavailable size/quantity in the original order';
