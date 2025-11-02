import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * QRCastModal - iOS casting fallback
 * Shows a pairing code that users can type on their TV
 * Used when Chrome Cast SDK is not available (iOS devices)
 */
export const QRCastModal = ({ isOpen, onClose, onDisconnect, sessionToken, isConnected }) => {
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
      <div className="bg-white rounded-t-2xl sm:rounded-sm shadow-xl w-full sm:max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('cast.closeQR')}
        >
          <X size={24} />
        </button>

        {/* Connection Status Badge */}
        <div className={`mb-4 rounded-sm p-4 border-2 ${
          isConnected 
            ? 'bg-green-50 border-[#9FCB3E]' 
            : 'bg-[#A4E6E0] bg-opacity-20 border-[#36C2C6]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <svg className="w-5 h-5 text-[#9FCB3E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[#336B3E] font-semibold">{t('cast.connected')}</span>
                </>
              ) : (
                <>
                  <svg className="animate-spin h-5 w-5 text-[#00A4A6]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-[#1E1EBE] font-semibold">{t('cast.connecting')}</span>
                </>
              )}
            </div>
            <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-[#36C2C6]">
              {sessionToken}
            </code>
          </div>
          <p className="text-sm text-gray-600">
            {isConnected ? t('cast.tvConnected') : t('cast.waitingForTV')}
          </p>
          {isConnected && (
            <p className="text-xs text-gray-500 mt-1">
              {t('cast.multipleDevicesNote')}
            </p>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isConnected ? '✓ ' + t('cast.casting') : t('cast.pairingCodeTitle')}
        </h2>
        <p className="text-gray-600 mb-6">
          {isConnected ? t('cast.connectedYouCanClose') : t('cast.pairingCodeSubtitle')}
        </p>

        {/* Pairing Code Display - Big and Easy to Read */}
        <div className="bg-gradient-to-br from-[#A4E6E0] from-opacity-30 to-[#36C2C6] to-opacity-20 rounded-sm p-8 mb-6 text-center border-2 border-[#36C2C6]">
          <div className="text-6xl font-mono font-bold text-[#00A4A6] tracking-widest mb-2">
            {sessionToken}
          </div>
          <div className="text-sm text-[#1E1EBE]">
            {t('cast.pairingCode')}
          </div>
        </div>

        {/* Instructions - only show when not connected */}
        {!isConnected && (
          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-[#A4E6E0] rounded-full flex items-center justify-center text-[#1E1EBE] font-semibold mr-3">
                1
              </div>
              <div className="flex-1">
                <p className="text-gray-700">{t('cast.codeStep1')}</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-[#A4E6E0] rounded-full flex items-center justify-center text-[#1E1EBE] font-semibold mr-3">
                2
              </div>
              <div className="flex-1">
                <p className="text-gray-700">{t('cast.codeStep2')}</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-[#A4E6E0] rounded-full flex items-center justify-center text-[#1E1EBE] font-semibold mr-3">
                3
              </div>
              <div className="flex-1">
                <p className="text-gray-700">{t('cast.codeStep3')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {!isConnected && (
            <button
              onClick={handleCopyCode}
              className="w-full px-4 py-3 bg-[#00A4A6] text-white rounded-sm hover:bg-[#2E9E97] transition-colors flex items-center justify-center gap-2 font-medium"
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
          
          {/* Close button - doesn't disconnect */}
          <button
            onClick={onClose}
            className={`w-full px-4 py-3 rounded-sm transition-colors font-medium text-lg ${
              isConnected 
                ? 'bg-[#00A4A6] text-white hover:bg-[#2E9E97]' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isConnected ? t('cast.closeAndKeepCasting') : t('common:actions.close')}
          </button>
          
          {/* Disconnect button - only show when connected */}
          {isConnected && onDisconnect && (
            <button
              onClick={onDisconnect}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-sm hover:bg-red-600 transition-colors font-medium"
            >
              {t('cast.stopCasting', { defaultValue: 'Stoppa casting' })}
            </button>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          {t('cast.receiverUrl')}: <span className="font-mono">{receiverUrl}</span>
        </p>
      </div>
    </div>
  );
};
