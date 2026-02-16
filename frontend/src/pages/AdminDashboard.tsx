import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  MessageCircle,
  Plus,
  Share2,
  UserCheck,
  Truck,
  Eye,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Clock,
  ImageOff,
  Phone,
  ExternalLink,
  Search,
  Menu,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Palette,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import { api, Design, Party, Order } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface KpiData {
  label: string;
  value: number | string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

interface TopDesign {
  id: string;
  design_no: string;
  name: string;
  thumbnail: string;
  views?: number;
  orders?: number;
  shares?: number;
  repeatRate?: number;
  ordersFromShares?: number;
}

interface ActiveParty {
  id: string;
  name: string;
  lastLogin: string;
  designsViewed: number;
  ordersPlaced: number;
}

interface StagnantParty {
  id: string;
  name: string;
  lastActivity: string;
  status: 'logged_no_order' | 'inactive';
  daysInactive: number;
  phone?: string;
}

interface ColorTrend {
  color: string;
  colorCode: string;
  views: number;
  orders: number;
  shares: number;
  percentage: number;
}

interface EngagementData {
  shared: number;
  opened: number;
  addedToCart: number;
  ordered: number;
}

interface DailyActivity {
  day: string;
  count: number;
}

interface AlertItem {
  id: string;
  type: 'designs_no_images' | 'orders_stuck' | 'parties_browsing' | 'transport_delays';
  count: number;
  message: string;
  severity: 'warning' | 'error' | 'info';
  action: string;
  onClick?: () => void;
}

// ============================================
// REUSABLE COMPONENTS
// ============================================

// Swipeable KPI Card
const SwipeableKpi: React.FC<{ kpis: KpiData[] }> = ({ kpis }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {kpis.map((kpi, index) => (
          <div
            key={index}
            onClick={kpi.onClick}
            className={`flex-shrink-0 w-[140px] sm:w-[160px] snap-start bg-white rounded-xl p-4 border border-gray-100 shadow-sm ${kpi.onClick ? 'cursor-pointer active:scale-95' : ''} transition-transform`}
          >
            <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center mb-2`}>
              {kpi.icon}
            </div>
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">{kpi.value}</span>
              <span className={`flex items-center text-xs font-medium ${
                kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-500' : 'text-gray-400'
              }`}>
                {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : 
                 kpi.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                {kpi.trendValue}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Insight Card Component
const InsightCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}> = ({ title, subtitle, children, action }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          {action.label}
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// Design Performance Card
const DesignPerformanceCard: React.FC<{
  design: TopDesign;
  metric: 'views' | 'orders' | 'shares';
  onOpen: () => void;
}> = ({ design, metric, onOpen }) => {
  const metricValue = metric === 'views' ? design.views : metric === 'orders' ? design.orders : design.shares;
  const metricLabel = metric === 'views' ? 'views' : metric === 'orders' ? 'orders' : 'shares';
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
        {design.thumbnail ? (
          <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{design.design_no}</p>
        <p className="text-xs text-gray-500 truncate">{design.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium text-gray-700">{metricValue} {metricLabel}</span>
          {metric === 'orders' && design.repeatRate && (
            <span className="text-xs text-green-600">({design.repeatRate}% repeat)</span>
          )}
          {metric === 'shares' && design.ordersFromShares && (
            <span className="text-xs text-green-600">→ {design.ordersFromShares} orders</span>
          )}
        </div>
      </div>
      <button
        onClick={onOpen}
        className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition"
        aria-label="Open design"
      >
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
};

// Party Engagement Card
const PartyEngagementCard: React.FC<{
  party: ActiveParty | StagnantParty;
  type: 'active' | 'stagnant';
  onAction: (action: 'open' | 'share' | 'call') => void;
}> = ({ party, type, onAction }) => {
  const isStagnant = type === 'stagnant';
  const stagnantParty = party as StagnantParty;
  
  return (
    <div className={`p-3 rounded-lg border ${isStagnant ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{party.name}</p>
          {isStagnant ? (
            <p className="text-xs text-amber-700 mt-0.5">
              {stagnantParty.status === 'logged_no_order' ? 'Logged in but no order' : `Inactive ${stagnantParty.daysInactive} days`}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Last: {(party as ActiveParty).lastLogin} • {(party as ActiveParty).designsViewed} viewed • {(party as ActiveParty).ordersPlaced} orders
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {isStagnant && stagnantParty.phone && (
            <button
              onClick={() => onAction('call')}
              className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition"
              aria-label="Call party"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}
          {isStagnant && (
            <button
              onClick={() => onAction('share')}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
              aria-label="Share catalogue"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onAction('open')}
            className="p-1.5 text-gray-500 hover:bg-white rounded-lg transition"
            aria-label="Open party"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Bar Chart (Mobile-friendly)
const MobileBarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
}> = ({ data, maxValue }) => {
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-12 text-right flex-shrink-0">{item.label}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${item.color || 'bg-primary'} flex items-center justify-end pr-2`}
              style={{ width: `${Math.max((item.value / max) * 100, 10)}%` }}
            >
              <span className="text-xs font-medium text-white">{item.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Funnel Chart (Simplified)
const FunnelChart: React.FC<{ data: EngagementData }> = ({ data }) => {
  const steps = [
    { label: 'Shared', value: data.shared, color: 'bg-blue-500' },
    { label: 'Opened', value: data.opened, color: 'bg-indigo-500' },
    { label: 'Added to Cart', value: data.addedToCart, color: 'bg-purple-500' },
    { label: 'Ordered', value: data.ordered, color: 'bg-green-500' },
  ];
  
  const maxValue = Math.max(...steps.map(s => s.value));
  
  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const width = Math.max((step.value / maxValue) * 100, 20);
        const conversionRate = index > 0 ? Math.round((step.value / steps[index - 1].value) * 100) : null;
        
        return (
          <div key={step.label} className="relative">
            <div
              className={`${step.color} rounded-lg py-2 px-3 flex items-center justify-between transition-all`}
              style={{ width: `${width}%`, marginLeft: `${(100 - width) / 2}%` }}
            >
              <span className="text-xs font-medium text-white">{step.label}</span>
              <span className="text-xs font-bold text-white">{step.value}</span>
            </div>
            {conversionRate !== null && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                {conversionRate}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Color Trend Bar
const ColorTrendBar: React.FC<{ trends: ColorTrend[] }> = ({ trends }) => {
  const maxOrders = Math.max(...trends.map(t => t.orders));
  
  return (
    <div className="space-y-3">
      {trends.map((trend, index) => (
        <div key={index} className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0"
            style={{ backgroundColor: trend.colorCode }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700 truncate">{trend.color}</span>
              <span className="text-xs text-gray-500">{trend.orders} orders</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${(trend.orders / maxOrders) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Alert Card
const AlertCard: React.FC<{ alert: AlertItem }> = ({ alert }) => {
  const severityStyles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  
  const iconStyles = {
    warning: 'text-amber-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  };
  
  return (
    <div className={`p-3 rounded-lg border ${severityStyles[alert.severity]} flex items-center gap-3`}>
      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${iconStyles[alert.severity]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{alert.count}</span>
          <span className="text-sm truncate">{alert.message}</span>
        </div>
      </div>
      <button
        onClick={alert.onClick}
        className="text-xs font-medium underline flex-shrink-0"
      >
        {alert.action}
      </button>
    </div>
  );
};

// Sticky Action Bar
const ActionStickyBar: React.FC<{
  onAction: (action: 'order' | 'design' | 'share' | 'party' | 'transport') => void;
}> = ({ onAction }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 md:hidden">
    <div className="flex items-center justify-around">
      <button
        onClick={() => onAction('order')}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary transition"
      >
        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium">Order</span>
      </button>
      <button
        onClick={() => onAction('design')}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary transition"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium">Design</span>
      </button>
      <button
        onClick={() => onAction('share')}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary transition"
      >
        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
          <Share2 className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium">Share</span>
      </button>
      <button
        onClick={() => onAction('party')}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary transition"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <UserCheck className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium">Party</span>
      </button>
      <button
        onClick={() => onAction('transport')}
        className="flex flex-col items-center gap-1 text-gray-600 hover:text-primary transition"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <Truck className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-medium">Transport</span>
      </button>
    </div>
  </div>
);

// Segmented Control
const SegmentedControl: React.FC<{
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex bg-gray-100 rounded-lg p-1">
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition ${
          value === option.value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

// ============================================
// MAIN ADMIN DASHBOARD COMPONENT
// ============================================

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [designMetric, setDesignMetric] = useState<'views' | 'orders' | 'shares'>('orders');
  
  // Data states
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [topDesigns, setTopDesigns] = useState<TopDesign[]>([]);
  const [activeParties, setActiveParties] = useState<ActiveParty[]>([]);
  const [stagnantParties, setStagnantParties] = useState<StagnantParty[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementData | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [colorTrends, setColorTrends] = useState<ColorTrend[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/catalogue');
    }
  }, [user, navigate]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API calls - Replace with actual API calls
      await Promise.all([
        loadKpis(),
        loadTopDesigns(),
        loadParties(),
        loadEngagement(),
        loadColorTrends(),
        loadAlerts(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const loadKpis = async () => {
    try {
      const data = await api.getDashboardKpis();
      setKpis([
        {
          label: 'Orders Today',
          value: data.ordersToday || 0,
          trend: data.ordersTodayTrend || 'neutral',
          trendValue: data.ordersTodayTrend === 'up' ? '+' + data.ordersToday : String(data.ordersToday),
          icon: <ShoppingCart className="w-4 h-4 text-white" />,
          color: 'bg-blue-500',
          onClick: () => navigate('/orders?filter=today'),
        },
        {
          label: 'Orders This Week',
          value: data.ordersThisWeek || 0,
          trend: data.ordersWeekTrend || 'neutral',
          trendValue: data.ordersWeekTrendValue || '0%',
          icon: <Package className="w-4 h-4 text-white" />,
          color: 'bg-indigo-500',
          onClick: () => navigate('/orders?filter=week'),
        },
        {
          label: 'WhatsApp → Orders',
          value: data.whatsappOrders || 0,
          trend: 'neutral',
          trendValue: 'tracked',
          icon: <MessageCircle className="w-4 h-4 text-white" />,
          color: 'bg-green-500',
        },
        {
          label: 'Active Parties',
          value: data.activeParties || 0,
          trend: 'neutral',
          trendValue: '30d',
          icon: <Users className="w-4 h-4 text-white" />,
          color: 'bg-purple-500',
          onClick: () => navigate('/parties?filter=active'),
        },
        {
          label: 'Inactive Parties',
          value: data.inactiveParties || 0,
          trend: 'down',
          trendValue: '60d+',
          icon: <Clock className="w-4 h-4 text-white" />,
          color: 'bg-amber-500',
          onClick: () => navigate('/parties?filter=inactive'),
        },
      ]);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    }
  };

  const loadTopDesigns = async () => {
    try {
      const [viewed, ordered, shared] = await Promise.all([
        api.getTopViewedDesigns(),
        api.getTopOrderedDesigns(),
        api.getMostSharedDesigns(),
      ]);

      const designMap = new Map<string, TopDesign>();

      viewed.forEach(d => {
        designMap.set(d.id, { ...d, views: d.views || 0 });
      });

      ordered.forEach(d => {
        const existing = designMap.get(d.id) || { ...d };
        designMap.set(d.id, { ...existing, orders: d.orders || 0, repeatRate: d.repeatRate || 0 });
      });

      shared.forEach(d => {
        const existing = designMap.get(d.id) || { ...d };
        designMap.set(d.id, { ...existing, shares: d.shares || 0, ordersFromShares: d.ordersFromShares || 0 });
      });

      setTopDesigns(Array.from(designMap.values()));
    } catch (error) {
      console.error('Error loading top designs:', error);
    }
  };

  const loadParties = async () => {
    try {
      const [active, stagnant] = await Promise.all([
        api.getActiveParties(),
        api.getStagnantParties(),
      ]);
      setActiveParties(active);
      setStagnantParties(stagnant);
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  };

  const loadEngagement = async () => {
    try {
      const data = await api.getWhatsAppEngagement();
      setEngagementData(data.funnel);
      setDailyActivity(data.dailyActivity || []);
    } catch (error) {
      console.error('Error loading engagement data:', error);
    }
  };

  const loadColorTrends = async () => {
    try {
      const trends = await api.getColorTrends();
      setColorTrends(trends);
    } catch (error) {
      console.error('Error loading color trends:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const alertsData = await api.getDashboardAlerts();
      const alertsWithActions = alertsData.map(alert => ({
        ...alert,
        onClick: () => {
          if (alert.type === 'designs_no_images') {
            navigate('/designs?filter=no_images');
          } else if (alert.type === 'orders_stuck') {
            navigate('/orders?filter=stuck');
          } else if (alert.type === 'parties_browsing') {
            navigate('/parties?filter=browsing');
          }
        },
      }));
      setAlerts(alertsWithActions);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  // Action handlers
  const handleAction = (action: 'order' | 'design' | 'share' | 'party' | 'transport') => {
    switch (action) {
      case 'order':
        navigate('/orders?action=new');
        break;
      case 'design':
        navigate('/designs?action=new');
        break;
      case 'share':
        navigate('/catalogue');
        break;
      case 'party':
        navigate('/parties');
        break;
      case 'transport':
        navigate('/transport');
        break;
    }
  };

  const handlePartyAction = (partyId: string, action: 'open' | 'share' | 'call', phone?: string) => {
    switch (action) {
      case 'open':
        navigate(`/parties/${partyId}`);
        break;
      case 'share':
        navigate('/catalogue');
        break;
      case 'call':
        if (phone) window.open(`tel:${phone}`, '_self');
        break;
    }
  };

  // Filter designs based on selected metric
  const getFilteredDesigns = () => {
    return [...topDesigns].sort((a, b) => {
      const aVal = designMetric === 'views' ? (a.views || 0) : designMetric === 'orders' ? (a.orders || 0) : (a.shares || 0);
      const bVal = designMetric === 'views' ? (b.views || 0) : designMetric === 'orders' ? (b.orders || 0) : (b.shares || 0);
      return bVal - aVal;
    }).slice(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Compact Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-6 max-w-7xl mx-auto">
        {/* Core KPI Stack */}
        <section>
          <SwipeableKpi kpis={kpis} />
        </section>

        {/* Desktop Quick Actions */}
        <section className="hidden md:block">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleAction('order')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition"
            >
              <Plus className="w-4 h-4" />
              New Order
            </button>
            <button
              onClick={() => handleAction('design')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              <Plus className="w-4 h-4" />
              Add Design
            </button>
            <button
              onClick={() => handleAction('share')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              <Share2 className="w-4 h-4" />
              Share Catalogue
            </button>
            <button
              onClick={() => handleAction('party')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              <UserCheck className="w-4 h-4" />
              Party Follow-up
            </button>
            <button
              onClick={() => handleAction('transport')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              <Truck className="w-4 h-4" />
              Transport
            </button>
          </div>
        </section>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Needs Attention
            </h2>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </section>
        )}

        {/* Two Column Layout for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Performance Intelligence */}
          <InsightCard
            title="What Designs Are Working?"
            subtitle="Top performing designs this month"
            action={{ label: 'View all', onClick: () => navigate('/designs') }}
          >
            <div className="mb-4">
              <SegmentedControl
                options={[
                  { value: 'orders', label: 'Ordered' },
                  { value: 'views', label: 'Viewed' },
                  { value: 'shares', label: 'Shared' },
                ]}
                value={designMetric}
                onChange={(v) => setDesignMetric(v as 'views' | 'orders' | 'shares')}
              />
            </div>
            <div className="space-y-2">
              {getFilteredDesigns().map((design) => (
                <DesignPerformanceCard
                  key={design.id}
                  design={design}
                  metric={designMetric}
                  onOpen={() => navigate(`/catalogue?design=${design.id}`)}
                />
              ))}
            </div>
          </InsightCard>

          {/* Party Intelligence */}
          <InsightCard
            title="Who Is Engaging?"
            subtitle="Whom should you contact today?"
            action={{ label: 'View all', onClick: () => navigate('/parties') }}
          >
            <div className="space-y-4">
              {/* Active Parties */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top Active</h4>
                <div className="space-y-2">
                  {activeParties.slice(0, 3).map((party) => (
                    <PartyEngagementCard
                      key={party.id}
                      party={party}
                      type="active"
                      onAction={(action) => handlePartyAction(party.id, action)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Stagnant Parties */}
              <div>
                <h4 className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  At Risk - Contact Today
                </h4>
                <div className="space-y-2">
                  {stagnantParties.slice(0, 3).map((party) => (
                    <PartyEngagementCard
                      key={party.id}
                      party={party}
                      type="stagnant"
                      onAction={(action) => handlePartyAction(party.id, action, party.phone)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </InsightCard>

          {/* WhatsApp & Catalogue Engagement */}
          <InsightCard
            title="Catalogue Reach & Impact"
            subtitle="WhatsApp sharing funnel"
          >
            <div className="space-y-6">
              {engagementData && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Conversion Funnel</h4>
                  <FunnelChart data={engagementData} />
                </div>
              )}
              
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Daily WhatsApp Activity (Last 7 Days)</h4>
                <MobileBarChart
                  data={dailyActivity.map(d => ({ label: d.day, value: d.count, color: 'bg-green-500' }))}
                />
              </div>
            </div>
          </InsightCard>

          {/* Color & Trend Intelligence */}
          <InsightCard
            title="What Is Trending?"
            subtitle="Top colors this month"
          >
            <ColorTrendBar trends={colorTrends} />
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-900">💡 Insight:</span> Pastel shades are trending in cotton kurtas. Dark colors converting better via WhatsApp shares.
              </p>
            </div>
          </InsightCard>
        </div>
      </main>

      {/* Sticky Action Bar (Mobile) */}
      <ActionStickyBar onAction={handleAction} />
    </div>
  );
};

export default AdminDashboard;
