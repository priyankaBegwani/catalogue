import { useTenant } from '../contexts/TenantContext';

export type BrandingSettings = {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tagline: string | null;
  whatsappNumber: string;
};

export function useBranding(): BrandingSettings {
  const { branding, settings } = useTenant();

  return {
    brandName: branding?.business_name ?? 'Your Brand',
    logoUrl: branding?.logo_url ?? '/Logo indie.png',
    primaryColor: branding?.primary_color ?? '#1e3473',
    secondaryColor: branding?.secondary_color ?? '#6366f1',
    accentColor: branding?.accent_color ?? '#f59e0b',
    tagline: branding?.tagline ?? null,
    whatsappNumber: settings?.whatsapp_number ?? '',
  };
}

export function getWhatsAppUrl(message: string, phoneNumber?: string): string {
  const number = phoneNumber || (document.documentElement.dataset.whatsapp ?? '');
  const base = number ? `https://wa.me/${number.replace(/[^0-9+]/g, '')}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
