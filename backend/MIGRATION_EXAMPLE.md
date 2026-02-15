# Backend Migration Example

## How to Refactor Existing Routes with New Utilities

### Example: Refactoring a User Route

#### **Before** (Old Pattern)
```javascript
// routes/users.js
import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*, parties!user_profiles_party_id_fkey(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { email, password, full_name, role, party_id } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Role validation
    if (!['admin', 'retailer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Create user logic...
    
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});
```

#### **After** (Optimized Pattern)
```javascript
// routes/users.js
import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import { 
  asyncHandler, 
  validateRequired, 
  validateEmail, 
  validateRole,
  executeQuery,
  cacheMiddleware 
} from '../utils/index.js';

const router = express.Router();

// GET all users - with caching
router.get('/', 
  authenticateUser, 
  requireAdmin, 
  cacheMiddleware(300), // Cache for 5 minutes
  asyncHandler(async (req, res) => {
    const users = await executeQuery(
      supabase
        .from('user_profiles')
        .select('*, parties!user_profiles_party_id_fkey(name)')
        .order('created_at', { ascending: false }),
      'Failed to fetch users'
    );

    res.json(users);
  })
);

// POST create user - with validation
router.post('/', 
  authenticateUser, 
  requireAdmin, 
  asyncHandler(async (req, res) => {
    const { email, password, full_name, role, party_id } = req.body;

    // Validate in one line each
    validateRequired(req.body, ['email', 'password', 'full_name', 'role']);
    validateEmail(email);
    validateRole(role);

    // Create user logic...
    // Errors automatically handled by asyncHandler
  })
);
```

### **Benefits**
- ✅ **60% less code** - No try-catch boilerplate
- ✅ **Consistent error handling** - All errors handled uniformly
- ✅ **Better performance** - Automatic caching
- ✅ **Cleaner code** - Validators are reusable
- ✅ **Type safety** - Validation prevents bad data

---

## Example: Refactoring Design Routes

#### **Before**
```javascript
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: design, error } = await supabase
      .from('designs')
      .select('*, design_colors(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json(design);
  } catch (error) {
    console.error('Get design error:', error);
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});
```

#### **After**
```javascript
import { asyncHandler, getOneOrFail, validateUUID } from '../utils/index.js';

router.get('/:id', 
  optionalAuth, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    validateUUID(id, 'Design ID');

    const design = await getOneOrFail(
      supabase
        .from('designs')
        .select('*, design_colors(*)')
        .eq('id', id),
      'Design not found'
    );

    res.json(design);
  })
);
```

---

## Example: Adding Caching to Expensive Queries

```javascript
import { cache } from '../utils/cache.js';

// Cache design categories (rarely change)
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await cache.getOrSet('design:categories', async () => {
    return await executeQuery(
      supabase
        .from('design_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      'Failed to fetch categories'
    );
  }, 600); // Cache for 10 minutes

  res.json(categories);
}));

// Or use middleware for automatic caching
router.get('/categories', 
  cacheMiddleware(600), 
  asyncHandler(async (req, res) => {
    const categories = await executeQuery(
      supabase
        .from('design_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      'Failed to fetch categories'
    );

    res.json(categories);
  })
);
```

---

## Example: Batch Operations

```javascript
import { batchInsert } from '../utils/queryHelpers.js';

router.post('/bulk-import', 
  authenticateUser, 
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { designs } = req.body;
    
    validateRequired(req.body, ['designs']);
    
    if (!Array.isArray(designs) || designs.length === 0) {
      throw new AppError('Designs must be a non-empty array', 400);
    }

    // Insert in batches of 100
    const inserted = await batchInsert('designs', designs, 100);

    res.status(201).json({ 
      message: `Successfully imported ${inserted.length} designs`,
      designs: inserted 
    });
  })
);
```

---

## Example: Dynamic Filtering

