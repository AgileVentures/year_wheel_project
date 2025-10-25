/**
 * Network error detection and handling utilities
 * Helps identify SSL/TLS, corporate firewall, and connection issues
 */

/**
 * Detect if an error is related to SSL/TLS or corporate firewall
 */
export const isSSLError = (error) => {
  if (!error) return false;
  
  const message = error?.message?.toLowerCase() || '';
  const name = error?.name?.toLowerCase() || '';
  
  return (
    message.includes('ssl') ||
    message.includes('tls') ||
    message.includes('certificate') ||
    message.includes('fortinet') ||
    message.includes('zscaler') ||
    message.includes('firewall') ||
    message.includes('net::err_cert') ||
    message.includes('security') ||
    name.includes('certificateerror')
  );
};

/**
 * Detect if an error is a network/connection error
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  
  const message = error?.message?.toLowerCase() || '';
  const name = error?.name?.toLowerCase() || '';
  
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('cors') ||
    message.includes('timeout') ||
    message.includes('failed to fetch') ||
    name === 'networkerror' ||
    name === 'typeerror'
  );
};

/**
 * Get user-friendly error message based on error type
 */
export const getNetworkErrorMessage = (error) => {
  if (isSSLError(error)) {
    return {
      title: 'Network Security Issue',
      message: 'Your network security software (like Fortinet or Zscaler) is blocking secure connections. Please contact your IT administrator or try a different network.',
      type: 'ssl',
      severity: 'error',
    };
  }
  
  if (isNetworkError(error)) {
    return {
      title: 'Connection Issue',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      type: 'network',
      severity: 'warning',
    };
  }
  
  return {
    title: 'Error',
    message: error?.message || 'An unexpected error occurred',
    type: 'unknown',
    severity: 'error',
  };
};

/**
 * Enhanced fetch wrapper with better error handling
 */
export const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      // Add timeout to prevent hanging requests
      signal: options.signal || AbortSignal.timeout(30000), // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    // Enhance error with network detection
    if (isSSLError(error)) {
      error.isSSLError = true;
      error.userMessage = 'Network security software is blocking this connection. Contact your IT administrator.';
    } else if (isNetworkError(error)) {
      error.isNetworkError = true;
      error.userMessage = 'Connection failed. Check your internet connection and try again.';
    }
    
    throw error;
  }
};

/**
 * Retry logic for network requests with exponential backoff
 */
export const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry SSL errors (configuration issue, not transient)
      if (isSSLError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Check if browser is in offline mode
 */
export const isOffline = () => {
  return !navigator.onLine;
};

/**
 * Listen for online/offline events
 */
export const addConnectionListener = (callback) => {
  const handleOnline = () => callback({ online: true });
  const handleOffline = () => callback({ online: false });
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

/**
 * Display network status in console (for debugging)
 */
export const logNetworkInfo = () => {
  console.group('🌐 Network Information');
  console.log('Online:', navigator.onLine);
  console.log('Connection:', navigator.connection);
  console.log('User Agent:', navigator.userAgent);
  console.log('Location:', window.location.href);
  console.groupEnd();
};
