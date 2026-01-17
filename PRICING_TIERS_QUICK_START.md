# Pricing Tiers - Quick Start Guide

## What Was Created

A complete pricing tier system with three models for managing customer discounts:

### 📊 Three Pricing Models

1. **Volume-Based** (Automatic)
   - Copper, Bronze, Silver, Gold, Platinum tiers
   - Based on monthly order count
   - 0% to 20% discounts
   - Fully automatic

2. **Relationship-Based** (Manual)
   - Standard, Trusted, Strategic tiers
   - Based on business relationship
   - 5% to 18% discounts
   - Manually assigned

3. **Hybrid** (Auto + Override)
   - Automatic volume-based assignment
   - Manual override capability
   - Best of both worlds

---

## How to Use

### Step 1: Choose Your Model
1. Go to **Settings** page (admin only)
2. Scroll to **Pricing Tier Model** section
3. Select your preferred model:
   - Volume-Based for automatic management
   - Relationship-Based for manual control
   - Hybrid for flexibility
4. Click **Save All Settings**

### Step 2: Configure Tiers
1. Click **Manage Tiers** button in Settings, or
2. Navigate to **Pricing Tiers** from sidebar
3. Edit discount percentages for each tier
4. Adjust order volume thresholds (Volume tiers)
5. Update descriptions and benefits
6. Click **Save Pricing Tiers**

### Step 3: Assign to Parties
- **Volume/Hybrid:** Automatic based on orders
- **Relationship:** Assign manually in Party Entry page
- **Hybrid Override:** Override automatic tier when needed

---

## Pages Created

### 1. Pricing Tiers Management (`/pricing-tiers`)
**Location:** Admin sidebar → Pricing Tiers

**Features:**
- Edit all tier configurations
- Visual tier cards with colors
- Inline editing
- Real-time preview
- Save all changes at once

### 2. Settings - Pricing Model Section
**Location:** Admin sidebar → Settings → Pricing Tier Model

**Features:**
- Select active model (radio buttons)
- Visual model descriptions
- Link to tier management
- Integrated with other settings

---

## Files Created

### Types & Interfaces
- `src/types/pricing.ts`
  - TierModel type
  - VolumeTier interface
  - RelationshipTier interface
  - HybridTier interface
  - Default tier configurations

### Utilities
- `src/utils/pricingTiers.ts`
  - getPricingConfig()
  - savePricingConfig()
  - calculateVolumeTier()
  - getDiscountForParty()
  - updatePartyMonthlyOrders()
  - applyDiscount()

### Pages
- `src/pages/PricingTiers.tsx`
  - Full tier management interface
  - Edit volume tiers
  - Edit relationship tiers
  - Hybrid model info

### Updates
- `src/pages/Settings.tsx`
  - Added Pricing Tier Model section
  - Model selection UI
  - Link to tier management

- `src/App.tsx`
  - Added `/pricing-tiers` route

- `src/components/Sidebar.tsx`
  - Added Pricing Tiers navigation item

---

## Default Configuration

### Volume Tiers
| Tier | Orders/Month | Discount | Color |
|------|-------------|----------|-------|
| Copper | 0-10 | 0% | Bronze |
| Bronze | 11-25 | 5% | Bronze |
| Silver | 26-50 | 10% | Silver |
| Gold | 51-100 | 15% | Gold |
| Platinum | 100+ | 20% | Platinum |

### Relationship Tiers
| Tier | Discount | Description |
|------|----------|-------------|
| Standard | 5% | New/occasional partners |
| Trusted | 12% | Established partners |
| Strategic | 18% | Key strategic partners |

---

## Storage

All data stored in `localStorage`:

- `pricing_tier_config`: Main configuration
- `party_tier_{partyId}`: Individual party tier data

---

## Navigation

**Admin Sidebar:**
- Pricing Tiers (new menu item with TrendingUp icon)
- Located between Orders and Settings

**Settings Page:**
- New collapsible section: "Pricing Tier Model"
- Indigo/Purple gradient header
- Radio button selection

---

## Key Features

✅ Three flexible pricing models  
✅ Configurable discount percentages  
✅ Adjustable volume thresholds  
✅ Color-coded tier visualization  
✅ Inline editing interface  
✅ Automatic tier calculation  
✅ Manual override capability  
✅ localStorage persistence  
✅ Admin-only access  
✅ Integrated with Settings  
✅ Full navigation support  

---

## Next Steps

### To Complete Integration:

1. **Update PartyEntry page:**
   - Add tier selection dropdown
   - Display current tier and discount
   - Show auto-assigned tier (Hybrid)
   - Add override toggle (Hybrid)

2. **Update Order processing:**
   - Calculate discount based on party tier
   - Apply discount to order totals
   - Display discount on order summary

3. **Add to Reports:**
   - Tier distribution charts
   - Discount impact analysis
   - Revenue by tier

4. **Backend Integration:**
   - Store tier data in database
   - Calculate monthly order counts
   - Sync with localStorage

---

## Testing Checklist

- [ ] Select each pricing model in Settings
- [ ] Edit volume tier thresholds
- [ ] Edit relationship tier discounts
- [ ] Navigate to Pricing Tiers page
- [ ] Edit tier descriptions
- [ ] Save configuration
- [ ] Verify localStorage updates
- [ ] Check sidebar navigation
- [ ] Test on mobile/responsive

---

## Documentation

Full documentation available in:
- `PRICING_TIERS_DOCUMENTATION.md` - Complete technical docs
- `PRICING_TIERS_QUICK_START.md` - This file

---

## Support

For questions:
1. Check documentation files
2. Review Settings page info boxes
3. Test in Pricing Tiers management page
4. Contact system administrator
