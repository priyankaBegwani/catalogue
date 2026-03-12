-- Add fields to order_items to track size set information
-- This allows the Orders page to display whether items were ordered as sets or individual sizes

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS size_set_name text,
ADD COLUMN IF NOT EXISTS is_from_size_set boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN order_items.size_set_name IS 'Name of the size set if this order item was created from a size set selection';
COMMENT ON COLUMN order_items.is_from_size_set IS 'Indicates whether this order item originated from a size set selection (true) or individual size selection (false)';
