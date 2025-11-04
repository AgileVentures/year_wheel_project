import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

function Footer({ variant = 'full' }) {
  const { t, i18n } = useTranslation(['landing']);

  if (variant === 'minimal') {
    return (
      <footer className="bg-gray-50 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>
            {t('landing:footer.createdBy')}{' '}
            <a 
              href="https://communitaslabs.io" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#00A4A6] hover:text-[#2E9E97] font-medium transition-colors"
            >
              CommunitasLabs Inc
            </a>
          </p>
        </div>
      </footer>
    );
  }

  if (variant === 'legal') {
    return (
      <footer className="border-t border-gray-200 py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-600">
          <p>
            {i18n.language === 'en' 
              ? 'YearWheel Planner is a SaaS service created and operated by'
              : 'YearWheel Planner är en SaaS-tjänst skapad och driven av'
            }{' '}
            <a 
              href="https://communitaslabs.io" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#00A4A6] hover:text-[#2E9E97] font-medium transition-colors"
            >
              CommunitasLabs Inc
            </a>
          </p>
        </div>
      </footer>
    );
  }

  // Default 'full' variant
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-6 w-auto" />
            </div>
            <p className="text-sm text-gray-600">
              {t('landing:footer.tagline')}
            </p>
          </div>

          <div>
            <h4 className="text-gray-900 font-semibold mb-4">{t('landing:footer.product')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/pricing" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.pricing')}</Link></li>
              <li><Link to="/guide/quick-start" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.quickStart', 'Quick Start Guide')}</Link></li>
              <li><Link to="/auth" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:nav.getStarted')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-semibold mb-4">{t('landing:footer.company')}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.about')}</a></li>
              <li><a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.contact')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-semibold mb-4">{t('landing:footer.legal')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/legal/privacy" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.privacy')}</Link></li>
              <li><Link to="/legal/terms" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>
            {t('landing:footer.createdBy')}{' '}
            <a 
              href="https://communitaslabs.io" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#00A4A6] hover:text-[#2E9E97] font-medium transition-colors"
            >
              CommunitasLabs Inc
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
