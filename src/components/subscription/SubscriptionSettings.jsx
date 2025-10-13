import { useState } from 'react';
import { Crown, Calendar, CreditCard, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../hooks/useSubscription';
import { createPortalSession, cancelSubscription } from '../../services/subscriptionService';

export default function SubscriptionSettings({ onClose }) {
  const { t, i18n } = useTranslation(['subscription']);
  const { subscription, isPremium, wheelCount, limits, loading, refresh } = useSubscription();
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleManageBilling = async () => {
    try {
      const { url } = await createPortalSession(window.location.href);
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert(t('subscription:settings.alerts.billingError'));
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      await cancelSubscription();
      await refresh();
      setShowCancelConfirm(false);
      
      alert(t('subscription:settings.alerts.canceled'));
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert(t('subscription:settings.alerts.cancelError'));
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-sm p-8">
          <p className="text-gray-600">{t('subscription:settings.loading')}</p>
        </div>
      </div>
    );
  }

  const getPlanName = () => {
    if (!subscription) return t('subscription:plans.free.name');
    if (subscription.plan_type === 'monthly') return t('subscription:plans.monthly.name');
    if (subscription.plan_type === 'yearly') return t('subscription:plans.yearly.name');
    return t('subscription:plans.free.name');
  };

  const getPlanPrice = () => {
    if (!subscription || subscription.plan_type === 'free') return `0 ${t('subscription:plans.monthly.currency')}`;
    if (subscription.plan_type === 'monthly') return `${t('subscription:plans.monthly.price')} ${t('subscription:plans.monthly.currency')}${t('subscription:plans.monthly.period')}`;
    if (subscription.plan_type === 'yearly') return `768 ${t('subscription:plans.yearly.currency')}${t('subscription:plans.yearly.period')} (${t('subscription:modal.priceBreakdown', { price: '64' })})`;
    return `0 ${t('subscription:plans.monthly.currency')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'en' ? 'en-GB' : 'sv-SE';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{t('subscription:settings.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Plan Card */}
          <div className={`
            rounded-sm border-2 p-6
            ${isPremium ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50' : 'border-gray-200 bg-gray-50'}
          `}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {isPremium && <Crown className="text-blue-600" size={24} />}
                  <h3 className="text-xl font-bold text-gray-900">
                    {getPlanName()}
                  </h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {getPlanPrice()}
                </p>
              </div>
              
              {isPremium && subscription?.status === 'active' && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <CheckCircle size={16} />
                  <span className="text-sm font-semibold">{t('subscription:settings.status.active')}</span>
                </div>
              )}
            </div>

            {/* Subscription Details */}
            {isPremium && subscription && (
              <div className="space-y-2 mb-4 text-sm">
                {subscription.current_period_end && (
                  <div className="flex items-center text-gray-700">
                    <Calendar size={16} className="mr-2" />
                    <span>
                      {t('subscription:settings.renews')}: {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                )}
                
                {subscription.cancel_at_period_end && (
                  <div className="flex items-center text-orange-600">
                    <AlertCircle size={16} className="mr-2" />
                    <span>
                      {t('subscription:settings.endsOn')}: {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {isPremium && subscription?.stripe_customer_id && (
                <>
                  <button
                    onClick={handleManageBilling}
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={18} />
                    {t('subscription:settings.manageBilling')}
                  </button>
                  
                  {!subscription.cancel_at_period_end && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-sm font-semibold transition-colors"
                    >
                      {t('subscription:settings.cancel')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-gray-50 rounded-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t('subscription:settings.usage.title')}
            </h3>
            
            <div className="space-y-4">
              {/* Wheels Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('subscription:settings.usage.wheels')}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {wheelCount} {isPremium ? '' : `/ ${limits?.maxWheels}`}
                  </span>
                </div>
                {!isPremium && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        wheelCount >= limits?.maxWheels ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(wheelCount / limits?.maxWheels) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Features List */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {t('subscription:settings.usage.features')}
                </h4>
                <ul className="space-y-2">
                  {limits?.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <CheckCircle className="text-green-600 mr-2 flex-shrink-0 mt-0.5" size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-sm p-6 max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t('subscription:settings.cancelConfirm.title')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('subscription:settings.cancelConfirm.message', { 
                  date: formatDate(subscription?.current_period_end) 
                })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-sm font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={canceling}
                >
                  {t('subscription:settings.cancelConfirm.keep')}
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-sm font-semibold text-white"
                  disabled={canceling}
                >
                  {canceling ? t('subscription:settings.cancelConfirm.processing') : t('subscription:settings.cancelConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
