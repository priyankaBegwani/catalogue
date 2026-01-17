import { VolumeTier, RelationshipTier, TierModel, PricingTierConfig, DEFAULT_VOLUME_TIERS, DEFAULT_RELATIONSHIP_TIERS } from '../types/pricing';

const STORAGE_KEY = 'pricing_tier_config';

export function getPricingConfig(): PricingTierConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse pricing config:', e);
    }
  }
  
  return {
    activeModel: 'volume',
    volumeTiers: DEFAULT_VOLUME_TIERS,
    relationshipTiers: DEFAULT_RELATIONSHIP_TIERS
  };
}

export function savePricingConfig(config: PricingTierConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function calculateVolumeTier(monthlyOrders: number, tiers: VolumeTier[]): VolumeTier | null {
  for (const tier of tiers) {
    if (monthlyOrders >= tier.minMonthlyOrders && 
        (tier.maxMonthlyOrders === null || monthlyOrders <= tier.maxMonthlyOrders)) {
      return tier;
    }
  }
  return null;
}

export function getDiscountForParty(
  partyId: string,
  model: TierModel,
  config: PricingTierConfig
): number {
  const partyTierData = getPartyTierData(partyId);
  
  if (!partyTierData) {
    return 0;
  }

  switch (model) {
    case 'volume': {
      const tier = config.volumeTiers.find(t => t.id === partyTierData.volumeTierId);
      return tier?.discountPercentage || 0;
    }
    case 'relationship': {
      const tier = config.relationshipTiers.find(t => t.id === partyTierData.relationshipTierId);
      return tier?.discountPercentage || 0;
    }
    case 'hybrid': {
      if (partyTierData.hybridManualOverride && partyTierData.hybridOverrideTierId) {
        const volumeTier = config.volumeTiers.find(t => t.id === partyTierData.hybridOverrideTierId);
        return volumeTier?.discountPercentage || 0;
      }
      const autoTier = config.volumeTiers.find(t => t.id === partyTierData.hybridAutoTierId);
      return autoTier?.discountPercentage || 0;
    }
    default:
      return 0;
  }
}

interface PartyTierData {
  partyId: string;
  volumeTierId?: string;
  relationshipTierId?: string;
  hybridAutoTierId?: string;
  hybridManualOverride?: boolean;
  hybridOverrideTierId?: string;
  monthlyOrderCount?: number;
  lastUpdated: string;
}

export function getPartyTierData(partyId: string): PartyTierData | null {
  const stored = localStorage.getItem(`party_tier_${partyId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse party tier data:', e);
    }
  }
  return null;
}

export function savePartyTierData(data: PartyTierData): void {
  localStorage.setItem(`party_tier_${data.partyId}`, JSON.stringify(data));
}

export function updatePartyMonthlyOrders(partyId: string, orderCount: number): void {
  const config = getPricingConfig();
  const existingData = getPartyTierData(partyId) || {
    partyId,
    lastUpdated: new Date().toISOString()
  };

  const autoTier = calculateVolumeTier(orderCount, config.volumeTiers);
  
  const updatedData: PartyTierData = {
    ...existingData,
    monthlyOrderCount: orderCount,
    hybridAutoTierId: autoTier?.id,
    lastUpdated: new Date().toISOString()
  };

  savePartyTierData(updatedData);
}

export function applyDiscount(originalPrice: number, discountPercentage: number): number {
  return originalPrice * (1 - discountPercentage / 100);
}

export function formatDiscount(discountPercentage: number): string {
  return `${discountPercentage}%`;
}
