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
import { MobileRepAppGate } from './mobile-rep/MobileRepApp';
import { useIsMobile } from './hooks/useIsMobile';
import { isRepUser } from './mobile-rep/mobileRepUtils';
import { PwaInstallProvider } from './pwa/PwaInstallContext';

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
  const isMobile = useIsMobile();
  const hideChatForMobileRep = isMobile && isRepUser(user);
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
            <MobileRepAppGate>
              <Dashboard view="dashboard" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="leads" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/sales-leads" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="salesLeads" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="reports" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/diary" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="diary" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/machines" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="machines" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="admin" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/activities" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="activities" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/job-card-templates" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="jobCardTemplates" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/job-card-submissions" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="jobCardSubmissions" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/parts-ready" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="partsReady" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/tech-app" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="techApp" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/pending-machine-readings" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="pendingReadings" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        <Route path="/pending-sales-requests" element={
          <ProtectedRoute>
            <MobileRepAppGate>
              <Dashboard view="pendingSalesRequests" />
            </MobileRepAppGate>
          </ProtectedRoute>
        } />
        {/* Public QR scan landing — NO auth, NO PublicRoute redirect. */}
        <Route path="/scan/machine/:token" element={<MachineScanPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Chat widget — hidden on the dedicated mobile Representative shell */}
      {user && !hideChatForMobileRep && <ChatWidget />}

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
  return (
    <AuthProvider>
      <PwaInstallProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </PwaInstallProvider>
    </AuthProvider>
  );
}

export default App;

