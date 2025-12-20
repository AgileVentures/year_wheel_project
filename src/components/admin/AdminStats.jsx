import { Users, Circle, Crown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminStats({ stats, subscriptionStats }) {
  const { t } = useTranslation(['admin']);

  if (!stats) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-sm shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <Users className="text-blue-600" size={20} />
            <span className="text-xs text-gray-500 hidden sm:inline">Total</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.users.total}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">{t('totalUsers')}</div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-500">
              <span>{t('today')}: <strong className="text-gray-900">{stats.users.today}</strong></span>
              <span>{t('last7Days')}: <strong className="text-gray-900">{stats.users.last7Days}</strong></span>
            </div>
          </div>
        </div>

        {/* Total Wheels */}
        <div className="bg-white rounded-sm shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <Circle className="text-green-600" size={20} />
            <span className="text-xs text-gray-500 hidden sm:inline">{t('created')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.wheels.total}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">{t('totalWheels')}</div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-500">
              <span>{t('today')}: <strong className="text-gray-900">{stats.wheels.today}</strong></span>
              <span>{t('thisMonth')}: <strong className="text-gray-900">{stats.wheels.thisMonth}</strong></span>
            </div>
          </div>
        </div>

        {/* Premium Users */}
        <div className="bg-white rounded-sm shadow-sm p-4 sm:p-6 border border-gray-200 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <Crown className="text-purple-600" size={20} />
            <span className="text-xs text-gray-500 hidden sm:inline">{t('active')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.premium}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">{t('premiumSubscribers')}</div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-500">
              <span>{t('monthly')}: <strong className="text-gray-900">{subscriptionStats?.monthly || 0}</strong></span>
              <span>{t('yearly')}: <strong className="text-gray-900">{subscriptionStats?.yearly || 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Public Content */}
        <div className="bg-white rounded-sm shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <Globe className="text-teal-600" size={20} />
            <span className="text-xs text-gray-500 hidden sm:inline">{t('shared')}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.publicWheels}</div>
          <div className="text-xs sm:text-sm text-gray-600 mt-1">{t('publicWheels')}</div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-500">
              <span>{t('templates')}: <strong className="text-gray-900">{stats.templates}</strong></span>
              <span>{t('teams')}: <strong className="text-gray-900">{stats.teams}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Stats */}
      <div className="bg-white rounded-sm shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">{t('monthOverview')}</h3>
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center sm:text-left">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.users.thisMonth}</div>
            <div className="text-xs sm:text-sm text-gray-600">{t('newUsers')}</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.wheels.thisMonth}</div>
            <div className="text-xs sm:text-sm text-gray-600">{t('wheelsCreated')}</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {stats.users.total > 0 ? ((stats.premium / stats.users.total) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600">{t('conversionRate')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
