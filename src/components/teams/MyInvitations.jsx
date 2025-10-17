import { useState, useEffect } from 'react';
import { Mail, Check, X, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getMyInvitations, acceptInvitation, declineInvitation } from '../../services/teamService';
import { showConfirmDialog, showToast } from '../../utils/dialogs';

const MyInvitations = ({ onInvitationAccepted }) => {
  const { t, i18n } = useTranslation(['teams']);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await getMyInvitations();
      setInvitations(data);
      setError(null);
    } catch (err) {
      console.error('Error loading invitations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      const teamId = await acceptInvitation(invitationId);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      if (onInvitationAccepted) {
        onInvitationAccepted(teamId);
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      showToast(t('teams:myInvitations.errorAccept') + ': ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    const confirmed = await showConfirmDialog({
      title: t('teams:myInvitations.declineTitle', { defaultValue: 'Avböj inbjudan' }),
      message: t('teams:myInvitations.confirmDecline'),
      confirmText: t('common:actions.decline', { defaultValue: 'Avböj' }),
      cancelText: t('common:actions.cancel', { defaultValue: 'Avbryt' }),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (!confirmed) return;
    
    try {
      setProcessingId(invitationId);
      await declineInvitation(invitationId);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Error declining invitation:', err);
      showToast(t('teams:myInvitations.errorDecline') + ': ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('teams:myInvitations.today');
    if (diffDays === 1) return t('teams:myInvitations.yesterday');
    if (diffDays < 7) return t('teams:myInvitations.daysAgo', { count: diffDays });
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'sv-SE');
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t('teams:myInvitations.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <div className="text-center py-8">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('teams:myInvitations.noInvitationsTitle')}
          </h3>
          <p className="text-gray-600">
            {t('teams:myInvitations.noInvitationsDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {t('teams:myInvitations.title')} ({invitations.length})
        </h3>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="border border-gray-200 rounded-sm p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {invitation.teams?.name || 'Team'}
                </h4>
                {invitation.teams?.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {invitation.teams.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{t('teams:myInvitations.sent', { date: formatDate(invitation.created_at) })}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors disabled:bg-green-400 text-sm"
                  title={t('teams:myInvitations.acceptTooltip')}
                >
                  <Check className="w-4 h-4" />
                  {t('teams:myInvitations.accept')}
                </button>
                <button
                  onClick={() => handleDecline(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-sm hover:bg-gray-300 transition-colors disabled:bg-gray-100 text-sm"
                  title={t('teams:myInvitations.declineTooltip')}
                >
                  <X className="w-4 h-4" />
                  {t('teams:myInvitations.decline')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyInvitations;
