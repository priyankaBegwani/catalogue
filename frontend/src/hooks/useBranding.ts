import { useState, useEffect, useRef } from 'react';

export interface BrandingSettings {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  whatsappNumber: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  brandName: 'Indie Craft',
  logoUrl: '/Logo indie.png',
  primaryColor: '#1e3473',
  secondaryColor: '#6366f1',
  whatsappNumber: '',
};

export function useBranding(): BrandingSettings {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const cssAppliedRef = useRef(false);

  useEffect(() => {
    const loadBranding = () => {
      const brandName = localStorage.getItem('brand_name') || DEFAULT_BRANDING.brandName;
      const logoUrl = localStorage.getItem('logo_url') || DEFAULT_BRANDING.logoUrl;
      const primaryColor = localStorage.getItem('primary_color') || DEFAULT_BRANDING.primaryColor;
      const secondaryColor = localStorage.getItem('secondary_color') || DEFAULT_BRANDING.secondaryColor;
      const whatsappNumber = localStorage.getItem('whatsapp_number') || DEFAULT_BRANDING.whatsappNumber;

      const newBranding = {
        brandName,
        logoUrl,
        primaryColor,
        secondaryColor,
        whatsappNumber,
      };

      setBranding(newBranding);

      // Apply CSS variables only once or when colors change
      if (!cssAppliedRef.current || 
          primaryColor !== DEFAULT_BRANDING.primaryColor || 
          secondaryColor !== DEFAULT_BRANDING.secondaryColor) {
        document.documentElement.style.setProperty('--color-primary', primaryColor);
        document.documentElement.style.setProperty('--color-secondary', secondaryColor);
        cssAppliedRef.current = true;
      }
    };

    loadBranding();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('brand_') || e.key?.startsWith('logo_') || 
          e.key?.startsWith('primary_') || e.key?.startsWith('secondary_') || 
          e.key?.startsWith('whatsapp_')) {
        loadBranding();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return branding;
}

export function getWhatsAppUrl(message: string, phoneNumber?: string): string {
  const branding = {
    whatsappNumber: localStorage.getItem('whatsapp_number') || '',
  };
  
  const number = phoneNumber || branding.whatsappNumber;
  const baseUrl = number ? `https://wa.me/${number.replace(/[^0-9+]/g, '')}` : 'https://wa.me/';
  
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
