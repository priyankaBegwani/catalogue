import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart3,
  Package,
  Palette,
  Users,
  UserPlus,
  Truck,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  ShoppingBag,
  Phone,
  Settings as SettingsIcon,
  Info
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onClose: () => void;
}

export function Sidebar({ isOpen, isPinned, onTogglePin, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname.slice(1) || 'catalogue';
  const { isAdmin } = useAuth();

  const navigationItems = [
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
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isPinned) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && !isPinned && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white z-50 transition-all duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
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
                Indie Craft
              </h2>
              <p className="text-xs text-slate-400">Catalogue System</p>
            </div>
          </div>
          <button
            onClick={onTogglePin}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors hidden lg:block"
            title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors lg:hidden"
          >
            <ChevronLeft size={20} />
          </button>
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
              <p className="text-sm font-medium text-white truncate">Indie Craft</p>
              <p className="text-xs text-slate-400">v1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle Button (when sidebar is closed and not pinned) */}
      {!isOpen && !isPinned && (
        <button
          onClick={() => {}}
          className="fixed top-24 left-0 z-30 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-r-xl shadow-lg hover:shadow-xl transition-all duration-200 lg:hidden"
          style={{ display: 'none' }} // Hidden as we'll control via TopBar
        >
          <ChevronRight size={20} />
        </button>
      )}
    </>
  );
}
