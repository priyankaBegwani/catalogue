import { VolumeTier, RelationshipTier, TierModel, PricingTierConfig, DEFAULT_VOLUME_TIERS, DEFAULT_RELATIONSHIP_TIERS } from '../types/pricing';
import { api } from '../lib/api';

// ── Module-level cache ────────────────────────────────────────────────────
// Populated by TenantContext on app startup. Allows synchronous reads
// across the app without requiring hooks everywhere.
let _cache: PricingTierConfig = {
  activeModel: 'volume',
  volumeTiers: DEFAULT_VOLUME_TIERS,
  relationshipTiers: DEFAULT_RELATIONSHIP_TIERS,
};

/** Called by TenantContext after loading tenant settings from /api/tenant/resolve */
export function setPricingConfigCache(config: PricingTierConfig): void {
  _cache = config;
}

/** Synchronous read — returns current in-memory config. */
export function getPricingConfig(): PricingTierConfig {
  return _cache;
}

/** Saves to the DB and updates the local cache. */
export async function savePricingConfig(config: PricingTierConfig): Promise<void> {
  _cache = config;
  await api.updateTenantSettings({
    pricing_active_model: config.activeModel,
    pricing_volume_tiers: config.volumeTiers,
    pricing_relationship_tiers: config.relationshipTiers,
  });
}

// ── Per-party tier data (not tenant-level, still in localStorage for now) ─
// These are local ephemeral assignments used by the UI. They will move
// to the parties table in a future migration.

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
    } catch {
      return null;
    }
  }
  return null;
}

export function savePartyTierData(data: PartyTierData): void {
  localStorage.setItem(`party_tier_${data.partyId}`, JSON.stringify(data));
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

export function updatePartyMonthlyOrders(partyId: string, orderCount: number): void {
  const existingData = getPartyTierData(partyId) || { partyId, lastUpdated: new Date().toISOString() };
  const autoTier = calculateVolumeTier(orderCount, _cache.volumeTiers);
  savePartyTierData({
    ...existingData,
    monthlyOrderCount: orderCount,
    hybridAutoTierId: autoTier?.id,
    lastUpdated: new Date().toISOString(),
  });
}

export function getDiscountForParty(partyId: string, model: TierModel, config: PricingTierConfig): number {
  const partyTierData = getPartyTierData(partyId);
  if (!partyTierData) return 0;

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

export function applyDiscount(originalPrice: number, discountPercentage: number): number {
  return originalPrice * (1 - discountPercentage / 100);
}

export function formatDiscount(discountPercentage: number): string {
  return `${discountPercentage}%`;
}
