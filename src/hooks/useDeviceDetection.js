import { useState, useEffect } from 'react';

/**
 * Hook to detect device type and Cast SDK availability
 * @returns {Object} Device information
 * @returns {boolean} isMobile - Phone (not tablet)
 * @returns {boolean} isTablet - Tablet device
 * @returns {boolean} isIOS - iOS device (iPhone/iPad)
 * @returns {boolean} isAndroid - Android device
 * @returns {boolean} supportsCast - Chrome Cast SDK available
 */
export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isIOS: false,
    isAndroid: false,
    supportsCast: false,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    
    // Detect Android
    const isAndroid = /android/i.test(userAgent);
    
    // Detect mobile vs tablet
    // Mobile: phones with "Mobile" in user agent
    // Tablet: iPad or Android without "Mobile"
    const isMobile = /iPhone|iPod|Android.*Mobile/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    
    // Check if Chrome Cast SDK is available
    const checkCastSDK = () => {
      const supportsCast = typeof window.chrome !== 'undefined' && 
                          typeof window.chrome.cast !== 'undefined';
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isIOS,
        isAndroid,
        supportsCast,
      });
    };

    // Initial check
    checkCastSDK();

    // Listen for Cast SDK load event
    window['__onGCastApiAvailable'] = (isAvailable) => {
      if (isAvailable) {
        checkCastSDK();
      }
    };

    // Fallback: check again after 2 seconds
    const timer = setTimeout(checkCastSDK, 2000);

    return () => clearTimeout(timer);
  }, []);

  return deviceInfo;
}
