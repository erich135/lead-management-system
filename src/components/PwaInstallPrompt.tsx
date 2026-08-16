import React from 'react';
import { Download, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePwaInstall } from '../pwa/PwaInstallContext';
import { isRepUser } from '../mobile-rep/mobileRepUtils';
import PwaInstallHelpSheet from './PwaInstallHelpSheet';

/**
 * One-time bottom Install popup for Representatives only.
 * Cancel / Not now hides it permanently; the Rep top Install control remains until installed.
 */
const PwaInstallPrompt: React.FC = () => {
  const { user } = useAuth();
  const {
    bannerVisible,
    dismissBanner,
    installOrShowHelp,
    installing,
    canPromptInstall,
    platform,
    isInstalled,
  } = usePwaInstall();

  const showBanner = Boolean(user && isRepUser(user) && bannerVisible && !isInstalled);

  return (
    <>
      {showBanner && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-start gap-3 px-3 py-3">
              <img
                src="/icon-192.png"
                alt="ARS"
                className="mt-0.5 h-11 w-11 shrink-0 rounded-lg border border-gray-100 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">Install ARS App</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Add ARS to your Home Screen for full-screen access and phone notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissBanner}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 border-t border-gray-100 px-3 py-2.5">
              <button
                type="button"
                onClick={dismissBanner}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void installOrShowHelp()}
                disabled={installing}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0969a9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#085a91] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {installing
                  ? 'Installing…'
                  : canPromptInstall
                    ? 'Install ARS App'
                    : platform === 'ios'
                      ? 'Show steps'
                      : 'Install ARS App'}
              </button>
            </div>
          </div>
        </div>
      )}
      <PwaInstallHelpSheet />
    </>
  );
};

export default PwaInstallPrompt;
