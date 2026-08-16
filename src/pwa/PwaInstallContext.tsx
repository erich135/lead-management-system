import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getInstallPlatform,
  isIosDevice,
  isStandaloneDisplay,
  markInstallPopupDismissed,
  wasInstallPopupDismissed,
  type BeforeInstallPromptEvent,
  type InstallPlatform,
} from './pwaInstallHelpers';

interface PwaInstallContextValue {
  /** True when already launched from Home Screen. */
  isInstalled: boolean;
  /** True when Chrome/Edge can show the native install dialog. */
  canPromptInstall: boolean;
  /** Platform used for step-by-step help. */
  platform: InstallPlatform;
  /** Whether the one-time bottom popup banner is visible. */
  bannerVisible: boolean;
  /** Whether the step-by-step help sheet is open. */
  helpOpen: boolean;
  /** Opens native install when available, otherwise the help sheet. */
  installOrShowHelp: () => Promise<void>;
  /** Opens the manual Add to Home Screen instructions. */
  openHelp: () => void;
  /** Closes the help sheet. */
  closeHelp: () => void;
  /** Permanently dismisses the one-time popup (Rep top bar remains until installed). */
  dismissBanner: () => void;
  installing: boolean;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

/**
 * Captures browser install events once and shares them with banners + buttons.
 */
export function PwaInstallProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [bannerVisible, setBannerVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const platform = useMemo(() => getInstallPlatform(), []);
  const ios = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setIsInstalled(true);
      return;
    }

    /**
     * Stores the deferred Chrome/Edge install prompt.
     */
    function onBeforeInstallPrompt(event: Event): void {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!wasInstallPopupDismissed()) {
        setBannerVisible(true);
      }
    }

    /**
     * Marks the site as installed after a successful Home Screen add.
     */
    function onAppInstalled(): void {
      setIsInstalled(true);
      setBannerVisible(false);
      setHelpOpen(false);
      setDeferredPrompt(null);
      markInstallPopupDismissed();
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // One-time soft popup shortly after load (only if never cancelled).
    let timer: number | undefined;
    if (!wasInstallPopupDismissed()) {
      timer = window.setTimeout(() => {
        if (!isStandaloneDisplay()) {
          setBannerVisible(true);
        }
      }, ios ? 1500 : 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, [ios]);

  /**
   * Opens the browser install dialog when available.
   */
  const promptNativeInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setBannerVisible(false);
        setHelpOpen(false);
        markInstallPopupDismissed();
        return true;
      }
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  /**
   * One-tap entry: native install if possible, otherwise simple instructions.
   */
  const installOrShowHelp = useCallback(async (): Promise<void> => {
    if (isInstalled) return;
    if (deferredPrompt) {
      const accepted = await promptNativeInstall();
      if (!accepted) setHelpOpen(true);
      return;
    }
    setHelpOpen(true);
  }, [deferredPrompt, isInstalled, promptNativeInstall]);

  /**
   * Permanently hides the one-time popup after Cancel — top Rep install stays until installed.
   */
  const dismissBanner = useCallback((): void => {
    setBannerVisible(false);
    markInstallPopupDismissed();
  }, []);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      isInstalled,
      canPromptInstall: Boolean(deferredPrompt),
      platform,
      bannerVisible: bannerVisible && !isInstalled,
      helpOpen,
      installOrShowHelp,
      openHelp: () => setHelpOpen(true),
      closeHelp: () => setHelpOpen(false),
      dismissBanner,
      installing,
    }),
    [
      bannerVisible,
      deferredPrompt,
      dismissBanner,
      helpOpen,
      installOrShowHelp,
      installing,
      isInstalled,
      platform,
    ],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

/**
 * Access the shared Install ARS App helpers.
 */
export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider');
  }
  return ctx;
}
