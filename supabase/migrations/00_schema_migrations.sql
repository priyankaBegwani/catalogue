/*
  ============================================================================
  CONSOLIDATED SCHEMA MIGRATIONS
  ============================================================================
  
  This file contains all CREATE, ALTER, and DROP statements for the database schema.
  
  INSTRUCTIONS FOR FUTURE UPDATES:
  - Add new CREATE TABLE statements in the appropriate section
  - Add new ALTER TABLE statements in the "Schema Updates" section
  - Add comments with date and description for each change
  - Keep sections organized by feature/module
  
  Last Updated: 2026-03-26
  ============================================================================
*/

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone_number text,
  role text NOT NULL DEFAULT 'retailer' CHECK (role IN ('admin', 'retailer', 'guest')),
  party_id uuid,
  can_order_individual_sizes boolean DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN user_profiles.role IS 'User role: admin, retailer, or guest';
COMMENT ON COLUMN user_profiles.party_id IS 'Reference to party (nullable for admin/guest users)';
COMMENT ON COLUMN user_profiles.can_order_individual_sizes IS 'Whether user can order individual sizes (default: false, sets only)';
COMMENT ON COLUMN user_profiles.last_login_at IS 'Timestamp of last successful login';

-- Login History Table
CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  login_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  success boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at DESC);

-- ============================================================================
-- PARTY MANAGEMENT
-- ============================================================================

-- Parties Table
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id text UNIQUE,
  name text NOT NULL,
  address text,
  city text,
  district text,
  state text,
  pincode text,
  phone_number text,
  email_id text,
  grade text CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C')),
  transport_name text,
  transport_address text,
  transport_city text,
  transport_state text,
  transport_pincode text,
  preferred_transport_1 text,
  preferred_transport_2 text,
  default_discount text CHECK (default_discount IN ('gold', 'silver', 'copper', 'retail')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN parties.grade IS 'Party grade: A+, A, B+, B, or C';
COMMENT ON COLUMN parties.preferred_transport_1 IS 'Primary preferred transport option';
COMMENT ON COLUMN parties.preferred_transport_2 IS 'Secondary preferred transport option';
COMMENT ON COLUMN parties.default_discount IS 'Default discount tier (gold: 47.45%, silver: 45%, copper: 40%, retail: 30%)';

CREATE INDEX IF NOT EXISTS idx_parties_party_id ON parties(party_id);
CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);

-- Party Phone Numbers Table
CREATE TABLE IF NOT EXISTS party_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  contact_name text,
  designation text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_party_phone_numbers_party_id ON party_phone_numbers(party_id);

-- ============================================================================
-- TRANSPORT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_name text UNIQUE NOT NULL,
  email_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PRODUCT CATALOG
-- ============================================================================

-- Design Categories
CREATE TABLE IF NOT EXISTS design_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Design Styles
CREATE TABLE IF NOT EXISTS design_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES design_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_design_styles_category_id ON design_styles(category_id);

-- Fabric Types
CREATE TABLE IF NOT EXISTS fabric_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  logo_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Designs Table
CREATE TABLE IF NOT EXISTS designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_no text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES design_categories(id) ON DELETE SET NULL,
  style_id uuid REFERENCES design_styles(id) ON DELETE SET NULL,
  fabric_type_id uuid REFERENCES fabric_types(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  available_sizes text[] DEFAULT ARRAY['S', 'M', 'L', 'XL', 'XXL'],
  price numeric(10,2) DEFAULT 0,
  whatsapp_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_designs_design_no ON designs(design_no);
CREATE INDEX IF NOT EXISTS idx_designs_category_id ON designs(category_id);
CREATE INDEX IF NOT EXISTS idx_designs_style_id ON designs(style_id);
CREATE INDEX IF NOT EXISTS idx_designs_fabric_type_id ON designs(fabric_type_id);
CREATE INDEX IF NOT EXISTS idx_designs_brand_id ON designs(brand_id);
CREATE INDEX IF NOT EXISTS idx_designs_is_active ON designs(is_active);

-- Design Colors
CREATE TABLE IF NOT EXISTS design_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  color_name text NOT NULL,
  color_code text,
  image_urls text[],
  video_urls text[],
  size_quantities jsonb DEFAULT '{}',
  in_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(design_id, color_name)
);

CREATE INDEX IF NOT EXISTS idx_design_colors_design_id ON design_colors(design_id);
CREATE INDEX IF NOT EXISTS idx_design_colors_in_stock ON design_colors(in_stock);

COMMENT ON COLUMN design_colors.size_quantities IS 'JSON object mapping sizes to available quantities, e.g., {"S": 10, "M": 15, "L": 20}';

