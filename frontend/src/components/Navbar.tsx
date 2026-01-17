import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, Palette, Heart, ShoppingCart, Menu, X, Truck, UserPlus, Package, ChevronDown, UserCircle2, User, BarChart3 } from 'lucide-react';
import { api } from '../lib/api';
import { CartModal } from './CartModal';
import { Wishlist } from './Wishlist';
import { useBranding } from '../hooks/useBranding';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname.slice(1) || 'catalogue';
  const { user, logout, isAdmin } = useAuth();
  const branding = useBranding();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);
  const [entriesDropdownOpen, setEntriesDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    loadCartCount();
    loadWishlistCount();
  }, []);

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

  const goTo = (path: string, options?: { closeEntries?: boolean; closeProfile?: boolean; closeMobile?: boolean }) => {
    navigate(path);
    if (options?.closeEntries) setEntriesDropdownOpen(false);
    if (options?.closeProfile) setProfileDropdownOpen(false);
    if (options?.closeMobile) setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center py-2 sm:py-3">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <button 
              onClick={() => goTo('/catalogue')}
              className="flex items-center group transition-transform hover:scale-105"
            >
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className="h-14 sm:h-16 lg:h-18 w-auto object-contain transition-all"
              />
            </button>

            <div className="hidden md:flex items-center space-x-6">
              {isAdmin && (
                <button
                  onClick={() => goTo('/dashboard')}
                  className={`px-3 py-2 font-medium transition-colors flex items-center space-x-2 ${
                    currentPage === 'dashboard'
                      ? 'text-primary'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              )}

              <button
                onClick={() => goTo('/catalogue')}
                className={`px-3 py-2 font-medium transition-colors relative ${
                  currentPage === 'catalogue'
                    ? 'text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Catalogue
               
              </button>

              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setEntriesDropdownOpen(!entriesDropdownOpen)}
                    onBlur={() => setTimeout(() => setEntriesDropdownOpen(false), 200)}
                    className={`px-3 py-2 font-medium transition-colors flex items-center space-x-1 relative ${
                      ['designs', 'users', 'parties', 'transport', 'orders'].includes(currentPage)
                        ? 'text-primary'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>Entries</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      entriesDropdownOpen ? 'rotate-180' : ''
                    }`} />
                   
                  </button>

                  {entriesDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <button
                        onMouseDown={() => goTo('/designs', { closeEntries: true })}
                        className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                          currentPage === 'designs'
                            ? 'bg-primary bg-opacity-10 text-primary'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Palette className="w-5 h-5" />
                        <span className="font-medium">Designs</span>
                      </button>

                      <button
                        onMouseDown={() => goTo('/users', { closeEntries: true })}
                        className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                          currentPage === 'users'
                            ? 'bg-primary bg-opacity-10 text-primary'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Users className="w-5 h-5" />
                        <span className="font-medium">Users</span>
                      </button>

                      <button
                        onMouseDown={() => goTo('/parties', { closeEntries: true })}
                        className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                          currentPage === 'parties'
                            ? 'bg-primary bg-opacity-10 text-primary'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <UserPlus className="w-5 h-5" />
                        <span className="font-medium">Parties</span>
                      </button>

                      <button
                        onMouseDown={() => goTo('/transport', { closeEntries: true })}
                        className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                          currentPage === 'transport'
                            ? 'bg-primary bg-opacity-10 text-primary'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Truck className="w-5 h-5" />
                        <span className="font-medium">Transport</span>
                      </button>

                      <button
                        onMouseDown={() => goTo('/orders', { closeEntries: true })}
                        className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                          currentPage === 'orders'
                            ? 'bg-primary bg-opacity-10 text-primary'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Package className="w-5 h-5" />
                        <span className="font-medium">Orders</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setWishlistModalOpen(true)}
              className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
              title="Wishlist"
            >
              <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCartModalOpen(true)}
              className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                onBlur={() => setTimeout(() => setProfileDropdownOpen(false), 200)}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition"
                title="Profile"
              >
                <UserCircle2 className="w-8 h-8" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-500">Welcome</p>
                    <p className="text-base font-semibold text-gray-900">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize mt-1">{user?.role}</p>
                  </div>

                  <button
                    onMouseDown={() => goTo('/orders', { closeProfile: true })}
                    className="w-full px-4 py-3 flex items-center space-x-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Package className="w-5 h-5" />
                    <span className="font-medium">Your Orders</span>
                  </button>

                  <button
                    onMouseDown={() => goTo('/profile', { closeProfile: true })}
                    className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                      currentPage === 'profile'
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">Profile Details</span>
                  </button>

                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button
                      onMouseDown={() => {
                        logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-3 flex items-center space-x-3 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => goTo('/catalogue', { closeMobile: true })}
                className={`px-4 py-3 rounded-lg font-medium transition text-left ${
                  currentPage === 'catalogue'
                    ? 'bg-primary bg-opacity-10 text-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Catalogue
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => goTo('/dashboard', { closeMobile: true })}
                    className={`px-4 py-3 rounded-lg font-medium transition flex items-center space-x-2 ${
                      currentPage === 'dashboard'
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => goTo('/designs', { closeMobile: true })}
                    className={`px-4 py-3 rounded-lg font-medium transition flex items-center space-x-2 ${
                      currentPage === 'designs'
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    <span>Designs</span>
                  </button>

                  <button
                    onClick={() => goTo('/users', { closeMobile: true })}
                    className={`px-4 py-3 rounded-lg font-medium transition flex items-center space-x-2 ${
                      currentPage === 'users'
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Users</span>
                  </button>

                  <button
                    onClick={() => goTo('/parties', { closeMobile: true })}
                    className={`px-4 py-3 rounded-lg font-medium transition flex items-center space-x-2 ${
                      currentPage === 'parties'
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Parties</span>
                  </button>

                  <button
                    onClick={() => goTo('/transport', { closeMobile: true })}
                    className={`px-4 py-3 rounded-lg font-medium transition flex items-center space-x-2 ${
                      currentPage === 'transport'
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Transport</span>
                  </button>

                  <button
                    onClick={() => goTo('/orders', { closeMobile: true })}
                    className={`px-4 py-3 rounded-lg font-medium transition flex items-center space-x-2 ${
                      currentPage === 'orders'
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Orders</span>
                  </button>
                </>
              )}

              <button
                onClick={() => goTo('/profile', { closeMobile: true })}
                className={`px-4 py-3 rounded-lg font-medium transition flex items-center space-x-2 ${
                  currentPage === 'profile'
                    ? 'bg-primary bg-opacity-10 text-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile Details</span>
              </button>

              <div className="sm:hidden pt-4 border-t border-gray-200 mt-2">
                <div className="px-4 pb-3">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-xl sm:text-2xl font-bold text-primary">My Wishlist</h2>
              </div>
              <button
                onClick={handleWishlistModalClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <Wishlist isModal onClose={handleWishlistModalClose} onUpdate={loadWishlistCount} />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
