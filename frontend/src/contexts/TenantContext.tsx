import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TenantSettings } from '../lib/api';
import { DEFAULT_VOLUME_TIERS, DEFAULT_RELATIONSHIP_TIERS } from '../types/pricing';
import { setPricingConfigCache } from '../utils/pricingTiers';
import { API_URL } from '../config/backend';

export type TenantBranding = {
  business_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  tagline: string | null;
};

type PlanFeatures = {
  pdf_catalog: boolean;
  ai_descriptions: boolean;
  custom_domain: boolean;
  analytics: boolean;
  whatsapp_sharing: boolean;
  bulk_import: boolean;
};

type TenantState = {
  tenantId: string | null;
  slug: string | null;
  name: string | null;
  branding: TenantBranding | null;
  settings: TenantSettings | null;
  features: PlanFeatures | null;
  subscriptionStatus: string | null;
  isExpired: boolean;
  inGracePeriod: boolean;
  daysRemaining: number | null;
  isTrialExpired: boolean; // kept for backward compat
  onboardingComplete: boolean;
  isLoading: boolean;
  error: string | null;
};

type TenantContextValue = TenantState & {
  updateBranding: (patch: Partial<TenantBranding>) => void;
  updateSettings: (patch: Partial<TenantSettings>) => void;
  updateSlug: (slug: string) => void;
  retryTenant: () => void;
};

const defaultBranding: TenantBranding = {
  business_name: null,
  logo_url: null,
  favicon_url: null,
  primary_color: '#1a1a1a',
  secondary_color: '#ffffff',
  accent_color: '#f59e0b',
  tagline: null,
};

const defaultSettings: TenantSettings = {
  whatsapp_number: null,
  tawk_property_id: null,
  tawk_widget_id: null,
  show_price_to_customers: true,
  pricing_active_model: 'volume',
  pricing_volume_tiers: null,
  pricing_relationship_tiers: null,
};

const defaultState: TenantState = {
  tenantId: null, slug: null, name: null,
  branding: null, settings: null, features: null,
  subscriptionStatus: null,
  isExpired: false, inGracePeriod: false, daysRemaining: null,
  isTrialExpired: false,
  onboardingComplete: true, // default true to avoid flicker
  isLoading: true, error: null,
};

export const TenantContext = createContext<TenantContextValue>({
  ...defaultState,
  updateBranding: () => {},
  updateSettings: () => {},
  updateSlug: () => {},
  retryTenant: () => {},
});

function applyBranding(branding: TenantBranding, businessName: string | null) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', branding.primary_color);
  root.style.setProperty('--color-secondary', branding.secondary_color);
  root.style.setProperty('--color-accent', branding.accent_color);
  if (branding.favicon_url) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = branding.favicon_url;
  }
  if (branding.business_name || businessName) {
    document.title = branding.business_name ?? businessName ?? document.title;
  }
}

function syncWhatsAppData(settings: TenantSettings) {
  // Store on dataset so getWhatsAppUrl() (non-hook) can read it
  document.documentElement.dataset.whatsapp = settings.whatsapp_number ?? '';
}

function syncPricingCache(settings: TenantSettings) {
  setPricingConfigCache({
    activeModel: settings.pricing_active_model,
    volumeTiers: (settings.pricing_volume_tiers as typeof DEFAULT_VOLUME_TIERS | null) ?? DEFAULT_VOLUME_TIERS,
    relationshipTiers: (settings.pricing_relationship_tiers as typeof DEFAULT_RELATIONSHIP_TIERS | null) ?? DEFAULT_RELATIONSHIP_TIERS,
  });
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TenantState>(defaultState);

  const doFetch = useCallback(() => {
    const slug     = sessionStorage.getItem('tenant_slug') ?? '';
    const tenantId = sessionStorage.getItem('tenant_id')   ?? '';

    const resolveUrl = slug
      ? `${API_URL}/api/tenant/resolve?tenant=${encodeURIComponent(slug)}`
      : `${API_URL}/api/tenant/resolve`;

    const resolveHeaders: Record<string, string> = {};
    if (!slug && tenantId) resolveHeaders['X-Tenant-ID'] = tenantId;

    fetch(resolveUrl, { headers: resolveHeaders })
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) {
          setState(s => ({ ...s, isLoading: false, error: 'Tenant not found' }));
          return;
        }

        sessionStorage.setItem('tenant_id', data.id);

        const branding: TenantBranding = { ...defaultBranding, ...(data.tenant_branding ?? {}) };
        const settings: TenantSettings = { ...defaultSettings, ...(data.tenant_settings ?? {}) };

        applyBranding(branding, data.name);
        syncPricingCache(settings);
        syncWhatsAppData(settings);

        const now = new Date();
        const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
        const effectiveEnd = data.subscription_status === 'trial' ? trialEnd : periodEnd;
        const graceEnd = effectiveEnd ? new Date(effectiveEnd.getTime() + 3 * 86400000) : null;

        setState({
          tenantId: data.id,
          slug: data.slug,
          name: data.name,
          branding,
          settings,
          features: data.plans?.features ?? null,
          subscriptionStatus: data.subscription_status,
          isExpired:       effectiveEnd ? effectiveEnd < now && (!graceEnd || graceEnd < now) : false,
          inGracePeriod:   effectiveEnd ? effectiveEnd < now && graceEnd != null && graceEnd > now : false,
          daysRemaining:   effectiveEnd && effectiveEnd > now
            ? Math.ceil((effectiveEnd.getTime() - now.getTime()) / 86400000)
            : null,
          isTrialExpired:      (effectiveEnd ? effectiveEnd < now && (!graceEnd || graceEnd < now) : false)
                            && data.subscription_status === 'trial',
          onboardingComplete: data.onboarding_complete ?? false,
          isLoading: false,
          error: null,
        });
      })
      .catch(() => setState(s => ({ ...s, isLoading: false, error: 'Failed to load tenant' })));
  }, []);

  useEffect(() => {
    // Persist ?tenant=slug from the URL into sessionStorage so it survives navigation
    const urlSlug = new URLSearchParams(window.location.search).get('tenant');
    if (urlSlug) sessionStorage.setItem('tenant_slug', urlSlug);
    doFetch();
  }, [doFetch]);

  // Called by AuthContext after OTT exchange sets sessionStorage.tenant_slug
  const retryTenant = useCallback(() => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    doFetch();
  }, [doFetch]);

  const updateBranding = useCallback((patch: Partial<TenantBranding>) => {
    setState(s => {
      const merged: TenantBranding = { ...(s.branding ?? defaultBranding), ...patch };
      applyBranding(merged, s.name);
      return { ...s, branding: merged };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<TenantSettings>) => {
    setState(s => {
      const merged: TenantSettings = { ...(s.settings ?? defaultSettings), ...patch };
      syncPricingCache(merged);
      syncWhatsAppData(merged);
      return { ...s, settings: merged };
    });
  }, []);

  const updateSlug = useCallback((slug: string) => {
    setState(s => ({ ...s, slug }));
  }, []);

  return (
    <TenantContext.Provider value={{ ...state, updateBranding, updateSettings, updateSlug, retryTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
