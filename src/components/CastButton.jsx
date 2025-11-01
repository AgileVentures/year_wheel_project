import { useState, useEffect } from 'react';
import { useCastManager } from '../hooks/useCastManager';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

/**
 * Cast button component with google-cast-launcher
 * Only visible on mobile/tablet devices with Cast support
 */
export default function CastButton({ wheelData, onCastStart, onCastStop }) {
  const { isMobile, isTablet, supportsCast } = useDeviceDetection();
  const { isCasting, isInitializing, error, startCast, stopCast } = useCastManager();
  const [showError, setShowError] = useState(false);

  // Show error briefly then hide
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Notify parent of cast state changes
  useEffect(() => {
    if (isCasting && onCastStart) {
      onCastStart();
    } else if (!isCasting && onCastStop) {
      onCastStop();
    }
  }, [isCasting, onCastStart, onCastStop]);

  // Hide button if not on mobile/tablet or Cast not supported
  if (!isMobile && !isTablet) return null;
  if (!supportsCast) return null;

  const handleCastToggle = async () => {
    if (isCasting) {
      stopCast();
    } else {
      await startCast(wheelData);
    }
  };

  return (
    <div className="relative">
      {/* Cast button wrapper */}
      <div className="relative">
        {/* Google Cast launcher (native button) */}
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
        
        {/* Casting indicator (pulsing dot) */}
        {isCasting && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
          </span>
        )}
        
        {/* Initializing spinner */}
        {isInitializing && (
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

      {/* Tooltip */}
      {!isCasting && !isInitializing && (
        <div className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Casta till skärm
        </div>
      )}
      {isCasting && (
        <div className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Castar • Klicka för att stoppa
        </div>
      )}
    </div>
  );
}
