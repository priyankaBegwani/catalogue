/*
  # Add Design Styles

  1. New Tables
    - `design_styles`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to design_categories)
      - `name` (text) - Style name
      - `description` (text) - Style description
      - `display_order` (integer) - Sort order
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `style_id` to `designs` table

  3. Default Styles
    - Add sample styles for each category

  4. Security
    - Enable RLS on design_styles
    - All authenticated users can view styles
    - Only admins can modify styles
*/

-- Create design_styles table
CREATE TABLE IF NOT EXISTS design_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES design_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Add style_id to designs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'designs' AND column_name = 'style_id'
  ) THEN
    ALTER TABLE designs ADD COLUMN style_id uuid REFERENCES design_styles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for designs.style_id
CREATE INDEX IF NOT EXISTS idx_designs_style_id ON designs(style_id);

-- Create index for design_styles.category_id
CREATE INDEX IF NOT EXISTS idx_design_styles_category_id ON design_styles(category_id);

-- Enable RLS on design_styles
ALTER TABLE design_styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_styles
CREATE POLICY "Authenticated users can view design styles"
  ON design_styles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert design styles"
  ON design_styles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can update design styles"
  ON design_styles FOR UPDATE
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

CREATE POLICY "Admins can delete design styles"
  ON design_styles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Create trigger for design_styles updated_at
CREATE TRIGGER update_design_styles_updated_at
  BEFORE UPDATE ON design_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default styles for each category
-- Note: We'll insert styles based on the category slugs
DO $$
DECLARE
  kurtas_id uuid;
  kurta_sets_id uuid;
  pajamas_id uuid;
  pants_id uuid;
  dhotis_id uuid;
  jackets_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO kurtas_id FROM design_categories WHERE slug = 'kurtas';
  SELECT id INTO kurta_sets_id FROM design_categories WHERE slug = 'kurta-sets';
  SELECT id INTO pajamas_id FROM design_categories WHERE slug = 'pajamas';
  SELECT id INTO pants_id FROM design_categories WHERE slug = 'pants';
  SELECT id INTO dhotis_id FROM design_categories WHERE slug = 'dhotis';
  SELECT id INTO jackets_id FROM design_categories WHERE slug = 'jackets';

  -- Insert styles for Kurtas
  IF kurtas_id IS NOT NULL THEN
    INSERT INTO design_styles (category_id, name, description, display_order, is_active)
    VALUES
      (kurtas_id, 'Straight Cut', 'Classic straight cut kurta', 1, true),
      (kurtas_id, 'A-Line', 'Flared A-line kurta', 2, true),
      (kurtas_id, 'Pathani', 'Traditional Pathani style', 3, true),
      (kurtas_id, 'Angrakha', 'Overlapping Angrakha style', 4, true),
      (kurtas_id, 'Asymmetric', 'Modern asymmetric cut', 5, true)
    ON CONFLICT (category_id, name) DO NOTHING;
  END IF;

  -- Insert styles for Kurta Sets
  IF kurta_sets_id IS NOT NULL THEN
    INSERT INTO design_styles (category_id, name, description, display_order, is_active)
    VALUES
      (kurta_sets_id, 'Kurta Pajama', 'Traditional kurta with pajama', 1, true),
      (kurta_sets_id, 'Kurta Churidar', 'Kurta with churidar', 2, true),
      (kurta_sets_id, 'Kurta Dhoti', 'Kurta with dhoti', 3, true),
      (kurta_sets_id, 'Indo-Western', 'Modern Indo-Western set', 4, true)
    ON CONFLICT (category_id, name) DO NOTHING;
  END IF;

  -- Insert styles for Pajamas
  IF pajamas_id IS NOT NULL THEN
    INSERT INTO design_styles (category_id, name, description, display_order, is_active)
    VALUES
      (pajamas_id, 'Straight Pajama', 'Classic straight fit', 1, true),
      (pajamas_id, 'Churidar', 'Fitted churidar style', 2, true),
      (pajamas_id, 'Aligarh Pajama', 'Traditional Aligarh style', 3, true),
      (pajamas_id, 'Patiala', 'Loose Patiala style', 4, true)
    ON CONFLICT (category_id, name) DO NOTHING;
  END IF;

  -- Insert styles for Pants
  IF pants_id IS NOT NULL THEN
    INSERT INTO design_styles (category_id, name, description, display_order, is_active)
    VALUES
      (pants_id, 'Formal', 'Formal dress pants', 1, true),
      (pants_id, 'Casual', 'Casual cotton pants', 2, true),
      (pants_id, 'Slim Fit', 'Modern slim fit', 3, true),
      (pants_id, 'Regular Fit', 'Comfortable regular fit', 4, true)
    ON CONFLICT (category_id, name) DO NOTHING;
  END IF;

  -- Insert styles for Dhotis
  IF dhotis_id IS NOT NULL THEN
    INSERT INTO design_styles (category_id, name, description, display_order, is_active)
    VALUES
      (dhotis_id, 'Traditional', 'Classic traditional dhoti', 1, true),
      (dhotis_id, 'Ready-to-Wear', 'Pre-stitched dhoti', 2, true),
      (dhotis_id, 'Silk Dhoti', 'Premium silk dhoti', 3, true),
      (dhotis_id, 'Cotton Dhoti', 'Comfortable cotton dhoti', 4, true)
    ON CONFLICT (category_id, name) DO NOTHING;
  END IF;

  -- Insert styles for Jackets
  IF jackets_id IS NOT NULL THEN
    INSERT INTO design_styles (category_id, name, description, display_order, is_active)
    VALUES
      (jackets_id, 'Nehru Jacket', 'Classic Nehru jacket', 1, true),
      (jackets_id, 'Waistcoat', 'Traditional waistcoat', 2, true),
      (jackets_id, 'Bandhgala', 'Formal Bandhgala jacket', 3, true),
      (jackets_id, 'Sherwani Jacket', 'Sherwani style jacket', 4, true),
      (jackets_id, 'Modi Jacket', 'Modern Modi jacket', 5, true)
    ON CONFLICT (category_id, name) DO NOTHING;
  END IF;
END $$;
