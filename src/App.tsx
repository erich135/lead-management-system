import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { SetPasswordPage } from './components/SetPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Dashboard } from './components/Dashboard';
import { ChatWidget } from './components/ChatWidget';
// import { AutoLocationTracker } from './components/AutoLocationTracker'; // disabled
import { MachineScanPage } from './components/MachineScanPage';
import PwaInstallPrompt from './components/PwaInstallPrompt';
// Push / appointment reminder UI — commented out (re-enable when needed)
// import { PushNotificationBootstrap } from './components/PushNotificationBootstrap';
// import AppointmentReminderToastHost from './components/AppointmentReminderToastHost';
import { PwaInstallProvider } from './pwa/PwaInstallContext';
// Bouwa module — Super-Admin gated route
import { BouwaModuleShell } from './features/bouwa/pages/BouwaModuleShell';
import { BouwaRouteGuard } from './features/bouwa/components/BouwaRouteGuard';
import { BouwaLoggerLocalApp } from './features/bouwa/pages/BouwaLoggerLocalApp';
import { BouwaPilotAccessProvider } from './features/bouwa/BouwaPilotAccessContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function SetPasswordRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow access to set-password page even if user is logged in (in case they need to reset)
  return <>{children}</>;
}

function AppContent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /**
   * Handles Service Worker "Open Appointment" clicks when a tab is already open.
   */
  useEffect(() => {
    /**
     * Routes to the URL embedded in a push notification click.
     */
    function onSwMessage(event: MessageEvent): void {
      const data = event.data;
      if (!data || data.type !== 'ARS_OPEN_URL' || typeof data.url !== 'string') return;
      try {
        const path = new URL(data.url, window.location.origin);
        navigate(`${path.pathname}${path.search}${path.hash}`);
      } catch {
        navigate(data.url);
      }
    }

    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onSwMessage);
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/set-password" element={
          <SetPasswordRoute>
            <SetPasswordPage />
          </SetPasswordRoute>
        } />
        <Route path="/reset-password" element={
          <SetPasswordRoute>
            <ResetPasswordPage />
          </SetPasswordRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard view="dashboard" />
          </ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute>
            <Dashboard view="leads" />
          </ProtectedRoute>
        } />
        <Route path="/sales-leads" element={
          <ProtectedRoute>
            <Dashboard view="salesLeads" />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <Dashboard view="reports" />
          </ProtectedRoute>
        } />
        <Route path="/diary" element={
          <ProtectedRoute>
            <Dashboard view="diary" />
          </ProtectedRoute>
        } />
        <Route path="/machines" element={
          <ProtectedRoute>
            <Dashboard view="machines" />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Dashboard view="admin" />
          </ProtectedRoute>
        } />
        <Route path="/activities" element={
          <ProtectedRoute>
            <Dashboard view="activities" />
          </ProtectedRoute>
        } />
        <Route path="/job-card-templates" element={
          <ProtectedRoute>
            <Dashboard view="jobCardTemplates" />
          </ProtectedRoute>
        } />
        <Route path="/job-card-submissions" element={
          <ProtectedRoute>
            <Dashboard view="jobCardSubmissions" />
          </ProtectedRoute>
        } />
        <Route path="/parts-ready" element={
          <ProtectedRoute>
            <Dashboard view="partsReady" />
          </ProtectedRoute>
        } />
        <Route path="/tech-app" element={
          <ProtectedRoute>
            <Dashboard view="techApp" />
          </ProtectedRoute>
        } />
        <Route path="/pending-machine-readings" element={
          <ProtectedRoute>
            <Dashboard view="pendingReadings" />
          </ProtectedRoute>
        } />
        <Route path="/pending-sales-requests" element={
          <ProtectedRoute>
            <Dashboard view="pendingSalesRequests" />
          </ProtectedRoute>
        } />
        {/* Hidden Bouwa route — authenticated + permission-gated.
            Wildcard because a proposal and its preview are addressable: a rep
            who refreshes on a preview must land back on that preview. */}
        <Route path="/bouwa/*" element={
          <ProtectedRoute>
            <BouwaRouteGuard>
              <BouwaModuleShell />
            </BouwaRouteGuard>
          </ProtectedRoute>
        } />
        {/* Public QR scan landing — NO auth, NO PublicRoute redirect. */}
        <Route path="/scan/machine/:token" element={<MachineScanPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {user && <ChatWidget />}

      {/* Auto-start GPS tracking for enabled users */}
      {/* AutoLocationTracker disabled — re-enable when location tracking is needed */}
      {/* {user && <AutoLocationTracker />} */}

      <PwaInstallPrompt />
      {/* Push notifications + in-app appointment reminder toasts — disabled for now */}
      {/* <PushNotificationBootstrap /> */}
      {/* {user && <AppointmentReminderToastHost />} */}
    </>
  );
}

function App() {
  if (import.meta.env.DEV && window.location.pathname === '/bouwa/logger-analysis-local') {
    return (
      <BrowserRouter>
        <BouwaLoggerLocalApp />
      </BrowserRouter>
    );
  }

  return (
    <AuthProvider>
      <BouwaPilotAccessProvider>
        <PwaInstallProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </PwaInstallProvider>
      </BouwaPilotAccessProvider>
    </AuthProvider>
  );
}

export default App;

