import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ErrorDisplay Component
 * 
 * Displays user-friendly error messages with expandable technical details
 * 
 * @param {string} message - User-friendly error message
 * @param {Error|string} error - Technical error object or message
 * @param {string} type - Error severity: 'error' | 'warning' | 'info'
 * @param {Function} onRetry - Optional retry callback
 * @param {Function} onDismiss - Optional dismiss callback
 * @param {boolean} dismissable - Can user dismiss the error?
 */
function ErrorDisplay({ 
  message, 
  error, 
  type = 'error',
  onRetry,
  onDismiss,
  dismissable = true,
  className = ''
}) {
  const { t } = useTranslation(['common']);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get error details
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const errorStack = error?.stack || '';
  const errorDetails = {
    message: errorMessage,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...(errorStack && { stack: errorStack })
  };

  // Color schemes based on type
  const colors = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      text: 'text-red-900',
      button: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-500',
      text: 'text-orange-900',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      text: 'text-blue-900',
      button: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const colorScheme = colors[type] || colors.error;

  const handleCopyError = async () => {
    const errorText = JSON.stringify(errorDetails, null, 2);
    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div className={`${colorScheme.bg} ${colorScheme.border} border rounded-sm p-4 ${className}`}>
      {/* Main Error Message */}
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`${colorScheme.text} font-medium mb-1`}>
            {message || t('common:errors.genericError', 'Något gick fel')}
          </p>
          <p className={`${colorScheme.text} text-sm opacity-80`}>
            {errorMessage}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`px-3 py-1 text-sm text-white ${colorScheme.button} rounded-sm transition-colors`}
            >
              {t('common:actions.retry', 'Försök igen')}
            </button>
          )}
          {dismissable && onDismiss && (
            <button
              onClick={onDismiss}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded-sm transition-colors"
            >
              {t('common:actions.dismiss', 'Stäng')}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Technical Details */}
      {error && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-2 text-sm ${colorScheme.text} hover:underline w-full text-left`}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>
              {expanded 
                ? t('common:errors.hideDetails', 'Dölj tekniska detaljer') 
                : t('common:errors.showDetails', 'Visa tekniska detaljer')}
            </span>
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {/* Error Details */}
              <div className="bg-white bg-opacity-60 border border-gray-300 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">
                    {t('common:errors.errorDetails', 'Feldetaljer')}
                  </span>
                  <button
                    onClick={handleCopyError}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-green-600">{t('common:actions.copied', 'Kopierat!')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t('common:actions.copy', 'Kopiera')}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </div>

              {/* Help Text */}
              <p className="text-xs text-gray-600">
                {t('common:errors.helpText', 'Om problemet kvarstår, kopiera feldetaljerna och kontakta support på')}
                {' '}
                <a 
                  href="mailto:hey@communitaslabs.io" 
                  className="text-blue-600 hover:underline"
                >
                  hey@communitaslabs.io
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ErrorDisplay;
