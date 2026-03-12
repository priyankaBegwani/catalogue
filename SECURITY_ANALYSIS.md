# Security Analysis: Authentication & RLS

## Current Implementation

### Authentication Flow
```
1. User sends request with JWT token in Authorization header
2. authenticateUser middleware validates token
3. requireAdmin middleware checks user role
4. Endpoint uses admin client (bypasses RLS)
```

### Security Layers

#### Layer 1: Middleware Authentication ✅
- **Location**: `workers/src/middleware/auth.js`
- **What it does**:
  - Validates JWT token
  - Fetches user profile from database
  - Checks if user is active
  - Verifies admin role for protected endpoints

#### Layer 2: RLS Policies (Currently Bypassed) ⚠️
- **Location**: Supabase database
- **What it should do**:
  - Enforce row-level permissions
  - Validate user context at database level
  - Provide defense-in-depth security

## Two Approaches

### Approach 1: Middleware-Only Security (Current)

**Pros:**
- ✅ Simpler code
- ✅ Easier to debug
- ✅ Single source of truth for permissions
- ✅ Better performance (no RLS overhead)
- ✅ Common in API servers

**Cons:**
- ❌ No defense-in-depth
- ❌ If middleware is bypassed, no protection
- ❌ Can't use Supabase client directly from frontend

**When to use:**
- Backend-only API
- Full control over all access paths
- Performance is critical
- Simple permission model

### Approach 2: Proper RLS with User Context (Recommended)

**Pros:**
- ✅ Defense-in-depth security
- ✅ Database-level enforcement
- ✅ Works with direct Supabase access
- ✅ Better for compliance/auditing
- ✅ Protects against middleware bugs

**Cons:**
- ❌ More complex setup
- ❌ Slight performance overhead
- ❌ Need to pass user context to Supabase

**When to use:**
- Multiple access paths to database
- High security requirements
- Compliance needs (SOC2, HIPAA, etc.)
- Frontend uses Supabase directly

## Recommended Solution: Proper RLS Implementation

### Step 1: Update Supabase Client to Use User Context

Instead of using admin client, create a client with the user's JWT:

```javascript
// workers/src/config.js
export function getSupabaseWithAuth(env, userToken) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });
}
```

### Step 2: Update Endpoints to Use User Context

```javascript
// workers/src/routes/designs.js
designs.post('/', authenticateUser, requireAdmin, async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    const token = authHeader.replace('Bearer ', '');
    const { getSupabaseWithAuth } = await import('../config.js');
    const supabase = getSupabaseWithAuth(c.env, token);
    
    // Now RLS policies will be enforced with user context
    const { data: design, error } = await supabase
      .from('designs')
      .insert({ ... })
      .select()
      .single();
    
    // RLS policy checks:
    // - Is user authenticated? ✅
    // - Is user admin? ✅
    // - Is user active? ✅
  }
});
```

### Step 3: Keep RLS Policies as They Are

The existing RLS policies already check for admin role:

```sql
CREATE POLICY "Admins can insert designs"
  ON designs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );
```

This policy will now work because:
1. User's JWT is passed to Supabase
2. `auth.uid()` returns the user's ID
3. Policy checks if user is admin
4. Middleware already verified this, so it's redundant but safe

### Step 4: Use Admin Client Only for Public Endpoints

```javascript
// Public endpoints that don't require auth
designs.get('/categories', optionalAuth, async (c) => {
  // Use admin client here because:
  // 1. No user authentication required
  // 2. Data is public (categories)
  // 3. RLS would block anonymous users
  const { getSupabaseAdmin } = await import('../config.js');
  const supabase = getSupabaseAdmin(c.env);
  // ...
});
```

## Hybrid Approach (Best of Both Worlds)

Use **admin client for reads**, **user context for writes**:

```javascript
// Read operations (GET) - Use admin client
// - Faster (no RLS overhead)
// - Middleware already checked auth
designs.get('/', authenticateUser, async (c) => {
  const { getSupabaseAdmin } = await import('../config.js');
  const supabase = getSupabaseAdmin(c.env);
  // Fast reads, middleware ensures only authenticated users
});

// Write operations (POST/PUT/DELETE) - Use user context
// - Defense-in-depth
// - RLS validates at database level
designs.post('/', authenticateUser, requireAdmin, async (c) => {
  const token = c.req.header('authorization').replace('Bearer ', '');
  const { getSupabaseWithAuth } = await import('../config.js');
  const supabase = getSupabaseWithAuth(c.env, token);
  // RLS enforced, double-checked security
});
```

## Security Comparison

| Aspect | Current (Admin Client) | Proper RLS | Hybrid |
|--------|----------------------|------------|--------|
| **Middleware Auth** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Database-level Security** | ❌ No | ✅ Yes | ⚠️ Writes only |
| **Defense-in-depth** | ❌ No | ✅ Yes | ⚠️ Partial |
| **Performance** | ✅ Fast | ⚠️ Slower | ✅ Fast reads, safe writes |
| **Complexity** | ✅ Simple | ⚠️ Complex | ⚠️ Moderate |
| **Audit Trail** | ⚠️ Middleware only | ✅ DB + Middleware | ✅ DB + Middleware |

## Recommendation

For your catalogue application, I recommend the **Hybrid Approach**:

1. **Public endpoints** (categories, styles, etc.) → Admin client
2. **Read operations** (list designs, get design) → Admin client (after auth check)
3. **Write operations** (create, update, delete) → User context with RLS

This provides:
- ✅ Good performance for reads
- ✅ Defense-in-depth for writes
- ✅ Proper audit trail
- ✅ Database-level validation for critical operations

## Implementation Priority

### High Priority (Security Critical)
- [ ] Create/Update/Delete Designs → Use user context
- [ ] Create/Update/Delete Users → Use user context
- [ ] Order creation → Use user context

### Medium Priority (Less Critical)
- [ ] Read operations → Can keep admin client
- [ ] Public data → Keep admin client

### Low Priority (Public Data)
- [ ] Categories, Styles, Fabric Types → Keep admin client
- [ ] Health checks → No auth needed

## Code Example: Proper Implementation

See `SECURITY_IMPLEMENTATION.md` for complete code examples.
