import { useLocation, useNavigate } from 'react-router-dom';
import { memo, useMemo, useCallback } from 'react';
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
  PinOff
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
  const currentPage = location.pathname.slice(1) || 'catalogue';
  const { user, logout, isAdmin } = useAuth();
  const branding = useBranding();

  const navigationItems = useMemo(() => [
    ...(isAdmin ? [{
      id: 'admin',
      label: 'Admin Dashboard',
      icon: BarChart3,
      path: '/admin',
      adminOnly: true,
    }] : []),
    {
      id: 'catalogue',
      label: 'Catalogue',
      icon: ShoppingBag,
      path: '/catalogue',
      adminOnly: false,
    },
    ...(isAdmin ? [
      {
        id: 'designs',
        label: 'Designs',
        icon: Palette,
        path: '/designs',
        adminOnly: true,
      },
      {
        id: 'users',
        label: 'Users',
        icon: Users,
        path: '/users',
        adminOnly: true,
      },
      {
        id: 'parties',
        label: 'Parties',
        icon: UserPlus,
        path: '/parties',
        adminOnly: true,
      },
      {
        id: 'transport',
        label: 'Transport',
        icon: Truck,
        path: '/transport',
        adminOnly: true,
      },
      {
        id: 'orders',
        label: 'Orders',
        icon: Package,
        path: '/orders',
        adminOnly: true,
      },
      {
        id: 'pricing-tiers',
        label: 'Pricing Tiers',
        icon: TrendingUp,
        path: '/pricing-tiers',
        adminOnly: true,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: SettingsIcon,
        path: '/settings',
        adminOnly: true,
      },
    ] : []),
    {
      id: 'contact',
      label: 'Contact Us',
      icon: Phone,
      path: '/contact',
      adminOnly: false,
    },
    {
      id: 'about',
      label: 'About Us',
      icon: Info,
      path: '/about',
      adminOnly: false,
    },
  ], [isAdmin]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  return (
    <>
      {/* Overlay - shows on mobile when open, and on desktop when open but not pinned */}
      {isOpen && !isPinned && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white z-50 transition-all duration-300 ease-in-out shadow-2xl ${
          isOpen || isPinned ? 'translate-x-0' : '-translate-x-full'
        } ${isPinned ? 'lg:translate-x-0' : ''}`}
        style={{ width: '280px' }}
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
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {isPinned ? <Pin size={20} className="text-blue-400" /> : <PinOff size={20} />}
            </button>
            {/* Close button - visible on mobile always, on desktop only when not pinned */}
            <button
              onClick={onClose}
              className={`p-2 hover:bg-slate-700/50 rounded-lg transition-colors ${
                isPinned ? 'lg:hidden' : ''
              }`}
              title="Close sidebar"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

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
