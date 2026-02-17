import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart,
  ShoppingCart,
  LogOut,
  User,
  Package,
  Menu,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import { CartModal } from './CartModal';
import { Wishlist } from './Wishlist';
import { useBranding } from '../hooks/useBranding';

interface TopBarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const TopBar = memo(function TopBar({ onToggleSidebar, isSidebarOpen }: TopBarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const branding = useBranding();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCartCount();
    loadWishlistCount();

    // Listen for cart updates from other components
    const handleCartUpdate = () => {
      loadCartCount();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  // Handle click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  const loadCartCount = async () => {
    try {
      const cartItems = await api.getCart();
      setCartCount(cartItems.length);
    } catch (error) {
      console.error('Failed to load cart count:', error);
    }
  };

  const loadWishlistCount = async () => {
    try {
      const wishlistItems = await api.getWishlist();
      setWishlistCount(wishlistItems.length);
    } catch (error) {
      console.error('Failed to load wishlist count:', error);
    }
  };

  const handleCartModalClose = () => {
    setCartModalOpen(false);
    loadCartCount();
  };

  const handleWishlistModalClose = () => {
    setWishlistModalOpen(false);
    loadWishlistCount();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 shadow-sm sm:h-20">
        <div className="h-full px-4 md:px-6">
          {/* Mobile Layout: Stacked */}
          <div className="sm:hidden flex flex-col">
            {/* First row: Logo */}
            <div className="flex items-center justify-center py-2 border-b border-gray-100">
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                style={{ height: '4.5rem' }}
                className="w-auto object-contain max-w-[180px]"
              />
            </div>
            
            {/* Second row: Menu and Actions */}
            <div className="flex items-center justify-between h-12">
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Toggle menu"
              >
                {isSidebarOpen ? <X size={20} className="text-gray-700" /> : <Menu size={20} className="text-gray-700" />}
              </button>
              
              <div className="flex items-center gap-1">
                {/* Wishlist */}
                <button
                  onClick={() => setWishlistModalOpen(true)}
                  className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all hover:scale-105"
                  title="Wishlist"
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg text-[10px]">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                {/* Cart */}
                <button
                  onClick={() => setCartModalOpen(true)}
                  className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all hover:scale-105"
                  title="Shopping Cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-lg text-[10px]">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-xl transition-all"
                    title="Profile"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg text-sm">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm text-gray-500">Signed in as</p>
                        <p className="text-base font-semibold text-gray-900 mt-1">{user?.full_name}</p>
                        <p className="text-xs text-gray-500 capitalize mt-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          {user?.role}
                        </p>
                      </div>

                      <button
                        onMouseDown={() => {
                          navigate('/orders');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Package className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">Your Orders</span>
                      </button>

                      <button
                        onMouseDown={() => {
                          navigate('/profile');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">Profile Settings</span>
                      </button>

                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <button
                          onMouseDown={() => {
                            logout();
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors rounded-lg mx-2"
                          style={{ width: 'calc(100% - 1rem)' }}
                        >
                          <LogOut className="w-5 h-5" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout: Single Row */}
          <div className="hidden sm:flex items-center justify-between h-20">
            {/* Left: Menu Toggle */}
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <X size={24} className="text-gray-700" /> : <Menu size={24} className="text-gray-700" />}
            </button>

            {/* Center: Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center pointer-events-none">
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                style={{ height: '10rem', paddingTop: '10px' }}
                className="w-auto object-contain"
              />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Wishlist */}
              <button
                onClick={() => setWishlistModalOpen(true)}
                className="relative p-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all hover:scale-105"
                title="Wishlist"
              >
                <Heart className="w-6 h-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={() => setCartModalOpen(true)}
                className="relative p-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all hover:scale-105"
                title="Shopping Cart"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-xl transition-all"
                  title="Profile"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {user?.full_name?.split(' ')[0] || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-500">Signed in as</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {user?.role}
                    </p>
                  </div>

                  <button
                    onMouseDown={() => {
                      navigate('/orders');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Package className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Your Orders</span>
                  </button>

                  <button
                    onMouseDown={() => {
                      navigate('/profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">Profile Settings</span>
                  </button>

                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button
                      onMouseDown={() => {
                        logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors rounded-lg mx-2"
                      style={{ width: 'calc(100% - 1rem)' }}
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <CartModal isOpen={cartModalOpen} onClose={handleCartModalClose} />

      {wishlistModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
          onClick={handleWishlistModalClose}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-6xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Wishlist</h2>
              </div>
              <button
                onClick={handleWishlistModalClose}
                className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <Wishlist onClose={handleWishlistModalClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
});
