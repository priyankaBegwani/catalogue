export type TierModel = 'volume' | 'relationship' | 'hybrid';

export interface VolumeTier {
  id: string;
  name: 'Copper' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  minMonthlyOrders: number;
  maxMonthlyOrders: number | null;
  discountPercentage: number;
  color: string;
  description: string;
}

export interface RelationshipTier {
  id: string;
  name: 'Standard' | 'Trusted' | 'Strategic';
  discountPercentage: number;
  color: string;
  description: string;
  benefits: string[];
}

export interface HybridTier {
  id: string;
  autoAssignedTier: string;
  manualOverride: boolean;
  overriddenTier?: string;
  monthlyOrderCount: number;
  lastCalculated: string;
}

export interface PricingTierConfig {
  activeModel: TierModel;
  volumeTiers: VolumeTier[];
  relationshipTiers: RelationshipTier[];
}

export const DEFAULT_VOLUME_TIERS: VolumeTier[] = [
  {
    id: 'copper',
    name: 'Copper',
    minMonthlyOrders: 0,
    maxMonthlyOrders: 10,
    discountPercentage: 0,
    color: '#B87333',
    description: 'Entry level - 0-10 orders per month'
  },
  {
    id: 'bronze',
    name: 'Bronze',
    minMonthlyOrders: 11,
    maxMonthlyOrders: 25,
    discountPercentage: 5,
    color: '#CD7F32',
    description: 'Growing customer - 11-25 orders per month'
  },
  {
    id: 'silver',
    name: 'Silver',
    minMonthlyOrders: 26,
    maxMonthlyOrders: 50,
    discountPercentage: 10,
    color: '#C0C0C0',
    description: 'Regular customer - 26-50 orders per month'
  },
  {
    id: 'gold',
    name: 'Gold',
    minMonthlyOrders: 51,
    maxMonthlyOrders: 100,
    discountPercentage: 15,
    color: '#FFD700',
    description: 'Premium customer - 51-100 orders per month'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    minMonthlyOrders: 101,
    maxMonthlyOrders: null,
    discountPercentage: 20,
    color: '#E5E4E2',
    description: 'Elite customer - 100+ orders per month'
  }
];

export const DEFAULT_RELATIONSHIP_TIERS: RelationshipTier[] = [
  {
    id: 'standard',
    name: 'Standard',
    discountPercentage: 5,
    color: '#6B7280',
    description: 'New or occasional business relationship',
    benefits: ['Standard support', 'Regular payment terms', 'Basic catalog access']
  },
  {
    id: 'trusted',
    name: 'Trusted',
    discountPercentage: 12,
    color: '#3B82F6',
    description: 'Established and reliable business partner',
    benefits: ['Priority support', 'Extended payment terms', 'Early access to new products', 'Dedicated account manager']
  },
  {
    id: 'strategic',
    name: 'Strategic',
    discountPercentage: 18,
    color: '#8B5CF6',
    description: 'Key strategic partner with long-term commitment',
    benefits: ['24/7 premium support', 'Flexible payment terms', 'Exclusive products', 'Custom pricing options', 'Joint marketing opportunities']
  }
];
