/**
 * Detect corporate network and Netlify-specific SSL issues
 */

/**
 * Check if user is likely on a corporate network with SSL inspection
 */
export const detectCorporateNetwork = () => {
  const indicators = {
    isCorporate: false,
    reasons: [],
  };

  // Check if we're on Netlify (yearwheel.se or *.netlify.app)
  const isNetlify = 
    window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('yearwheel.se');

  if (!isNetlify) {
    return indicators;
  }

  // Check for corporate network indicators
  
  // 1. Check for proxy in user agent
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('corporate') || ua.includes('enterprise')) {
    indicators.isCorporate = true;
    indicators.reasons.push('Corporate user agent detected');
  }

  // 2. Check connection info (if available)
  if (navigator.connection) {
    const conn = navigator.connection;
    // Corporate networks often report as ethernet or unknown
    if (conn.effectiveType && conn.effectiveType === '4g' && conn.type === 'ethernet') {
      indicators.isCorporate = true;
      indicators.reasons.push('Wired network with mobile-like characteristics');
    }
  }

  // 3. Check if we're in a private IP range (common for corporate networks)
  // This requires a fetch to an external service
  checkPrivateIP().then(isPrivate => {
    if (isPrivate) {
      indicators.isCorporate = true;
      indicators.reasons.push('Private IP address detected');
    }
  });

  // 4. Check DNS resolution time (corporate networks often have slower DNS)
  const dnsStart = performance.now();
  fetch('https://dns.google/resolve?name=' + window.location.hostname)
    .then(() => {
      const dnsTime = performance.now() - dnsStart;
      if (dnsTime > 500) { // >500ms DNS resolution suggests proxy
        indicators.isCorporate = true;
        indicators.reasons.push('Slow DNS resolution (likely proxy)');
      }
    })
    .catch(() => {
      // DNS blocked might indicate corporate firewall
      indicators.isCorporate = true;
      indicators.reasons.push('DNS resolution blocked');
    });

  // 5. Check for common corporate domain patterns in hostname
  const corporateDomains = ['.local', '.corp', '.internal', '.intranet'];
  if (corporateDomains.some(domain => window.location.hostname.includes(domain))) {
    indicators.isCorporate = true;
    indicators.reasons.push('Corporate domain pattern detected');
  }

  return indicators;
};

/**
 * Check if client has a private IP (corporate network indicator)
 */
const checkPrivateIP = async () => {
  try {
    // Use WebRTC to get local IP
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve(false);
          return;
        }
        
        const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
        if (ipMatch) {
          const ip = ipMatch[1];
          // Check if it's a private IP
          const isPrivate = 
            ip.startsWith('10.') ||
            ip.startsWith('172.') ||
            ip.startsWith('192.168.') ||
            ip === '127.0.0.1';
          
          pc.close();
          resolve(isPrivate);
        }
      };
      
      // Timeout after 2 seconds
      setTimeout(() => {
        pc.close();
        resolve(false);
      }, 2000);
    });
  } catch (error) {
    return false;
  }
};

/**
 * Test if current connection has SSL issues
 */
export const testNetlifySSL = async () => {
  try {
    // Try to fetch from Netlify's known endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://' + window.location.hostname + '/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });
    
    clearTimeout(timeout);
    
    return {
      success: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isSSLError: error.message.includes('certificate') || 
                  error.message.includes('SSL') ||
                  error.message.includes('TLS'),
    };
  }
};

/**
 * Get Netlify-specific troubleshooting info
 */
export const getNetlifyTroubleshootingInfo = () => {
  return {
    hostname: window.location.hostname,
    isNetlify: window.location.hostname.includes('netlify.app') || 
               window.location.hostname.includes('yearwheel.se'),
    protocol: window.location.protocol,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    onLine: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    // Helpful for diagnosing SSL issues
    securityInfo: {
      isSecureContext: window.isSecureContext,
      crossOriginIsolated: window.crossOriginIsolated,
    }
  };
};

/**
 * Show warning banner for users on corporate networks
 */
export const showCorporateNetworkWarning = () => {
  const warning = document.createElement('div');
  warning.id = 'corporate-network-warning';
  warning.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
    color: white;
    padding: 12px 20px;
    text-align: center;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease-out;
  `;
  
  warning.innerHTML = `
    <style>
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
    </style>
    <strong>⚠️ Corporate Network Detected</strong> - 
    If you experience connection issues, please contact your IT department about SSL inspection settings.
    <button onclick="this.parentElement.remove()" style="
      background: white;
      color: #FF6B6B;
      border: none;
      padding: 4px 12px;
      margin-left: 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    ">Got it</button>
  `;
  
  document.body.insertBefore(warning, document.body.firstChild);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    warning.remove();
  }, 10000);
};

/**
 * Initialize corporate network detection
 */
export const initCorporateNetworkDetection = () => {
  const detected = detectCorporateNetwork();
  
  if (detected.isCorporate) {
    console.warn('Corporate network detected:', detected.reasons);
    // Only show warning if we detect SSL issues
    testNetlifySSL().then(result => {
      if (!result.success && result.isSSLError) {
        showCorporateNetworkWarning();
      }
    });
  }
  
  return detected;
};
