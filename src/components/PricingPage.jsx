import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Crown, Check, Sparkles, Users, FileImage, History, Share2, Zap, Calendar, Copy } from 'lucide-react';
import SubscriptionModal from './subscription/SubscriptionModal';
import LanguageSwitcher from './LanguageSwitcher';
import ComparisonTable from './ComparisonTable';
import Footer from './Footer';

function PricingPage() {
  const { t } = useTranslation(['landing', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' or 'yearly'

  const handleGetStarted = () => {
    if (user) {
      // Already logged in - show subscription modal
      setShowSubscriptionModal(true);
    } else {
      // Not logged in - redirect to auth page
      navigate('/auth');
    }
  };

  const handleBackToDashboard = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="/year_wheel_logo.svg" 
                alt="YearWheel" 
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                {user ? t('common:navigation.dashboard') : t('common:navigation.login')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A4A6]/10 backdrop-blur-sm border border-[#36C2C6]/30 rounded-full text-sm font-semibold mb-6">
          <Sparkles size={16} className="text-[#36C2C6]" />
          <span className="text-[#2E9E97]">{t('landing:pricing.premium.features.0')}</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          {t('landing:pricing.title')}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {t('landing:pricing.subtitle')}
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
            {t('landing:pricing.monthly')}
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
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
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-sm shadow-lg border-2 border-gray-200 p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('landing:pricing.free.name')}</h3>
              <p className="text-gray-600">{t('subscription:plans.free.description')}</p>
            </div>

            <div className="mb-6">
              <span className="text-5xl font-bold text-gray-900">{t('landing:pricing.free.price')}</span>
              <span className="text-gray-600 ml-2">{t('subscription:plans.monthly.period')}</span>
            </div>

            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-sm font-semibold transition-colors mb-8"
            >
              {t('landing:pricing.free.cta')}
            </button>

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{t('subscription:plans.free.features.wheels')}</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{t('subscription:plans.free.features.teams')}</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{t('subscription:plans.free.features.export')}</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{t('subscription:plans.free.features.basic')}</span>
              </div>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-[#1B2A63] via-[#2D4EC8] to-[#2E9E97] rounded-sm shadow-2xl border-2 border-[#36C2C6]/50 p-8 flex flex-col relative overflow-hidden">
            {/* Popular Badge */}
            <div className="absolute top-0 right-0 bg-[#9FCB3E] text-[#1a3d1f] px-4 py-1 text-xs font-bold rounded-bl-lg">
              {t('subscription:modal.mostPopular').toUpperCase()}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-[#9FCB3E]" />
                <h3 className="text-2xl font-bold text-white">{t('landing:pricing.premium.title')}</h3>
              </div>
              <p className="text-[#A4E6E0]">{t('landing:pricing.premium.description')}</p>
            </div>

            <div className="mb-6">
              {billingCycle === 'monthly' ? (
                <div>
                  <span className="text-5xl font-bold text-white">{t('landing:pricing.premium.priceMonthly')}</span>
                  <span className="text-[#A4E6E0] ml-2">{t('landing:pricing.premium.period')}</span>
                </div>
              ) : (
                <div>
                  <span className="text-5xl font-bold text-white">{t('landing:pricing.premium.priceYearly')}</span>
                  <span className="text-[#A4E6E0] ml-2">{t('landing:pricing.premium.period')}</span>
                  <div className="text-sm text-[#A4E6E0] mt-1">
                    ({t('landing:pricing.premium.yearlyTotal')} - {t('landing:pricing.premium.saveText').toLowerCase()})
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGetStarted}
              className="w-full py-3 px-6 bg-white hover:bg-[#A4E6E0] text-[#1B2A63] rounded-sm font-semibold transition-colors mb-8 shadow-lg"
            >
              {t('landing:pricing.premium.cta')}
            </button>

            <div className="space-y-4 flex-grow">
              {t('landing:pricing.premium.features', { returnObjects: true }).map((feature, index) => {
                // Icon mapping for each feature
                const getIcon = () => {
                  const iconMap = [
                    <Sparkles className="w-3 h-3 text-[#00A4A6]" />,  // AI assistant
                    <Calendar className="w-3 h-3 text-[#00A4A6]" />,  // Google Integration
                    <Copy className="w-3 h-3 text-[#00A4A6]" />,      // SmartCopy
                    <Zap className="w-3 h-3 text-[#00A4A6]" />,       // Unlimited wheels
                    <Users className="w-3 h-3 text-[#00A4A6]" />,     // Unlimited teams
                    <FileImage className="w-3 h-3 text-[#00A4A6]" />, // All export formats
                    <History className="w-3 h-3 text-[#00A4A6]" />,   // Version history
                    <Share2 className="w-3 h-3 text-[#00A4A6]" />,    // Share & collaborate
                    <Check className="w-3 h-3 text-[#00A4A6]" />      // Priority support
                  ];
                  return iconMap[index] || <Check className="w-3 h-3 text-[#00A4A6]" />;
                };

                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getIcon()}
                    </div>
                    <span className={`text-white ${index < 3 ? 'font-semibold' : ''}`}>{feature}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">{t('landing:pricing.trustSignals')}</p>
          <p className="text-sm text-gray-500">{t('landing:pricing.flexibility')}</p>
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
                  href={`mailto:${t('landing:pricing.ngoDiscount.cta')}?subject=NGO%20Discount%20-%20YearWheel`}
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('landing:pricing.ngoDiscount.cta')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <ComparisonTable />

      {/* FAQ Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {t('landing:pricing.faq.title')}
          </h2>
          
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('landing:pricing.faq.tryPremium.question')}
              </h3>
              <p className="text-gray-600">
                {t('landing:pricing.faq.tryPremium.answer')}
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('landing:pricing.faq.dataAfterCancel.question')}
              </h3>
              <p className="text-gray-600">
                {t('landing:pricing.faq.dataAfterCancel.answer')}
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('landing:pricing.faq.aiAssistant.question')} <span className="text-xs px-2 py-0.5 bg-[#9FCB3E]/20 text-[#1a3d1f] rounded-full font-bold ml-2">PREMIUM</span>
              </h3>
              <p className="text-gray-600 mb-2">
                {t('landing:pricing.faq.aiAssistant.answer1')}
              </p>
              <ul className="text-gray-600 list-disc list-inside ml-4 space-y-1">
                <li>"{t('landing:pricing.faq.aiAssistant.example1')}"</li>
                <li>"{t('landing:pricing.faq.aiAssistant.example2')}"</li>
                <li>"{t('landing:pricing.faq.aiAssistant.example3')}"</li>
              </ul>
              <p className="text-gray-600 mt-2">
                {t('landing:pricing.faq.aiAssistant.answer2')}
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('landing:pricing.faq.googleIntegration.question')} <span className="text-xs px-2 py-0.5 bg-[#9FCB3E]/20 text-[#1a3d1f] rounded-full font-bold ml-2">PREMIUM</span>
              </h3>
              <p className="text-gray-600">
                {t('landing:pricing.faq.googleIntegration.answer')}
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('landing:pricing.faq.changePlan.question')}
              </h3>
              <p className="text-gray-600">
                {t('landing:pricing.faq.changePlan.answer')}
              </p>
            </div>

            <div className="pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('landing:pricing.faq.securePayments.question')}
              </h3>
              <p className="text-gray-600">
                {t('landing:pricing.faq.securePayments.answer')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#1B2A63] via-[#2D4EC8] to-[#2E9E97] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('landing:pricing.cta.title')}
          </h2>
          <p className="text-xl text-[#A4E6E0] mb-8">
            {t('landing:pricing.cta.subtitle')}
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-4 bg-white hover:bg-[#A4E6E0] text-[#1B2A63] rounded-sm font-bold text-lg transition-colors shadow-xl inline-flex items-center gap-2"
          >
            {t('landing:pricing.cta.button')}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </section>

      <Footer variant="minimal" />

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal 
          onClose={() => setShowSubscriptionModal(false)}
          currentPlan="free"
        />
      )}
    </div>
  );
}

export default PricingPage;
