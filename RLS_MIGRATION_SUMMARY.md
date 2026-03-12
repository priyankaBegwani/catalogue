# RLS Migration: Using Anon Key with User Tokens

## Overview

Migrated from using Supabase service role key (bypassing RLS) to using anon key with user JWT tokens (enforcing RLS policies).

## Changes Made

### 1. Added `getSupabaseWithAuth` Helper

**File**: `workers/src/config.js`

```javascript
// Create Supabase client with user's auth token (enforces RLS)
export function getSupabaseWithAuth(env, userToken) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

### 2. Updated Design Endpoints

**File**: `workers/src/routes/designs.js`

All write operations (POST, PUT, DELETE) now use user context:

- ✅ `POST /` - Create design
- ✅ `PUT /:id` - Update design
- ✅ `DELETE /:id` - Delete design
- ✅ `POST /:id/colors` - Add color
- ✅ `PUT /:id/colors/:colorId` - Update color
- ✅ `DELETE /:id/colors/:colorId` - Delete color

**Pattern used:**
```javascript
const authHeader = c.req.header('authorization');
const token = authHeader.replace('Bearer ', '');
const { getSupabaseWithAuth } = await import('../config.js');
const supabase = getSupabaseWithAuth(c.env, token);
```

### 3. Endpoints Still Using Admin Client (Public Data)

These endpoints use `getSupabaseAdmin` because they serve public data:

- `GET /categories` - Public category list
- `GET /styles` - Public style list
- `GET /fabric-types` - Public fabric types
- `GET /brands` - Public brands list

### 4. Endpoints That Need Migration

The following routes still use `getSupabase(c.env)` and need to be updated to use user context:

#### Admin Routes (`workers/src/routes/admin.js`)
- All CRUD operations for categories, styles, fabric types

#### Auth Routes (`workers/src/routes/auth.js`)
- Some operations (review needed)

#### Brands Routes (`workers/src/routes/brands.js`)
- POST, PUT, DELETE operations

#### Cart Routes (`workers/src/routes/cart.js`)
- All cart operations (GET, POST, PUT, DELETE)

#### Locations Routes (`workers/src/routes/locations.js`)
- All CRUD operations

#### Orders Routes (`workers/src/routes/orders.js`)
- All order operations

#### Parties Routes (`workers/src/routes/parties.js`)
- All party operations

#### Transport Routes (`workers/src/routes/transport.js`)
- All transport operations

#### Users Routes (`workers/src/routes/users.js`)
- All user management operations

#### Wishlist Routes (`workers/src/routes/wishlist.js`)
- All wishlist operations

## Security Benefits

### Before (Service Role Key)
```
Request → JWT Auth ✅ → Admin Check ✅ → Service Role (Bypass RLS) ⚠️
```

### After (Anon Key + User Token)
```
Request → JWT Auth ✅ → Admin Check ✅ → Anon Key + User Token → RLS Check ✅
```

**Benefits:**
1. ✅ **Defense-in-depth**: Two layers of security (middleware + database)
2. ✅ **Database-level enforcement**: RLS policies validate at DB level
3. ✅ **Proper audit trail**: Database logs show which user performed action
4. ✅ **Compliance**: Meets security standards requiring DB-level security
5. ✅ **Future-proof**: Safe if direct Supabase access is added later

## When to Use Each Client

### `getSupabaseWithAuth(env, token)` - For Protected Operations
Use for all authenticated operations that modify data:
- ✅ Create, Update, Delete operations
- ✅ User-specific data (cart, wishlist, orders)
- ✅ Admin operations (categories, styles, etc.)

### `getSupabaseAdmin(env)` - For Public Read-Only Data
Use only for:
- ✅ Public endpoints (categories, styles, fabric types, brands)
- ✅ Data that anonymous users can view
- ✅ System operations (if needed)

### `getSupabase(env)` - For Truly Public Endpoints
Use for:
- ✅ Health checks
- ✅ Public data with no auth required

## Migration Checklist

- [x] Add `getSupabaseWithAuth` helper
- [x] Update design CRUD endpoints
- [x] Update design color endpoints
- [x] Update admin endpoints
- [x] Update brands endpoints
- [x] Update cart endpoints
- [x] Update locations endpoints
- [x] Update orders endpoints
- [x] Update parties endpoints
- [x] Update transport endpoints
- [x] Update users endpoints
- [x] Update wishlist endpoints
- [ ] Test all endpoints
- [ ] Verify RLS policies work correctly

## Testing

After migration, test:

1. **Create operations** - Verify RLS allows admin users
2. **Update operations** - Verify RLS allows admin users
3. **Delete operations** - Verify RLS allows admin users
4. **Read operations** - Verify data is accessible
5. **Non-admin users** - Verify they're blocked by RLS
6. **Public endpoints** - Verify they still work

## Rollback Plan

If issues occur, revert by changing:
```javascript
const { getSupabaseWithAuth } = await import('../config.js');
const supabase = getSupabaseWithAuth(c.env, token);
```

Back to:
```javascript
const { getSupabaseAdmin } = await import('../config.js');
const supabase = getSupabaseAdmin(c.env);
```

## Current Status

**✅ MIGRATION COMPLETE**

All routes have been migrated to use anon key with user tokens:

- ✅ Design endpoints (CRUD + colors)
- ✅ Cart endpoints (all operations)
- ✅ Wishlist endpoints (all operations)
- ✅ Orders endpoints (all operations)
- ✅ Users endpoints (all operations)
- ✅ Admin endpoints (categories, styles, fabric types)
- ✅ Brands endpoints (CRUD operations)
- ✅ Parties endpoints (CRUD operations)
- ✅ Transport endpoints (CRUD operations)
- ✅ Locations endpoints (CRUD operations)

**Public endpoints still using admin client (correct):**
- ✅ GET /api/designs/categories
- ✅ GET /api/designs/styles
- ✅ GET /api/designs/fabric-types
- ✅ GET /api/brands

**Next Steps:**
1. Restart Workers backend: `cd workers && npm run dev`
2. Test all endpoints with authenticated requests
3. Verify RLS policies are enforced correctly
4. Monitor for any permission errors
