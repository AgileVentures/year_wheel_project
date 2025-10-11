import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { User, Mail, Key, ArrowLeft, Link as LinkIcon, Calendar, Sheet, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  getUserIntegrations, 
  isProviderConnected, 
  initiateGoogleOAuth, 
  disconnectProvider 
} from '../services/integrationService';

function ProfilePage({ onBack }) {
  const { user, signOut } = useAuth();
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

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
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
      setError('Lösenordet måste vara minst 6 tecken');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Lösenorden matchar inte');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setSuccess('Lösenord uppdaterat!');
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
      setSuccess(`${provider === 'google_calendar' ? 'Google Calendar' : 'Google Sheets'} ansluten!`);
      await loadIntegrations(); // Reload integrations
    } catch (err) {
      setError(err.message || 'Kunde inte ansluta till Google');
      console.error('Error connecting Google:', err);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnectGoogle = async (provider) => {
    if (!confirm('Är du säker på att du vill koppla från denna integration? Alla ring-kopplingar kommer att tas bort.')) {
      return;
    }

    setError('');
    
    try {
      await disconnectProvider(provider);
      setSuccess('Integration borttagen');
      await loadIntegrations(); // Reload integrations
    } catch (err) {
      setError(err.message || 'Kunde inte koppla från integration');
      console.error('Error disconnecting:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
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
              title="Tillbaka"
            >
              <ArrowLeft size={22} />
            </button>
            <img 
              src="/year_wheel_symbol.svg" 
              alt="YearWheel" 
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Min profil</h1>
              <p className="text-xs text-gray-600">Kontoinställningar</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Min profil</h1>
          <p className="text-gray-600">Hantera dina kontoinställningar</p>
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
            Kontoinformation
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-post
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-900">{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Användar-ID
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                <span className="text-sm text-gray-600 font-mono">{user?.id}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medlem sedan
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                <span className="text-gray-900">
                  {new Date(user?.created_at).toLocaleDateString('sv-SE', {
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
            Google Integrationer
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Anslut ditt Google-konto för att synkronisera data från Calendar och Sheets till dina hjul.
          </p>

          {integrationsLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 size={20} className="animate-spin" />
              <span>Laddar integrationer...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google Calendar Integration */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-sm bg-gray-50">
                <div className="flex items-center gap-3">
                  <Calendar size={24} className="text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Google Calendar</h3>
                    <p className="text-sm text-gray-600">
                      Synkronisera händelser från dina kalendrar
                    </p>
                  </div>
                </div>
                
                {getIntegrationByProvider('google_calendar') ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium">Ansluten</span>
                    </div>
                    <button
                      onClick={() => handleDisconnectGoogle('google_calendar')}
                      className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-sm transition-colors"
                    >
                      Koppla från
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
                        Ansluter...
                      </>
                    ) : (
                      'Anslut Calendar'
                    )}
                  </button>
                )}
              </div>

              {/* Google Sheets Integration */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-sm bg-gray-50">
                <div className="flex items-center gap-3">
                  <Sheet size={24} className="text-green-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">Google Sheets</h3>
                    <p className="text-sm text-gray-600">
                      Importera data från kalkylblad
                    </p>
                  </div>
                </div>
                
                {getIntegrationByProvider('google_sheets') ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={20} />
                      <span className="text-sm font-medium">Ansluten</span>
                    </div>
                    <button
                      onClick={() => handleDisconnectGoogle('google_sheets')}
                      className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-sm transition-colors"
                    >
                      Koppla från
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
                        Ansluter...
                      </>
                    ) : (
                      'Anslut Sheets'
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
            Säkerhet
          </h2>

          {!isChangingPassword ? (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm transition-colors"
            >
              Ändra lösenord
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nytt lösenord
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
                  Bekräfta nytt lösenord
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
                  {loading ? 'Uppdaterar...' : 'Uppdatera lösenord'}
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
                  Avbryt
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-sm shadow-sm border border-red-200 p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Farlig zon
          </h2>
          <p className="text-gray-600 mb-4">
            När du loggar ut kommer du att återvända till inloggningssidan.
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors"
          >
            Logga ut
          </button>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
