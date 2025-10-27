import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { fetchUserWheels, fetchTeamWheels, createWheel, deleteWheel, duplicateWheel, fetchTemplateWheels, checkIsAdmin } from '../../services/wheelService';
import { getMyInvitations } from '../../services/teamService';
import WheelCard from './WheelCard';
import CreateWheelCard from './CreateWheelCard';
import CreateWheelModal from './CreateWheelModal';
import ProfilePage from '../ProfilePage';
import TeamList from '../teams/TeamList';
import MyInvitations from '../teams/MyInvitations';
import { Users, Mail, LayoutGrid, Crown, Shield, Sparkles, User, LogOut, ChevronDown, TrendingUp } from 'lucide-react';
import { useUsageLimits } from '../../hooks/useSubscription';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionModal from '../subscription/SubscriptionModal';
import UpgradePrompt from '../subscription/UpgradePrompt';
import SubscriptionSettings from '../subscription/SubscriptionSettings';
import LanguageSwitcher from '../LanguageSwitcher';
import Footer from '../Footer';
import MobileNav from './MobileNav';
import { showConfirmDialog, showToast } from '../../utils/dialogs';
import { trackPurchase } from '../../utils/gtm';

// User Menu Dropdown Component
function UserMenu({ user, onShowProfile, onSignOut, isPremium, isAdmin, onManageSubscription }) {
  const { t } = useTranslation(['dashboard', 'common', 'subscription']);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
        title={user?.email}
        aria-label={t('dashboard:profile.title')}
      >
        <User size={20} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-sm shadow-xl z-50">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate mb-2">{user?.email}</p>
              
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-sm text-xs font-semibold">
                    <Shield size={12} />
                    {t('subscription:subscription.admin')}
                  </span>
                )}
                {isPremium && !isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-sm text-xs font-semibold">
                    <Crown size={12} />
                    {t('dashboard:subscription.premium')}
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                onShowProfile();
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 transition-colors"
            >
              <User size={18} />
              {t('dashboard:profile.title')}
            </button>
            
            {/* Subscription Management (for premium users) */}
            {(isPremium || isAdmin) && onManageSubscription && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onManageSubscription();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 transition-colors"
              >
                <Crown size={18} />
                {t('dashboard:subscription.manage')}
              </button>
            )}
            
            {/* Admin Panel Link */}
            {isAdmin && (
              <>
                <div className="border-t border-gray-200" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/admin';
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 transition-colors"
                >
                  <Shield size={18} />
                  Admin Panel
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/forecasts';
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 transition-colors"
                >
                  <TrendingUp size={18} />
                  Revenue Forecasts
                </button>
              </>
            )}
            
            <div className="border-t border-gray-200" />
            
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 text-red-600 transition-colors"
            >
              <LogOut size={18} />
              {t('common:navigation.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Dashboard({ onSelectWheel }) {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  
  // Check URL params for initial view
  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get('view') || 'wheels';
  const [currentView, setCurrentView] = useState(initialView); // 'wheels', 'teams', 'invitations'
  const [invitationCount, setInvitationCount] = useState(0);

  // Load invitation count
  useEffect(() => {
    loadInvitationCount();
  }, []);

  const loadInvitationCount = async () => {
    try {
      const invitations = await getMyInvitations();
      setInvitationCount(invitations.length);
    } catch (err) {
      console.error('Error loading invitations:', err);
    }
  };

  const handleInvitationAccepted = () => {
    // Refresh invitation count
    loadInvitationCount();
    // Switch to teams view
    setCurrentView('teams');
  };
  
  if (showProfile) {
    return <ProfilePage onBack={() => setShowProfile(false)} />;
  }
  
  return (
    <DashboardContent 
      onSelectWheel={onSelectWheel} 
      onShowProfile={() => setShowProfile(true)}
      currentView={currentView}
      setCurrentView={setCurrentView}
      invitationCount={invitationCount}
      onInvitationAccepted={handleInvitationAccepted}
      refreshInvitations={loadInvitationCount}
    />
  );
}

function DashboardContent({ onSelectWheel, onShowProfile, currentView, setCurrentView, invitationCount, onInvitationAccepted, refreshInvitations }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation(['dashboard', 'common', 'subscription', 'auth']);
  const [wheels, setWheels] = useState([]);
  const [teamWheels, setTeamWheels] = useState([]);
  const [templateWheels, setTemplateWheels] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Subscription state
  const { hasReachedWheelLimit, wheelCount, maxWheels, isPremium, loading: subscriptionLoading, refresh: refreshSubscription } = useUsageLimits();
  const { isAdmin: isAdminUser, subscription } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSubscriptionSettings, setShowSubscriptionSettings] = useState(false);

  // Check for successful Stripe checkout on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId && user) {
      // User returned from successful checkout
      console.log('[Dashboard] Stripe checkout successful, refreshing subscription...');
      
      // Show success message
      const event = new CustomEvent('showToast', { 
        detail: { message: t('subscription:messages.activated'), type: 'success' } 
      });
      window.dispatchEvent(event);
      
      // Refresh subscription data
      refreshSubscription();
      
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
      
      // Poll subscription status (webhook might take a few seconds)
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 2000; // 2 seconds
      let hasTrackedPurchase = false;
      
      const pollSubscription = setInterval(async () => {
        attempts++;
        console.log(`[Dashboard] Polling subscription status (attempt ${attempts}/${maxAttempts})...`);
        
        await refreshSubscription();
        
        // Track purchase event once subscription is confirmed
        // We check isPremium from subscription hook to confirm backend processed the payment
        if (!hasTrackedPurchase && subscription) {
          try {
            // Determine plan type from subscription data
            const planType = subscription.plan_type; // 'monthly' or 'yearly'
            
            // Calculate value based on plan
            const value = planType === 'monthly' ? 79 : 768;
            
            // Track purchase event to GTM
            trackPurchase({
              transactionId: subscription.stripe_subscription_id || sessionId,
              userId: user.id,
              plan: planType,
              value: value,
              currency: 'SEK'
            });
            
            hasTrackedPurchase = true;
            console.log('[Dashboard] GTM purchase event tracked:', { planType, value, userId: user.id });
          } catch (trackError) {
            console.error('[Dashboard] GTM purchase tracking error:', trackError);
            // Don't throw - tracking failure shouldn't block user experience
          }
        }
        
        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollSubscription);
          console.log('[Dashboard] Stopped polling subscription status');
          
          // Show final message
          const finalEvent = new CustomEvent('showToast', { 
            detail: { 
              message: t('subscription:messages.activatedFinal'), 
              type: 'success' 
            } 
          });
          window.dispatchEvent(finalEvent);
        }
      }, pollInterval);
      
      // Clean URL by removing session_id param
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl);
      
      // Cleanup interval on unmount
      return () => clearInterval(pollSubscription);
    }
  }, [user, subscription, refreshSubscription, t]); // Add dependencies

  // Check for pending template copy after authentication
  useEffect(() => {
    const pendingCopy = localStorage.getItem('pendingTemplateCopy');
    
    if (pendingCopy && user) {
      console.log('[Dashboard] Found pending template copy, redirecting to preview page...');
      
      try {
        const intent = JSON.parse(pendingCopy);
        console.log('[Dashboard] Template intent:', intent);
        
        // Redirect to the preview page where the copy will be executed
        navigate(`/preview-wheel/${intent.wheelId}`);
      } catch (error) {
        console.error('[Dashboard] Error parsing pending template copy:', error);
        localStorage.removeItem('pendingTemplateCopy');
      }
    }
  }, [user, navigate]);

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
      
      // Load templates if admin
      if (adminStatus) {
        const templates = await fetchTemplateWheels();
        setTemplateWheels(templates);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (currentView === 'wheels') {
      loadWheels();
    }
  }, [currentView]);

  const loadWheels = async () => {
    setLoading(true);
    setError('');
    try {
      const [personalWheels, sharedWheels] = await Promise.all([
        fetchUserWheels(),
        fetchTeamWheels()
      ]);
      setWheels(personalWheels);
      setTeamWheels(sharedWheels);
      
      // Reload templates if admin
      if (isAdmin) {
        const templates = await fetchTemplateWheels();
        setTemplateWheels(templates);
      }
    } catch (err) {
      console.error('Error loading wheels:', err);
      setError(t('dashboard:error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWheelClick = () => {
    // Check if user has reached wheel limit
    if (hasReachedWheelLimit) {
      setShowUpgradePrompt(true);
      return;
    }
    
    // Open create modal if within limits
    setShowCreateModal(true);
  };

  const handleCreateWheel = async (wheelData) => {
    try {
      const newWheelId = await createWheel(wheelData);
      await loadWheels();
      // Refresh subscription to update wheel count
      await refreshSubscription();
      setShowCreateModal(false);
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.created'), type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error creating wheel:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.createError'), type: 'error' } 
      });
      window.dispatchEvent(event);
      throw err;
    }
  };

  const handleDeleteWheel = async (wheelId, wheelTitle) => {
    const confirmed = await showConfirmDialog({
      title: t('dashboard:messages.deleteTitle', { defaultValue: 'Radera hjul' }),
      message: t('dashboard:messages.confirmDelete', { title: wheelTitle }),
      confirmText: t('common:actions.delete', { defaultValue: 'Radera' }),
      cancelText: t('common:actions.cancel', { defaultValue: 'Avbryt' }),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (!confirmed) return;
    
    try {
      await deleteWheel(wheelId);
      await loadWheels();
      // CRITICAL: Refresh subscription to update wheel count
      await refreshSubscription();
      // Show success feedback
      showToast(t('dashboard:messages.deleted'), 'success');
    } catch (err) {
      console.error('Error deleting wheel:', err);
      showToast(t('dashboard:messages.deleteError'), 'error');
    }
  };

  const handleDuplicateWheel = async (wheelId) => {
    try {
      await duplicateWheel(wheelId);
      await loadWheels();
      // Refresh subscription to update wheel count
      await refreshSubscription();
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.duplicated'), type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error duplicating wheel:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.duplicateError'), type: 'error' } 
      });
      window.dispatchEvent(event);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(() => {
        // Show toast message
        const event = new CustomEvent('showToast', {
          detail: { message: t('auth:goodbyeMessage'), type: 'success' }
        });
        window.dispatchEvent(event);
        
        // Navigate to root path
        navigate('/');
      });
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">{t('dashboard:loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex justify-between items-center gap-4">
            {/* Left: Logo & Navigation */}
            <div className="flex items-center gap-3 sm:gap-8 min-w-0 flex-1">
              <img 
                src="/year_wheel_logo.svg" 
                alt="YearWheel" 
                className="h-6 sm:h-8 w-auto flex-shrink-0"
              />
              
              {/* Mobile Navigation */}
              <MobileNav 
                currentView={currentView}
                onViewChange={setCurrentView}
                wheelCount={wheels.length}
                invitationCount={invitationCount}
                isPremium={isPremium}
                isAdmin={isAdminUser}
                isLoading={subscriptionLoading}
              />
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1 sm:gap-2 overflow-x-auto">
                <button
                  onClick={() => setCurrentView('wheels')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-sm font-medium transition-all whitespace-nowrap ${
                    currentView === 'wheels'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={t('dashboard:nav.myWheelsTitle')}
                >
                  <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{t('dashboard:nav.wheels')}</span>
                  {currentView === 'wheels' && wheels.length > 0 && (
                    <span className="bg-white/20 text-white text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                      {wheels.length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setCurrentView('teams')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-sm font-medium transition-all whitespace-nowrap ${
                    currentView === 'teams'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={t('dashboard:nav.myTeamsTitle')}
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{t('dashboard:nav.teams')}</span>
                </button>
                
                <button
                  onClick={() => setCurrentView('invitations')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-sm font-medium transition-all relative whitespace-nowrap ${
                    currentView === 'invitations'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={t('common:navigation.invitations')}
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{t('dashboard:nav.invitations')}</span>
                  {invitationCount > 0 && (
                    <span className={`text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-semibold ${
                      currentView === 'invitations' 
                        ? 'bg-white text-blue-600' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {invitationCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>
            
            {/* Right: User Menu */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {/* Subscription Button (only show for non-premium users) */}
              {!subscriptionLoading && !isPremium && !isAdminUser && (
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-sm font-semibold transition-all bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg"
                  title={t('dashboard:subscription.seePricing')}
                >
                  <Crown size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="text-xs sm:text-sm hidden md:inline">
                    {t('dashboard:subscription.upgrade')}
                  </span>
                </button>
              )}
              
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {/* User Menu Dropdown */}
              <UserMenu 
                user={user}
                onShowProfile={onShowProfile}
                onSignOut={handleSignOut}
                isPremium={isPremium}
                isAdmin={isAdminUser}
                onManageSubscription={() => setShowSubscriptionSettings(true)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Wheels View */}
        {currentView === 'wheels' && (
          <>
            {/* Header with title and usage indicator */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('dashboard:title')}</h2>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">{t('dashboard:subtitle')}</p>
                
                {/* Usage indicator for free users */}
                {!isPremium && !subscriptionLoading && (
                  <div className="text-sm text-gray-600">
                    <span className={wheelCount >= maxWheels ? 'text-orange-600 font-semibold' : ''}>
                      {t('dashboard:wheelCount', { count: wheelCount, max: maxWheels })}
                    </span>
                    {wheelCount >= maxWheels && (
                      <span className="ml-2 text-orange-600">
                        {t('dashboard:limitReached')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">{t('dashboard:loading')}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Personal Wheels Section */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard:myWheels')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wheels.map((wheel) => (
                      <WheelCard
                        key={wheel.id}
                        wheel={wheel}
                        onSelect={() => onSelectWheel(wheel.id)}
                        onDelete={() => handleDeleteWheel(wheel.id, wheel.title)}
                        onUpdate={loadWheels}
                      />
                    ))}
                    
                    {/* Create New Wheel Card - Always show in grid */}
                    <CreateWheelCard 
                      onClick={handleCreateWheelClick}
                      hasReachedLimit={hasReachedWheelLimit}
                    />
                  </div>
                </section>

                {/* Team Wheels Section */}
                {teamWheels.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{t('dashboard:teamWheels')}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {teamWheels.map((wheel) => (
                        <WheelCard
                          key={wheel.id}
                          wheel={wheel}
                          onSelect={() => onSelectWheel(wheel.id)}
                          onUpdate={loadWheels}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Template Wheels Section (Admin Only) */}
                {isAdmin && templateWheels.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Template-hjul</h3>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        Endast Admin
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Dessa hjul visas som mallar på startsidan och kan användas som exempel av alla användare.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templateWheels.map((wheel) => (
                        <WheelCard
                          key={wheel.id}
                          wheel={wheel}
                          onSelect={() => onSelectWheel(wheel.id)}
                          onUpdate={loadWheels}
                          isTemplate={true}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {/* Teams View */}
        {currentView === 'teams' && (
          <TeamList onSelectWheel={onSelectWheel} />
        )}

        {/* Invitations View */}
        {currentView === 'invitations' && (
          <MyInvitations 
            onInvitationAccepted={onInvitationAccepted}
          />
        )}
      </main>

      {/* Create Wheel Modal */}
      {showCreateModal && (
        <CreateWheelModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWheel}
        />
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          title={t('subscription:limitReached.title')}
          message={t('subscription:limitReached.message', { current: wheelCount, max: maxWheels })}
          currentUsage={wheelCount}
          limit={maxWheels}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            setShowSubscriptionModal(true);
          }}
          onCancel={() => setShowUpgradePrompt(false)}
        />
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal 
          onClose={() => setShowSubscriptionModal(false)}
          currentPlan={isPremium ? 'premium' : 'free'}
        />
      )}

      {/* Subscription Settings Modal */}
      {showSubscriptionSettings && (
        <SubscriptionSettings 
          onClose={() => setShowSubscriptionSettings(false)}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Dashboard;
