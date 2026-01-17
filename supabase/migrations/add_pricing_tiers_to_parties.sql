-- Add pricing tier columns to parties table
ALTER TABLE parties
ADD COLUMN volume_tier_id VARCHAR(50),
ADD COLUMN relationship_tier_id VARCHAR(50),
ADD COLUMN hybrid_auto_tier_id VARCHAR(50),
ADD COLUMN hybrid_manual_override BOOLEAN DEFAULT FALSE,
ADD COLUMN hybrid_override_tier_id VARCHAR(50),
ADD COLUMN monthly_order_count INTEGER DEFAULT 0,
ADD COLUMN tier_last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for faster tier lookups
CREATE INDEX idx_parties_volume_tier ON parties(volume_tier_id);
CREATE INDEX idx_parties_relationship_tier ON parties(relationship_tier_id);
CREATE INDEX idx_parties_monthly_orders ON parties(monthly_order_count);

-- Add comment to document the columns
COMMENT ON COLUMN parties.volume_tier_id IS 'Volume-based tier ID (copper, bronze, silver, gold, platinum)';
COMMENT ON COLUMN parties.relationship_tier_id IS 'Relationship-based tier ID (standard, trusted, strategic)';
COMMENT ON COLUMN parties.hybrid_auto_tier_id IS 'Auto-calculated tier for hybrid model';
COMMENT ON COLUMN parties.hybrid_manual_override IS 'Whether hybrid tier has manual override';
COMMENT ON COLUMN parties.hybrid_override_tier_id IS 'Manual override tier ID for hybrid model';
COMMENT ON COLUMN parties.monthly_order_count IS 'Count of orders in current month for tier calculation';
COMMENT ON COLUMN parties.tier_last_updated IS 'Last time tier was updated';