-- ============================================================================
-- SIZE SETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS size_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sizes text[] NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CART & WISHLIST
-- ============================================================================

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES design_colors(id) ON DELETE CASCADE,
  size text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size_set_id uuid REFERENCES size_sets(id) ON DELETE SET NULL,
  is_set_order boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_design_id ON cart_items(design_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_color_id ON cart_items(color_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_size_set_id ON cart_items(size_set_id);

-- Unique constraints for cart items
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_per_size 
  ON cart_items(user_id, design_id, color_id, size) 
  WHERE is_set_order = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_set 
  ON cart_items(user_id, design_id, color_id, size_set_id) 
  WHERE is_set_order = true;

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, design_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_design_id ON wishlist(design_id);

-- ============================================================================
-- ORDERS
-- ============================================================================

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  party_name text NOT NULL,
  date_of_order date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  transport text,
  remarks text,
  discount_tier text,
  discount_percentage numeric(5,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN orders.discount_tier IS 'Discount tier applied to this order (gold, silver, copper, retail)';
COMMENT ON COLUMN orders.discount_percentage IS 'Actual discount percentage applied (for historical reference)';

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date_of_order ON orders(date_of_order DESC);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  design_number text NOT NULL,
  color text NOT NULL,
  sizes_quantities jsonb NOT NULL,
  is_from_size_set boolean DEFAULT false,
  size_set_name text,
  is_substitute boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

COMMENT ON COLUMN order_items.is_from_size_set IS 'Whether this item was ordered as part of a size set';
COMMENT ON COLUMN order_items.size_set_name IS 'Name of the size set if ordered as a set';
COMMENT ON COLUMN order_items.is_substitute IS 'Whether this item is a substitute for an unavailable item';

-- Order Remarks
CREATE TABLE IF NOT EXISTS order_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  remark text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_remarks_order_id ON order_remarks(order_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_party_phone_numbers_updated_at
  BEFORE UPDATE ON party_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_updated_at
  BEFORE UPDATE ON transport
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_categories_updated_at
  BEFORE UPDATE ON design_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_styles_updated_at
  BEFORE UPDATE ON design_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fabric_types_updated_at
  BEFORE UPDATE ON fabric_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_colors_updated_at
  BEFORE UPDATE ON design_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_size_sets_updated_at
  BEFORE UPDATE ON size_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, can_order_individual_sizes)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'retailer'),
    COALESCE((NEW.raw_user_meta_data->>'can_order_individual_sizes')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_remarks ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow profile creation during signup"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Login History Policies
CREATE POLICY "Users can view own login history"
  ON login_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Parties Policies (Admin only for write, all authenticated for read)
CREATE POLICY "Authenticated users can view parties"
  ON parties FOR SELECT
  TO authenticated
  USING (true);

-- Party Phone Numbers Policies
CREATE POLICY "Authenticated users can view party phone numbers"
  ON party_phone_numbers FOR SELECT
  TO authenticated
  USING (true);

-- Transport Policies
CREATE POLICY "Authenticated users can view transport"
  ON transport FOR SELECT
  TO authenticated
  USING (true);

-- Design Categories Policies
CREATE POLICY "Authenticated users can view categories"
  ON design_categories FOR SELECT
  TO authenticated
  USING (true);

-- Design Styles Policies
CREATE POLICY "Authenticated users can view styles"
  ON design_styles FOR SELECT
  TO authenticated
  USING (true);

-- Fabric Types Policies
CREATE POLICY "Authenticated users can view fabric types"
  ON fabric_types FOR SELECT
  TO authenticated
  USING (true);

-- Brands Policies
CREATE POLICY "Authenticated users can view brands"
  ON brands FOR SELECT
  TO authenticated
  USING (true);

-- Designs Policies
CREATE POLICY "Authenticated users can view designs"
  ON designs FOR SELECT
  TO authenticated
  USING (true);

-- Design Colors Policies
CREATE POLICY "Authenticated users can view design colors"
  ON design_colors FOR SELECT
  TO authenticated
  USING (true);

-- Size Sets Policies
CREATE POLICY "Authenticated users can view size sets"
  ON size_sets FOR SELECT
  TO authenticated
  USING (true);

-- Cart Items Policies
CREATE POLICY "Users can manage own cart"
  ON cart_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Wishlist Policies
CREATE POLICY "Users can manage own wishlist"
  ON wishlist FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Orders Policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Order Items Policies
CREATE POLICY "Users can view order items for own orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Order Remarks Policies
CREATE POLICY "Users can view order remarks for own orders"
  ON order_remarks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_remarks.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- ============================================================================
-- END OF SCHEMA MIGRATIONS
-- ============================================================================
