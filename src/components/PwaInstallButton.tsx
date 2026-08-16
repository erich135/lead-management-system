import React from 'react';
import { Download } from 'lucide-react';
import { usePwaInstall } from '../pwa/PwaInstallContext';

interface PwaInstallButtonProps {
  /** Visual style without changing surrounding layouts. */
  variant?: 'primary' | 'menu' | 'login';
  className?: string;
}

/**
 * Install ARS App entry point for login, menus, and profile.
 * Hidden when already running from the Home Screen.
 */
const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({
  variant = 'primary',
  className = '',
}) => {
  const { isInstalled, installOrShowHelp, installing } = usePwaInstall();

  if (isInstalled) return null;

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={() => void installOrShowHelp()}
        disabled={installing}
        className={`w-full flex items-center gap-4 p-4 rounded-[8px] bg-gray-50 text-ars-heading hover:bg-gray-100 transition-all disabled:opacity-50 ${className}`}
      >
        <Download className="w-5 h-5 text-[#0969a9]" />
        <span className="font-medium">Install ARS App</span>
      </button>
    );
  }

  if (variant === 'login') {
    return (
      <button
        type="button"
        onClick={() => void installOrShowHelp()}
        disabled={installing}
        className={`mt-4 inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-[#0969a9]/30 bg-[#0969a9]/5 px-4 text-sm font-semibold text-[#0969a9] hover:bg-[#0969a9]/10 disabled:opacity-50 ${className}`}
      >
        <Download className="h-4 w-4" />
        {installing ? 'Installing…' : 'Install ARS App'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void installOrShowHelp()}
      disabled={installing}
      className={`inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-[#0969a9] px-4 text-sm font-bold text-white disabled:opacity-50 ${className}`}
    >
      <Download className="h-4 w-4" />
      {installing ? 'Installing…' : 'Install ARS App'}
    </button>
  );
};

export default PwaInstallButton;
