import { useState, useEffect } from 'react';
import { Mail, Check, X, Clock } from 'lucide-react';
import { getMyInvitations, acceptInvitation, declineInvitation } from '../../services/teamService';

const MyInvitations = ({ onInvitationAccepted }) => {
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
      alert('Kunde inte acceptera inbjudan: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    if (!confirm('Är du säker på att du vill avvisa denna inbjudan?')) return;
    
    try {
      setProcessingId(invitationId);
      await declineInvitation(invitationId);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Error declining invitation:', err);
      alert('Kunde inte avvisa inbjudan: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Idag';
    if (diffDays === 1) return 'Igår';
    if (diffDays < 7) return `${diffDays} dagar sedan`;
    return date.toLocaleDateString('sv-SE');
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Laddar inbjudningar...</p>
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
            Inga väntande inbjudningar
          </h3>
          <p className="text-gray-600">
            Du har inga teaminbjudningar just nu
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
          Väntande inbjudningar ({invitations.length})
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
                  <span>Skickad {formatDate(invitation.created_at)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors disabled:bg-green-400 text-sm"
                  title="Acceptera inbjudan"
                >
                  <Check className="w-4 h-4" />
                  Acceptera
                </button>
                <button
                  onClick={() => handleDecline(invitation.id)}
                  disabled={processingId === invitation.id}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-sm hover:bg-gray-300 transition-colors disabled:bg-gray-100 text-sm"
                  title="Avvisa inbjudan"
                >
                  <X className="w-4 h-4" />
                  Avvisa
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
