# Database Migrations

This directory contains consolidated database migration files for easier management and maintenance.

## File Structure

### `00_schema_migrations.sql`
Contains all **schema-related changes**:
- `CREATE TABLE` statements
- `ALTER TABLE` statements (add/modify/drop columns)
- `CREATE INDEX` statements
- `CREATE TRIGGER` statements
- `DROP` statements
- Row Level Security (RLS) policies

### `01_data_migrations.sql`
Contains all **data operations**:
- `INSERT` statements (seed data, initial records)
- `UPDATE` statements (data modifications)
- Default/initial data for lookup tables

## How to Add New Migrations

### For Schema Changes (Tables, Columns, Indexes)

Edit `00_schema_migrations.sql`:

1. Find the appropriate section (e.g., "PARTY MANAGEMENT", "ORDERS", etc.)
2. Add your changes with clear comments:

```sql
-- ============================================================================
-- [DATE] - [DESCRIPTION OF CHANGE]
-- ============================================================================

-- Example: 2026-03-26 - Add discount fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_tier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2);

COMMENT ON COLUMN orders.discount_tier IS 'Discount tier applied to this order';
```

### For Data Changes (Inserts, Updates)

Edit `01_data_migrations.sql`:

1. Add your changes at the bottom of the "FUTURE DATA UPDATES" section:

```sql
-- 2026-03-26 - Add new size sets
INSERT INTO size_sets (name, sizes, display_order, is_active)
VALUES
  ('XS-S-M', ARRAY['XS', 'S', 'M'], 7, true)
ON CONFLICT (name) DO NOTHING;
```

## Migration Guidelines

### DO:
✅ Add clear comments with date and description  
✅ Use `IF NOT EXISTS` for CREATE statements  
✅ Use `ON CONFLICT DO NOTHING` for INSERT statements  
✅ Group related changes together  
✅ Add COMMENT statements for important columns  
✅ Keep sections organized by feature/module  

### DON'T:
❌ Create new migration files for small changes  
❌ Remove or modify existing migrations  
❌ Add changes without comments  
❌ Mix schema and data changes in the same section  

## Running Migrations

To apply migrations to your Supabase database:

```bash
# Apply all migrations
supabase db reset

# Or apply specific file
supabase db push
```

## Old Migration Files

The `old_migrations/` directory contains the original individual migration files for historical reference. These are no longer used but kept for audit purposes.

## Example: Adding a New Feature

If you're adding a new feature (e.g., "Product Reviews"):

1. **In `00_schema_migrations.sql`**, add a new section:
```sql
-- ============================================================================
-- PRODUCT REVIEWS (Added: 2026-04-01)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_design_id ON product_reviews(design_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
```

2. **In `01_data_migrations.sql`**, add seed data if needed:
```sql
-- 2026-04-01 - Add sample reviews for testing
INSERT INTO product_reviews (user_id, design_id, rating, comment)
VALUES
  -- Add your seed data here
ON CONFLICT DO NOTHING;
```

## Troubleshooting

### Migration fails with "already exists" error
- Ensure you're using `IF NOT EXISTS` for CREATE statements
- Check if the object was created in a previous run

### Data insertion fails with duplicate key
- Use `ON CONFLICT (unique_column) DO NOTHING` or `DO UPDATE`
- Check if data already exists before inserting

### Need to rollback a change
- Edit the consolidated file to remove/modify the problematic change
- Run `supabase db reset` to reapply all migrations

## Questions?

For questions about migrations, contact the development team or refer to the Supabase documentation:
https://supabase.com/docs/guides/database/migrations
