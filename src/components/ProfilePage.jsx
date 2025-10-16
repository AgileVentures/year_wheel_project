import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { User, Mail, Key, ArrowLeft, Link as LinkIcon, Calendar, Sheet, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { 
  getUserIntegrations, 
  isProviderConnected, 
  initiateGoogleOAuth, 
  disconnectProvider 
} from '../services/integrationService';

function ProfilePage({ onBack }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation(['common', 'auth']);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Integration states
  const [integrations, setIntegrations] = useState([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState(null);

  // Load integrations on mount and check for OAuth callback
  useEffect(() => {
    loadIntegrations();
    
    // Check for OAuth callback in URL
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');
    const oauthProvider = params.get('provider');
    
    if (oauthSuccess === 'true') {
      const providerName = oauthProvider === 'google_calendar' ? 'Google Calendar' : 
                          oauthProvider === 'google_sheets' ? 'Google Sheets' : 'Google';
      setSuccess(t('common:profilePage.integrationConnected', { provider: providerName }));
      // Clean URL
      window.history.replaceState({}, '', '/profile');
    } else if (oauthError) {
      setError(decodeURIComponent(oauthError));
      // Clean URL
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  const loadIntegrations = async () => {
    try {
      setIntegrationsLoading(true);
      const data = await getUserIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setIntegrationsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (newPassword.length < 6) {
      setError(t('common:profilePage.passwordMinLength'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(t('common:profilePage.passwordsNoMatch'));
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setSuccess(t('common:profilePage.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async (provider, scopes) => {
    setError('');
    setConnectingProvider(provider);
    
    try {
      await initiateGoogleOAuth(provider, scopes);
      const providerName = provider === 'google_calendar' ? 'Google Calendar' : 'Google Sheets';
      setSuccess(t('common:profilePage.integrationConnected', { provider: providerName }));
      await loadIntegrations(); // Reload integrations
    } catch (err) {
      setError(err.message || 'Kunde inte ansluta till Google');
      console.error('Error connecting Google:', err);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnectGoogle = async (provider) => {
    if (!confirm(t('common:profilePage.disconnectConfirm'))) {
      return;
    }

    setError('');
    
    try {
      await disconnectProvider(provider);
      setSuccess(t('common:profilePage.integrationDisconnected'));
      await loadIntegrations(); // Reload integrations
    } catch (err) {
      setError(err.message || 'Kunde inte koppla från integration');
      console.error('Error disconnecting:', err);
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

  const getIntegrationByProvider = (provider) => {
    return integrations.find(i => i.provider === provider);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title={t('common:profilePage.back')}
            >
              <ArrowLeft size={22} />
            </button>
            <img 
              src="/year_wheel_symbol.svg" 
              alt="YearWheel" 
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('common:profilePage.title')}</h1>
              <p className="text-xs text-gray-600">{t('common:profilePage.accountSettings')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('common:profilePage.title')}</h1>
          <p className="text-gray-600">{t('common:profilePage.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm">
            {success}
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User size={20} />
            {t('common:profilePage.accountInfo')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:profilePage.email')}
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-900">{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:profilePage.userId')}
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                <span className="text-sm text-gray-600 font-mono">{user?.id}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:profilePage.memberSince')}
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                <span className="text-gray-900">
                  {new Date(user?.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'sv-SE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Google Integrations */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LinkIcon size={20} />
            {t('common:profilePage.googleIntegrations')}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {t('common:profilePage.googleIntegrationsDescription')}
          </p>

          {integrationsLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 size={20} className="animate-spin" />
              <span>{t('common:profilePage.loadingIntegrations')}</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Calendar Integration */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-sm bg-gray-50">
                <div className="flex items-center gap-3">
                  <Calendar size={24} className="text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">{t('common:profilePage.googleCalendar')}</h3>
                    <p className="text-sm text-gray-600">
                      {t('common:profilePage.googleCalendarDescription')}
                    </p>
                  </div>
                </div>
                
                {getIntegrationByProvider('google_calendar') ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium">{t('common:profilePage.connected')}</span>
                    </div>
                    <button
                      onClick={() => handleDisconnectGoogle('google_calendar')}
                      className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-sm transition-colors"
                    >
                      {t('common:profilePage.disconnect')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectGoogle('google_calendar', [
                      'https://www.googleapis.com/auth/calendar.readonly'
                    ])}
                    disabled={connectingProvider === 'google_calendar'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {connectingProvider === 'google_calendar' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('common:profilePage.connecting')}
                      </>
                    ) : (
                      t('common:profilePage.connectCalendar')
                    )}
                  </button>
                )}
              </div>

              {/* Google Sheets Integration */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-sm bg-gray-50">
                <div className="flex items-center gap-3">
                  <Sheet size={24} className="text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">{t('common:profilePage.googleSheets')}</h3>
                    <p className="text-sm text-gray-600">
                      {t('common:profilePage.googleSheetsDescription')}
                    </p>
                  </div>
                </div>
                
                {getIntegrationByProvider('google_sheets') ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium">{t('common:profilePage.connected')}</span>
                    </div>
                    <button
                      onClick={() => handleDisconnectGoogle('google_sheets')}
                      className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-sm transition-colors"
                    >
                      {t('common:profilePage.disconnect')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectGoogle('google_sheets', [
                      'https://www.googleapis.com/auth/spreadsheets.readonly'
                    ])}
                    disabled={connectingProvider === 'google_sheets'}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {connectingProvider === 'google_sheets' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('common:profilePage.connecting')}
                      </>
                    ) : (
                      t('common:profilePage.connectSheets')
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key size={20} />
            {t('common:profilePage.security')}
          </h2>

          {!isChangingPassword ? (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm transition-colors"
            >
              {t('common:profilePage.changePassword')}
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common:profilePage.newPassword')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common:profilePage.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? t('common:profilePage.updating') : t('common:profilePage.updatePassword')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm transition-colors"
                >
                  {t('common:profilePage.cancel')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-sm shadow-sm border border-red-200 p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            {t('common:profilePage.dangerZone')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('common:profilePage.signOutDescription')}
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors"
          >
            {t('common:profilePage.signOut')}
          </button>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
