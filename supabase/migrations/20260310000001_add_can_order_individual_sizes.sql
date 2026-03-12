-- Add can_order_individual_sizes column to user_profiles
-- This controls whether a user can see and select individual sizes when adding to cart
-- Admin users always have this capability regardless of this setting
-- Retailer users default to false (size sets only)

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS can_order_individual_sizes boolean DEFAULT false;

-- Set all existing admin users to true
UPDATE user_profiles
SET can_order_individual_sizes = true
WHERE role = 'admin';

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.can_order_individual_sizes IS 'Controls whether user can order individual sizes. Admin users always can regardless of this setting. Retailer users default to size sets only.';
