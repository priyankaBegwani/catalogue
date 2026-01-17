# Pricing Tiers System Documentation

## Overview
The Pricing Tiers system provides a flexible discount management framework with three different models to suit various business needs. Discounts are automatically or manually applied to parties/customers based on their tier assignment.

## Three Pricing Models

### 1. Volume-Based Tiers (Automatic)
**Icon:** TrendingUp (Amber/Orange gradient)

Automatically assigns tiers based on monthly order volume.

**Default Tiers:**
- **Copper** (0-10 orders/month): 0% discount
  - Color: #B87333
  - Entry level customers
  
- **Bronze** (11-25 orders/month): 5% discount
  - Color: #CD7F32
  - Growing customers
  
- **Silver** (26-50 orders/month): 10% discount
  - Color: #C0C0C0
  - Regular customers
  
- **Gold** (51-100 orders/month): 15% discount
  - Color: #FFD700
  - Premium customers
  
- **Platinum** (100+ orders/month): 20% discount
  - Color: #E5E4E2
  - Elite customers

**How it works:**
- System automatically calculates monthly order count for each party
- Tier is assigned based on where the count falls in the ranges
- Tiers update automatically as order volume changes
- No manual intervention required

---

### 2. Relationship-Based Tiers (Manual)
**Icon:** Users (Blue/Indigo gradient)

Manually assigned tiers based on business relationship quality.

**Default Tiers:**
- **Standard**: 5% discount
  - Color: #6B7280 (Gray)
  - New or occasional business relationships
  - Benefits:
    - Standard support
    - Regular payment terms
    - Basic catalog access

- **Trusted**: 12% discount
  - Color: #3B82F6 (Blue)
  - Established and reliable business partners
  - Benefits:
    - Priority support
    - Extended payment terms
    - Early access to new products
    - Dedicated account manager

- **Strategic**: 18% discount
  - Color: #8B5CF6 (Purple)
  - Key strategic partners with long-term commitment
  - Benefits:
    - 24/7 premium support
    - Flexible payment terms
    - Exclusive products
    - Custom pricing options
    - Joint marketing opportunities

**How it works:**
- Admin manually assigns tier to each party
- Based on relationship quality, trust, payment history
- Tier remains until manually changed
- Independent of order volume

---

### 3. Hybrid Model (Auto + Manual Override)
**Icon:** Zap (Purple/Pink gradient)

Combines automatic volume-based assignment with manual override capability.

**How it works:**
- System automatically assigns volume-based tier (Copper through Platinum)
- Tier updates automatically based on monthly order count
- Admin can manually override the automatic tier for specific parties
- Manual override remains in effect until:
  - Admin removes the override
  - Tier is recalculated
- Uses the same volume tiers as Volume-Based model

**Use cases:**
- VIP customer with low volume but strategic importance
- New customer you want to incentivize
- Temporary promotional discounts
- Special circumstances requiring manual adjustment

---

## Configuration

### Settings Page
**Location:** `/settings` (Admin only)

**Pricing Tier Model Section:**
- Select which model to use (Volume, Relationship, or Hybrid)
- Radio button selection with visual indicators
- Link to "Manage Tiers" page for detailed configuration
- Changes saved with all other settings

### Pricing Tiers Management Page
**Location:** `/pricing-tiers` (Admin only)

**Features:**
- Edit discount percentages for all tiers
- Modify order volume thresholds (Volume-Based)
- Update tier descriptions
- Edit relationship tier benefits
- Real-time preview of changes
- Color-coded tier cards

**Volume Tiers Configuration:**
- Adjust min/max monthly order ranges
- Set discount percentages (0-100%)
- Update descriptions
- Cannot delete default tiers (only edit)

**Relationship Tiers Configuration:**
- Set discount percentages
- Edit descriptions
- Manage benefit lists
- Cannot delete default tiers (only edit)

---

## Party/Customer Assignment

### Automatic Assignment (Volume & Hybrid)
- System tracks monthly order count per party
- Tier automatically calculated based on configured ranges
- Updates happen when orders are placed
- Visible in party details

### Manual Assignment (Relationship & Hybrid Override)
- Admin assigns tier from party management page
- Dropdown/selection interface
- Shows current tier and discount percentage
- Can be changed at any time

