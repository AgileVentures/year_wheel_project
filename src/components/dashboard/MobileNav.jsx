import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Users, Mail, Crown, Menu, X } from 'lucide-react';

/**
 * MobileNav - Mobile navigation menu for Dashboard
 * Shows hamburger menu on mobile, expands to show navigation options
 */
function MobileNav({ 
  currentView, 
  onViewChange, 
  wheelCount, 
  invitationCount,
  isPremium,
  isAdmin,
  isLoading 
}) {
  const { t } = useTranslation(['dashboard', 'common', 'subscription']);
  const [isOpen, setIsOpen] = useState(false);

  const handleViewChange = (view) => {
    onViewChange(view);
    setIsOpen(false);
  };

  return (
    <div className="lg:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
        aria-label={isOpen ? t('common:header.closePanel') : t('common:header.openPanel')}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white shadow-2xl z-50 flex flex-col">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('common:navigation.menu')}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-sm transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {/* Wheels */}
                <button
                  onClick={() => handleViewChange('wheels')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm font-medium transition-all ${
                    currentView === 'wheels'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                  <span className="flex-1 text-left">{t('dashboard:nav.wheels')}</span>
                  {currentView === 'wheels' && wheelCount > 0 && (
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                      {wheelCount}
                    </span>
                  )}
                </button>

                {/* Teams */}
                <button
                  onClick={() => handleViewChange('teams')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm font-medium transition-all ${
                    currentView === 'teams'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="flex-1 text-left">{t('dashboard:nav.teams')}</span>
                </button>

                {/* Invitations */}
                <button
                  onClick={() => handleViewChange('invitations')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm font-medium transition-all relative ${
                    currentView === 'invitations'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="flex-1 text-left">{t('dashboard:nav.invitations')}</span>
                  {invitationCount > 0 && (
                    <span className={`text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold ${
                      currentView === 'invitations' 
                        ? 'bg-white text-blue-600' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {invitationCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Upgrade CTA (for non-premium users) */}
              {!isLoading && !isPremium && !isAdmin && (
                <div className="mt-6 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-sm border border-yellow-200">
                  <div className="flex items-start gap-3 mb-3">
                    <Crown className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {t('dashboard:subscription.upgradeToPremium')}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {t('dashboard:subscription.unlockAllFeatures')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/pricing';
                    }}
                    className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-sm transition-colors text-sm"
                  >
                    {t('dashboard:subscription.seePricing')}
                  </button>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

export default MobileNav;
