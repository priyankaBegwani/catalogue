import express from 'express';
import { supabase } from '../config.js';
import { authenticateUser, requirePermission } from '../middleware/auth.js';
import { asyncHandler, executeQuery } from '../utils/index.js';

const router = express.Router();

async function getUserProfilesMap(userIds) {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data: userProfiles, error: userProfilesError } = await supabase
    .from('user_profiles')
    .select(`
      id,
      email,
      full_name,
      party_id,
      parties!user_profiles_party_id_fkey(name, city, state),
      user_roles(role_name)
    `)
    .in('id', userIds);

  if (userProfilesError) {
    console.error('Error fetching user profiles for analytics:', userProfilesError);
    throw new Error(`Failed to fetch analytics user profiles: ${userProfilesError.message}`);
  }

  return new Map((userProfiles || []).map(profile => [profile.id, profile]));
}

// Get all cart items across all users with search and filters
router.get('/cart-items',
  authenticateUser,
  requirePermission('analytics', 'view_carts'),
  asyncHandler(async (req, res) => {
    const { search, user_id, party_id, design_id } = req.query;

    let query = supabase
      .from('cart_items')
      .select(`
        *,
        designs(
          id,
          design_no,
          name,
          category_id,
          whatsapp_image_url,
          design_categories(name),
          design_styles(name),
          fabric_types(name)
        ),
        design_colors!cart_items_color_id_fkey(
          id,
          color_name,
          color_code
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (design_id) {
      query = query.eq('design_id', design_id);
    }

    const { data: cartItems, error: cartError } = await query;

    if (cartError) {
      console.error('Error fetching cart items:', cartError);
      throw new Error(`Failed to fetch cart items: ${cartError.message}`);
    }

    const userIds = [...new Set((cartItems || []).map(item => item.user_id).filter(Boolean))];
    const userProfilesMap = await getUserProfilesMap(userIds);

    const cartItemsWithProfiles = (cartItems || []).map(item => ({
      ...item,
      user_profiles: userProfilesMap.get(item.user_id) || null,
    }));

    console.log(`Found ${cartItemsWithProfiles.length} cart items`);

    // Apply search filter in memory (for party name, user name, design number)
    let filteredItems = cartItemsWithProfiles;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        const userName = item.user_profiles?.full_name?.toLowerCase() || '';
        const userEmail = item.user_profiles?.email?.toLowerCase() || '';
        const partyName = item.user_profiles?.parties?.name?.toLowerCase() || '';
        const designNumber = item.designs?.design_no?.toLowerCase() || '';
        const designName = item.designs?.name?.toLowerCase() || '';

        return userName.includes(searchLower) ||
               userEmail.includes(searchLower) ||
               partyName.includes(searchLower) ||
               designNumber.includes(searchLower) ||
               designName.includes(searchLower);
      });
    }

    // Filter by party_id if provided
    if (party_id) {
      filteredItems = filteredItems.filter(item =>
        item.user_profiles?.party_id === party_id
      );
    }

    console.log(`Returning ${filteredItems.length} filtered cart items`);
    res.json({ cart_items: filteredItems });
  })
);

// Get all wishlist items across all users with search and filters
router.get('/wishlist-items',
  authenticateUser,
  requirePermission('analytics', 'view_wishlists'),
  asyncHandler(async (req, res) => {
    const { search, user_id, party_id, design_id } = req.query;

    let query = supabase
      .from('wishlist_items')
      .select(`
        *,
        designs(
          id,
          design_no,
          name,
          category_id,
          whatsapp_image_url,
          design_categories(name),
          design_styles(name),
          fabric_types(name)
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (design_id) {
      query = query.eq('design_id', design_id);
    }

    const { data: wishlistItems, error: wishlistError } = await query;

    if (wishlistError) {
      console.error('Error fetching wishlist items:', wishlistError);
      throw new Error(`Failed to fetch wishlist items: ${wishlistError.message}`);
    }

    const userIds = [...new Set((wishlistItems || []).map(item => item.user_id).filter(Boolean))];
    const userProfilesMap = await getUserProfilesMap(userIds);

    const wishlistItemsWithProfiles = (wishlistItems || []).map(item => ({
      ...item,
      user_profiles: userProfilesMap.get(item.user_id) || null,
    }));

    console.log(`Found ${wishlistItemsWithProfiles.length} wishlist items`);

    // Apply search filter in memory
    let filteredItems = wishlistItemsWithProfiles;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item => {
        const userName = item.user_profiles?.full_name?.toLowerCase() || '';
        const userEmail = item.user_profiles?.email?.toLowerCase() || '';
        const partyName = item.user_profiles?.parties?.name?.toLowerCase() || '';
        const designNumber = item.designs?.design_no?.toLowerCase() || '';
        const designName = item.designs?.name?.toLowerCase() || '';

        return userName.includes(searchLower) ||
               userEmail.includes(searchLower) ||
               partyName.includes(searchLower) ||
               designNumber.includes(searchLower) ||
               designName.includes(searchLower);
      });
    }

    // Filter by party_id if provided
    if (party_id) {
      filteredItems = filteredItems.filter(item => 
        item.user_profiles?.party_id === party_id
      );
    }

    console.log(`Returning ${filteredItems.length} filtered wishlist items`);
    res.json({ wishlist_items: filteredItems });
  })
);

