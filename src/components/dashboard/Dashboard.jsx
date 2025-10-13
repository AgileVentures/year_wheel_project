import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { fetchUserWheels, fetchTeamWheels, createWheel, deleteWheel, duplicateWheel } from '../../services/wheelService';
import { getMyInvitations } from '../../services/teamService';
import WheelCard from './WheelCard';
import CreateWheelCard from './CreateWheelCard';
import CreateWheelModal from './CreateWheelModal';
import ProfilePage from '../ProfilePage';
import TeamList from '../teams/TeamList';
import MyInvitations from '../teams/MyInvitations';
import { Users, Mail, LayoutGrid, Crown, Shield } from 'lucide-react';
import { useUsageLimits } from '../../hooks/useSubscription';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionModal from '../subscription/SubscriptionModal';
import UpgradePrompt from '../subscription/UpgradePrompt';
import SubscriptionSettings from '../subscription/SubscriptionSettings';
import LanguageSwitcher from '../LanguageSwitcher';

function Dashboard({ onSelectWheel }) {
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
  const { user, signOut } = useAuth();
  const { t } = useTranslation(['dashboard', 'common', 'subscription']);
  const [wheels, setWheels] = useState([]);
  const [teamWheels, setTeamWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Subscription state
  const { hasReachedWheelLimit, wheelCount, maxWheels, isPremium, loading: subscriptionLoading } = useUsageLimits();
  const { isAdmin: isAdminUser, refresh: refreshSubscription } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSubscriptionSettings, setShowSubscriptionSettings] = useState(false);

  // Check for successful Stripe checkout on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      // User returned from successful checkout
      console.log('[Dashboard] Stripe checkout successful, refreshing subscription...');
      
      // Show success message
      const event = new CustomEvent('showToast', { 
        detail: { message: t('subscription:messages.activated'), type: 'success' } 
      });
      window.dispatchEvent(event);
      
      // Poll subscription status (webhook might take a few seconds)
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 2000; // 2 seconds
      
      const pollSubscription = setInterval(async () => {
        attempts++;
        console.log(`[Dashboard] Polling subscription status (attempt ${attempts}/${maxAttempts})...`);
        
        await refreshSubscription();
        
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
  }, []); // Run only once on mount

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
    if (!confirm(t('dashboard:messages.confirmDelete', { title: wheelTitle }))) return;
    
    try {
      await deleteWheel(wheelId);
      await loadWheels();
      // CRITICAL: Refresh subscription to update wheel count
      await refreshSubscription();
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.deleted'), type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error deleting wheel:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.deleteError'), type: 'error' } 
      });
      window.dispatchEvent(event);
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
      await signOut();
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            {/* Left: Symbol & Navigation */}
            <div className="flex items-center gap-8">
              <img 
                src="/year_wheel_symbol.svg" 
                alt="YearWheel" 
                className="w-12 h-12 hover:scale-110 transition-transform"
              />
              
              {/* Icon-based Navigation */}
              <nav className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('wheels')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-sm font-medium transition-all ${
                    currentView === 'wheels'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={t('dashboard:nav.myWheelsTitle')}
                >
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-sm">{t('dashboard:nav.wheels')}</span>
                  {currentView === 'wheels' && wheels.length > 0 && (
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {wheels.length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setCurrentView('teams')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-sm font-medium transition-all ${
                    currentView === 'teams'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={t('dashboard:nav.myTeamsTitle')}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm">{t('dashboard:nav.teams')}</span>
                </button>
                
                <button
                  onClick={() => setCurrentView('invitations')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-sm font-medium transition-all relative ${
                    currentView === 'invitations'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={t('common:navigation.invitations')}
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">{t('dashboard:nav.invitations')}</span>
                  {invitationCount > 0 && (
                    <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold ${
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
            
            {/* Right: Subscription & User Menu */}
            <div className="flex items-center gap-3">
              {/* Admin Badge */}
              {!subscriptionLoading && isAdminUser && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-sm font-semibold shadow-md">
                  <Shield size={18} />
                  <span className="text-sm hidden sm:inline">{t('subscription:subscription.admin')}</span>
                </div>
              )}
              
              {/* Subscription Button */}
              {!subscriptionLoading && !isAdminUser && (
                <button
                  onClick={() => isPremium ? setShowSubscriptionSettings(true) : window.location.href = '/pricing'}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-sm font-semibold transition-all
                    ${isPremium 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md' 
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md hover:shadow-lg'
                    }
                  `}
                  title={isPremium ? t('dashboard:subscription.manage') : t('dashboard:subscription.seePricing')}
                >
                  <Crown size={18} className={isPremium ? 'animate-pulse' : ''} />
                  <span className="text-sm hidden sm:inline">
                    {isPremium ? t('dashboard:subscription.premium') : t('dashboard:subscription.upgrade')}
                  </span>
                </button>
              )}
              
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
              <button
                onClick={onShowProfile}
                className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
                title={t('dashboard:profile.title')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>
              <button
                onClick={handleSignOut}
                className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
                title={t('common:navigation.logout')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
}

export default Dashboard;
