import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCanonicalUrl } from '../hooks/useCanonicalUrl';
import { Mail, ArrowLeft, MessageCircle, Clock } from 'lucide-react';
import Footer from './Footer';
import LandingNavigation from './LandingNavigation';

function SupportPage() {
  const { t } = useTranslation(['support', 'common']);
  
  // Set canonical URL for support page
  useCanonicalUrl('https://yearwheel.se/support');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <LandingNavigation />
      
      <main className="flex-1 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>{t('common:actions.backToHome')}</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <MessageCircle size={32} className="text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t('support:title')}
            </h1>
            <p className="text-xl text-gray-600">
              {t('support:subtitle')}
            </p>
          </div>

          {/* Support Card */}
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-8 mb-8">
            <div className="space-y-6">
              {/* Care Message */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('support:careTitle')}
                  </h2>
                  <p className="text-gray-600">
                    {t('support:careMessage')}
                  </p>
                </div>
              </div>

              {/* Response Time */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('support:responseTimeTitle')}
                  </h2>
                  <p className="text-gray-600">
                    {t('support:responseTimeMessage')}
                  </p>
                </div>
              </div>

              {/* Contact Email */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Mail size={20} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('support:contactTitle')}
                  </h2>
                  <a 
                    href="mailto:hey@communitaslabs.io"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-lg transition-colors"
                  >
                    <Mail size={20} />
                    hey@communitaslabs.io
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 text-center">
            <p className="text-gray-700">
              {t('support:additionalInfo')}
            </p>
          </div>

          {/* Testing Opt-Out Notice */}
          <div className="bg-orange-50 border border-orange-200 rounded-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2 text-center">
              {t('support:testingOptOut')}
            </h3>
            <p className="text-gray-700 text-center">
              {t('support:testingOptOutMessage')}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default SupportPage;
