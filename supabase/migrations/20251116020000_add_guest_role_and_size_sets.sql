/*
  # Add Guest Role and Size Sets

  1. User Role Updates
    - Add 'guest' role to user_profiles
    - Guest users can have optional party_id (nullable)

  2. New Tables
    - `size_sets`
      - `id` (uuid, primary key)
      - `name` (text) - Set name (e.g., "S-M-L-XL-XXL")
      - `sizes` (text[]) - Array of sizes in the set
      - `display_order` (integer) - Sort order
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Cart Schema Updates
    - Add `size_set_id` to cart_items (nullable)
    - Add `is_set_order` boolean to distinguish set vs per-size orders
    - Keep existing `size` and `quantity` for guest per-size orders
    - For set orders: size_set_id is populated, quantity represents set quantity

  4. Predefined Size Sets
    - S-M-L-XL-XXL
    - S-M-L-XL
    - M-L-XL-XXL
    - M-L-XL
    - L-XL-XXL
    - 3XL (single size set)

  5. Security
    - Enable RLS on size_sets
    - All authenticated users can view size sets
*/

-- Add guest role to user_profiles (if using enum, this would need to be updated)
-- For now, we'll just document that 'guest' is a valid role value
COMMENT ON COLUMN user_profiles.role IS 'User role: admin, retailer, or guest';

-- Create size_sets table
CREATE TABLE IF NOT EXISTS size_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sizes text[] NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to cart_items for set-based ordering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'size_set_id'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN size_set_id uuid REFERENCES size_sets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'is_set_order'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN is_set_order boolean DEFAULT false;
  END IF;
END $$;

-- Update cart_items constraints
-- For set orders: size_set_id must be set, size can be empty
-- For per-size orders: size must be set, size_set_id is null
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_design_id_color_id_size_key;

-- Create new unique constraint that handles both cases
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_per_size 
  ON cart_items(user_id, design_id, color_id, size) 
  WHERE is_set_order = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_set 
  ON cart_items(user_id, design_id, color_id, size_set_id) 
  WHERE is_set_order = true;

-- Create index for size_set_id
CREATE INDEX IF NOT EXISTS idx_cart_items_size_set_id ON cart_items(size_set_id);

-- Enable RLS on size_sets
ALTER TABLE size_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for size_sets (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view size sets"
  ON size_sets FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger for size_sets updated_at
CREATE TRIGGER update_size_sets_updated_at
  BEFORE UPDATE ON size_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert predefined size sets
INSERT INTO size_sets (name, sizes, display_order, is_active)
VALUES
  ('S-M-L-XL-XXL', ARRAY['S', 'M', 'L', 'XL', 'XXL'], 1, true),
  ('S-M-L-XL', ARRAY['S', 'M', 'L', 'XL'], 2, true),
  ('M-L-XL-XXL', ARRAY['M', 'L', 'XL', 'XXL'], 3, true),
  ('M-L-XL', ARRAY['M', 'L', 'XL'], 4, true),
  ('L-XL-XXL', ARRAY['L', 'XL', 'XXL'], 5, true),
  ('3XL', ARRAY['XXXL'], 6, true)
ON CONFLICT (name) DO NOTHING;

-- Add comment to document the new columns
COMMENT ON COLUMN cart_items.size_set_id IS 'Foreign key to size_sets. Used for retailer set-based orders. NULL for guest per-size orders.';
COMMENT ON COLUMN cart_items.is_set_order IS 'True for retailer set-based orders, false for guest per-size orders.';
