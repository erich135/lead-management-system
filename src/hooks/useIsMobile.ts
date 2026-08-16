import { useState, useEffect } from 'react';

/** Matches Tailwind `md` / mobile redesign breakpoint (screens below 768px). */
const MOBILE_MAX_WIDTH = 767;

/**
 * Detects narrow viewports for the mobile Representative shell.
 * Uses width ≤ 767px only so it matches CSS `@media (max-width: 767px)`.
 *
 * @returns True when the mobile experience should be used
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_MAX_WIDTH;
  });

  useEffect(() => {
    /**
     * Syncs mobile layout with the 768px redesign breakpoint.
     */
    function checkMobile() {
      setIsMobile(window.innerWidth <= MOBILE_MAX_WIDTH);
    }

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
