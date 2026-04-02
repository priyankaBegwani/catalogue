-- Create party_phone_numbers table
CREATE TABLE IF NOT EXISTS party_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  designation TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_party_phone_numbers_party_id ON party_phone_numbers(party_id);

-- Add comments
COMMENT ON TABLE party_phone_numbers IS 'Phone numbers associated with parties';
COMMENT ON COLUMN party_phone_numbers.party_id IS 'Reference to the party';
COMMENT ON COLUMN party_phone_numbers.phone_number IS 'Phone number';
COMMENT ON COLUMN party_phone_numbers.contact_name IS 'Name of the contact person';
COMMENT ON COLUMN party_phone_numbers.designation IS 'Designation of the contact person';
COMMENT ON COLUMN party_phone_numbers.is_default IS 'Whether this is the default phone number for communication';
