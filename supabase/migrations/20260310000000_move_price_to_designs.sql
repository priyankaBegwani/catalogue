/*
  # Move Price from Design Colors to Designs

  1. Changes
    - Add `price` column to `designs` table
    - Migrate existing price data from first color of each design
    - Remove `price` column from `design_colors` table

  2. Migration Strategy
    - Add price column to designs with default 0.00
    - Copy price from first color variant to design
    - Drop price column from design_colors
*/

-- Step 1: Add price column to designs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'designs' AND column_name = 'price'
  ) THEN
    ALTER TABLE designs ADD COLUMN price decimal(10,2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;

-- Step 2: Migrate existing price data from design_colors to designs
-- Use the price from the first color variant for each design
UPDATE designs d
SET price = COALESCE(
  (
    SELECT dc.price
    FROM design_colors dc
    WHERE dc.design_id = d.id
    ORDER BY dc.created_at ASC
    LIMIT 1
  ),
  0.00
)
WHERE EXISTS (
  SELECT 1 FROM design_colors dc WHERE dc.design_id = d.id
);

-- Step 3: Remove price column from design_colors table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_colors' AND column_name = 'price'
  ) THEN
    ALTER TABLE design_colors DROP COLUMN price;
  END IF;
END $$;
