-- Add address, phone, GST, and location fields to transport table
ALTER TABLE transport
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS gst_number text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transport_state ON transport(state);
CREATE INDEX IF NOT EXISTS idx_transport_city ON transport(city);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transport_updated_at_trigger ON transport;
CREATE TRIGGER transport_updated_at_trigger
  BEFORE UPDATE ON transport
  FOR EACH ROW
  EXECUTE FUNCTION update_transport_updated_at();
