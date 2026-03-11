import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { SetPasswordPage } from './components/SetPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { Dashboard } from './components/Dashboard';
import { ChatWidget } from './components/ChatWidget';
import { AutoLocationTracker } from './components/AutoLocationTracker';

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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Chat widget - only show when logged in */}
      {user && <ChatWidget />}

      {/* Auto-start GPS tracking for enabled users */}
      {user && <AutoLocationTracker />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

