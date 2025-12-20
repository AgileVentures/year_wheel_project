import { useTranslation } from 'react-i18next';
import AdminAffiliates from './AdminAffiliates';

export default function AdminAffiliatesPage() {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('affiliates')}</h2>
        <p className="text-gray-600 text-sm">Hantera affiliateprogram och ansökningar</p>
      </div>
      <AdminAffiliates />
    </div>
  );
}
