import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WheelLoader from '../WheelLoader';
import { 
  Users, 
  Crown, 
  Shield, 
  UserCheck,
  Calendar,
  Eye,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  Circle as CircleIcon
} from 'lucide-react';

export default function AdminTeams({ teams, onRefresh, loading }) {
  const { t } = useTranslation(['admin', 'common']);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getRoleBadge = (role) => {
    const roles = {
      owner: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Crown },
      admin: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Shield },
      member: { bg: 'bg-gray-100', text: 'text-gray-800', icon: UserCheck },
    };

    const roleConfig = roles[role] || roles.member;
    const Icon = roleConfig.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleConfig.bg} ${roleConfig.text}`}>
        <Icon size={12} />
        {role}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTeams = teams.filter(team => 
    team.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeamExpand = (teamId) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <WheelLoader size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and search */}
      <div className="bg-white rounded-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users className="text-gray-500" size={20} />
              <div>
                <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
                <p className="text-xs text-gray-500">Totalt antal team</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="text-gray-500" size={20} />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {teams.reduce((sum, team) => sum + (team.members?.length || 0), 0)}
                </p>
                <p className="text-xs text-gray-500">Totalt antal medlemmar</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Sök team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-gray-900 text-white rounded-sm text-sm hover:bg-gray-800"
            >
              Uppdatera
            </button>
          </div>
        </div>
      </div>

      {/* Teams list */}
      <div className="space-y-3">
        {filteredTeams.length === 0 ? (
          <div className="bg-white rounded-sm border border-gray-200 p-8 text-center">
            <Users className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600">
              {searchTerm ? 'Inga team matchade sökningen' : 'Inga team hittades'}
            </p>
          </div>
        ) : (
          filteredTeams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-sm border border-gray-200 overflow-hidden"
            >
              {/* Team Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleTeamExpand(team.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {team.name}
                      </h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {team.members?.length || 0} medlemmar
                      </span>
                    </div>
                    {team.description && (
                      <p className="text-sm text-gray-600 mb-2">{team.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Mail size={14} />
                        <span>Ägare: {team.owner_email || 'Okänd'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Skapad: {formatDate(team.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CircleIcon size={14} />
                        <span>{team.wheel_count || 0} hjul</span>
                      </div>
                    </div>
                  </div>
                  <button className="ml-4 p-1 hover:bg-gray-100 rounded">
                    {expandedTeam === team.id ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Team Details */}
              {expandedTeam === team.id && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Medlemmar</h4>
                    {team.members && team.members.length > 0 ? (
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div
                            key={member.user_id}
                            className="bg-white rounded border border-gray-200 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Users size={16} className="text-gray-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {member.full_name || 'Okänd användare'}
                                  </p>
                                  <p className="text-xs text-gray-500">{member.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getRoleBadge(member.role)}
                                <div className="text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>{formatDateTime(member.joined_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Inga medlemmar</p>
                    )}

                    {/* Team wheels info */}
                    {team.wheel_count > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Hjul</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CircleIcon size={16} />
                          <span>{team.wheel_count} hjul i detta team</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary footer */}
      <div className="bg-white rounded-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Visar {filteredTeams.length} av {teams.length} team</span>
          <span>
            Totalt {teams.reduce((sum, team) => sum + (team.members?.length || 0), 0)} medlemmar
            {' '}över alla team
          </span>
        </div>
      </div>
    </div>
  );
}