---

## Technical Implementation

### Storage
**localStorage Keys:**
- `pricing_tier_config`: Main configuration object
  ```json
  {
    "activeModel": "volume" | "relationship" | "hybrid",
    "volumeTiers": [...],
    "relationshipTiers": [...]
  }
  ```
- `party_tier_{partyId}`: Individual party tier data
  ```json
  {
    "partyId": "string",
    "volumeTierId": "string",
    "relationshipTierId": "string",
    "hybridAutoTierId": "string",
    "hybridManualOverride": boolean,
    "hybridOverrideTierId": "string",
    "monthlyOrderCount": number,
    "lastUpdated": "ISO date string"
  }
  ```

### Files Created
1. **Types:**
   - `src/types/pricing.ts`: TypeScript interfaces and default tier definitions

2. **Utilities:**
   - `src/utils/pricingTiers.ts`: Helper functions for tier calculation and discount application

3. **Pages:**
   - `src/pages/PricingTiers.tsx`: Tier management interface
   - Updated `src/pages/Settings.tsx`: Model selection

4. **Routing:**
   - Added `/pricing-tiers` route (admin only)
   - Added to Sidebar navigation

### Key Functions

```typescript
// Get current pricing configuration
getPricingConfig(): PricingTierConfig

// Save pricing configuration
savePricingConfig(config: PricingTierConfig): void

// Calculate volume tier based on order count
calculateVolumeTier(monthlyOrders: number, tiers: VolumeTier[]): VolumeTier | null

// Get discount for a specific party
getDiscountForParty(partyId: string, model: TierModel, config: PricingTierConfig): number

// Update party's monthly order count
updatePartyMonthlyOrders(partyId: string, orderCount: number): void

// Apply discount to price
applyDiscount(originalPrice: number, discountPercentage: number): number
```

---

## Usage Workflow

### Initial Setup
1. Navigate to Settings → Pricing Tier Model section
2. Select desired model (Volume, Relationship, or Hybrid)
3. Click "Manage Tiers" to configure discount percentages
4. Edit tier details as needed
5. Save configuration

### For Volume-Based Model
1. System automatically tracks orders
2. Tiers assigned based on monthly count
3. No manual intervention needed
4. Monitor tier distribution in reports

### For Relationship-Based Model
1. Go to Party Entry/Management
2. Select party to assign tier
3. Choose tier from dropdown (Standard/Trusted/Strategic)
4. Save party details
5. Discount automatically applied to orders

### For Hybrid Model
1. System auto-assigns based on volume
2. View auto-assigned tier in party details
3. Optionally override for specific parties
4. Override remains until removed
5. Can revert to automatic at any time

---

## Integration Points

### Party Entry Page
- Tier selection dropdown (Relationship model)
- Current tier display
- Discount percentage indicator
- Override toggle (Hybrid model)

### Order Processing
- Discount automatically applied based on party's tier
- Discount shown on order summary
- Original and discounted prices displayed

### Reports/Analytics
- Tier distribution charts
- Discount impact analysis
- Revenue by tier
- Tier migration tracking

---

## Best Practices

1. **Start Simple:** Begin with Volume-Based for automatic management
2. **Review Regularly:** Check tier thresholds quarterly
3. **Document Decisions:** Note why relationship tiers are assigned
4. **Monitor Impact:** Track discount costs vs. customer retention
5. **Communicate Clearly:** Inform customers of their tier and benefits
6. **Use Hybrid Wisely:** Only override when necessary
7. **Test Changes:** Preview discount impact before applying

---

## Future Enhancements

Potential additions:
- Time-based tier expiration
- Seasonal tier adjustments
- Multi-factor tier calculation (volume + payment terms + returns)
- Tier upgrade notifications
- Customer-facing tier dashboard
- Historical tier tracking
- Bulk tier assignments
- Import/export tier configurations

---

## Support

For questions or issues:
1. Check this documentation
2. Review Settings page info boxes
3. Test in Pricing Tiers management page
4. Contact system administrator

---

## Changelog

**Version 1.0** (Initial Release)
- Three pricing models (Volume, Relationship, Hybrid)
- Default tier configurations
- Settings page integration
- Pricing Tiers management page
- localStorage persistence
- Admin-only access
