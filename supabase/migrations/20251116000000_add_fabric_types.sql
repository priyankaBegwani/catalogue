/*
  # Add Fabric Types

  1. New Tables
    - `fabric_types`
      - `id` (uuid, primary key)
      - `name` (text) - Fabric type name
      - `description` (text) - Fabric description
      - `display_order` (integer) - Sort order
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `fabric_type_id` to `designs` table

  3. Default Fabric Types
    - Add common fabric types

  4. Security
    - Enable RLS on fabric_types
    - All authenticated users can view fabric types
    - Only admins can modify fabric types
*/

-- Create fabric_types table
CREATE TABLE IF NOT EXISTS fabric_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add fabric_type_id to designs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'designs' AND column_name = 'fabric_type_id'
  ) THEN
    ALTER TABLE designs ADD COLUMN fabric_type_id uuid REFERENCES fabric_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for designs.fabric_type_id
CREATE INDEX IF NOT EXISTS idx_designs_fabric_type_id ON designs(fabric_type_id);

-- Enable RLS on fabric_types
ALTER TABLE fabric_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fabric_types
CREATE POLICY "Authenticated users can view fabric types"
  ON fabric_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert fabric types"
  ON fabric_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can update fabric types"
  ON fabric_types FOR UPDATE
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

CREATE POLICY "Admins can delete fabric types"
  ON fabric_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Create trigger for fabric_types updated_at
CREATE TRIGGER update_fabric_types_updated_at
  BEFORE UPDATE ON fabric_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default fabric types
INSERT INTO fabric_types (name, description, display_order, is_active)
VALUES
  ('Cotton', 'Pure cotton fabric, breathable and comfortable', 1, true),
  ('Silk', 'Premium silk fabric, luxurious and smooth', 2, true),
  ('Linen', 'Natural linen fabric, lightweight and airy', 3, true),
  ('Polyester', 'Synthetic polyester fabric, durable and wrinkle-resistant', 4, true),
  ('Rayon', 'Semi-synthetic rayon fabric, soft and drapes well', 5, true),
  ('Cotton Blend', 'Cotton blended with other fibers for enhanced properties', 6, true),
  ('Silk Blend', 'Silk blended with other fibers for durability', 7, true),
  ('Khadi', 'Hand-spun and hand-woven fabric, eco-friendly', 8, true),
  ('Jacquard', 'Intricately woven fabric with raised patterns', 9, true),
  ('Brocade', 'Rich decorative fabric with raised designs', 10, true),
  ('Velvet', 'Soft pile fabric with luxurious feel', 11, true),
  ('Georgette', 'Lightweight, sheer fabric with a crepe texture', 12, true),
  ('Chiffon', 'Sheer, lightweight fabric with a slight shimmer', 13, true),
  ('Chanderi', 'Traditional handwoven fabric, lightweight and glossy', 14, true),
  ('Banarasi', 'Fine silk fabric with intricate brocade work', 15, true)
ON CONFLICT (name) DO NOTHING;
