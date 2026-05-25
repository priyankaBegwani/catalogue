import { useTenant } from '../contexts/TenantContext';

type FeatureKey = 'pdf_catalog' | 'ai_descriptions' | 'custom_domain' | 'analytics' | 'whatsapp_sharing' | 'bulk_import';

export function useFeatureFlag(key: FeatureKey): boolean {
  const { features } = useTenant();
  return features?.[key] ?? false;
}
