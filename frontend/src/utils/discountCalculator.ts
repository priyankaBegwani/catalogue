// Discount tier percentages
export const DISCOUNT_TIERS = {
  gold: 47.45,
  silver: 45,
  copper: 40,
  retail: 30
} as const;

export type DiscountTier = keyof typeof DISCOUNT_TIERS;

/**
 * Calculate discounted price based on party's discount tier
 * @param originalPrice - The original price before discount
 * @param discountTier - The discount tier (gold, silver, copper, retail)
 * @returns The discounted price
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discountTier?: string | null
): number {
  if (!discountTier || !(discountTier in DISCOUNT_TIERS)) {
    return originalPrice;
  }

  const discountPercentage = DISCOUNT_TIERS[discountTier as DiscountTier];
  const discountAmount = (originalPrice * discountPercentage) / 100;
  const discountedPrice = originalPrice - discountAmount;

  return Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
}

/**
 * Get discount percentage for a tier
 * @param discountTier - The discount tier
 * @returns The discount percentage or 0 if no tier
 */
export function getDiscountPercentage(discountTier?: string | null): number {
  if (!discountTier || !(discountTier in DISCOUNT_TIERS)) {
    return 0;
  }
  return DISCOUNT_TIERS[discountTier as DiscountTier];
}

/**
 * Format discount tier for display
 * @param discountTier - The discount tier
 * @returns Formatted string
 */
export function formatDiscountTier(discountTier?: string | null): string {
  if (!discountTier) return 'No discount';
  
  const tier = discountTier.charAt(0).toUpperCase() + discountTier.slice(1);
  const percentage = getDiscountPercentage(discountTier);
  
  return `${tier} (${percentage}% off)`;
}
