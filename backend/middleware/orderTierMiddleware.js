const { getPartyDiscount, applyDiscount, updatePartyOrderCount } = require('../utils/tierCalculator');

/**
 * Middleware to apply tier-based discount to order items
 * Should be used before order creation
 */
async function applyTierDiscount(req, res, next) {
  try {
    const db = req.app.get('db');
    const { party_id, items } = req.body;
    
    if (!party_id || !items || !Array.isArray(items)) {
      return next();
    }
    
    // Get party tier information
    const partyResult = await db.query(
      `SELECT 
        volume_tier_id,
        relationship_tier_id,
        hybrid_auto_tier_id,
        hybrid_manual_override,
        hybrid_override_tier_id,
        monthly_order_count
       FROM parties 
       WHERE id = $1`,
      [party_id]
    );
    
    if (partyResult.rows.length === 0) {
      return next();
    }
    
    const party = partyResult.rows[0];
    
    // Get active pricing model from settings (stored in a settings table or config)
    // For now, we'll check localStorage equivalent or default to 'volume'
    const activeModel = req.query.pricingModel || 'volume';
    
    // Calculate discount
    const discountPercentage = getPartyDiscount(party, activeModel);
    
    // Apply discount to each item
    const discountedItems = items.map(item => ({
      ...item,
      original_price: item.price,
      discount_percentage: discountPercentage,
      discounted_price: applyDiscount(item.price, discountPercentage),
      final_price: applyDiscount(item.price, discountPercentage) * (item.quantity || 1)
    }));
    
    // Attach discount info to request for use in order creation
    req.tierDiscount = {
      partyId: party_id,
      discountPercentage,
      activeModel,
      items: discountedItems,
      totalOriginal: items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
      totalDiscounted: discountedItems.reduce((sum, item) => sum + item.final_price, 0)
    };
    
    next();
  } catch (error) {
    console.error('Error applying tier discount:', error);
    // Don't fail the request, just proceed without discount
    next();
  }
}

/**
 * Middleware to update party's monthly order count after order creation
 * Should be used after successful order creation
 */
async function updatePartyTierAfterOrder(req, res, next) {
  try {
    const db = req.app.get('db');
    const { party_id } = req.body;
    
    if (!party_id) {
      return next();
    }
    
    // Update party's order count and tier in background
    // Don't await to avoid slowing down response
    updatePartyOrderCount(db, party_id).catch(error => {
      console.error('Background tier update failed:', error);
    });
    
    next();
  } catch (error) {
    console.error('Error in tier update middleware:', error);
    next();
  }
}

/**
 * Calculate order totals with tier discount
 * @param {Array} items - Order items
 * @param {number} discountPercentage - Tier discount percentage
 * @returns {Object} - Order totals
 */
function calculateOrderTotals(items, discountPercentage = 0) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const discountAmount = (subtotal * discountPercentage) / 100;
  const total = subtotal - discountAmount;
  
  return {
    subtotal,
    discountPercentage,
    discountAmount,
    total,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

module.exports = {
  applyTierDiscount,
  updatePartyTierAfterOrder,
  calculateOrderTotals
};
