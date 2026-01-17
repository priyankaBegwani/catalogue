const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { updatePartyOrderCount, batchUpdateAllParties } = require('../utils/tierCalculator');

/**
 * POST /api/pricing-tiers/update-party/:partyId
 * Manually trigger update of party's monthly order count and tier
 */
router.post('/update-party/:partyId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { partyId } = req.params;
    const db = req.app.get('db');
    
    const tierInfo = await updatePartyOrderCount(db, partyId);
    
    res.json({
      success: true,
      message: 'Party tier updated successfully',
      data: tierInfo
    });
  } catch (error) {
    console.error('Error updating party tier:', error);
    res.status(500).json({ error: 'Failed to update party tier' });
  }
});

/**
 * POST /api/pricing-tiers/batch-update
 * Batch update all parties' order counts and tiers
 */
router.post('/batch-update', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const updateCount = await batchUpdateAllParties(db);
    
    res.json({
      success: true,
      message: `Successfully updated ${updateCount} parties`,
      updatedCount: updateCount
    });
  } catch (error) {
    console.error('Error batch updating parties:', error);
    res.status(500).json({ error: 'Failed to batch update parties' });
  }
});

/**
 * GET /api/pricing-tiers/party/:partyId/discount
 * Get current discount for a party based on active pricing model
 */
router.get('/party/:partyId/discount', authenticateToken, async (req, res) => {
  try {
    const { partyId } = req.params;
    const { activeModel = 'volume' } = req.query;
    const db = req.app.get('db');
    
    const result = await db.query(
      `SELECT 
        volume_tier_id,
        relationship_tier_id,
        hybrid_auto_tier_id,
        hybrid_manual_override,
        hybrid_override_tier_id,
        monthly_order_count
       FROM parties 
       WHERE id = $1`,
      [partyId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    const party = result.rows[0];
    const { getPartyDiscount } = require('../utils/tierCalculator');
    const discount = getPartyDiscount(party, activeModel);
    
    res.json({
      partyId,
      activeModel,
      discountPercentage: discount,
      tierInfo: {
        volumeTierId: party.volume_tier_id,
        relationshipTierId: party.relationship_tier_id,
        hybridAutoTierId: party.hybrid_auto_tier_id,
        hybridManualOverride: party.hybrid_manual_override,
        hybridOverrideTierId: party.hybrid_override_tier_id,
        monthlyOrderCount: party.monthly_order_count
      }
    });
  } catch (error) {
    console.error('Error getting party discount:', error);
    res.status(500).json({ error: 'Failed to get party discount' });
  }
});

module.exports = router;
