import { useState, useEffect, useCallback, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  Login,
  Setup,
  Catalogue,
  UserManagement,
  DesignManagement,
  PartyEntry,
  TransportEntry,
  Orders,
  OrderDetails,
  ProfilePage,
  Dashboard,
  AdminDashboard,
  ContactUs,
  Settings,
  PricingTiers,
  AboutUs,
  ResetPassword,
} from './pages';
import CartWishlistAnalytics from './pages/CartWishlistAnalytics';
import { Sidebar, TopBar, TawkToChat } from './components';

function AppContent() {
  const { user, loading, isAdmin, hasPermission } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(sidebarPinned));
  }, [sidebarPinned]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const togglePin = useCallback(() => setSidebarPinned(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
 
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (showSetup) {
    return <Setup />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Login onShowSetup={() => setShowSetup(true)} />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        isPinned={sidebarPinned}
        onTogglePin={togglePin}
        onClose={closeSidebar}
      />
      <TopBar
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={sidebarOpen}
      />
      <main
        className={`transition-all duration-300 pt-16 sm:pt-24 min-h-screen ${
          sidebarPinned ? 'lg:pl-[280px]' : ''
        }`}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }>
        <Routes>
        <Route path="/" element={<Navigate to={hasPermission('dashboard', 'view') ? '/dashboard' : hasPermission('catalogue', 'view') ? '/catalogue' : '/profile'} replace />} />
        <Route
          path="/dashboard"
          element={hasPermission('dashboard', 'view') ? <Dashboard /> : <Navigate to="/catalogue" replace />}
        />
        <Route
          path="/admin"
          element={isAdmin ? <AdminDashboard /> : <Navigate to="/catalogue" replace />}
        />
        <Route path="/catalogue" element={hasPermission('catalogue', 'view') ? <Catalogue /> : <Navigate to="/dashboard" replace />} />
        <Route path="/designs" element={hasPermission('designs', 'view') ? <DesignManagement /> : <Navigate to="/catalogue" replace />} />
        <Route path="/analytics/cart-wishlist" element={hasPermission('analytics', 'view_carts') ? <CartWishlistAnalytics /> : <Navigate to="/catalogue" replace />} />
        <Route path="/users" element={hasPermission('users', 'view') ? <UserManagement /> : <Navigate to="/catalogue" replace />} />
        <Route path="/parties" element={hasPermission('parties', 'view') ? <PartyEntry /> : <Navigate to="/catalogue" replace />} />
        <Route path="/transport" element={hasPermission('transport', 'view') ? <TransportEntry /> : <Navigate to="/catalogue" replace />} />
        <Route path="/orders" element={hasPermission('orders', 'view') ? <Orders /> : <Navigate to="/catalogue" replace />} />
        <Route path="/orders/:orderId" element={hasPermission('orders', 'view') ? <OrderDetails /> : <Navigate to="/catalogue" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/about" element={<AboutUs />} />
        <Route
          path="/settings"
          element={hasPermission('settings', 'view') ? <Settings /> : <Navigate to="/catalogue" replace />}
        />
        <Route
          path="/pricing-tiers"
          element={hasPermission('pricing', 'view') ? <PricingTiers /> : <Navigate to="/catalogue" replace />}
        />
        <Route path="*" element={<Navigate to="/catalogue" replace />} />
        </Routes>
        </Suspense>
      </main>
      
      {/* Tawk.to Chat Widget - Only for non-admin users (retailers and guests) */}
      {!hasPermission('users', 'manage_roles') && <TawkToChat enabled={true} />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
