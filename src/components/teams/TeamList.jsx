import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Crown, Shield, User } from 'lucide-react';
import { getUserTeams } from '../../services/teamService';
import CreateTeamModal from './CreateTeamModal';
import TeamDetails from './TeamDetails';

const TeamList = ({ onSelectWheel }) => {
  const { t, i18n } = useTranslation(['teams', 'common']);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await getUserTeams();
      setTeams(data);
      setError(null);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamCreated = (newTeam) => {
    // Add team_members structure for consistency with getUserTeams()
    const teamWithMembers = {
      ...newTeam,
      team_members: [{ role: 'owner' }] // User is owner of newly created team
    };
    setTeams(prev => [teamWithMembers, ...prev]);
    setShowCreateModal(false);
  };

  const handleTeamUpdated = (updatedTeam) => {
    setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  };

  const handleTeamDeleted = (teamId) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setSelectedTeam(null);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner':
        return t('teams:roles.owner');
      case 'admin':
        return t('teams:roles.admin');
      default:
        return t('teams:roles.member');
    }
  };

  if (selectedTeam) {
    return (
      <TeamDetails
        teamId={selectedTeam}
        onBack={() => setSelectedTeam(null)}
        onTeamUpdated={handleTeamUpdated}
        onTeamDeleted={handleTeamDeleted}
        onSelectWheel={onSelectWheel}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('teams:title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('teams:subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('teams:create')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t('common:messages.loading')}</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-sm border-2 border-dashed border-gray-300">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('teams:noTeams')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('teams:noTeamsDescription')}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('teams:createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              data-cy="team-card"
              data-team-name={team.name}
              onClick={() => setSelectedTeam(team.id)}
              className="bg-white border border-gray-200 rounded-sm p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                </div>
                <div className="flex items-center gap-1" title={getRoleLabel(team.team_members?.[0]?.role || 'member')}>
                  {getRoleIcon(team.team_members?.[0]?.role || 'member')}
                </div>
              </div>
              
              {team.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {team.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>
                  {t('teams:member', { count: team.team_members?.length || 0 })}
                </span>
                <span>
                  {new Date(team.created_at).toLocaleDateString(i18n.language === 'sv' ? 'sv-SE' : 'en-US')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onTeamCreated={handleTeamCreated}
        />
      )}
    </div>
  );
};

export default TeamList;
