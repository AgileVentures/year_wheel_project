import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Users } from 'lucide-react';
import { getUserTeams, assignWheelToTeam, removeWheelFromTeam } from '../../services/teamService';

function WheelCard({ wheel, onSelect, onDelete, onUpdate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  const formattedDate = new Date(wheel.updated_at).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const isTeamWheel = wheel.team_id && wheel.teams;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowTeamSelector(false);
      }
    };

    if (showMenu || showTeamSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showTeamSelector]);

  useEffect(() => {
    if (showTeamSelector) {
      loadTeams();
    }
  }, [showTeamSelector]);

  const loadTeams = async () => {
    try {
      const data = await getUserTeams();
      setTeams(data);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  const handleMoveToTeam = async (teamId) => {
    try {
      setLoading(true);
      await assignWheelToTeam(wheel.id, teamId);
      setShowTeamSelector(false);
      setShowMenu(false);
      if (onUpdate) onUpdate();
      
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Hjul flyttat till team!', type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error moving wheel to team:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte flytta hjul', type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromTeam = async () => {
    try {
      setLoading(true);
      await removeWheelFromTeam(wheel.id);
      setShowMenu(false);
      if (onUpdate) onUpdate();
      
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Hjul gjort personligt!', type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error removing wheel from team:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte ta bort från team', type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-sm shadow hover:shadow-lg transition-shadow overflow-hidden border border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {wheel.title}
          </h3>
          <div className="flex items-center gap-2">
            {isTeamWheel && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                <Users className="w-3 h-3" />
                {wheel.teams.name}
              </span>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Mer alternativ"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-sm shadow-lg z-10">
                  {!isTeamWheel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTeamSelector(true);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2"
                      disabled={loading}
                    >
                      <Users className="w-4 h-4" />
                      Flytta till team
                    </button>
                  )}
                  {isTeamWheel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromTeam();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                      disabled={loading}
                    >
                      Gör personligt
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600"
                    disabled={loading}
                  >
                    Radera hjul
                  </button>
                </div>
              )}

              {showTeamSelector && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-sm shadow-lg z-10 max-h-64 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
                    Välj team
                  </div>
                  {teams.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Du har inga team än
                    </div>
                  ) : (
                    teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToTeam(team.id);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                        disabled={loading}
                      >
                        {team.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          År: {wheel.year}
        </p>
        <p className="text-xs text-gray-500">
          Senast ändrad: {formattedDate}
        </p>
      </div>
      <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
        <button
          onClick={onSelect}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Öppna
        </button>
      </div>
    </div>
  );
}

export default WheelCard;
