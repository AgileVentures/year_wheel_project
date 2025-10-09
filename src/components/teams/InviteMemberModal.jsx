import { useState } from 'react';
import { X, Mail, Copy, Check } from 'lucide-react';
import { sendTeamInvitation } from '../../services/teamService';

const InviteMemberModal = ({ teamId, teamName, onClose, onInvitationSent }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('E-post är obligatoriskt');
      return;
    }

    if (!validateEmail(email)) {
      setError('Ogiltig e-postadress');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const invitation = await sendTeamInvitation(teamId, email.trim());
      
      // Generate invite link
      const link = `${window.location.origin}/invite/${invitation.token}`;
      setInviteLink(link);
      setSuccess(true);
      
      // Notify parent
      if (onInvitationSent) onInvitationSent();
    } catch (err) {
      console.error('Error sending invitation:', err);
      if (err.message.includes('duplicate')) {
        setError('En inbjudan har redan skickats till denna e-postadress');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm max-w-md w-full my-8">
        <div className="flex justify-between items-center p-6 pb-4 sticky top-0 bg-white rounded-t-sm z-10">
          <h3 className="text-xl font-bold text-gray-900">Bjud in medlem</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 pb-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {success ? (
          <div className="py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">
              Inbjudan skapad!
            </h4>
            <p className="text-gray-600 text-center mb-6">
              Dela länken nedan med {email}
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 mb-4">
              <p className="text-xs text-gray-600 mb-2">Inbjudningslänk:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-2 py-1 text-sm bg-white border border-gray-300 rounded text-gray-700 font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                  title="Kopiera länk"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Kopierad!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Kopiera
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tips:</strong> Skicka länken via e-post, Slack, eller WhatsApp. 
                När mottagaren klickar på länken kommer de automatiskt att läggas till i teamet 
                när de loggar in eller skapar ett konto.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-sm hover:bg-gray-200 transition-colors"
            >
              Stäng
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              Bjud in en användare till <strong>{teamName}</strong> genom att ange deras e-postadress.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-postadress <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anvandare@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Personen kommer att få en inbjudan och kan acceptera den från sitt konto.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
                  disabled={loading || !email.trim()}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Skickar...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Skicka inbjudan
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;
