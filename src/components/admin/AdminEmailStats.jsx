import { Mail, Users, TrendingUp, Target, Send, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminEmailStats({ quizLeadsStats, newsletterStats }) {
  const { t } = useTranslation('admin');
  
  if (!quizLeadsStats && !newsletterStats) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">{t('emailStats.title')}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quiz Leads Card */}
        {quizLeadsStats && (
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="text-white" size={24} />
                  <h4 className="text-lg font-semibold text-white">{t('emailStats.quizLeads')}</h4>
                </div>
                <div className="text-white text-2xl font-bold">{quizLeadsStats.total}</div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Recent Activity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('emailStats.last7Days')}</div>
                  <div className="text-2xl font-bold text-gray-900">{quizLeadsStats.last7Days}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('emailStats.thisMonth')}</div>
                  <div className="text-2xl font-bold text-gray-900">{quizLeadsStats.thisMonth}</div>
                </div>
              </div>

              {/* Quality Metrics */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('emailStats.highPainScore')}</span>
                  <span className="text-sm font-semibold text-orange-600">{quizLeadsStats.highPain}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('emailStats.converted')}</span>
                  <span className="text-sm font-semibold text-green-600">{quizLeadsStats.converted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('emailStats.conversionRate')}</span>
                  <span className="text-sm font-semibold text-purple-600">{quizLeadsStats.conversionRate}%</span>
                </div>
              </div>

              {/* Persona Breakdown */}
              <div className="pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-3">{t('emailStats.thisMonthByPersona')}</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{t('emailStats.marketing')}</span>
                    <span className="text-sm font-medium text-gray-900">{quizLeadsStats.byPersona.marketing}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{t('emailStats.project')}</span>
                    <span className="text-sm font-medium text-gray-900">{quizLeadsStats.byPersona.project}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{t('emailStats.education')}</span>
                    <span className="text-sm font-medium text-gray-900">{quizLeadsStats.byPersona.education}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Newsletter Stats Card */}
        {newsletterStats && (
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Send className="text-white" size={24} />
                  <h4 className="text-lg font-semibold text-white">{t('emailStats.newsletters')}</h4>
                </div>
                <div className="text-white text-2xl font-bold">{newsletterStats.total}</div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Send Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('emailStats.thisMonth')}</div>
                  <div className="text-2xl font-bold text-gray-900">{newsletterStats.thisMonth}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{t('emailStats.totalRecipients')}</div>
                  <div className="text-2xl font-bold text-gray-900">{newsletterStats.totalRecipients}</div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">{t('emailStats.deliverySuccessRate')}</span>
                  <span className="text-lg font-bold text-green-600">{newsletterStats.successRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${newsletterStats.successRate}%` }}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-100">
                <a
                  href="/newsletter"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-sm transition-colors"
                >
                  <Mail size={18} />
                  {t('emailStats.sendNewsletter')}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Combined Insights */}
      {quizLeadsStats && newsletterStats && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-sm border border-purple-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-purple-600" size={20} />
            <h4 className="text-sm font-semibold text-gray-900">{t('emailStats.leadGenInsights')}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600 mb-1">{t('emailStats.activeLeadsThisMonth')}</div>
              <div className="text-xl font-bold text-purple-600">{quizLeadsStats.thisMonth}</div>
              <div className="text-xs text-gray-500 mt-1">
                {quizLeadsStats.highPain} {t('emailStats.highPriorityLeads')}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">{t('emailStats.newsletterEngagement')}</div>
              <div className="text-xl font-bold text-blue-600">{newsletterStats.totalRecipients}</div>
              <div className="text-xs text-gray-500 mt-1">
                {t('emailStats.totalReach')}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">{t('emailStats.leadToCustomer')}</div>
              <div className="text-xl font-bold text-green-600">{quizLeadsStats.conversionRate}%</div>
              <div className="text-xs text-gray-500 mt-1">
                {quizLeadsStats.converted} {t('emailStats.convertedSuccessfully')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
