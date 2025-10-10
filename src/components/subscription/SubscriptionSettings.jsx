import { useState } from 'react';
import { Crown, Calendar, CreditCard, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { createPortalSession, cancelSubscription } from '../../services/subscriptionService';

export default function SubscriptionSettings({ onClose }) {
  const { subscription, isPremium, wheelCount, limits, loading, refresh } = useSubscription();
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleManageBilling = async () => {
    try {
      const { url } = await createPortalSession(window.location.href);
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Kunde inte öppna faktureringspanelen. Försök igen senare.');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      await cancelSubscription();
      await refresh();
      setShowCancelConfirm(false);
      
      alert('Din prenumeration kommer att avslutas vid periodens slut.');
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Kunde inte avbryta prenumeration. Försök igen senare.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-sm p-8">
          <p className="text-gray-600">Laddar prenumeration...</p>
        </div>
      </div>
    );
  }

  const getPlanName = () => {
    if (!subscription) return 'Gratis';
    if (subscription.plan_type === 'monthly') return 'Premium Månadsvis';
    if (subscription.plan_type === 'yearly') return 'Premium Årlig';
    return 'Gratis';
  };

  const getPlanPrice = () => {
    if (!subscription || subscription.plan_type === 'free') return '0 kr';
    if (subscription.plan_type === 'monthly') return '79 kr/månad';
    if (subscription.plan_type === 'yearly') return '768 kr/år (64 kr/månad)';
    return '0 kr';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE', {
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
          <h2 className="text-2xl font-bold text-gray-900">Prenumeration</h2>
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
                  <span className="text-sm font-semibold">Aktiv</span>
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
                      Förnyas: {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                )}
                
                {subscription.cancel_at_period_end && (
                  <div className="flex items-center text-orange-600">
                    <AlertCircle size={16} className="mr-2" />
                    <span>
                      Avslutas: {formatDate(subscription.current_period_end)}
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
                    Hantera betalning
                  </button>
                  
                  {!subscription.cancel_at_period_end && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-sm font-semibold transition-colors"
                    >
                      Avbryt
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-gray-50 rounded-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Din användning
            </h3>
            
            <div className="space-y-4">
              {/* Wheels Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Årshjul
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
                  Tillgängliga funktioner:
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
                Avbryt prenumeration?
              </h3>
              <p className="text-gray-600 mb-6">
                Du kommer att behålla åtkomst till premium-funktioner till{' '}
                {formatDate(subscription?.current_period_end)}. Efter det återgår 
                du till gratisplanen.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-sm font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={canceling}
                >
                  Behåll prenumeration
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-sm font-semibold text-white"
                  disabled={canceling}
                >
                  {canceling ? 'Avbryter...' : 'Ja, avbryt'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
