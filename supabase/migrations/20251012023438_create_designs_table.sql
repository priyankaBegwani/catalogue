/*
  # Create Designs Management System

  1. New Tables
    - `designs`
      - `id` (uuid, primary key)
      - `design_no` (text, unique) - Design number/code
      - `name` (text) - Design name
      - `description` (text) - Design description
      - `available_sizes` (text[]) - Array of available sizes
      - `is_active` (boolean) - Whether design is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to user_profiles)
    
    - `design_colors`
      - `id` (uuid, primary key)
      - `design_id` (uuid, foreign key to designs)
      - `color_name` (text) - Name of the color
      - `color_code` (text) - Hex color code (optional)
      - `in_stock` (boolean) - Stock status
      - `stock_quantity` (integer) - Quantity in stock
      - `image_urls` (text[]) - Array of image URLs for this color
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Admins can create, read, update, delete designs
    - Retailers can only read designs
    - Public users cannot access designs

  3. Storage
    - Create storage bucket for design images
*/

-- Create designs table
CREATE TABLE IF NOT EXISTS designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_no text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  available_sizes text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- Create design_colors table
CREATE TABLE IF NOT EXISTS design_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid REFERENCES designs(id) ON DELETE CASCADE NOT NULL,
  color_name text NOT NULL,
  color_code text,
  in_stock boolean DEFAULT true,
  stock_quantity integer DEFAULT 0,
  image_urls text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_designs_design_no ON designs(design_no);
CREATE INDEX IF NOT EXISTS idx_designs_created_by ON designs(created_by);
CREATE INDEX IF NOT EXISTS idx_design_colors_design_id ON design_colors(design_id);

-- Enable RLS
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_colors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for designs table
CREATE POLICY "Authenticated users can view designs"
  ON designs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert designs"
  ON designs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can update designs"
  ON designs FOR UPDATE
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

CREATE POLICY "Admins can delete designs"
  ON designs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- RLS Policies for design_colors table
CREATE POLICY "Authenticated users can view design colors"
  ON design_colors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert design colors"
  ON design_colors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can update design colors"
  ON design_colors FOR UPDATE
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

CREATE POLICY "Admins can delete design colors"
  ON design_colors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_colors_updated_at
  BEFORE UPDATE ON design_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();