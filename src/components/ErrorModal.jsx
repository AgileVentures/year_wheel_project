import { X } from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';

/**
 * ErrorModal Component
 * 
 * Modal wrapper for ErrorDisplay - shows errors in a prominent modal dialog
 * 
 * @param {string} title - Modal title
 * @param {string} message - User-friendly error message
 * @param {Error|string} error - Technical error details
 * @param {string} type - Error type: 'error' | 'warning' | 'info'
 * @param {Function} onClose - Close callback
 * @param {Function} onRetry - Optional retry callback
 * @param {boolean} open - Modal visibility
 */
function ErrorModal({ 
  title = 'Ett fel uppstod',
  message, 
  error, 
  type = 'error',
  onClose,
  onRetry,
  open = false
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <ErrorDisplay
            message={message}
            error={error}
            type={type}
            onRetry={onRetry}
            onDismiss={onClose}
            dismissable={false}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors font-medium"
            >
              Försök igen
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors font-medium"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorModal;
