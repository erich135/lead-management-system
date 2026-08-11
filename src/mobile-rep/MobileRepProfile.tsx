import React, { useState } from 'react';
import { LogOut, MapPin, Phone, Settings, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PwaInstallButton from '../components/PwaInstallButton';
// import { NotificationSettingsPanel } from '../components/NotificationSettingsPanel'; // notifications disabled

/**
 * Simple Representative profile / account screen for the mobile field app.
 */
const MobileRepProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  /**
   * Signs the representative out of the app.
   */
  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mobile-rep-rise space-y-4 px-4 pb-4 pt-4">
      <header>
        <h1 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-0.5 text-sm font-medium text-slate-500">Your field account</p>
      </header>

      <section className="mobile-rep-card rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0969a9] to-[#064e7a] text-lg font-extrabold text-white shadow-md">
            {(user?.firstName?.[0] || user?.fullName?.[0] || 'R').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold text-slate-900">
              {user?.fullName || 'Representative'}
            </p>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 text-[#0969a9]/70" />
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Role</dt>
              <dd className="font-semibold text-slate-900">{user?.role?.name || 'Rep'}</dd>
            </div>
          </div>
          {user?.repCode && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-[#0969a9]/70" />
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Rep Code</dt>
                <dd className="font-semibold text-slate-900">{user.repCode.code || '—'}</dd>
              </div>
            </div>
          )}
          {user?.cellPhone && (
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-[#0969a9]/70" />
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Phone</dt>
                <dd className="font-semibold text-slate-900">{user.cellPhone}</dd>
              </div>
            </div>
          )}
        </dl>
      </section>

      <button
        type="button"
        onClick={() => setShowSettings((current) => !current)}
        className="mobile-rep-action mobile-rep-card inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-slate-800"
      >
        <Settings className="h-4 w-4 text-[#0969a9]" />
        {showSettings ? 'Hide Settings' : 'Settings'}
      </button>

      {showSettings && (
        <div className="space-y-3">
          {/* Push notifications — commented out (re-enable when needed) */}
          {/*
          <p className="rounded-2xl border border-sky-100 bg-sky-50/90 px-3.5 py-2.5 text-xs leading-relaxed text-sky-950">
            To get background notifications on this phone: open the app via an{' '}
            <strong>https://</strong> ngrok link (not http://192.168…), then Enable Notifications
            below. While the app is open, in-app alerts still work on HTTP.
          </p>
          <NotificationSettingsPanel />
          */}
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-700">
            Notification settings are temporarily disabled.
          </p>
        </div>
      )}

      <PwaInstallButton variant="primary" />

      <button
        type="button"
        disabled={signingOut}
        onClick={() => void handleSignOut()}
        className="mobile-rep-action inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white/90 text-sm font-bold text-rose-700 shadow-sm disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {signingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
};

export default MobileRepProfile;
