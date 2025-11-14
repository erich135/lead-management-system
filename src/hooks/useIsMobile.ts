import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the user is on a mobile device.
 * Checks both screen width and user agent for accurate detection.
 * 
 * @returns {boolean} True if on mobile device
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    /**
     * Checks if device is mobile based on screen width and user agent.
     */
    function checkMobile() {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent || navigator.vendor;
      
      // Check screen width (mobile breakpoint)
      const isSmallScreen = width < 768;
      
      // Check user agent for mobile devices
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      
      setIsMobile(isSmallScreen || isMobileUserAgent);
    }

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}


