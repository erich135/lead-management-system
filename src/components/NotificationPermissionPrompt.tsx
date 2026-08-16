import React from 'react';
import { Bell, BellOff, Settings, X } from 'lucide-react';

export type NotificationPermissionPromptMode = 'enable' | 'blocked';

interface NotificationPermissionPromptProps {
  /** enable = first-login Allow/Enable; blocked = permission previously denied */
  mode?: NotificationPermissionPromptMode;
  onAllow: () => void;
  onNotNow: () => void;
  busy?: boolean;
}

/**
 * First-login prompt asking the user to enable ARS CRM browser notifications.
 * When permission was previously denied, shows browser-settings instructions instead.
 */
export function NotificationPermissionPrompt({
  mode = 'enable',
  onAllow,
  onNotNow,
  busy = false,
}: NotificationPermissionPromptProps): React.ReactElement {
  const isBlocked = mode === 'blocked';

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ars-push-prompt-title"
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0969a9]/10 text-[#0969a9]">
              {isBlocked ? <Settings className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="ars-push-prompt-title" className="text-lg font-bold text-gray-900">
                {isBlocked
                  ? 'Enable notifications in browser settings'
                  : 'Enable Notifications'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {isBlocked
                  ? 'Notifications were blocked for this site. Allow them in your browser settings, then tap Try again.'
                  : 'Get alerts for new jobs, appointments, reminders, and approvals — even when you are away from this screen.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNotNow}
            disabled={busy}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {isBlocked ? (
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-gray-600">
              <li>Click the lock / tune icon in the address bar</li>
              <li>Open Site settings → Notifications</li>
              <li>Choose Allow for this site</li>
              <li>Return here and tap Try again</li>
            </ol>
          ) : (
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li>• Works on this device after you tap Enable</li>
              <li>• On your phone: Install ARS App → Enable Notifications</li>
              <li>• No SMS needed — free browser push on the installed app</li>
            </ul>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onNotNow}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <BellOff className="h-4 w-4" />
              Not now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAllow}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#0969a9] px-4 text-sm font-bold text-white hover:bg-[#075a91] disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              {busy ? 'Enabling…' : isBlocked ? 'Try again' : 'Enable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
