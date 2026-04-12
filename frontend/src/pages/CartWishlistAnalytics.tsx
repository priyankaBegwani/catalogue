import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, Search, Mail, TrendingUp, Users, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CartItem {
  id: string;
  user_id: string;
  design_id: string;
  quantity: number;
  created_at: string;
  user_profiles: {
    id: string;
    email: string;
    full_name: string;
    party_id: string | null;
    parties: {
      name: string;
      city: string;
      state: string;
    } | null;
    user_roles: {
      role_name: string;
    };
  };
  designs: {
    id: string;
    design_number: string;
    design_name: string;
    category: string;
    image_url: string;
  };
}

interface WishlistItem {
  id: string;
  user_id: string;
  design_id: string;
  created_at: string;
  user_profiles: {
    id: string;
    email: string;
    full_name: string;
    party_id: string | null;
    parties: {
      name: string;
      city: string;
      state: string;
    } | null;
    user_roles: {
      role_name: string;
    };
  };
  designs: {
    id: string;
    design_number: string;
    design_name: string;
    category: string;
    image_url: string;
  };
}

interface DemandSummary {
  design_id: string;
  design_number: string;
  design_name: string;
  image_url: string;
  cart_count: number;
  cart_quantity: number;
  wishlist_count: number;
  total_interest: number;
}

export default function CartWishlistAnalytics() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'carts' | 'wishlists' | 'demand'>('carts');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [demandSummary, setDemandSummary] = useState<DemandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      if (activeTab === 'carts') {
        const response = await fetch(`/api/analytics/cart-items?search=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setCartItems(data.cart_items || []);
      } else if (activeTab === 'wishlists') {
        const response = await fetch(`/api/analytics/wishlist-items?search=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setWishlistItems(data.wishlist_items || []);
      } else if (activeTab === 'demand') {
        const response = await fetch('/api/analytics/demand-summary', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setDemandSummary(data.demand_summary || []);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const handleMessageUser = (userEmail: string, userName: string) => {
    const subject = encodeURIComponent('Regarding your cart items');
    const body = encodeURIComponent(`Hi ${userName},\n\nWe noticed you have items in your cart/wishlist. How can we help you complete your order?\n\nBest regards,\nTeam`);
    window.location.href = `mailto:${userEmail}?subject=${subject}&body=${body}`;
  };

  if (!hasPermission('analytics', 'view_carts')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Cart & Wishlist Analytics
          </h1>
          <p className="text-gray-600">
            Monitor customer interest and reach out to help them complete their orders
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by user, party, design number, or design name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
            >
              Search
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('carts')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                  activeTab === 'carts'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                Cart Items
              </button>
              <button
                onClick={() => setActiveTab('wishlists')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                  activeTab === 'wishlists'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Heart className="w-5 h-5" />
                Wishlist Items
              </button>
              <button
                onClick={() => setActiveTab('demand')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                  activeTab === 'demand'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                Demand Summary
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : activeTab === 'carts' ? (
              <CartItemsTable items={cartItems} onMessageUser={handleMessageUser} />
            ) : activeTab === 'wishlists' ? (
              <WishlistItemsTable items={wishlistItems} onMessageUser={handleMessageUser} />
            ) : (
              <DemandSummaryTable items={demandSummary} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemsTable({ items, onMessageUser }: { items: CartItem[]; onMessageUser: (email: string, name: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No cart items found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{item.user_profiles.full_name}</div>
                <div className="text-sm text-gray-500">{item.user_profiles.email}</div>
                <div className="text-xs text-gray-400">{item.user_profiles.user_roles.role_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {item.user_profiles.parties ? (
                  <div>
                    <div className="text-sm text-gray-900">{item.user_profiles.parties.name}</div>
                    <div className="text-xs text-gray-500">{item.user_profiles.parties.city}, {item.user_profiles.parties.state}</div>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No party</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {item.designs.image_url && (
                    <img src={item.designs.image_url} alt={item.designs.design_number} className="w-12 h-12 object-cover rounded" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.designs.design_number}</div>
                    <div className="text-xs text-gray-500">{item.designs.design_name}</div>
                    <div className="text-xs text-gray-400">{item.designs.category}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onMessageUser(item.user_profiles.email, item.user_profiles.full_name)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Message
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WishlistItemsTable({ items, onMessageUser }: { items: WishlistItem[]; onMessageUser: (email: string, name: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No wishlist items found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{item.user_profiles.full_name}</div>
                <div className="text-sm text-gray-500">{item.user_profiles.email}</div>
                <div className="text-xs text-gray-400">{item.user_profiles.user_roles.role_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {item.user_profiles.parties ? (
                  <div>
                    <div className="text-sm text-gray-900">{item.user_profiles.parties.name}</div>
                    <div className="text-xs text-gray-500">{item.user_profiles.parties.city}, {item.user_profiles.parties.state}</div>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No party</span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {item.designs.image_url && (
                    <img src={item.designs.image_url} alt={item.designs.design_number} className="w-12 h-12 object-cover rounded" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.designs.design_number}</div>
                    <div className="text-xs text-gray-500">{item.designs.design_name}</div>
                    <div className="text-xs text-gray-400">{item.designs.category}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onMessageUser(item.user_profiles.email, item.user_profiles.full_name)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Message
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemandSummaryTable({ items }: { items: DemandSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No demand data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Carts</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quantity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Wishlists</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Interest</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.design_id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.design_number} className="w-12 h-12 object-cover rounded" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.design_number}</div>
                    <div className="text-xs text-gray-500">{item.design_name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{item.cart_count}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">{item.cart_quantity}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{item.wishlist_count}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-primary">{item.total_interest}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
