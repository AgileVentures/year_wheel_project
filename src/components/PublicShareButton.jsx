import { Globe, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * PublicShareButton - Toggle for making wheel public/private
 * Preview and embed links are now in the Export menu
 */
function PublicShareButton({ isPublic, onTogglePublic }) {
  const { t } = useTranslation(['subscription']);

  return (
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
  );
}

export default PublicShareButton;
