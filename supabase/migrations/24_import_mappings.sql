-- Migration 24: Tenant import mapping persistence
-- Saves column + category + department mappings per tenant per entity type
-- so MSME users never have to re-map the same CSV format twice.

CREATE TABLE IF NOT EXISTS tenant_import_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type         TEXT NOT NULL CHECK (entity_type IN ('designs', 'parties', 'transport')),
  -- Maps source CSV header → our DB field key (e.g. "Design No." → "design_no")
  column_mapping      JSONB NOT NULL DEFAULT '{}',
  -- Maps source category string → category_id UUID (e.g. "MENS KURTA" → "6f6c...")
  category_mapping    JSONB NOT NULL DEFAULT '{}',
  -- Maps source department string → our department string (e.g. "MENSWEAR" → "mens")
  department_mapping  JSONB NOT NULL DEFAULT '{}',
  -- The name the user gave this mapping profile (for future reference)
  profile_name        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_import_mappings_tenant ON tenant_import_mappings(tenant_id);
