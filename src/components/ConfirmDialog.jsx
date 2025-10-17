import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * ConfirmDialog Component
 * 
 * A reusable confirmation dialog that replaces window.confirm()
 * Usage: Dispatch a 'showConfirmDialog' custom event with options
 * 
 * @example
 * const confirmed = await new Promise((resolve) => {
 *   const event = new CustomEvent('showConfirmDialog', {
 *     detail: {
 *       title: 'Confirm Action',
 *       message: 'Are you sure?',
 *       confirmText: 'Yes',
 *       cancelText: 'No',
 *       onConfirm: () => resolve(true),
 *       onCancel: () => resolve(false)
 *     }
 *   });
 *   window.dispatchEvent(event);
 * });
 */
function ConfirmDialog() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const handleShowDialog = (event) => {
      const { 
        title = 'Bekräfta', 
        message, 
        confirmText = 'OK', 
        cancelText = 'Cancel',
        confirmButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white',
        onConfirm, 
        onCancel 
      } = event.detail;
      
      setDialog({
        title,
        message,
        confirmText,
        cancelText,
        confirmButtonClass,
        onConfirm,
        onCancel
      });
    };

    window.addEventListener('showConfirmDialog', handleShowDialog);
    return () => window.removeEventListener('showConfirmDialog', handleShowDialog);
  }, []);

  const handleConfirm = () => {
    if (dialog?.onConfirm) {
      dialog.onConfirm();
    }
    setDialog(null);
  };

  const handleCancel = () => {
    if (dialog?.onCancel) {
      dialog.onCancel();
    }
    setDialog(null);
  };

  if (!dialog) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white  rounded-sm shadow-xl max-w-md w-full animate-scale-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
            <AlertCircle className="text-gray-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">
              {dialog.title}
            </h3>
          </div>
          
          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-gray-700 whitespace-pre-line">
              {dialog.message}
            </p>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              {dialog.cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${dialog.confirmButtonClass}`}
            >
              {dialog.confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfirmDialog;
          