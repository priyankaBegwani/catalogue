-- Add preferred transport columns to parties table
ALTER TABLE parties ADD COLUMN IF NOT EXISTS preferred_transport_1 UUID REFERENCES transports(id);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS preferred_transport_2 UUID REFERENCES transports(id);

-- Add comments to the columns
COMMENT ON COLUMN parties.preferred_transport_1 IS 'First preferred transport for this party';
COMMENT ON COLUMN parties.preferred_transport_2 IS 'Second preferred transport for this party';
