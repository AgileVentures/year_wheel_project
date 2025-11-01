import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * QRCastModal - iOS casting fallback
 * Shows a pairing code that users can type on their TV
 * Used when Chrome Cast SDK is not available (iOS devices)
 */
export const QRCastModal = ({ isOpen, onClose, sessionToken, isConnected }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Construct receiver URL
  const receiverUrl = `${window.location.origin}/cast-receiver?code=${sessionToken}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('cast.closeQR')}
        >
          <X size={24} />
        </button>

        {/* Connection Status Badge */}
        {isConnected === true && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-700 font-medium">{t('cast.connected')}</span>
          </div>
        )}
        {isConnected === false && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-blue-700 font-medium">{t('cast.connecting')}</span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isConnected ? t('cast.casting') : t('cast.pairingCodeTitle')}
        </h2>
        <p className="text-gray-600 mb-6">
          {isConnected ? t('cast.controlFromPhone') : t('cast.pairingCodeSubtitle')}
        </p>

        {/* Pairing Code Display - Big and Easy to Read */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 mb-6 text-center border-2 border-blue-200">
          <div className="text-6xl font-mono font-bold text-blue-600 tracking-widest mb-2">
            {sessionToken}
          </div>
          <div className="text-sm text-gray-600">
            {t('cast.pairingCode')}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
              1
            </div>
            <div className="flex-1">
              <p className="text-gray-700">{t('cast.codeStep1')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
              2
            </div>
            <div className="flex-1">
              <p className="text-gray-700">{t('cast.codeStep2')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold mr-3">
              3
            </div>
            <div className="flex-1">
              <p className="text-gray-700">{t('cast.codeStep3')}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {!isConnected && (
            <button
              onClick={handleCopyCode}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {copied ? (
                <>
                  <Check size={20} />
                  {t('cast.codeCopied')}
                </>
              ) : (
                <>
                  <Copy size={20} />
                  {t('cast.copyCode')}
                </>
              )}
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`w-full px-4 py-3 rounded-lg transition-colors font-medium ${
              isConnected 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {isConnected ? t('cast.disconnect') : t('cast.closeQR')}
          </button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          {t('cast.receiverUrl')}: <span className="font-mono">{receiverUrl}</span>
        </p>
      </div>
    </div>
  );
};
