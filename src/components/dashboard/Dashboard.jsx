import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { fetchUserWheels, createWheel, deleteWheel, duplicateWheel } from '../../services/wheelService';
import WheelCard from './WheelCard';

function Dashboard({ onSelectWheel }) {
  const { user, signOut } = useAuth();
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWheels();
  }, []);

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

  const handleCreateWheel = async () => {
    try {
      const newWheelId = await createWheel({
        title: 'Nytt hjul',
        year: new Date().getFullYear(),
      });
      await loadWheels();
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Nytt hjul skapat!', type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error creating wheel:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte skapa hjul', type: 'error' } 
      });
      window.dispatchEvent(event);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mina hjul</h1>
            <p className="text-sm text-gray-600 mt-1">
              {wheels.length} {wheels.length === 1 ? 'hjul' : 'hjul'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              Logga ut
            </button>
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

        <div className="mb-6">
          <button
            onClick={handleCreateWheel}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Skapa nytt hjul
          </button>
        </div>

        {wheels.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-4 mt-4">Du har inga hjul ännu</p>
            <button
              onClick={handleCreateWheel}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
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
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
