import { useLocation, useNavigate } from 'react-router-dom';
import { memo, useMemo, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import {
  BarChart3,
  Package,
  Palette,
  Users,
  UserPlus,
  Truck,
  ChevronLeft,
  ShoppingBag,
  Phone,
  Settings as SettingsIcon,
  Info,
  TrendingUp,
  Pin,
  PinOff,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Cog
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
}

export const Sidebar = memo(function Sidebar({ isOpen, isPinned, onClose, onTogglePin }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, isAdmin, user, permissions } = useAuth();
  const branding = useBranding();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['management', 'system']));

  const navigationStructure = useMemo(() => {
    // Debug logging
    console.log('Sidebar - Building navigation structure');
    console.log('User:', user);
    console.log('Permissions:', permissions);
    console.log('isAdmin:', isAdmin);
    console.log('hasPermission test (dashboard, view):', hasPermission('dashboard', 'view'));
    console.log('hasPermission test (catalogue, view):', hasPermission('catalogue', 'view'));
    
    const structure: any[] = [];

    // Catalogue - visible only if user has catalogue view permission
    if (hasPermission('catalogue', 'view')) {
      structure.push({
        type: 'item',
        id: 'catalogue',
        label: 'Catalogue',
        icon: ShoppingBag,
        path: '/catalogue',
      });
    }

    // Dashboard - visible if user has dashboard view permission
    if (hasPermission('dashboard', 'view')) {
      structure.push({
        type: 'item',
        id: 'dashboard',
        label: 'Dashboard',
        icon: BarChart3,
        path: '/dashboard',
      });
    }

    // Management section - build dynamically based on permissions
    const managementItems: any[] = [];

    // Designs - only for Admin and Staff (check permission)
    if (hasPermission('designs', 'view')) {
      managementItems.push({
        id: 'designs',
        label: 'Designs',
        icon: Palette,
        path: '/designs',
      });
    }

    // Cart & Wishlist Analytics - only for Admin and Staff
    if (hasPermission('analytics', 'view_carts')) {
      managementItems.push({
        id: 'analytics',
        label: 'Cart & Wishlist Analytics',
        icon: TrendingUp,
        path: '/analytics/cart-wishlist',
      });
    }

    if (hasPermission('orders', 'view')) {
      managementItems.push({
        id: 'orders',
        label: 'Orders',
        icon: Package,
        path: '/orders',
      });
    }

    if (hasPermission('users', 'view')) {
      managementItems.push({
        id: 'users',
        label: 'Users',
        icon: Users,
        path: '/users',
      });
    }

    if (hasPermission('parties', 'view')) {
      managementItems.push({
        id: 'parties',
        label: 'Parties',
        icon: UserPlus,
        path: '/parties',
      });
    }

    if (hasPermission('transport', 'view')) {
      managementItems.push({
        id: 'transport',
        label: 'Transport',
        icon: Truck,
        path: '/transport',
      });
    }

    // Only show Management section if there are items
    if (managementItems.length > 0) {
      structure.push({
        type: 'section',
        id: 'management',
        label: 'Management',
        icon: Briefcase,
        items: managementItems,
      });
    }

    // System section - build dynamically based on permissions
    const systemItems: any[] = [];

    if (hasPermission('pricing', 'view')) {
      systemItems.push({
        id: 'pricing-tiers',
        label: 'Pricing Tiers',
        icon: TrendingUp,
        path: '/pricing-tiers',
      });
    }

    if (hasPermission('settings', 'view')) {
      systemItems.push({
        id: 'settings',
        label: 'Settings',
        icon: SettingsIcon,
        path: '/settings',
      });
    }

    // Only show System section if there are items
    if (systemItems.length > 0) {
      structure.push({
        type: 'section',
        id: 'system',
        label: 'System',
        icon: Cog,
        items: systemItems,
      });
    }

    // Bottom items visible to all
    structure.push(
      {
        type: 'item',
        id: 'about',
        label: 'About Us',
        icon: Info,
        path: '/about',
      },
      {
        type: 'item',
        id: 'contact',
        label: 'Contact Us',
        icon: Phone,
        path: '/contact',
      }
    );

    return structure;
  }, [hasPermission]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  return (
    <>
      {/* Overlay - shows when sidebar is open and not pinned */}
      {/* On mobile/tablet: always show when open */}
      {/* On desktop: only show when open and NOT pinned */}
      {isOpen && !isPinned && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      {/* Mobile-only overlay (for when sidebar might be pinned on desktop but should still have overlay on mobile) */}
      {isOpen && isPinned && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white z-50 transition-all duration-300 ease-in-out shadow-2xl flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isPinned ? 'lg:translate-x-0' : ''}`}
        style={{ width: '280px' }}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {branding.brandName}
              </h2>
              <p className="text-xs text-slate-400">Catalogue System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Pin button - only visible on large screens */}
            <button
              onClick={onTogglePin}
              className="hidden lg:block p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {isPinned ? <Pin size={20} className="text-blue-400" /> : <PinOff size={20} />}
            </button>
            {/* Close button - always visible on mobile, on desktop only when not pinned */}
            <button
              onClick={onClose}
              className={`p-2 hover:bg-slate-700/50 rounded-lg transition-colors ${
                isPinned ? 'lg:hidden' : ''
              }`}
              aria-label="Close sidebar"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-6 px-4">
          <div className="space-y-1">
            {navigationStructure.map((item) => {
              if (item.type === 'item') {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon
                      size={20}
                      className={`transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                    )}
                  </button>
                );
              }

              if (item.type === 'section') {
                const SectionIcon = item.icon;
                const isExpanded = expandedSections.has(item.id);
                const hasActiveChild = item.items.some((child: any) => location.pathname === child.path);

                return (
                  <div key={item.id} className="space-y-1">
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                        hasActiveChild
                          ? 'bg-slate-700/30 text-white'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <SectionIcon
                        size={20}
                        className={`transition-transform group-hover:scale-110 ${
                          hasActiveChild ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="font-medium flex-1 text-left">{item.label}</span>
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400" />
                      )}
                    </button>

                    {/* Section Items */}
                    {isExpanded && (
                      <div className="ml-4 space-y-1 border-l-2 border-slate-700/50 pl-2">
                        {item.items.map((subItem: any) => {
                          const SubIcon = subItem.icon;
                          const isActive = location.pathname === subItem.path;

                          return (
                            <button
                              key={subItem.id}
                              onClick={() => handleNavigate(subItem.path)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                                isActive
                                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                              }`}
                            >
                              <SubIcon
                                size={18}
                                className={`transition-transform group-hover:scale-110 ${
                                  isActive ? 'text-white' : 'text-slate-400'
                                }`}
                              />
                              <span className="text-sm font-medium">{subItem.label}</span>
                              {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              IC
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{branding.brandName}</p>
              <p className="text-xs text-slate-400">v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});
