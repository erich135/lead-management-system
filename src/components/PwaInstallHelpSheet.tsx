import React from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePwaInstall } from '../pwa/PwaInstallContext';
import type { InstallPlatform } from '../pwa/pwaInstallHelpers';

/**
 * Returns numbered steps for Add to Home Screen by platform.
 */
function getSteps(platform: InstallPlatform): string[] {
  if (platform === 'ios') {
    return [
      'Tap the Share button at the bottom of Safari (square with an arrow).',
      'Scroll and tap Add to Home Screen.',
      'Tap Add — the ARS icon will appear on your Home Screen.',
      'Open ARS from the Home Screen icon (full screen, no browser bar).',
    ];
  }
  if (platform === 'android') {
    return [
      'Tap the menu (⋮) in Chrome or Edge.',
      'Tap Install app or Add to Home screen.',
      'Confirm Install / Add.',
      'Open ARS from your Home Screen icon (full screen).',
    ];
  }
  return [
    'Open this site in Chrome or Edge on your phone.',
    'Use the browser menu → Install app / Add to Home screen.',
    'Confirm, then open ARS from the new Home Screen icon.',
  ];
}

/**
 * Simple step-by-step Install ARS App help for non-technical users.
 */
export const PwaInstallHelpSheet: React.FC = () => {
  const { helpOpen, closeHelp, platform, canPromptInstall, installOrShowHelp, installing } =
    usePwaInstall();

  if (!helpOpen) return null;

  const steps = getSteps(platform);

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={closeHelp} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex items-start gap-3">
            <img
              src="/icon-192.png"
              alt="ARS"
              className="h-11 w-11 rounded-lg border border-gray-100 object-cover"
            />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Install ARS App</h2>
              <p className="mt-0.5 text-sm text-gray-600">
                Takes under a minute. No app store needed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeHelp}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-3 px-4 py-4">
          {canPromptInstall && (
            <button
              type="button"
              disabled={installing}
              onClick={() => void installOrShowHelp()}
              className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-[#0969a9] px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {installing ? 'Installing…' : 'Install ARS App'}
            </button>
          )}

          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-gray-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0969a9] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="pt-1 leading-snug">
                  {platform === 'ios' && index === 0 ? (
                    <>
                      Tap the <Share className="inline h-3.5 w-3.5" /> Share button at the bottom of
                      Safari.
                    </>
                  ) : (
                    step
                  )}
                </span>
              </li>
            ))}
          </ol>

          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            After install, always open ARS from the Home Screen icon for the best experience.
          </p>
        </div>

        <footer className="border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={closeHelp}
            className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-gray-200 text-sm font-semibold text-gray-700"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PwaInstallHelpSheet;
