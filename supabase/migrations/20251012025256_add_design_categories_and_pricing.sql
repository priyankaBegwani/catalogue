/*
  # Add Design Categories and Pricing

  1. New Tables
    - `design_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name
      - `slug` (text, unique) - URL-friendly slug
      - `description` (text) - Category description
      - `display_order` (integer) - Sort order
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `category_id` to `designs` table
    - Add `price` to `design_colors` table
    - Remove `base_price` concept (price is per color now)

  3. Default Categories
    - Kurtas, Kurta Sets, Pajamas, Pants, Dhotis, Jackets

  4. Security
    - Enable RLS on design_categories
    - All authenticated users can view categories
    - Only admins can modify categories
*/

-- Create design_categories table
CREATE TABLE IF NOT EXISTS design_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add category_id to designs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'designs' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE designs ADD COLUMN category_id uuid REFERENCES design_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add price to design_colors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_colors' AND column_name = 'price'
  ) THEN
    ALTER TABLE design_colors ADD COLUMN price decimal(10,2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;

-- Create index for designs.category_id
CREATE INDEX IF NOT EXISTS idx_designs_category_id ON designs(category_id);

-- Enable RLS on design_categories
ALTER TABLE design_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_categories
CREATE POLICY "Authenticated users can view design categories"
  ON design_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert design categories"
  ON design_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can update design categories"
  ON design_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can delete design categories"
  ON design_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Create trigger for design_categories updated_at
CREATE TRIGGER update_design_categories_updated_at
  BEFORE UPDATE ON design_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO design_categories (name, slug, description, display_order, is_active)
VALUES
  ('Kurtas', 'kurtas', 'Traditional kurtas for men', 1, true),
  ('Kurta Sets', 'kurta-sets', 'Complete kurta sets with bottom wear', 2, true),
  ('Pajamas', 'pajamas', 'Comfortable pajamas', 3, true),
  ('Pants', 'pants', 'Traditional and modern pants', 4, true),
  ('Dhotis', 'dhotis', 'Traditional dhotis', 5, true),
  ('Jackets', 'jackets', 'Ethnic jackets and waistcoats', 6, true)
ON CONFLICT (slug) DO NOTHING;