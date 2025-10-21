import { Users, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminActivity({ recentActivity }) {
  const { t } = useTranslation(['admin']);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  if (!recentActivity) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Users */}
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} />
          {t('recentUsers')}
        </h3>
        <div className="space-y-4">
          {recentActivity.recentUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
              <div>
                <div className="font-medium text-gray-900">{user.full_name || 'No name'}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{formatDate(user.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Wheels */}
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Circle size={20} />
          {t('recentWheels')}
        </h3>
        <div className="space-y-4">
          {recentActivity.recentWheels.map((wheel) => (
            <div key={wheel.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
              <div>
                <div className="font-medium text-gray-900">{wheel.title}</div>
                <div className="text-sm text-gray-500">
                  {t('by')} {wheel.profiles?.full_name || wheel.profiles?.email || t('unknown')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{formatDate(wheel.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
