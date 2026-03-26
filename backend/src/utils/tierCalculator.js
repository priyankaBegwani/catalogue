// Tier calculation utilities for backend

const DEFAULT_VOLUME_TIERS = [
  { id: 'copper', name: 'Copper', minOrders: 0, maxOrders: 10, discount: 0 },
  { id: 'bronze', name: 'Bronze', minOrders: 11, maxOrders: 25, discount: 5 },
  { id: 'silver', name: 'Silver', minOrders: 26, maxOrders: 50, discount: 10 },
  { id: 'gold', name: 'Gold', minOrders: 51, maxOrders: 100, discount: 15 },
  { id: 'platinum', name: 'Platinum', minOrders: 101, maxOrders: null, discount: 20 }
];

const DEFAULT_RELATIONSHIP_TIERS = [
  { id: 'standard', name: 'Standard', discount: 5 },
  { id: 'trusted', name: 'Trusted', discount: 12 },
  { id: 'strategic', name: 'Strategic', discount: 18 }
];

/**
 * Calculate volume tier based on monthly order count
 * @param {number} monthlyOrders - Number of orders in the current month
 * @param {Array} customTiers - Optional custom tier configuration
 * @returns {Object|null} - Tier object or null if no match
 */
function calculateVolumeTier(monthlyOrders, customTiers = null) {
  const tiers = customTiers || DEFAULT_VOLUME_TIERS;
  
  for (const tier of tiers) {
    if (monthlyOrders >= tier.minOrders && 
        (tier.maxOrders === null || monthlyOrders <= tier.maxOrders)) {
      return tier;
    }
  }
  
  return null;
}

/**
 * Get discount percentage for a party based on active pricing model
 * @param {Object} party - Party object with tier information
 * @param {string} activeModel - Active pricing model (volume, relationship, hybrid)
 * @param {Object} config - Pricing configuration with tier definitions
 * @returns {number} - Discount percentage
 */
function getPartyDiscount(party, activeModel, config = {}) {
  const volumeTiers = config.volumeTiers || DEFAULT_VOLUME_TIERS;
  const relationshipTiers = config.relationshipTiers || DEFAULT_RELATIONSHIP_TIERS;

  switch (activeModel) {
    case 'volume': {
      const tier = volumeTiers.find(t => t.id === party.volume_tier_id);
      return tier ? tier.discount : 0;
    }
    
    case 'relationship': {
      const tier = relationshipTiers.find(t => t.id === party.relationship_tier_id);
      return tier ? tier.discount : 0;
    }
    
    case 'hybrid': {
      if (party.hybrid_manual_override && party.hybrid_override_tier_id) {
        const tier = volumeTiers.find(t => t.id === party.hybrid_override_tier_id);
        return tier ? tier.discount : 0;
      }
      const tier = volumeTiers.find(t => t.id === party.hybrid_auto_tier_id);
      return tier ? tier.discount : 0;
    }
    
    default:
      return 0;
  }
}

/**
 * Apply discount to a price
 * @param {number} price - Original price
 * @param {number} discountPercentage - Discount percentage (0-100)
 * @returns {number} - Discounted price
 */
function applyDiscount(price, discountPercentage) {
  return price * (1 - discountPercentage / 100);
}

/**
 * Update party's monthly order count and recalculate tier
 * @param {Object} db - Database connection
 * @param {string} partyId - Party ID
 * @returns {Promise<Object>} - Updated party tier information
 */
async function updatePartyOrderCount(db, partyId) {
  // Get current month's order count
  const result = await db.query(
    `SELECT COUNT(*) as order_count 
     FROM orders 
     WHERE party_id = $1 
     AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
    [partyId]
  );
  
  const monthlyOrderCount = parseInt(result.rows[0].order_count);
  
  // Calculate new tier
  const newTier = calculateVolumeTier(monthlyOrderCount);
  
  // Update party record
  await db.query(
    `UPDATE parties 
     SET monthly_order_count = $1,
         hybrid_auto_tier_id = $2,
         tier_last_updated = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [monthlyOrderCount, newTier ? newTier.id : null, partyId]
  );
  
  return {
    monthlyOrderCount,
    tierId: newTier ? newTier.id : null,
    tierName: newTier ? newTier.name : null,
    discount: newTier ? newTier.discount : 0
  };
}

/**
 * Batch update all parties' monthly order counts
 * Useful for scheduled jobs
 * @param {Object} db - Database connection
 * @returns {Promise<number>} - Number of parties updated
 */
async function batchUpdateAllParties(db) {
  const parties = await db.query('SELECT id FROM parties WHERE is_active = true');
  
  let updateCount = 0;
  for (const party of parties.rows) {
    try {
      await updatePartyOrderCount(db, party.id);
      updateCount++;
    } catch (error) {
      console.error(`Failed to update party ${party.id}:`, error);
    }
  }
  
  return updateCount;
}

module.exports = {
  calculateVolumeTier,
  getPartyDiscount,
  applyDiscount,
  updatePartyOrderCount,
  batchUpdateAllParties,
  DEFAULT_VOLUME_TIERS,
  DEFAULT_RELATIONSHIP_TIERS
};
