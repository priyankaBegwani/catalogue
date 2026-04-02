-- Add default_discount column to parties table
ALTER TABLE parties ADD COLUMN IF NOT EXISTS default_discount TEXT;

-- Add comment to the column
COMMENT ON COLUMN parties.default_discount IS 'Default discount tier for the party (gold, silver, copper, retail)';

-- Remove old pricing tier columns (optional - uncomment if you want to remove them)
-- ALTER TABLE parties DROP COLUMN IF EXISTS volume_tier_id;
-- ALTER TABLE parties DROP COLUMN IF EXISTS relationship_tier_id;
-- ALTER TABLE parties DROP COLUMN IF EXISTS hybrid_auto_tier_id;
-- ALTER TABLE parties DROP COLUMN IF EXISTS hybrid_manual_override;
-- ALTER TABLE parties DROP COLUMN IF EXISTS hybrid_override_tier_id;
-- ALTER TABLE parties DROP COLUMN IF EXISTS monthly_order_count;
-- ALTER TABLE parties DROP COLUMN IF EXISTS tier_last_updated;
