import React from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePwaInstall } from '../pwa/PwaInstallContext';
import { isRepUser } from './mobileRepUtils';

/**
 * Install ARS App strip for Representatives on the Diary / Planner screen.
 * Hidden once the app is installed (standalone Home Screen mode).
 */
const RepInstallAppDiaryBanner: React.FC = () => {
  const { user } = useAuth();
  const { isInstalled, installOrShowHelp, installing, canPromptInstall, platform } =
    usePwaInstall();

  if (!user || !isRepUser(user) || isInstalled) {
    return null;
  }

  return (
    <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#0969a9]/25 bg-[#0969a9]/5 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Install ARS App</p>
        <p className="text-xs text-gray-600">
          Add to Home Screen for phone alerts when you are in another app.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void installOrShowHelp()}
        disabled={installing}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0969a9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#085a91] disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {installing
          ? 'Installing…'
          : canPromptInstall || platform !== 'ios'
            ? 'Install'
            : 'Install'}
      </button>
    </div>
  );
};

export default RepInstallAppDiaryBanner;
