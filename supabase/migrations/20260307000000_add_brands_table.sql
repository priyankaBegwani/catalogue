-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Add brand_id to designs table
ALTER TABLE designs
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_designs_brand_id ON designs(brand_id);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brands_display_order ON brands(display_order);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brands table
-- Allow everyone to read active brands
CREATE POLICY "Allow public read access to active brands"
  ON brands FOR SELECT
  USING (is_active = true);

-- Allow authenticated users to read all brands
CREATE POLICY "Allow authenticated users to read all brands"
  ON brands FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert brands
CREATE POLICY "Allow admins to insert brands"
  ON brands FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow admins to update brands
CREATE POLICY "Allow admins to update brands"
  ON brands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow admins to delete brands
CREATE POLICY "Allow admins to delete brands"
  ON brands FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at_trigger
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_brands_updated_at();

-- Insert some default brands (optional)
INSERT INTO brands (name, description, is_active, display_order) VALUES
  ('Premium Collection', 'High-end premium designs', true, 1),
  ('Classic Collection', 'Timeless classic designs', true, 2),
  ('Modern Collection', 'Contemporary modern designs', true, 3)
ON CONFLICT (name) DO NOTHING;