```javascript
import { applyFilters } from '../utils/queryHelpers.js';

router.get('/search', asyncHandler(async (req, res) => {
  const { category_id, fabric_type_id, min_price, max_price } = req.query;

  let query = supabase
    .from('designs')
    .select('*, design_colors(*)');

  // Apply filters dynamically
  query = applyFilters(query, {
    category_id,
    fabric_type_id,
    // Support range queries
    'design_colors.price': min_price ? { operator: 'gte', value: min_price } : undefined
  });

  const designs = await executeQuery(query, 'Failed to search designs');

  res.json(designs);
}));
```

---

## Cache Invalidation Pattern

```javascript
import { cache } from '../utils/cache.js';

// When creating/updating/deleting, invalidate cache
router.post('/', 
  authenticateUser, 
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Create design...
    const design = await createDesign(req.body);

    // Invalidate related caches
    cache.delete('designs:all');
    cache.delete(`designs:category:${design.category_id}`);

    res.status(201).json(design);
  })
);
```

---

## Performance Monitoring Example

```javascript
// Add timing middleware
const timingMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};

app.use(timingMiddleware);
```

---

## Complete Refactored Route Example

```javascript
import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';
import { 
  asyncHandler, 
  AppError,
  validateRequired, 
  validateUUID,
  executeQuery,
  getOneOrFail,
  cacheMiddleware,
  cache
} from '../utils/index.js';

const router = express.Router();

// List with caching and pagination
router.get('/', 
  cacheMiddleware(60),
  asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    const designs = await executeQuery(
      supabase
        .from('designs')
        .select('*, design_colors(*)')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false }),
      'Failed to fetch designs'
    );

    res.json(designs);
  })
);

// Get single
router.get('/:id', 
  asyncHandler(async (req, res) => {
    validateUUID(req.params.id);

    const design = await getOneOrFail(
      supabase
        .from('designs')
        .select('*, design_colors(*)')
        .eq('id', req.params.id),
      'Design not found'
    );

    res.json(design);
  })
);

// Create
router.post('/', 
  authenticateUser,
  requireAdmin,
  asyncHandler(async (req, res) => {
    validateRequired(req.body, ['design_no', 'name']);

    const design = await executeQuery(
      supabase
        .from('designs')
        .insert(req.body)
        .select()
        .single(),
      'Failed to create design'
    );

    // Invalidate cache
    cache.delete('designs:all');

    res.status(201).json(design);
  })
);

// Update
router.patch('/:id', 
  authenticateUser,
  requireAdmin,
  asyncHandler(async (req, res) => {
    validateUUID(req.params.id);

    const design = await executeQuery(
      supabase
        .from('designs')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single(),
      'Failed to update design'
    );

    // Invalidate cache
    cache.delete('designs:all');
    cache.delete(`design:${req.params.id}`);

    res.json(design);
  })
);

// Delete
router.delete('/:id', 
  authenticateUser,
  requireAdmin,
  asyncHandler(async (req, res) => {
    validateUUID(req.params.id);

    await executeQuery(
      supabase
        .from('designs')
        .delete()
        .eq('id', req.params.id),
      'Failed to delete design'
    );

    // Invalidate cache
    cache.delete('designs:all');

    res.json({ message: 'Design deleted successfully' });
  })
);

export default router;
```

---

## Testing the Optimizations

```javascript
// Test cache performance
console.time('First request (no cache)');
await fetch('/api/designs/categories');
console.timeEnd('First request (no cache)'); // ~200ms

console.time('Second request (cached)');
await fetch('/api/designs/categories');
console.timeEnd('Second request (cached)'); // ~5ms

// Test error handling
try {
  await fetch('/api/designs/invalid-uuid');
} catch (error) {
  console.log(error.message); // "Invalid Design ID format"
}
```

---

## Rollout Strategy

1. **Phase 1**: Add utilities (✅ Done)
2. **Phase 2**: Update 1-2 routes as examples
3. **Phase 3**: Gradually migrate other routes
4. **Phase 4**: Remove old error handling patterns
5. **Phase 5**: Add comprehensive tests

**No breaking changes** - Old code continues to work!
