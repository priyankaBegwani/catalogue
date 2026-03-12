/*
  # Add Video URLs to Design Colors

  1. Changes
    - Add `video_urls` column to `design_colors` table
    - This column stores an array of video URLs for each color variant
*/

-- Add video_urls column to design_colors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_colors' AND column_name = 'video_urls'
  ) THEN
    ALTER TABLE design_colors ADD COLUMN video_urls text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;
