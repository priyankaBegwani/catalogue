-- Add size_quantities column to design_colors table
-- This will store quantity available for each size (S, M, L, XL, XXL, XXXL)

ALTER TABLE design_colors
ADD COLUMN IF NOT EXISTS size_quantities jsonb DEFAULT '{
  "S": 0,
  "M": 0,
  "L": 0,
  "XL": 0,
  "XXL": 0,
  "XXXL": 0
}'::jsonb;

-- Add a comment to document the column structure
COMMENT ON COLUMN design_colors.size_quantities IS 'JSON object storing quantity available for each size: {"S": 0, "M": 0, "L": 0, "XL": 0, "XXL": 0, "XXXL": 0}';

-- Create an index on the jsonb column for better query performance
CREATE INDEX IF NOT EXISTS idx_design_colors_size_quantities ON design_colors USING gin(size_quantities);
