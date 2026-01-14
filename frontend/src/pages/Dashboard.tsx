import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  Package,
  Users,
  TrendingUp,
  ShoppingCart,
  X,
  GripVertical,
  RefreshCw,
  Calendar,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Eye
} from 'lucide-react';
import { api, Order } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetConfig {
  i: string;
  title: string;
  icon: React.ReactNode;
  visible: boolean;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

interface TopParty {
  party_name: string;
  order_count: number;
  total_items: number;
}

interface TopDesign {
  design_number: string;
  order_count: number;
  total_quantity: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { i: 'stats', title: 'Overview Stats', icon: <BarChart3 size={20} />, visible: true },
    { i: 'recent-orders', title: 'Recent Orders', icon: <Package size={20} />, visible: true },
    { i: 'pending-orders', title: 'Pending Orders', icon: <Clock size={20} />, visible: true },
    { i: 'top-parties', title: 'Top 5 Parties', icon: <Users size={20} />, visible: true },
    { i: 'top-designs', title: 'Top Designs', icon: <TrendingUp size={20} />, visible: true },
    { i: 'status-breakdown', title: 'Order Status', icon: <BarChart3 size={20} />, visible: true },
  ]);

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [topParties, setTopParties] = useState<TopParty[]>([]);
  const [topDesigns, setTopDesigns] = useState<TopDesign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Default layouts for different breakpoints
  const defaultLayouts = {
    lg: [
      { i: 'stats', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
      { i: 'recent-orders', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'pending-orders', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      { i: 'top-parties', x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 3 },
      { i: 'top-designs', x: 6, y: 6, w: 6, h: 3, minW: 4, minH: 3 },
      { i: 'status-breakdown', x: 0, y: 9, w: 12, h: 2, minW: 6, minH: 2 },
    ],
    md: [
      { i: 'stats', x: 0, y: 0, w: 10, h: 2, minW: 6, minH: 2 },
      { i: 'recent-orders', x: 0, y: 2, w: 5, h: 4, minW: 4, minH: 3 },
      { i: 'pending-orders', x: 5, y: 2, w: 5, h: 4, minW: 4, minH: 3 },
      { i: 'top-parties', x: 0, y: 6, w: 5, h: 3, minW: 4, minH: 3 },
      { i: 'top-designs', x: 5, y: 6, w: 5, h: 3, minW: 4, minH: 3 },
      { i: 'status-breakdown', x: 0, y: 9, w: 10, h: 2, minW: 6, minH: 2 },
    ],
    sm: [
      { i: 'stats', x: 0, y: 0, w: 6, h: 2, minW: 6, minH: 2 },
      { i: 'recent-orders', x: 0, y: 2, w: 6, h: 4, minW: 6, minH: 3 },
      { i: 'pending-orders', x: 0, y: 6, w: 6, h: 4, minW: 6, minH: 3 },
      { i: 'top-parties', x: 0, y: 10, w: 6, h: 3, minW: 6, minH: 3 },
      { i: 'top-designs', x: 0, y: 13, w: 6, h: 3, minW: 6, minH: 3 },
      { i: 'status-breakdown', x: 0, y: 16, w: 6, h: 2, minW: 6, minH: 2 },
    ],
  };

  useEffect(() => {
    // Load saved layout from localStorage
    const savedLayout = localStorage.getItem('dashboardLayout');
    if (savedLayout) {
      setLayouts(JSON.parse(savedLayout));
    } else {
      setLayouts(defaultLayouts);
    }

    // Load widget visibility from localStorage
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    if (savedWidgets) {
      setWidgets(JSON.parse(savedWidgets));
    }

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all orders
      const ordersData = await api.fetchOrders();
      const allOrders = ordersData.orders || [];

      // Recent orders (last 5)
      const sortedOrders = [...allOrders].sort((a, b) => 
        new Date(b.date_of_order).getTime() - new Date(a.date_of_order).getTime()
      );
      setRecentOrders(sortedOrders.slice(0, 5));

      // Pending orders (top 10)
      const pending = allOrders.filter(order => order.status === 'pending');
      setPendingOrders(pending.slice(0, 10));

      // Calculate stats
      const completed = allOrders.filter(order => order.status === 'completed');
      setStats({
        totalOrders: allOrders.length,
        pendingOrders: pending.length,
        completedOrders: completed.length,
        totalRevenue: 0, // Calculate if you have pricing data
      });

      // Top 5 parties by order count
      const partyMap = new Map<string, { count: number; items: number }>();
      allOrders.forEach(order => {
        const existing = partyMap.get(order.party_name) || { count: 0, items: 0 };
        const itemCount = order.order_items?.length || 0;
        partyMap.set(order.party_name, {
          count: existing.count + 1,
          items: existing.items + itemCount,
        });
      });
      const topPartiesData = Array.from(partyMap.entries())
        .map(([name, data]) => ({
          party_name: name,
          order_count: data.count,
          total_items: data.items,
        }))
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, 5);
      setTopParties(topPartiesData);

      // Top designs by frequency
      const designMap = new Map<string, { count: number; quantity: number }>();
      allOrders.forEach(order => {
        order.order_items?.forEach(item => {
          const existing = designMap.get(item.design_number) || { count: 0, quantity: 0 };
          const totalQty = item.sizes_quantities?.reduce((sum, sq) => sum + sq.quantity, 0) || 0;
          designMap.set(item.design_number, {
            count: existing.count + 1,
            quantity: existing.quantity + totalQty,
          });
        });
      });
      const topDesignsData = Array.from(designMap.entries())
        .map(([design, data]) => ({
          design_number: design,
          order_count: data.count,
          total_quantity: data.quantity,
        }))
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, 5);
      setTopDesigns(topDesignsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    // Merge new layouts with existing ones to preserve hidden widget dimensions
    const mergedLayouts: { [key: string]: Layout[] } = {};
    Object.keys(layouts).forEach(breakpoint => {
      const existingLayouts = currentLayouts[breakpoint] || [];
      const newLayouts = layouts[breakpoint] || [];
      
      // Create a map of existing layouts
      const existingMap = new Map(existingLayouts.map(l => [l.i, l]));
      
      // Update with new layouts
      newLayouts.forEach(l => existingMap.set(l.i, l));
      
      // Convert back to array
      mergedLayouts[breakpoint] = Array.from(existingMap.values());
    });
    
    setLayouts(mergedLayouts);
    localStorage.setItem('dashboardLayout', JSON.stringify(mergedLayouts));
  };

  const toggleWidget = (widgetId: string) => {
    const updatedWidgets = widgets.map(w =>
      w.i === widgetId ? { ...w, visible: !w.visible } : w
    );
    setWidgets(updatedWidgets);
    localStorage.setItem('dashboardWidgets', JSON.stringify(updatedWidgets));
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.setItem('dashboardLayout', JSON.stringify(defaultLayouts));
    const resetWidgets = widgets.map(w => ({ ...w, visible: true }));
    setWidgets(resetWidgets);
    localStorage.setItem('dashboardWidgets', JSON.stringify(resetWidgets));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'processing':
        return <Package size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      case 'cancelled':
        return <AlertCircle size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  const visibleWidgets = widgets.filter(w => w.visible);
  const currentLayouts = Object.keys(layouts).length > 0 ? layouts : defaultLayouts;
  
  // Filter layouts to only include visible widgets
  const visibleLayouts: { [key: string]: Layout[] } = {};
  Object.keys(currentLayouts).forEach(breakpoint => {
    visibleLayouts[breakpoint] = currentLayouts[breakpoint].filter(layout => 
      visibleWidgets.some(w => w.i === layout.i)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Overview of your catalogue management system</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-200"
            >
              <RefreshCw size={18} className="text-blue-600" />
              <span className="font-medium text-gray-700">Refresh</span>
            </button>
            <button
              onClick={resetLayout}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              Reset Layout
            </button>
          </div>
        </div>

        {/* Widget Toggles */}
        <div className="mt-6 flex flex-wrap gap-2">
          {widgets.map(widget => (
            <button
              key={widget.i}
              onClick={() => toggleWidget(widget.i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                widget.visible
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:scale-105'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {widget.icon}
              <span>{widget.title}</span>
              {!widget.visible && <X size={14} />}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={visibleLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isDraggable={true}
        isResizable={true}
        compactType={null}
        preventCollision={false}
      >
        {/* Overview Stats Widget */}
        {visibleWidgets.find(w => w.i === 'stats') && (
          <div key="stats" className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="widget-header px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
              <div className="flex items-center gap-2">
                <GripVertical className="drag-handle cursor-move text-gray-400 hover:text-gray-600" size={16} />
                <BarChart3 size={16} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Overview Stats</h3>
              <button onClick={() => toggleWidget('stats')} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-all">
                <X size={16} />
              </button>
              </div>
             
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:scale-105 transition-transform duration-200">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{stats.totalOrders}</div>
                <div className="text-sm font-medium text-gray-700 mt-2">Total Orders</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 hover:scale-105 transition-transform duration-200">
                <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{stats.pendingOrders}</div>
                <div className="text-sm font-medium text-gray-700 mt-2">Pending</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 hover:scale-105 transition-transform duration-200">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.completedOrders}</div>
                <div className="text-sm font-medium text-gray-700 mt-2">Completed</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:scale-105 transition-transform duration-200">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{stats.totalOrders - stats.completedOrders - stats.pendingOrders}</div>
                <div className="text-sm font-medium text-gray-700 mt-2">In Progress</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Orders Widget */}
        {visibleWidgets.find(w => w.i === 'recent-orders') && (
          <div key="recent-orders" className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="widget-header px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50">
              <div className="flex items-center gap-2">
                <GripVertical className="drag-handle cursor-move text-gray-400 hover:text-gray-600" size={16} />
                <Package size={16} className="text-green-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Recent Orders</h3>
                <button onClick={() => toggleWidget('recent-orders')} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-all">
                  <X size={16} />
                </button>
              </div>
             
            </div>
            <div className="widget-content p-5">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Package size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No Recent Orders</p>
                  <p className="text-sm text-gray-500">Orders will appear here once created</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map(order => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-green-300 transition-all duration-200 cursor-pointer bg-gradient-to-r from-white to-gray-50"
                      onClick={() => navigate('/orders')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{order.party_name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Order #{order.order_number || order.id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(order.date_of_order).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Orders Widget */}
        {visibleWidgets.find(w => w.i === 'pending-orders') && (
          <div key="pending-orders" className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="widget-header px-3 h-10 pt-2.5 py-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50">
              <div className="flex items-center gap-2">
                <GripVertical className="drag-handle cursor-move text-gray-400 hover:text-gray-600" size={16} />
                <Clock size={16} className="text-yellow-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Pending Orders ({pendingOrders.length})</h3>
              
              <button onClick={() => toggleWidget('pending-orders')} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-all">
                <X size={16} />
              </button>
              </div>
            </div>
            <div className="widget-content p-5">
              {pendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">All Clear!</p>
                  <p className="text-sm text-gray-500">No pending orders at the moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map(order => (
                    <div
                      key={order.id}
                      className="border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 hover:shadow-lg hover:border-yellow-400 transition-all duration-200 cursor-pointer"
                      onClick={() => navigate('/orders')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{order.party_name}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            #{order.order_number || order.id.slice(0, 8)} • {new Date(order.date_of_order).toLocaleDateString()}
                          </div>
                        </div>
                        <Eye size={16} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top 5 Parties Widget */}
        {visibleWidgets.find(w => w.i === 'top-parties') && (
          <div key="top-parties" className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50">
              <div className="flex items-center gap-2">
                <GripVertical className="drag-handle cursor-move text-gray-400 hover:text-gray-600" size={16} />
                <Users size={16} className="text-purple-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Top 5 Parties</h3>
             
              <button onClick={() => toggleWidget('top-parties')} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-all">
                <X size={16} />
              </button>
               </div>
            </div>
            <div className="widget-content p-5">
              {topParties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Users size={32} className="text-purple-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No Party Data</p>
                  <p className="text-sm text-gray-500">Party statistics will appear after orders are placed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topParties.map((party, index) => (
                    <div key={party.party_name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-purple-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{party.party_name}</div>
                        <div className="text-sm text-gray-600">
                          {party.order_count} orders • {party.total_items} items
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Designs Widget */}
        {visibleWidgets.find(w => w.i === 'top-designs') && (
          <div key="top-designs" className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-red-50 to-pink-50">
              <div className="flex items-center gap-2">
                <GripVertical className="drag-handle cursor-move text-gray-400 hover:text-gray-600" size={16} />
                <TrendingUp size={16} className="text-orange-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Top Designs</h3>
            
              <button onClick={() => toggleWidget('top-designs')} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-all">
                <X size={16} />
              </button>
                </div>
            </div>
            <div className="widget-content p-5">
              {topDesigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <TrendingUp size={32} className="text-orange-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No Design Data</p>
                  <p className="text-sm text-gray-500">Popular designs will appear after orders are placed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topDesigns.map((design, index) => (
                    <div key={design.design_number} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-orange-300 transition-all duration-200 bg-gradient-to-r from-white to-orange-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{design.design_number}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {design.order_count} orders • {design.total_quantity} units
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">#{index + 1}</div>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-orange-500 h-full"
                          style={{ width: `${(design.order_count / topDesigns[0].order_count) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Breakdown Widget */}
        {visibleWidgets.find(w => w.i === 'status-breakdown') && (
          <div key="status-breakdown" className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50">
              <div className="flex items-center gap-2">
                <GripVertical className="drag-handle cursor-move text-gray-400 hover:text-gray-600" size={16} />
                <BarChart3 size={16} className="text-indigo-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Order Status Breakdown</h3>
             
              <button onClick={() => toggleWidget('status-breakdown')} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-all">
                <X size={16} />
              </button>
               </div>
            </div>
            <div className="widget-content p-6">
              {stats.totalOrders === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <BarChart3 size={32} className="text-blue-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No Order Data</p>
                  <p className="text-sm text-gray-500">Status breakdown will appear after orders are created</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 hover:scale-105 transition-transform duration-200">
                  <Clock className="mx-auto text-yellow-600 mb-3" size={28} />
                  <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{stats.pendingOrders}</div>
                  <div className="text-sm font-medium text-gray-700 mt-2">Pending</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:scale-105 transition-transform duration-200">
                  <Package className="mx-auto text-blue-600 mb-3" size={28} />
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stats.totalOrders - stats.completedOrders - stats.pendingOrders}</div>
                  <div className="text-sm font-medium text-gray-700 mt-2">Processing</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 hover:scale-105 transition-transform duration-200">
                  <CheckCircle className="mx-auto text-green-600 mb-3" size={28} />
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.completedOrders}</div>
                  <div className="text-sm font-medium text-gray-700 mt-2">Completed</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:scale-105 transition-transform duration-200">
                  <ShoppingCart className="mx-auto text-gray-600 mb-3" size={28} />
                  <div className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">{stats.totalOrders}</div>
                  <div className="text-sm font-medium text-gray-700 mt-2">Total</div>
                </div>
              </div>
              )}
            </div>
          </div>
        )}
      </ResponsiveGridLayout>
    </div>
  );
};

export default Dashboard;
