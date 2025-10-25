/* eslint-disable react/prop-types */
import { AlertCircle, Wifi, WifiOff, Shield } from 'lucide-react';
import { isSSLError, isNetworkError } from '../utils/networkErrors';

/**
 * NetworkErrorMessage Component
 * 
 * Displays user-friendly error messages for network issues
 * Use this instead of generic error messages for API failures
 */
function NetworkErrorMessage({ error, onRetry, className = '' }) {
  if (!error) return null;

  const isSSL = isSSLError(error);
  const isNetwork = isNetworkError(error);

  // SSL/Corporate Firewall Error
  if (isSSL) {
    return (
      <div className={`bg-orange-50 border-l-4 border-orange-400 p-4 ${className}`}>
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Network Security Issue
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p className="mb-2">
                Your network's security software is blocking this connection. This is common in corporate environments.
              </p>
              <p className="font-medium">What to do:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Contact your IT administrator</li>
                <li>Try a different network (home or mobile hotspot)</li>
                <li>Ask IT to whitelist <span className="font-mono text-xs">{window.location.hostname}</span></li>
              </ul>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 text-sm font-medium text-orange-800 hover:text-orange-900 underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Generic Network Error
  if (isNetwork) {
    return (
      <div className={`bg-blue-50 border-l-4 border-blue-400 p-4 ${className}`}>
        <div className="flex items-start">
          <WifiOff className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              Connection Issue
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Unable to connect to the server. Please check your internet connection.</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Generic Error
  return (
    <div className={`bg-red-50 border-l-4 border-red-400 p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error?.message || 'An unexpected error occurred'}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetworkErrorMessage;
