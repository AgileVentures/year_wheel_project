import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreVertical, Users, Calendar, Star } from 'lucide-react';
import { getUserTeams, assignWheelToTeam, removeWheelFromTeam } from '../../services/teamService';
import { fetchPages, toggleShowOnLanding } from '../../services/wheelService';
import { supabase } from '../../lib/supabase';

function WheelCard({ wheel, onSelect, onDelete, onUpdate, isTeamContext = false }) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const [showMenu, setShowMenu] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [ringColors, setRingColors] = useState([]);
  const menuRef = useRef(null);

  const locale = i18n.language === 'sv' ? 'sv-SE' : 'en-US';
  const formattedDate = new Date(wheel.updated_at).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const isTeamWheel = wheel.team_id && wheel.teams;

  // Load page count and colors
  useEffect(() => {
    const loadWheelData = async () => {
      try {
        // Load pages
        const pages = await fetchPages(wheel.id);
        setPageCount(pages.length);

        // Load activity group colors for the wheel preview
        const { data: activityGroups, error } = await supabase
          .from('activity_groups')
          .select('color')
          .eq('wheel_id', wheel.id)
          .eq('visible', true)
          .limit(3);

        if (error) throw error;

        // Extract colors, fallback to default blue/purple palette
        const colors = activityGroups && activityGroups.length > 0
          ? activityGroups.map(g => g.color)
          : ['#e0e7ff', '#dbeafe', '#e5e7eb'];

        setRingColors(colors);
      } catch (err) {
        console.error('Error loading wheel data:', err);
        setPageCount(0);
        setRingColors(['#e0e7ff', '#dbeafe', '#e5e7eb']); // Fallback colors
      }
    };
    loadWheelData();
  }, [wheel.id]);

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
        detail: { message: t('dashboard:messages.movedToTeam'), type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error moving wheel to team:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.moveError'), type: 'error' } 
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
        detail: { message: t('dashboard:messages.madePersonal'), type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error removing wheel from team:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.moveError'), type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShowOnLanding = async () => {
    try {
      setLoading(true);
      await toggleShowOnLanding(wheel.id, !wheel.show_on_landing);
      setShowMenu(false);
      if (onUpdate) onUpdate();
      
      const messageKey = wheel.show_on_landing 
        ? 'dashboard:messages.removedFromLanding' 
        : 'dashboard:messages.addedToLanding';
      
      const event = new CustomEvent('showToast', { 
        detail: { message: t(messageKey), type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error('Error toggling show on landing:', err);
      const event = new CustomEvent('showToast', { 
        detail: { message: t('dashboard:messages.toggleError'), type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-sm p-5 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onSelect}
    >
      {/* Wheel Preview */}
      <div className="aspect-square bg-gray-100 rounded-sm mb-4 flex items-center justify-center relative">
        <svg viewBox="0 0 360 360" className="transform -rotate-90 w-full h-full p-8">
          {/* Background */}
          <circle cx="180" cy="180" r="175" fill="#fafafa" />
          
          {/* Outer ring - First color */}
          <circle 
            cx="180" 
            cy="180" 
            r="165" 
            fill="none" 
            stroke={ringColors[0] || "#e0e7ff"} 
            strokeWidth="28" 
          />
          
          {/* Middle ring - Second color */}
          <circle 
            cx="180" 
            cy="180" 
            r="132" 
            fill="none" 
            stroke={ringColors[1] || "#dbeafe"} 
            strokeWidth="26" 
          />
          
          {/* Inner ring - Third color or gray */}
          <circle 
            cx="180" 
            cy="180" 
            r="102" 
            fill="none" 
            stroke={ringColors[2] || "#e5e7eb"} 
            strokeWidth="24" 
          />
          
          {/* Month ring */}
          <circle cx="180" cy="180" r="86" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          
          {/* Week ring */}
          <circle cx="180" cy="180" r="78" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          
          {/* Center */}
          <circle cx="180" cy="180" r="72" fill="white" />
        </svg>

        {/* Menu Button - Positioned absolutely over the preview */}
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 bg-white/80 backdrop-blur-sm rounded-sm opacity-0 group-hover:opacity-100"
            title={t('common:actions.more', { defaultValue: 'More options' })}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
              
          {showMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-sm shadow-lg z-20">
              {!isTeamContext && isTeamWheel && (
                <>
                  <div className="px-4 py-2 border-b border-gray-200 text-xs text-gray-500 font-medium">
                    {t('dashboard:wheel.sharedWith', { team: wheel.teams.name })}
                  </div>
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
                    {t('dashboard:wheel.moveToTeam')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromTeam();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-200"
                    disabled={loading}
                  >
                    {t('dashboard:wheel.makePersonal')}
                  </button>
                </>
              )}
              {!isTeamContext && !isTeamWheel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTeamSelector(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2 border-b border-gray-200"
                  disabled={loading}
                >
                  <Users className="w-4 h-4" />
                  {t('dashboard:wheel.shareWithTeam')}
                </button>
              )}
              {wheel.is_template && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleShowOnLanding();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-2 border-b border-gray-200"
                  disabled={loading}
                >
                  <Star className={`w-4 h-4 ${wheel.show_on_landing ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  {wheel.show_on_landing ? t('dashboard:wheel.hideFromLanding') : t('dashboard:wheel.showOnLanding')}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600"
                  disabled={loading}
                >
                  {t('dashboard:wheel.delete')}
                </button>
              )}
            </div>
          )}

          {showTeamSelector && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-sm shadow-lg z-20 max-h-64 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
                {t('common:labels.selectTeam', { defaultValue: 'Select team' })}
              </div>
              {teams.filter(team => team.id !== wheel.team_id).length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  {teams.length === 0 ? t('common:messages.noTeams', { defaultValue: 'You have no teams yet' }) : t('common:messages.noOtherTeams', { defaultValue: 'No other teams available' })}
                </div>
              ) : (
                teams
                  .filter(team => team.id !== wheel.team_id)
                  .map((team) => (
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

      {/* Card Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 truncate">{wheel.title}</h3>
        
        {/* Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">
            {t('dashboard:wheel.year', { year: wheel.year })}
          </span>
          {pageCount > 1 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-600" title={t('dashboard:wheel.years', { count: pageCount })}>
                <Calendar className="w-3 h-3" />
                {t('dashboard:wheel.years', { count: pageCount })}
              </span>
            </>
          )}
          {isTeamWheel && (
            <>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-blue-700" title={t('dashboard:wheel.sharedWith', { team: wheel.teams.name })}>
                <Users className="w-3 h-3" />
                {t('common:navigation.teams')}
              </span>
            </>
          )}
        </div>
        
        <p className="text-sm text-gray-500">
          {t('dashboard:wheel.lastUpdated', { date: formattedDate })}
        </p>
      </div>
    </div>
  );
}

export default WheelCard;
