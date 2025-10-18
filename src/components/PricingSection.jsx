import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Crown, Check, Sparkles, Calendar, Copy } from 'lucide-react';

function PricingSection({ billingCycle, setBillingCycle, setAuthMode, scrollToAuth }) {
  const { t, i18n } = useTranslation(['landing', 'subscription']);

  const handleToggleBilling = useCallback(() => {
    setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly');
  }, [setBillingCycle]);

  const handleFreeSignup = useCallback(() => {
    setAuthMode('signup');
    scrollToAuth();
  }, [setAuthMode, scrollToAuth]);

  const handlePremiumSignup = useCallback(() => {
    setAuthMode('signup');
    scrollToAuth();
  }, [setAuthMode, scrollToAuth]);

  return (
    <section id="pricing-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Enkel prissättning
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Börja gratis, uppgradera när du behöver mer
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              {t('landing:pricing.monthly')}
            </span>
            <button
              onClick={handleToggleBilling}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A4A6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A4A6] focus:ring-offset-2"
              aria-label={`Switch to ${billingCycle === 'monthly' ? 'yearly' : 'monthly'} billing`}
              role="switch"
              aria-checked={billingCycle === 'yearly'}
            >
              <span className="sr-only">Toggle billing cycle</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              {t('landing:pricing.yearly')}
            </span>
            {billingCycle === 'yearly' && (
              <span className="inline-flex items-center px-2 py-1 bg-[#9FCB3E]/20 text-[#1a3d1f] text-xs font-bold rounded-full border border-[#9FCB3E]/30">
                {t('landing:pricing.yearlyDiscount')}
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-sm p-8 border-2 border-gray-200 hover:border-gray-300 transition-colors">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('landing:pricing.free.name')}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900">{t('landing:pricing.free.price')}</span>
                <span className="text-gray-600">{t('landing:pricing.premium.period')}</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700">{t('subscription:plans.free.features.wheels')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700">{t('subscription:plans.free.features.teams')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700">{t('subscription:plans.free.features.export')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <span className="text-gray-700">{t('landing:pricing.free.features')}</span>
              </li>
            </ul>

            <button
              onClick={handleFreeSignup}
              className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-sm font-semibold transition-colors"
            >
              {t('landing:pricing.free.cta')}
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-[#1B2A63] via-[#2D4EC8] to-[#2E9E97] rounded-sm p-8 border-2 border-[#36C2C6]/50 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 bg-[#9FCB3E] text-[#1a3d1f] px-4 py-1 text-xs font-bold rounded-bl-lg">
              {t('landing:pricing.premium.popular')}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="text-[#9FCB3E]" size={24} />
                <h3 className="text-2xl font-bold text-white">{t('landing:pricing.premium.name')}</h3>
              </div>
              {billingCycle === 'monthly' ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">{t('landing:pricing.premium.priceMonthly')}</span>
                    <span className="text-[#A4E6E0]">{t('landing:pricing.premium.period')}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">{t('landing:pricing.premium.priceYearly')}</span>
                    <span className="text-[#A4E6E0]">{t('landing:pricing.premium.period')}</span>
                  </div>
                  <p className="text-sm text-[#A4E6E0] mt-1">({t('landing:pricing.premium.yearlyTotal')} - {t('landing:pricing.premium.saveText')})</p>
                </div>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {t('landing:pricing.premium.features', { returnObjects: true }).map((feature, index) => {
                // Special icons for first three features (AI, Google Integration, SmartCopy)
                const getIcon = () => {
                  if (index === 0) {
                    return (
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="text-[#00A4A6]" size={12} />
                      </div>
                    );
                  }
                  if (index === 1) {
                    return (
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Calendar className="text-[#00A4A6]" size={12} />
                      </div>
                    );
                  }
                  if (index === 2) {
                    return (
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Copy className="text-[#00A4A6]" size={12} />
                      </div>
                    );
                  }
                  return <Check className="text-white flex-shrink-0 mt-1" size={20} />;
                };

                return (
                  <li key={index} className="flex items-start gap-3">
                    {getIcon()}
                    <span className={`text-white ${index < 3 ? 'font-semibold' : ''}`}>{feature}</span>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={handlePremiumSignup}
              className="w-full py-3 px-6 bg-white hover:bg-[#A4E6E0] text-[#1B2A63] rounded-sm font-semibold transition-colors shadow-lg"
            >
              {t('landing:pricing.premium.cta')}
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/pricing" className="text-[#00A4A6] hover:text-[#2E9E97] font-semibold">
            {t('landing:pricing.viewAllDetails')}
          </Link>
          {/* Billing note for English language */}
          {i18n.language === 'en' && (
            <p className="text-sm text-gray-500 mt-4">
              {t('landing:pricing.billingNote')}
            </p>
          )}
        </div>

        {/* NGO/Non-profit Discount Banner */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-sm p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('landing:pricing.ngoDiscount.title')}
                </h3>
                <p className="text-gray-700 mb-3" dangerouslySetInnerHTML={{ __html: t('landing:pricing.ngoDiscount.description') }} />
                <a 
                  href="mailto:hey@communitaslabs.io?subject=NGO%20Rabatt%20-%20YearWheel&body=Hej!%0A%0AVi%20är%20en%20ideell%20organisation%2FNGO%20och%20skulle%20vilja%20veta%20mer%20om%20er%2050%25%20rabatt%20på%20Premium-planen.%0A%0AOrganisation%3A%20%0AWebbplats%3A%20%0A%0ATack!"
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  hey@communitaslabs.io
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(PricingSection);