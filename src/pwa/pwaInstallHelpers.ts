/**
 * Shared helpers for the website “Install ARS App” / Add to Home Screen flow.
 * Remains a Progressive Web App — not a native store application.
 */

/** Permanent dismiss for the one-time Install popup (Cancel / Not now). */
export const PWA_POPUP_DISMISS_KEY = 'ars-pwa-install-popup-dismissed-v2';

/** @deprecated Kept so older session keys can be cleaned up. */
export const PWA_DISMISS_KEY = 'ars-pwa-install-dismissed-session';
export const PWA_DISMISS_KEY_LEGACY = 'ars-pwa-install-dismissed-v1';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Detects iOS / iPadOS Safari (no beforeinstallprompt support).
 */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

/**
 * Detects Android browsers (for manual install steps when needed).
 */
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || '');
}

/**
 * Returns true when ARS is already running from the Home Screen (standalone).
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media || fullscreen || iosStandalone;
}

export type InstallPlatform = 'ios' | 'android' | 'desktop';

/**
 * Resolves which simple instruction set to show.
 */
export function getInstallPlatform(): InstallPlatform {
  if (isIosDevice()) return 'ios';
  if (isAndroidDevice()) return 'android';
  return 'desktop';
}

/**
 * Returns true when the one-time Install popup was cancelled permanently.
 */
export function wasInstallPopupDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_POPUP_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Permanently hides the one-time Install popup after Cancel / Not now.
 */
export function markInstallPopupDismissed(): void {
  try {
    localStorage.setItem(PWA_POPUP_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}
