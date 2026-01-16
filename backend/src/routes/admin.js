import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// ADMIN DASHBOARD API ENDPOINTS
// ============================================

// GET /api/admin/kpis - Core KPI data
router.get('/kpis', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoISO = sixtyDaysAgo.toISOString();

    // Orders today
    const { count: ordersToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    // Orders this week
    const { count: ordersThisWeek } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgoISO);

    // Active parties (logged in within 30 days)
    const { count: activeParties } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'retailer')
      .gte('updated_at', thirtyDaysAgoISO);

    // Inactive parties (no activity in 60+ days)
    const { count: inactiveParties } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'retailer')
      .lt('updated_at', sixtyDaysAgoISO);

    // Previous period comparisons for trends
    const previousWeekStart = new Date(weekAgo);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    
    const { count: ordersPreviousWeek } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousWeekStart.toISOString())
      .lt('created_at', weekAgoISO);

    const weekTrend = ordersPreviousWeek > 0 
      ? Math.round(((ordersThisWeek - ordersPreviousWeek) / ordersPreviousWeek) * 100)
      : 0;

    res.json({
      ordersToday: ordersToday || 0,
      ordersTodayTrend: 'up', // Would need yesterday's data for accurate trend
      ordersThisWeek: ordersThisWeek || 0,
      ordersWeekTrend: weekTrend >= 0 ? 'up' : 'down',
      ordersWeekTrendValue: `${weekTrend >= 0 ? '+' : ''}${weekTrend}%`,
      whatsappOrders: 0, // Placeholder - needs WhatsApp tracking implementation
      activeParties: activeParties || 0,
      inactiveParties: inactiveParties || 0,
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// GET /api/admin/designs/top-viewed - Top viewed designs
router.get('/designs/top-viewed', authenticateUser, requireAdmin, async (req, res) => {
  try {
    // For now, return designs sorted by order_count as a proxy for popularity
    // In a real implementation, you'd track view counts separately
    const { data: designs, error } = await supabase
      .from('designs')
      .select(`
        id,
        design_no,
        name,
        design_colors (
          image_urls
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const formattedDesigns = designs.map(d => ({
      id: d.id,
      design_no: d.design_no,
      name: d.name,
      thumbnail: d.design_colors?.[0]?.image_urls?.[0] || '',
      views: Math.floor(Math.random() * 300) + 50, // Placeholder - needs view tracking
    }));

    res.json(formattedDesigns);
  } catch (error) {
    console.error('Error fetching top viewed designs:', error);
    res.status(500).json({ error: 'Failed to fetch top viewed designs' });
  }
});

// GET /api/admin/designs/top-ordered - Top ordered designs
router.get('/designs/top-ordered', authenticateUser, requireAdmin, async (req, res) => {
  try {
    // Get order items grouped by design
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(`
        design_number,
        sizes_quantities
      `);

    if (error) throw error;

    // Aggregate by design number
    const designCounts = {};
    orderItems.forEach(item => {
      if (!designCounts[item.design_number]) {
        designCounts[item.design_number] = { orders: 0, quantity: 0 };
      }
      designCounts[item.design_number].orders += 1;
      if (item.sizes_quantities) {
        item.sizes_quantities.forEach(sq => {
          designCounts[item.design_number].quantity += sq.quantity || 0;
        });
      }
    });

    // Get design details for top designs
    const topDesignNumbers = Object.entries(designCounts)
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 5)
      .map(([designNo]) => designNo);

    const { data: designs } = await supabase
      .from('designs')
      .select(`
        id,
        design_no,
        name,
        design_colors (
          image_urls
        )
      `)
      .in('design_no', topDesignNumbers);

    const formattedDesigns = topDesignNumbers.map(designNo => {
      const design = designs?.find(d => d.design_no === designNo);
      return {
        id: design?.id || designNo,
        design_no: designNo,
        name: design?.name || designNo,
        thumbnail: design?.design_colors?.[0]?.image_urls?.[0] || '',
        orders: designCounts[designNo].orders,
        repeatRate: Math.floor(Math.random() * 50) + 20, // Placeholder
      };
    });

    res.json(formattedDesigns);
  } catch (error) {
    console.error('Error fetching top ordered designs:', error);
    res.status(500).json({ error: 'Failed to fetch top ordered designs' });
  }
});

// GET /api/admin/designs/most-shared - Most shared designs on WhatsApp
router.get('/designs/most-shared', authenticateUser, requireAdmin, async (req, res) => {
  try {
    // Placeholder - needs WhatsApp share tracking implementation
    const { data: designs, error } = await supabase
      .from('designs')
      .select(`
        id,
        design_no,
        name,
        design_colors (
          image_urls
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const formattedDesigns = designs.map(d => ({
      id: d.id,
      design_no: d.design_no,
      name: d.name,
      thumbnail: d.design_colors?.[0]?.image_urls?.[0] || '',
      shares: Math.floor(Math.random() * 50) + 10, // Placeholder
      ordersFromShares: Math.floor(Math.random() * 15) + 2, // Placeholder
    }));

    res.json(formattedDesigns);
  } catch (error) {
    console.error('Error fetching most shared designs:', error);
    res.status(500).json({ error: 'Failed to fetch most shared designs' });
  }
});

// GET /api/admin/parties/active - Active parties (last 30 days)
router.get('/parties/active', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        updated_at,
        party_id,
        parties (
          name
        )
      `)
      .eq('role', 'retailer')
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Get order counts for these users
    const partyNames = users.map(u => u.parties?.name).filter(Boolean);
    
    const { data: orders } = await supabase
      .from('orders')
      .select('party_name')
      .in('party_name', partyNames);

    const orderCounts = {};
    orders?.forEach(o => {
      orderCounts[o.party_name] = (orderCounts[o.party_name] || 0) + 1;
    });

    const formattedParties = users.map(u => {
      const lastLogin = new Date(u.updated_at);
      const now = new Date();
      const diffMs = now - lastLogin;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let lastLoginText = '';
      if (diffHours < 1) lastLoginText = 'Just now';
      else if (diffHours < 24) lastLoginText = `${diffHours}h ago`;
      else lastLoginText = `${diffDays}d ago`;

      return {
        id: u.id,
        name: u.parties?.name || u.full_name || 'Unknown',
        lastLogin: lastLoginText,
        designsViewed: Math.floor(Math.random() * 50) + 10, // Placeholder
        ordersPlaced: orderCounts[u.parties?.name] || 0,
      };
    });

    res.json(formattedParties);
  } catch (error) {
    console.error('Error fetching active parties:', error);
    res.status(500).json({ error: 'Failed to fetch active parties' });
  }
});

// GET /api/admin/parties/stagnant - Stagnant/at-risk parties
router.get('/parties/stagnant', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        updated_at,
        party_id,
        parties (
          name,
          phone_number
        )
      `)
      .eq('role', 'retailer')
      .lt('updated_at', sixtyDaysAgo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(10);

    if (error) throw error;

    const formattedParties = users.map(u => {
      const lastActivity = new Date(u.updated_at);
      const now = new Date();
      const diffDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

      return {
        id: u.id,
        name: u.parties?.name || u.full_name || 'Unknown',
        lastActivity: `${diffDays} days ago`,
        status: diffDays > 60 ? 'inactive' : 'logged_no_order',
        daysInactive: diffDays,
        phone: u.parties?.phone_number || null,
      };
    });

    res.json(formattedParties);
  } catch (error) {
    console.error('Error fetching stagnant parties:', error);
    res.status(500).json({ error: 'Failed to fetch stagnant parties' });
  }
});

// GET /api/admin/trends/colors - Color trends
router.get('/trends/colors', authenticateUser, requireAdmin, async (req, res) => {
  try {
    // Get color distribution from order items
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('color');

    if (error) throw error;

    // Count colors
    const colorCounts = {};
    orderItems.forEach(item => {
      if (item.color) {
        colorCounts[item.color] = (colorCounts[item.color] || 0) + 1;
      }
    });

    // Get top colors
    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalOrders = Object.values(colorCounts).reduce((a, b) => a + b, 0);

    // Color code mapping (simplified)
    const colorCodeMap = {
      'red': '#DC2626',
      'blue': '#2563EB',
      'green': '#16A34A',
      'pink': '#EC4899',
      'yellow': '#EAB308',
      'purple': '#9333EA',
      'orange': '#EA580C',
      'black': '#171717',
      'white': '#F5F5F5',
      'maroon': '#800000',
      'navy': '#000080',
    };

    const formattedColors = topColors.map(([color, count]) => ({
      color: color.charAt(0).toUpperCase() + color.slice(1),
      colorCode: colorCodeMap[color.toLowerCase()] || '#9CA3AF',
      views: Math.floor(Math.random() * 300) + 100, // Placeholder
      orders: count,
      shares: Math.floor(Math.random() * 50) + 10, // Placeholder
      percentage: Math.round((count / totalOrders) * 100),
    }));

    res.json(formattedColors);
  } catch (error) {
    console.error('Error fetching color trends:', error);
    res.status(500).json({ error: 'Failed to fetch color trends' });
  }
});

// GET /api/admin/engagement/whatsapp - WhatsApp engagement data
router.get('/engagement/whatsapp', authenticateUser, requireAdmin, async (req, res) => {
  try {
    // Placeholder data - needs WhatsApp tracking implementation
    res.json({
      funnel: {
        shared: 156,
        opened: 98,
        addedToCart: 45,
        ordered: 24,
      },
      dailyActivity: [
        { day: 'Mon', count: 18 },
        { day: 'Tue', count: 24 },
        { day: 'Wed', count: 32 },
        { day: 'Thu', count: 28 },
        { day: 'Fri', count: 35 },
        { day: 'Sat', count: 42 },
        { day: 'Sun', count: 22 },
      ],
    });
  } catch (error) {
    console.error('Error fetching WhatsApp engagement:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp engagement' });
  }
});

// GET /api/admin/alerts - Operational alerts
router.get('/alerts', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const alerts = [];

    // Check designs without images
    const { data: designsNoImages } = await supabase
      .from('designs')
      .select(`
        id,
        design_colors (
          image_urls
        )
      `)
      .eq('is_active', true);

    const noImageCount = designsNoImages?.filter(d => 
      !d.design_colors?.length || !d.design_colors.some(c => c.image_urls?.length > 0)
    ).length || 0;

    if (noImageCount > 0) {
      alerts.push({
        id: 'designs_no_images',
        type: 'designs_no_images',
        count: noImageCount,
        message: 'designs without images',
        severity: 'warning',
        action: 'Fix now',
      });
    }

    // Check orders stuck (pending for more than 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { count: stuckOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('created_at', threeDaysAgo.toISOString());

    if (stuckOrders > 0) {
      alerts.push({
        id: 'orders_stuck',
        type: 'orders_stuck',
        count: stuckOrders,
        message: 'orders stuck beyond SLA',
        severity: 'error',
        action: 'Review',
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

export default router;
