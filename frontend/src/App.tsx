import { useState, useEffect, useCallback, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
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
  BrandRegister,
  SubscriptionExpired,
  Subscription,
  Onboarding,
  InviteAccept,
} from './pages';
import CartWishlistAnalytics from './pages/CartWishlistAnalytics';
import { ImageRestructure } from './pages/internal/ImageRestructure';
import { DesignCompletion } from './pages/internal/DesignCompletion';
import { AssistanceRequests } from './pages/internal/AssistanceRequests';
import { PreviewCatalogue } from './pages/PreviewCatalogue';
import { Sidebar, TopBar, TawkToChat } from './components';
import { SubscriptionBanner } from './components/SubscriptionBanner';
import { useTenant } from './contexts/TenantContext';

function AppContent() {
  const { user, loading, isAdmin, isSuperAdmin, hasPermission } = useAuth();
  const { isExpired, inGracePeriod, onboardingComplete, isLoading: tenantLoading } = useTenant();
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

  // Wait for TenantContext to finish before rendering authenticated pages.
  // Components make API calls on mount — if sessionStorage.tenant_id isn't set yet
  // (because TenantContext hasn't resolved) every tenant-scoped request fails.
  if (user && tenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
        <Route path="/register" element={<BrandRegister />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        {/* Public preview page — no login required */}
        <Route path="/preview/:token" element={<PreviewCatalogue />} />
        <Route path="*" element={<Login onShowSetup={() => setShowSetup(true)} />} />
      </Routes>
    );
  }

  // On first-time registration login, force the admin straight into the onboarding wizard.
  // We track this with a per-tenant localStorage flag so that subsequent logins (with
  // onboarding still incomplete) land on the normal app — where the sidebar shows the
  // "Complete Setup" link instead of blocking access entirely.
  const tenantId = sessionStorage.getItem('tenant_id');
  const onboardingForcedKey = tenantId ? `onboarding_forced_${tenantId}` : null;
  const onboardingAlreadyForced = onboardingForcedKey ? !!localStorage.getItem(onboardingForcedKey) : false;

  if (isAdmin && !isSuperAdmin && !tenantLoading && !onboardingComplete && !onboardingAlreadyForced) {
    if (onboardingForcedKey) localStorage.setItem(onboardingForcedKey, '1');
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  // Show frozen page if subscription fully expired (not in grace period)
  // Still allow /subscription route so they can pay
  if (user && isExpired && !inGracePeriod) {
    return (
      <Routes>
        <Route path="/subscription" element={<Subscription />} />
        <Route path="*" element={<SubscriptionExpired />} />
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
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/onboarding" element={<Onboarding />} />
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
        {/* Internal superadmin tools — no sidebar chrome needed (InternalLayout handles it) */}
        <Route path="/internal/assistance"         element={isSuperAdmin ? <AssistanceRequests /> : <Navigate to="/catalogue" replace />} />
        <Route path="/internal/image-restructure"  element={isSuperAdmin ? <ImageRestructure />   : <Navigate to="/catalogue" replace />} />
        <Route path="/internal/design-completion"  element={isSuperAdmin ? <DesignCompletion />   : <Navigate to="/catalogue" replace />} />
        {/* Preview accessible when logged in too */}
        <Route path="/preview/:token" element={<PreviewCatalogue />} />
        <Route path="*" element={<Navigate to="/catalogue" replace />} />
        </Routes>
        </Suspense>
      </main>
      
      {/* Tawk.to Chat Widget - Only for non-admin users (retailers and guests) */}
      {!hasPermission('users', 'manage_roles') && <TawkToChat enabled={true} />}
      <SubscriptionBanner />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
    <TenantProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
}

export default App;