// Get demand analytics - most popular items in carts and wishlists
router.get('/demand-summary',
  authenticateUser,
  requirePermission('analytics', 'view_carts'),
  asyncHandler(async (req, res) => {
    // Get cart items grouped by design
    const { data: cartData } = await supabase
      .from('cart_items')
      .select('design_id, quantity, designs(design_no, name, whatsapp_image_url, design_categories(name), design_styles(name), fabric_types(name))');

    // Get wishlist items grouped by design
    const { data: wishlistData } = await supabase
      .from('wishlist_items')
      .select('design_id, designs(design_no, name, whatsapp_image_url, design_categories(name), design_styles(name), fabric_types(name))');

    // Aggregate by design
    const demandMap = new Map();

    // Process cart items
    if (cartData) {
      cartData.forEach(item => {
        if (!demandMap.has(item.design_id)) {
          demandMap.set(item.design_id, {
            design_id: item.design_id,
            design_number: item.designs?.design_no,
            design_name: item.designs?.name,
            image_url: item.designs?.whatsapp_image_url,
            category_name: item.designs?.design_categories?.name,
            style_name: item.designs?.design_styles?.name,
            fabric_name: item.designs?.fabric_types?.name,
            cart_count: 0,
            cart_quantity: 0,
            wishlist_count: 0
          });
        }
        const entry = demandMap.get(item.design_id);
        entry.cart_count += 1;
        entry.cart_quantity += item.quantity || 0;
      });
    }

    // Process wishlist items
    if (wishlistData) {
      wishlistData.forEach(item => {
        if (!demandMap.has(item.design_id)) {
          demandMap.set(item.design_id, {
            design_id: item.design_id,
            design_number: item.designs?.design_no,
            design_name: item.designs?.name,
            image_url: item.designs?.whatsapp_image_url,
            category_name: item.designs?.design_categories?.name,
            style_name: item.designs?.design_styles?.name,
            fabric_name: item.designs?.fabric_types?.name,
            cart_count: 0,
            cart_quantity: 0,
            wishlist_count: 0
          });
        }
        const entry = demandMap.get(item.design_id);
        entry.wishlist_count += 1;
      });
    }

    // Convert to array and sort by total demand
    const demandSummary = Array.from(demandMap.values())
      .map(item => ({
        ...item,
        total_interest: item.cart_count + item.wishlist_count
      }))
      .sort((a, b) => b.total_interest - a.total_interest);

    res.json({ demand_summary: demandSummary });
  })
);

export default router;
