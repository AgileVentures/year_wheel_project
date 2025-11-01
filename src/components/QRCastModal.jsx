import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * QRCastModal - iOS casting fallback
 * Shows a pairing code that users can type on their TV
 * Used when Chrome Cast SDK is not available (iOS devices)
 */
export const QRCastModal = ({ isOpen, onClose, sessionToken }) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('cast.closeQR')}
        >
          <X size={24} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('cast.pairingCodeTitle')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('cast.pairingCodeSubtitle')}
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
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('cast.closeQR')}
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
