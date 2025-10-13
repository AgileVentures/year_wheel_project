import { Globe, Lock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * PublicShareButton - Toggle for making wheel public/private
 * Shows share link when public
 */
function PublicShareButton({ isPublic, wheelId, onTogglePublic }) {
  const { t } = useTranslation(['subscription']);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/preview-wheel/${wheelId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Toggle Button */}
      <button
        onClick={onTogglePublic}
        className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
          isPublic
            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300'
        }`}
        title={isPublic ? t('subscription:publicShare.isPublic') : t('subscription:publicShare.makePublic')}
      >
        {isPublic ? <Globe size={16} /> : <Lock size={16} />}
        <span>{isPublic ? t('subscription:publicShare.public') : t('subscription:publicShare.private')}</span>
      </button>

      {/* Copy Link Button (only show when public) */}
      {isPublic && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-gray-700 hover:bg-gray-100 border border-gray-300 transition-colors"
          title={t('subscription:publicShare.copyLink')}
        >
          {copied ? (
            <>
              <Check size={16} className="text-green-600" />
              <span className="text-green-600">{t('subscription:publicShare.copied')}</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>{t('subscription:publicShare.copyLink')}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default PublicShareButton;
