import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

function LandingNavigation({ 
  mobileMenuOpen, 
  setMobileMenuOpen, 
  setAuthMode, 
  scrollToFeatures,
  scrollToTemplates, 
  scrollToPricing, 
  scrollToAuth 
}) {
  const { t } = useTranslation(['landing', 'auth']);

  const handleLoginClick = () => {
    setAuthMode('login');
    scrollToAuth();
  };

  const handleSignupClick = () => {
    setAuthMode('signup');
    scrollToAuth();
  };

  const handleMobileLogin = () => {
    setAuthMode('login');
    scrollToAuth();
    setMobileMenuOpen(false);
  };

  const handleMobileSignup = () => {
    setAuthMode('signup');
    scrollToAuth();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-8 w-auto" />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              <button onClick={scrollToFeatures} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t('landing:nav.features')}
              </button>
              <button onClick={scrollToTemplates} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t('landing:nav.templates')}
              </button>
              <button onClick={scrollToPricing} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t('landing:nav.pricing')}
              </button>
              <LanguageSwitcher />
              <button
                onClick={handleLoginClick}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                {t('auth:login.title')}
              </button>
              <button
                onClick={handleSignupClick}
                className="px-5 py-2.5 bg-[#00A4A6] text-white rounded-sm hover:bg-[#2E9E97] font-semibold transition-colors"
              >
                {t('landing:nav.getStarted')}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay - Rendered OUTSIDE nav */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[998] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 right-0 bottom-0 w-64 bg-white shadow-2xl z-[999] lg:hidden overflow-y-auto border-l border-gray-200">
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  scrollToFeatures();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-sm font-medium transition-colors"
              >
                {t('landing:nav.features')}
              </button>
              <button
                onClick={() => {
                  scrollToTemplates();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-sm font-medium transition-colors"
              >
                {t('landing:nav.templates')}
              </button>
              <button
                onClick={() => {
                  scrollToPricing();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-sm font-medium transition-colors"
              >
                {t('landing:nav.pricing')}
              </button>
              <div className="pt-4 border-t border-gray-200 mt-4 space-y-2">
                <button
                  onClick={handleMobileLogin}
                  className="w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-sm font-medium transition-colors"
                >
                  {t('auth:login.title')}
                </button>
                <button
                  onClick={handleMobileSignup}
                  className="w-full px-4 py-3 bg-[#00A4A6] text-white rounded-sm hover:bg-[#2E9E97] font-semibold transition-colors"
                >
                  {t('landing:nav.getStarted')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default memo(LandingNavigation);