import React from 'react';
import { X } from 'lucide-react';
// import { NotificationSettingsPanel } from './NotificationSettingsPanel'; // notifications disabled
import { useAuth } from '../contexts/AuthContext';

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Profile > Settings modal with notification controls.
 */
export function ProfileSettingsModal({
  open,
  onClose,
}: ProfileSettingsModalProps): React.ReactElement | null {
  const { user } = useAuth();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id="profile-settings-title" className="text-lg font-bold text-gray-900">
              Profile › Settings
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {user?.fullName || 'User'} · {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Notifications panel — commented out (re-enable when needed) */}
          {/* <NotificationSettingsPanel /> */}
          <p className="text-sm text-gray-500">
            Notification settings are temporarily disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
