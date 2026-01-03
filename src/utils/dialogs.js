/**
 * Dialog Utilities
 * 
 * Helper functions to show custom confirm dialogs and toast messages
 * instead of using window.confirm() and window.alert()
 */

import i18n from '../i18n';

/**
 * Show a confirmation dialog and return a promise that resolves with the user's choice
 * 
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} [options.confirmText='OK'] - Confirm button text
 * @param {string} [options.cancelText='Cancel'] - Cancel button text
 * @param {string} [options.confirmButtonClass] - Custom CSS class for confirm button
 * @param {boolean} [options.requireConfirmation=false] - Require typing confirmation text
 * @param {string} [options.confirmationText] - Text that must be typed to confirm (e.g., "DELETE")
 * @param {string} [options.confirmationPrompt] - Prompt message for confirmation input
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
 * 
 * @example
 * // With confirmation text requirement
 * const confirmed = await showConfirmDialog({
 *   title: 'Delete Account',
 *   message: 'This will permanently delete your account.',
 *   requireConfirmation: true,
 *   confirmationText: 'DELETE',
 *   confirmationPrompt: 'Type DELETE to confirm',
 *   confirmText: 'Delete Account',
 *   confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
 * });
 */
export function showConfirmDialog({
  title = 'Bekräfta',
  message,
  confirmText = 'OK',
  cancelText = 'Avbryt',
  confirmButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white',
  requireConfirmation = false,
  confirmationText = '',
  confirmationPrompt = ''
}) {
  return new Promise((resolve) => {
    const event = new CustomEvent('showConfirmDialog', {
      detail: {
        title,
        message,
        confirmText,
        cancelText,
        confirmButtonClass,
        requireConfirmation,
        confirmationText,
        confirmationPrompt,
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
 * Supports both direct messages and i18n translation keys.
 * If the message starts with 'toast:' it will be treated as a translation key.
 * 
 * @param {string} message - Message to display OR translation key (e.g., 'toast:save.success')
 * @param {('success'|'error'|'info')} type - Toast type
 * @param {Object} [interpolation] - Interpolation values for translation
 * 
 * @example
 * // Direct message
 * showToast('Changes saved successfully!', 'success');
 * 
 * // Using translation key
 * showToast('toast:save.success', 'success');
 * 
 * // With interpolation
 * showToast('toast:import.success', 'success', { count: 150 });
 */
export function showToast(message, type = 'info', interpolation = {}) {
  let resolvedMessage = message;
  
  // If message starts with 'toast:', treat it as a translation key
  if (message && message.startsWith('toast:')) {
    const key = message.substring(6); // Remove 'toast:' prefix
    resolvedMessage = i18n.t(`toast:${key}`, interpolation);
  }
  
  const event = new CustomEvent('showToast', {
    detail: { message: resolvedMessage, type }
  });
  window.dispatchEvent(event);
}
