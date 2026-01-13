import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Mail, AlertCircle } from 'lucide-react';
import WheelLoader from '../components/WheelLoader';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      // Token-based unsubscribe (no auth required)
      const sid = searchParams.get('sid');
      const e = searchParams.get('e');
      const ts = searchParams.get('ts');
      const sig = searchParams.get('sig');

      if (sid && e && ts && sig) {
        // Use edge function for tokenized unsubscribe
        const { data, error } = await supabase.functions.invoke('unsubscribe', {
          body: { sid, e, ts, sig }
        });
        
        if (error || !data?.success) {
          setError('Kunde inte avregistrera. Länken kan vara ogiltig eller utgången.');
          setLoading(false);
          return;
        }
        
        setUnsubscribed(true);
        setEmail(tryDecodeEmail(e));
        setLoading(false);
        return;
      }

      // If no token, allow manual unsubscribe for logged-in users
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      
      if (!user) {
        setError('Du kan avregistrera via länken i mejlet, eller logga in för att ändra dina inställningar.');
        setLoading(false);
        return;
      }

      // Load profile state for UI
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, newsletter_subscribed')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setEmail(profile.email);

      if (!profile.newsletter_subscribed) {
        setUnsubscribed(true);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setError('Ett fel uppstod. Försök igen senare.');
      setLoading(false);
    }
  };

  const tryDecodeEmail = (eParam) => {
    try {
      const s = eParam.replace(/-/g, '+').replace(/_/g, '/');
      const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
      return atob(s + pad);
    } catch {
      return '';
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Du måste vara inloggad.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          newsletter_subscribed: false,
          newsletter_unsubscribed_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUnsubscribed(true);
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Ett fel uppstod vid avregistrering. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleResubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Du måste vara inloggad.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          newsletter_subscribed: true,
          newsletter_unsubscribed_at: null
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUnsubscribed(false);
      // No auto-redirect - user stays on page
    } catch (err) {
      console.error('Error resubscribing:', err);
      setError('Ett fel uppstod vid återregistrering. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-sm shadow-xl p-8 max-w-md w-full text-center">
          <WheelLoader size="sm" className="mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-sm shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          {unsubscribed ? (
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          ) : (
            <Mail className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {unsubscribed ? 'Avregistrerad' : 'Avregistrera från nyhetsbrev'}
          </h1>
          {email && (
            <p className="text-sm text-gray-600">{email}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {unsubscribed ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-sm">
              <p className="text-sm text-gray-700 mb-2">
                Du är nu avregistrerad från våra nyhetsbrev.
              </p>
              <p className="text-xs text-gray-600">
                Vi kommer inte längre att skicka marknadsföringsmejl till dig. Du kommer fortfarande att få viktiga meddelanden om ditt konto.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleResubscribe}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-sm transition-colors"
              >
                {loading ? 'Återregistrerar...' : 'Prenumerera igen'}
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-sm transition-colors"
              >
                Till startsidan
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-sm">
              <p className="text-sm text-gray-700 mb-2">
                Vill du sluta få nyhetsbrev från YearWheel?
              </p>
              <p className="text-xs text-gray-600">
                Du kan när som helst ändra detta i dina inställningar.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium rounded-sm transition-colors"
              >
                {loading ? 'Avregistrerar...' : 'Ja, avregistrera mig'}
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-sm transition-colors"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Behöver du hjälp?{' '}
            <a href="mailto:hey@communitaslabs.io" className="text-blue-600 hover:underline">
              Kontakta oss
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
