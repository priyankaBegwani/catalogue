# Size-Specific Quantities Implementation

## Overview
Added size-specific inventory tracking for design color variants. Each color can now have different quantities for sizes: S, M, L, XL, XXL, XXXL.

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20251110120000_add_size_quantities_to_design_colors.sql`

Added `size_quantities` JSONB column to `design_colors` table:
```sql
ALTER TABLE design_colors
ADD COLUMN IF NOT EXISTS size_quantities jsonb DEFAULT '{
  "S": 0,
  "M": 0,
  "L": 0,
  "XL": 0,
  "XXL": 0,
  "XXXL": 0
}'::jsonb;
```

**Features:**
- JSONB data type for flexible storage
- Default values of 0 for all sizes
- GIN index for efficient querying
- Column documentation via COMMENT

**Action Required:** Run this migration on your Supabase database:
```bash
# Via Supabase CLI or dashboard
supabase db push
```

### 2. Backend API Updates

#### File: `backend/src/routes/designs.js`

**Updated Endpoints:**

1. **GET /api/designs** - List all designs
   - Added `size_quantities` to design_colors SELECT query

2. **GET /api/designs/:id** - Get single design
   - Added `size_quantities` to design_colors SELECT query

3. **POST /api/designs** - Create new design
   - Accepts `size_quantities` in colors array
   - Default: `{ S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 }`

4. **POST /api/designs/:id/colors** - Add color to design
   - Accepts `size_quantities` parameter
   - Default: `{ S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 }`

5. **PUT /api/designs/colors/:colorId** - Update color
   - Accepts `size_quantities` parameter for updates

**Example Request Body (Create Design):**
```json
{
  "design_no": "IND-001",
  "name": "Premium Kurta",
  "colors": [
    {
      "color_name": "Navy Blue",
      "price": 1299,
      "size_quantities": {
        "S": 20,
        "M": 50,
        "L": 30,
        "XL": 15,
        "XXL": 10,
        "XXXL": 5
      }
    }
  ]
}
```

### 3. Frontend API Client

#### File: `frontend/src/lib/api.ts`

**Updated Interfaces:**

```typescript
export interface DesignColor {
  id: string;
  design_id: string;
  color_name: string;
  color_code: string | null;
  price: number;
  in_stock: boolean;
  stock_quantity: number;
  size_quantities?: {
    S: number;
    M: number;
    L: number;
    XL: number;
    XXL: number;
    XXXL: number;
  };
  image_urls: string[];
  created_at: string;
  updated_at: string;
}
```

**Updated Methods:**
- `createDesign()` - Accepts size_quantities in colors array
- All GET methods now return size_quantities data

### 4. Frontend UI Component

#### File: `frontend/src/components/AddDesignModal.tsx`

**New Features:**

1. **Size Quantity Inputs**
   - 6 input fields (S, M, L, XL, XXL, XXXL)
   - Grid layout: 3 columns on mobile, 6 on desktop
   - Centered labels and inputs

2. **Smart Input Behavior**
   - **Numeric-only**: `inputMode="numeric"` + regex validation
   - **Zero placeholder**: Shows "0" placeholder when value is 0
   - **Auto-clear**: Typing removes the zero placeholder
   - **Pattern validation**: `pattern="[0-9]*"` ensures numbers only

3. **Data Structure**
   ```typescript
   interface ColorData {
     // ... other fields
     size_quantities: {
       S: number;
       M: number;
       L: number;
       XL: number;
       XXL: number;
       XXXL: number;
     };
   }
   ```

**UI Layout:**
```
┌─────────────────────────────────────────────────┐
│ Color #1                                    [×] │
├─────────────────────────────────────────────────┤
│ Color Name: [Navy Blue]    Color: [🎨]         │
│ Price: [1299]              ☑ In Stock          │
├─────────────────────────────────────────────────┤
│ Quantity by Size                                │
├────────┬────────┬────────┬────────┬────────┬────┤
│   S    │   M    │   L    │   XL   │  XXL   │XXXL│
│  [20]  │  [50]  │  [30]  │  [15]  │  [10]  │ [5]│
└────────┴────────┴────────┴────────┴────────┴────┘
```

## Data Flow

### Creating a Design with Size Quantities

1. **User Input** (Frontend)
   - User adds color variant
   - Enters quantities for each size (S, M, L, XL, XXL, XXXL)
   - Only numeric input allowed
   - Zero values show as placeholder

2. **API Request** (Frontend → Backend)
   ```javascript
   {
     color_name: "Navy Blue",
     price: 1299,
     size_quantities: {
       S: 20, M: 50, L: 30,
       XL: 15, XXL: 10, XXXL: 5
     }
   }
   ```

3. **Database Storage** (Backend)
   - Stored as JSONB in `design_colors.size_quantities`
   - Indexed for fast queries
   - Default values if not provided

4. **API Response** (Backend → Frontend)
   - Returns complete design with size_quantities
   - Frontend displays in edit mode

## Benefits

1. **Granular Inventory Control**
   - Track stock at size level, not just color level
   - Better inventory management
   - Accurate stock availability

2. **Flexible Data Structure**
   - JSONB allows easy schema evolution
   - Can add new sizes without migration
   - Efficient storage and querying

3. **User-Friendly Interface**
   - Clear visual layout
   - Numeric-only input prevents errors
   - Placeholder behavior improves UX

4. **API Compatibility**
   - Backward compatible (optional field)
   - Existing designs work without size_quantities
   - Defaults provided for missing data

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create new design with size quantities
- [ ] Verify data stored correctly in database
- [ ] Edit existing design (should show default zeros)
- [ ] Test numeric-only input validation
- [ ] Test placeholder behavior (zero disappears on type)
- [ ] Verify API returns size_quantities in GET requests
- [ ] Test with different size combinations
- [ ] Check mobile responsive layout (3 columns)
- [ ] Check desktop layout (6 columns)

## Future Enhancements

1. **Auto-calculate total stock** from size quantities
2. **Size-based pricing** (different prices per size)
3. **Low stock alerts** per size
4. **Size popularity analytics**
5. **Bulk size quantity updates**
