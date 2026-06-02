import { useTenant } from '../contexts/TenantContext';

export type BrandingSettings = {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tagline: string | null;
  whatsappNumber: string;
  hasCustomBranding: boolean;
  // true only when a logo image URL has been uploaded — used inside the app
  // to decide whether to show the brand image or the default Whollio mark
  hasCustomLogo: boolean;
};

export function useBranding(): BrandingSettings {
  const { branding, settings } = useTenant();

  const hasCustomLogo = !!branding?.logo_url;
  const hasCustomBranding = !!(branding?.logo_url || branding?.business_name);

  return {
    brandName: branding?.business_name ?? 'Whollio',
    logoUrl: branding?.logo_url ?? '',
    primaryColor: branding?.primary_color ?? '#2563eb',
    secondaryColor: branding?.secondary_color ?? '#1e40af',
    accentColor: branding?.accent_color ?? '#f59e0b',
    tagline: branding?.tagline ?? null,
    whatsappNumber: settings?.whatsapp_number ?? '',
    hasCustomBranding,
    hasCustomLogo,
  };
}

export function getWhatsAppUrl(message: string, phoneNumber?: string): string {
  const number = phoneNumber || (document.documentElement.dataset.whatsapp ?? '');
  const base = number ? `https://wa.me/${number.replace(/[^0-9+]/g, '')}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
