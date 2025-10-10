import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { fetchUserWheels, createWheel, deleteWheel, duplicateWheel } from '../../services/wheelService';
import { getMyInvitations } from '../../services/teamService';
import WheelCard from './WheelCard';
import CreateWheelModal from './CreateWheelModal';
import ProfilePage from '../ProfilePage';
import TeamList from '../teams/TeamList';
import MyInvitations from '../teams/MyInvitations';
import { Users, Mail, LayoutGrid } from 'lucide-react';

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
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (currentView === 'wheels') {
      loadWheels();
    }
  }, [currentView]);

  const loadWheels = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchUserWheels();
      setWheels(data);
    } catch (err) {
      console.error('Error loading wheels:', err);
      setError('Kunde inte ladda hjul');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWheel = async (wheelData) => {
    try {
      const newWheelId = await createWheel(wheelData);
      await loadWheels();
      setShowCreateModal(false);
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: 'New wheel skapat!', type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error creating wheel:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte skapa hjul', type: 'error' } 
      });
      window.dispatchEvent(event);
      throw err;
    }
  };

  const handleDeleteWheel = async (wheelId, wheelTitle) => {
    if (!confirm(`Är du säker på att du vill radera "${wheelTitle}"?`)) return;
    
    try {
      await deleteWheel(wheelId);
      await loadWheels();
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Hjul raderat!', type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error deleting wheel:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte radera hjul', type: 'error' } 
      });
      window.dispatchEvent(event);
    }
  };

  const handleDuplicateWheel = async (wheelId) => {
    try {
      await duplicateWheel(wheelId);
      await loadWheels();
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Hjul duplicerat!', type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error duplicating wheel:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte duplicera hjul', type: 'error' } 
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
        <div className="text-lg text-gray-600">Laddar hjul...</div>
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
                  title="Mina hjul"
                >
                  <LayoutGrid className="w-5 h-5" />
                  <span className="text-sm">Hjul</span>
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
                  title="Mina team"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm">Team</span>
                </button>
                
                <button
                  onClick={() => setCurrentView('invitations')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-sm font-medium transition-all relative ${
                    currentView === 'invitations'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title="Inbjudningar"
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">Inbjudningar</span>
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
            
            {/* Right: User Menu */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 hidden sm:inline">{user?.email}</span>
              <button
                onClick={onShowProfile}
                className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
                title="Min profil"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>
              <button
                onClick={handleSignOut}
                className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
                title="Logga ut"
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
            <div className="mb-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Skapa New wheel
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Laddar hjul...</p>
              </div>
            ) : wheels.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 mb-4 mt-4">Du har inga hjul ännu</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Skapa ditt första hjul
                </button>
              </div>
            ) : (
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
              </div>
            )}
          </>
        )}

        {/* Teams View */}
        {currentView === 'teams' && (
          <TeamList />
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
    </div>
  );
}

export default Dashboard;
