import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCastManager } from '../hooks/useCastManager';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import QRCastModal from './QRCastModal';

/**
 * Cast button component with google-cast-launcher for Android
 * and QR code modal fallback for iOS
 * Only visible on mobile/tablet devices
 */
export default function CastButton({ wheelData, realtimeCast, onCastStart, onCastStop }) {
  const { t } = useTranslation(['common']);
  const { isMobile, isTablet, isIOS, supportsCast } = useDeviceDetection();
  const { isCasting, isInitializing, error, startCast, stopCast } = useCastManager();
  const [showError, setShowError] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  
  // Unpack realtime cast hook
  const { 
    isConnected: isRealtimeConnected,
    startSession: startRealtimeSession,
    stopSession: stopRealtimeSession,
    error: realtimeError
  } = realtimeCast || {};

  // Show error briefly then hide
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Notify parent of cast state changes (both Android and iOS)
  useEffect(() => {
    const isActive = isCasting || isRealtimeConnected;
    if (isActive && onCastStart) {
      onCastStart();
    } else if (!isActive && onCastStop) {
      onCastStop();
    }
  }, [isCasting, isRealtimeConnected, onCastStart, onCastStop]);

  // Hide button if not on mobile/tablet
  if (!isMobile && !isTablet) return null;

  const handleCastToggle = async () => {
    // iOS fallback: show QR code modal and start Realtime session
    if (isIOS || !supportsCast) {
      if (showQRModal || isRealtimeConnected) {
        // Stop casting
        setShowQRModal(false);
        setSessionToken(null);
        if (stopRealtimeSession) {
          stopRealtimeSession();
        }
      } else {
        // Start casting
        // Generate unique session token
        const token = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setSessionToken(token);
        setShowQRModal(true);
        
        // Start Realtime session
        if (startRealtimeSession) {
          startRealtimeSession(token, wheelData);
        }
      }
      return;
    }

    // Android: use Cast SDK
    if (isCasting) {
      stopCast();
    } else {
      await startCast(wheelData);
    }
  };

  return (
    <>
      <div className="relative">
        {/* iOS: Custom cast button */}
        {(isIOS || !supportsCast) && (
          <button
            onClick={handleCastToggle}
            className={`
              w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
              ${showQRModal ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}
              ${isInitializing ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105'}
            `}
            aria-label={showQRModal ? t('common:cast.closeQR') : t('common:cast.castToScreen')}
          >
            <Smartphone size={24} />
            
            {/* Active indicator */}
            {showQRModal && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
              </span>
            )}
          </button>
        )}

        {/* Android: Google Cast launcher (native button) */}
        {!isIOS && supportsCast && (
          <google-cast-launcher
          onClick={handleCastToggle}
          className={`
            transition-all duration-200
            ${isCasting ? 'text-blue-500' : 'text-gray-600'}
            ${isInitializing ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-110'}
          `}
            style={{
              width: '56px',
              height: '56px',
              display: 'block',
            }}
          />
        )}
        
        {/* Casting indicator (pulsing dot) - Android only */}
        {!isIOS && supportsCast && isCasting && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
          </span>
        )}
        
        {/* Initializing spinner - Android only */}
        {!isIOS && supportsCast && isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-full">
            <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Error message */}
      {showError && error && (
        <div className="absolute bottom-full mb-2 right-0 bg-red-500 text-white text-sm px-3 py-2 rounded shadow-lg whitespace-nowrap max-w-xs">
          {error}
        </div>
      )}

      {/* Tooltip - iOS */}
      {(isIOS || !supportsCast) && !showQRModal && (
        <div className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {t('common:cast.castToScreen')}
        </div>
      )}

      {/* Tooltip - Android */}
      {!isIOS && supportsCast && !isCasting && !isInitializing && (
        <div className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {t('common:cast.castToScreen')}
        </div>
      )}
      {!isIOS && supportsCast && isCasting && (
        <div className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {t('common:cast.castingClickToStop')}
        </div>
      )}

      {/* QR Code Modal - iOS fallback */}
      <QRCastModal
        isOpen={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setSessionToken(null);
        }}
        sessionToken={sessionToken}
        wheelData={wheelData}
      />
    </>
  );
}
