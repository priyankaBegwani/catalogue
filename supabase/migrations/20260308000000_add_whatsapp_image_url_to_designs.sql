/*
  # Add WhatsApp Image URL to Designs

  1. Changes
    - Add `whatsapp_image_url` column to `designs` table
    - This column stores the URL of the image used for WhatsApp sharing
*/

-- Add whatsapp_image_url column to designs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'designs' AND column_name = 'whatsapp_image_url'
  ) THEN
    ALTER TABLE designs ADD COLUMN whatsapp_image_url text;
  END IF;
END $$;
