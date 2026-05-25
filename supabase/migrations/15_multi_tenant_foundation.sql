-- ============================================================================
-- Migration 15: Multi-Tenant Foundation Tables
-- Creates plans, tenants, tenant_branding, tenant_domains
-- and seeds the default tenant used by existing data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PLANS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  price_monthly numeric(10,2) DEFAULT 0,
  price_yearly numeric(10,2) DEFAULT 0,
  max_products integer DEFAULT 500,
  max_users integer DEFAULT 5,
  max_retailers integer DEFAULT 100,
  features jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO plans (name, price_monthly, price_yearly, max_products, max_users, max_retailers, features) VALUES
(
  'Starter',
  999, 9990, 500, 5, 100,
  '{"custom_domain": false, "ai_descriptions": false, "analytics": false, "whatsapp_sharing": true, "pdf_catalog": false}'::jsonb
),
(
  'Growth',
  2499, 24990, 5000, 20, 500,
  '{"custom_domain": true, "ai_descriptions": true, "analytics": true, "whatsapp_sharing": true, "pdf_catalog": true}'::jsonb
),
(
  'Enterprise',
  4999, 49990, -1, -1, -1,
  '{"custom_domain": true, "ai_descriptions": true, "analytics": true, "whatsapp_sharing": true, "pdf_catalog": true, "priority_support": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- TENANTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  plan_id uuid REFERENCES plans(id),
  owner_email text NOT NULL,
  owner_phone text,
  subscription_status text NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Seed the default tenant that all existing single-tenant data belongs to
INSERT INTO tenants (id, slug, name, owner_email, subscription_status, is_active, trial_ends_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'default',
  'Default Tenant',
  'admin@default.local',
  'active',
  true,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- TENANT BRANDING
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_branding (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  tagline text,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#1e3473',
  secondary_color text DEFAULT '#6366f1',
  accent_color text DEFAULT '#f59e0b',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO tenant_branding (tenant_id, business_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Indie Craft')
ON CONFLICT (tenant_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- TENANT DOMAINS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain text UNIQUE NOT NULL,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_id ON tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains(domain);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tenant_branding_updated_at
  BEFORE UPDATE ON tenant_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
