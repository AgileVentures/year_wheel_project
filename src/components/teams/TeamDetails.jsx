import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, UserPlus, Trash2, Crown, Shield, User, X, MoreVertical, ExternalLink, Mail, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  getTeam, 
  updateTeam, 
  deleteTeam, 
  getTeamMembers, 
  removeTeamMember, 
  updateMemberRole,
  getTeamWheels,
  getTeamInvitations,
  cancelInvitation
} from '../../services/teamService';
import { useAuth } from '../../hooks/useAuth';
import InviteMemberModal from './InviteMemberModal';
import WheelCard from '../dashboard/WheelCard';
import { showConfirmDialog, showToast } from '../../utils/dialogs';

const TeamDetails = ({ teamId, onBack, onTeamUpdated, onTeamDeleted, onSelectWheel }) => {
  const { t, i18n } = useTranslation(['teams']);
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingWheels, setLoadingWheels] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(null);
  const [inviteMenuOpen, setInviteMenuOpen] = useState(null);

  const currentUserRole = team?.team_members?.find(m => m.user_id === user?.id)?.role;
  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  useEffect(() => {
    loadTeamDetails();
    loadTeamWheels();
  }, [teamId]);

  const loadTeamDetails = async () => {
    try {
      setLoading(true);
      const [teamData, membersData, invitesData] = await Promise.all([
        getTeam(teamId),
        getTeamMembers(teamId),
        getTeamInvitations(teamId)
      ]);
      setTeam(teamData);
      setMembers(membersData);
      setPendingInvites(invitesData || []);
      setError(null);
    } catch (err) {
      console.error('Error loading team details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamWheels = async () => {
    try {
      setLoadingWheels(true);
      const wheelsData = await getTeamWheels(teamId);
      setWheels(wheelsData);
    } catch (err) {
      console.error('Error loading team wheels:', err);
    } finally {
      setLoadingWheels(false);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await deleteTeam(teamId);
      onTeamDeleted(teamId);
    } catch (err) {
      console.error('Error deleting team:', err);
      showToast(t('teams:messages.errorDeleteTeam') + ': ' + err.message, 'error');
    }
  };

  const handleRemoveMember = async (memberId, userId) => {
    const confirmed = await showConfirmDialog({
      title: t('teams:messages.removeMemberTitle', { defaultValue: 'Ta bort medlem' }),
      message: t('teams:messages.removeMemberConfirm'),
      confirmText: t('common:actions.remove', { defaultValue: 'Ta bort' }),
      cancelText: t('common:actions.cancel', { defaultValue: 'Avbryt' }),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (!confirmed) return;
    
    try {
      await removeTeamMember(teamId, userId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setMemberMenuOpen(null);
    } catch (err) {
      console.error('Error removing member:', err);
      showToast(t('teams:messages.errorRemoveMember') + ': ' + err.message, 'error');
    }
  };

  const handleChangeRole = async (memberId, userId, newRole) => {
    try {
      await updateMemberRole(teamId, userId, newRole);
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      setMemberMenuOpen(null);
    } catch (err) {
      console.error('Error changing role:', err);
      showToast(t('teams:messages.errorChangeRole') + ': ' + err.message, 'error');
    }
  };

  const handleCancelInvitation = async (inviteId) => {
    const confirmed = await showConfirmDialog({
      title: t('teams:messages.cancelInviteTitle', { defaultValue: 'Avbryt inbjudan' }),
      message: t('teams:messages.cancelInviteConfirm'),
      confirmText: t('common:actions.cancel', { defaultValue: 'Avbryt inbjudan' }),
      cancelText: t('common:actions.back', { defaultValue: 'Tillbaka' }),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (!confirmed) return;
    
    try {
      await cancelInvitation(inviteId);
      setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      setInviteMenuOpen(null);
    } catch (err) {
      console.error('Error canceling invitation:', err);
      showToast(t('teams:messages.errorCancelInvitation') + ': ' + err.message, 'error');
    }
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">{t('teams:messages.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('teams:back')}
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('teams:back')}
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{team?.name}</h2>
          {team?.description && (
            <p className="text-gray-600 mt-2">{team.description}</p>
          )}
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-sm hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {t('teams:settings')}
          </button>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('teams:members', { count: members.length })}
          </h3>
          {canManageTeam && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm"
            >
              <UserPlus className="w-4 h-4" />
              {t('teams:invite')}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-sm hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {member.email}
                    </span>
                    {member.user_id === user?.id && (
                      <span className="text-xs text-gray-500">{t('teams:you')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    {getRoleIcon(member.role)}
                    <span>{getRoleLabel(member.role)}</span>
                  </div>
                </div>
              </div>

              {canManageTeam && member.role !== 'owner' && member.user_id !== user?.id && (
                <div className="relative">
                  <button
                    onClick={() => setMemberMenuOpen(memberMenuOpen === member.id ? null : member.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  {memberMenuOpen === member.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setMemberMenuOpen(null)}
                      />
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-sm shadow-lg z-20">
                        {isOwner && member.role !== 'admin' && (
                          <button
                            onClick={() => handleChangeRole(member.id, member.user_id, 'admin')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4 text-blue-500" />
                            {t('teams:changeRole.makeAdmin')}
                          </button>
                        )}
                        {isOwner && member.role === 'admin' && (
                          <button
                            onClick={() => handleChangeRole(member.id, member.user_id, 'member')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-gray-500" />
                            {t('teams:changeRole.makeMember')}
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('teams:removeMember')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pending Invitations */}
        {canManageTeam && pendingInvites.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('teams:pendingInvites', { count: pendingInvites.length })}
            </h4>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-sm bg-amber-50 border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {invite.email}
                      </div>
                      <div className="text-xs text-gray-600">
                        {t('teams:invited', { date: new Date(invite.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'sv-SE') })}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setInviteMenuOpen(inviteMenuOpen === invite.id ? null : invite.id)}
                      className="p-1 hover:bg-amber-200 rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    {inviteMenuOpen === invite.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setInviteMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-sm shadow-lg z-20">
                          <button
                            onClick={() => handleCancelInvitation(invite.id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          >
                            <X className="w-4 h-4" />
                            {t('teams:cancelInvite')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Wheels Section */}
      <div className="mt-6 bg-white border border-gray-200 rounded-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('teams:teamWheels', { count: wheels.length })}
          </h3>
        </div>

        {loadingWheels ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">{t('teams:loadingWheels')}</p>
          </div>
        ) : wheels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>{t('teams:noWheels')}</p>
            <p className="text-sm mt-1">{t('teams:noWheelsDescription')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wheels.map((wheel) => (
              <WheelCard
                key={wheel.id}
                wheel={wheel}
                onSelect={() => onSelectWheel?.(wheel.id)}
                onUpdate={loadTeamWheels}
                isTeamContext={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-sm p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">{t('teams:dangerZone')}</h3>
          <p className="text-sm text-red-700 mb-4">
            {t('teams:dangerZoneDescription')}
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('teams:deleteTeam.button')}
          </button>
        </div>
      )}

      {/* Modals */}
      {showInviteModal && (
        <InviteMemberModal
          teamId={teamId}
          teamName={team?.name}
          onClose={() => {
            setShowInviteModal(false);
            loadTeamDetails(); // Refresh to show new pending invitation
          }}
        />
      )}

      {showEditModal && (
        <EditTeamModal
          team={team}
          onClose={() => setShowEditModal(false)}
          onTeamUpdated={(updated) => {
            setTeam(updated);
            onTeamUpdated(updated);
            setShowEditModal(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-sm max-w-md w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('teams:deleteTeam.confirm')}</h3>
            <p className="text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: t('teams:deleteTeam.confirmMessage', { name: team?.name }) + ' ' + t('teams:deleteTeam.warning') }} />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              >
                {t('teams:editTeam.cancel')}
              </button>
              <button
                onClick={handleDeleteTeam}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors"
              >
                {t('teams:deleteTeam.button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Team Modal Component
const EditTeamModal = ({ team, onClose, onTeamUpdated }) => {
  const { t } = useTranslation(['teams']);
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(t('teams:editTeam.nameRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await updateTeam(team.id, {
        name: name.trim(),
        description: description.trim()
      });
      onTeamUpdated(updated);
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm max-w-md w-full my-8">
        <div className="flex justify-between items-center p-6 pb-4 sticky top-0 bg-white rounded-t-sm z-10">
          <h3 className="text-xl font-bold text-gray-900">{t('teams:editTeam.title')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 pb-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teams:editTeam.nameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teams:editTeam.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              {t('teams:editTeam.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              disabled={loading || !name.trim()}
            >
              {loading ? t('teams:editTeam.saving') : t('teams:editTeam.save')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default TeamDetails;
