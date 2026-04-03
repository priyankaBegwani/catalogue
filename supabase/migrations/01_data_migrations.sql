/*
  ============================================================================
  CONSOLIDATED DATA MIGRATIONS
  ============================================================================
  
  This file contains all INSERT and UPDATE statements for initial/seed data.
  
  INSTRUCTIONS FOR FUTURE UPDATES:
  - Add new INSERT statements in the appropriate section
  - Add new UPDATE statements with clear comments
  - Include date and description for each change
  - Keep sections organized by feature/module
  
  Last Updated: 2026-03-26
  ============================================================================
*/

-- ============================================================================
-- SIZE SETS - Predefined Size Sets
-- ============================================================================

-- Insert predefined size sets (if not exists)
INSERT INTO size_sets (name, sizes, display_order, is_active)
VALUES
  ('S-M-L-XL-XXL', ARRAY['S', 'M', 'L', 'XL', 'XXL'], 1, true),
  ('S-M-L-XL', ARRAY['S', 'M', 'L', 'XL'], 2, true),
  ('M-L-XL-XXL', ARRAY['M', 'L', 'XL', 'XXL'], 3, true),
  ('M-L-XL', ARRAY['M', 'L', 'XL'], 4, true),
  ('L-XL-XXL', ARRAY['L', 'XL', 'XXL'], 5, true),
  ('3XL', ARRAY['3XL'], 6, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- DESIGN CATEGORIES - Initial Categories
-- ============================================================================

-- Insert default design categories (if not exists)
INSERT INTO design_categories (name, description, display_order, is_active)
VALUES
  ('Kurtis', 'Traditional and modern kurtis', 1, true),
  ('Tops', 'Casual and formal tops', 2, true),
  ('Dresses', 'Party and casual dresses', 3, true),
  ('Co-ord Sets', 'Matching top and bottom sets', 4, true),
  ('Ethnic Wear', 'Traditional ethnic clothing', 5, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- FABRIC TYPES - Initial Fabric Types
-- ============================================================================

-- Insert default fabric types (if not exists)
INSERT INTO fabric_types (name, description, display_order, is_active)
VALUES
  ('Cotton', 'Pure cotton fabric', 1, true),
  ('Rayon', 'Soft rayon fabric', 2, true),
  ('Crepe', 'Lightweight crepe fabric', 3, true),
  ('Georgette', 'Flowy georgette fabric', 4, true),
  ('Silk', 'Premium silk fabric', 5, true),
  ('Linen', 'Breathable linen fabric', 6, true),
  ('Polyester', 'Durable polyester fabric', 7, true),
  ('Cotton Blend', 'Cotton blend fabric', 8, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- FUTURE DATA UPDATES
-- ============================================================================

/*
  Add new INSERT or UPDATE statements below with the following format:
  
  -- [DATE] - [DESCRIPTION]
  -- Example: 2026-03-26 - Add new discount tiers
  
  INSERT INTO table_name (columns)
  VALUES (values)
  ON CONFLICT (unique_column) DO NOTHING;
  
  OR
  
  UPDATE table_name
  SET column = value
  WHERE condition;
*/

-- ============================================================================
-- END OF DATA MIGRATIONS
-- ============================================================================
