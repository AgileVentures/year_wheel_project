import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import CookieConsent from "./components/CookieConsent";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth.jsx";
import AffiliateTracker from "./components/AffiliateTracker";
import WheelLoader from "./components/WheelLoader";

// Import routing components
import ProtectedRoute from "./components/routing/ProtectedRoute";
import WheelEditorRoute from "./components/routing/WheelEditorRoute";
import DashboardRoute from "./components/routing/DashboardRoute";

// Lazy load route components for better code splitting
const LandingPage = lazy(() => import("./components/LandingPage"));
const AuthPage = lazy(() => import("./components/auth/AuthPage"));
const InviteAcceptPage = lazy(() => import("./components/InviteAcceptPage"));
const PreviewWheelPage = lazy(() => import("./components/PreviewWheelPage"));
const PricingPage = lazy(() => import("./components/PricingPage"));
const LegalPage = lazy(() => import("./components/LegalPage"));
const SupportPage = lazy(() => import("./components/SupportPage"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const EmbedWheel = lazy(() => import("./components/EmbedWheel"));
const CastReceiverPage = lazy(() => import("./pages/CastReceiverPage"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const AffiliateApplicationForm = lazy(() => import("./pages/AffiliateApplicationForm"));

// Admin components (lazy loaded)
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminGuard = lazy(() => import("./components/admin/AdminGuard"));
const AdminOverview = lazy(() => import("./components/admin/AdminOverview"));
const AdminUsersPage = lazy(() => import("./components/admin/AdminUsersPage"));
const AdminWheelsPage = lazy(() => import("./components/admin/AdminWheelsPage"));
const AdminAffiliatesPage = lazy(() => import("./components/admin/AdminAffiliatesPage"));
const AdminMondayPage = lazy(() => import("./components/admin/AdminMondayPage"));
const RevenueForecast = lazy(() => import("./components/admin/RevenueForecast"));
const NewsletterManager = lazy(() => import("./pages/admin/NewsletterManager"));

// Keyword-optimized landing pages
const HRPlanering = lazy(() => import("./pages/landing/HRPlanering"));
const Marknadsplanering = lazy(() => import("./pages/landing/Marknadsplanering"));
const SkolaUtbildning = lazy(() => import("./pages/landing/SkolaUtbildning"));
const Projektplanering = lazy(() => import("./pages/landing/Projektplanering"));
const QuickStartGuide = lazy(() => import("./components/QuickStartGuide"));
const ArshjulGuide = lazy(() => import("./pages/ArshjulGuide"));
const MondayHowToGuide = lazy(() => import("./pages/MondayHowToGuide"));

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <WheelLoader size="sm" className="mx-auto" />
        </div>
      </div>
    );
  }

  // Check where to redirect authenticated users on /auth
  const getAuthRedirect = () => {
    const pendingToken = sessionStorage.getItem('pendingInviteToken');
    if (pendingToken) {
      return `/invite/${pendingToken}`;
    }
    
    // Check for pending template copy
    const pendingCopy = localStorage.getItem('pendingTemplateCopy');
    if (pendingCopy) {
      try {
        const intent = JSON.parse(pendingCopy);
        return `/preview-wheel/${intent.wheelId}`;
      } catch (error) {
        console.error('[App] Error parsing pending template copy:', error);
        localStorage.removeItem('pendingTemplateCopy');
      }
    }
    
    return '/dashboard';
  };

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <WheelLoader size="sm" className="mx-auto" />
        </div>
      </div>
    }>
      <AffiliateTracker />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to={getAuthRedirect()} replace /> : <AuthPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/guide/quick-start" element={<QuickStartGuide />} />
        <Route path="/guide/arshjul" element={<ArshjulGuide />} />
        <Route path="/how-to" element={<MondayHowToGuide />} />
        <Route path="/legal/:document" element={<LegalPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/preview-wheel/:wheelId" element={<PreviewWheelPage />} />
        <Route path="/embed/:wheelId" element={<EmbedWheel />} />
        <Route path="/cast-receiver" element={<CastReceiverPage />} />

        {/* Keyword-optimized landing pages */}
        <Route path="/hr-planering" element={<HRPlanering />} />
        <Route path="/marknadsplanering" element={<Marknadsplanering />} />
        <Route path="/skola-och-utbildning" element={<SkolaUtbildning />} />
        <Route path="/projektplanering" element={<Projektplanering />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRoute />
          </ProtectedRoute>
        } />
        
        {/* Admin routes with nested layout */}
        <Route path="/admin" element={
          <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><WheelLoader size="sm" className="mx-auto" /></div>}>
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          </Suspense>
        }>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="wheels" element={<AdminWheelsPage />} />
          <Route path="affiliates" element={<AdminAffiliatesPage />} />
          <Route path="monday" element={<AdminMondayPage />} />
          <Route path="newsletter" element={<NewsletterManager />} />
          <Route path="forecasts" element={<RevenueForecast />} />
        </Route>
        
        <Route path="/affiliate" element={
          <ProtectedRoute>
            <AffiliateDashboard />
          </ProtectedRoute>
        } />
        <Route path="/affiliate/apply" element={
          <ProtectedRoute>
            <AffiliateApplicationForm />
          </ProtectedRoute>
        } />
        <Route path="/wheel/:wheelId" element={
          <ProtectedRoute>
            <WheelEditorRoute />
          </ProtectedRoute>
        } />
        
        {/* 404 redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <CookieConsent />
        <ConfirmDialog />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
