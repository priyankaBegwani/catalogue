import { useState, useEffect, Suspense } from 'react';
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
import { Sidebar, TopBar, TawkToChat } from './components';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(sidebarPinned));
  }, [sidebarPinned]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const togglePin = () => setSidebarPinned(!sidebarPinned);
  const closeSidebar = () => setSidebarOpen(false);
 
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
        className={`transition-all duration-300 pt-[160px] sm:pt-24 min-h-screen ${
          sidebarPinned ? 'lg:pl-[280px]' : ''
        }`}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }>
        <Routes>
        <Route path="/" element={<Navigate to={isAdmin ? '/admin' : '/catalogue'} replace />} />
        <Route
          path="/dashboard"
          element={isAdmin ? <Dashboard /> : <Navigate to="/catalogue" replace />}
        />
        <Route
          path="/admin"
          element={isAdmin ? <AdminDashboard /> : <Navigate to="/catalogue" replace />}
        />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/designs" element={<DesignManagement />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/parties" element={<PartyEntry />} />
        <Route path="/transport" element={<TransportEntry />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderDetails />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/about" element={<AboutUs />} />
        <Route
          path="/settings"
          element={isAdmin ? <Settings /> : <Navigate to="/catalogue" replace />}
        />
        <Route
          path="/pricing-tiers"
          element={isAdmin ? <PricingTiers /> : <Navigate to="/catalogue" replace />}
        />
        <Route path="*" element={<Navigate to="/catalogue" replace />} />
        </Routes>
        </Suspense>
      </main>
      
      {/* Tawk.to Chat Widget - Only for non-admin users (retailers and guests) */}
      {!isAdmin && <TawkToChat enabled={true} />}
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
