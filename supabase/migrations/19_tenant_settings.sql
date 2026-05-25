-- ============================================================================
-- TENANT SETTINGS
-- Stores per-tenant operational settings that were previously in localStorage.
-- ============================================================================

CREATE TABLE tenant_settings (
  tenant_id              uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_number        text,
  tawk_property_id       text,
  tawk_widget_id         text,
  show_price_to_customers boolean NOT NULL DEFAULT true,
  pricing_active_model   text NOT NULL DEFAULT 'volume'
    CHECK (pricing_active_model IN ('volume', 'relationship', 'hybrid')),
  pricing_volume_tiers        jsonb,   -- NULL = use application defaults
  pricing_relationship_tiers  jsonb,   -- NULL = use application defaults
  updated_at             timestamptz DEFAULT now()
);

-- Seed default tenant
INSERT INTO tenant_settings (tenant_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (tenant_id) DO NOTHING;

CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read settings"
  ON tenant_settings FOR SELECT TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "Tenant admins can update settings"
  ON tenant_settings FOR UPDATE TO authenticated
  USING (tenant_id = auth_tenant_id() AND auth_is_tenant_admin())
  WITH CHECK (tenant_id = auth_tenant_id() AND auth_is_tenant_admin());
