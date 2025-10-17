/**
 * Dialog Utilities
 * 
 * Helper functions to show custom confirm dialogs and toast messages
 * instead of using window.confirm() and window.alert()
 */

/**
 * Show a confirmation dialog and return a promise that resolves with the user's choice
 * 
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} [options.confirmText='OK'] - Confirm button text
 * @param {string} [options.cancelText='Cancel'] - Cancel button text
 * @param {string} [options.confirmButtonClass] - Custom CSS class for confirm button
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 * 
 * @example
 * const confirmed = await showConfirmDialog({
 *   title: 'Delete Item',
 *   message: 'Are you sure you want to delete this item?',
 *   confirmText: 'Delete',
 *   cancelText: 'Cancel',
 *   confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
 * });
 * if (confirmed) {
 *   // User clicked Delete
 * }
 */
export function showConfirmDialog({
  title = 'Bekräfta',
  message,
  confirmText = 'OK',
  cancelText = 'Avbryt',
  confirmButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white'
}) {
  return new Promise((resolve) => {
    const event = new CustomEvent('showConfirmDialog', {
      detail: {
        title,
        message,
        confirmText,
        cancelText,
        confirmButtonClass,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      }
    });
    window.dispatchEvent(event);
  });
}

/**
 * Show a toast notification
 * 
 * @param {string} message - Message to display
 * @param {('success'|'error'|'info')} type - Toast type
 * 
 * @example
 * showToast('Changes saved successfully!', 'success');
 * showToast('An error occurred', 'error');
 */
export function showToast(message, type = 'info') {
  const event = new CustomEvent('showToast', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
}
