import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { checkEmailExists } from '../services/teamService';
import { Users, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function InviteAcceptPage() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [success, setSuccess] = useState(false);
  const hasProcessed = useRef(false);

  const checkAndRedirect = async () => {
    try {
      // console.log('User not logged in, checking if email exists and redirecting to /auth');
      
      // Store invite token
      sessionStorage.setItem('pendingInviteToken', token);
      
      // Get the invitation to find the email
      const { data: inviteData } = await supabase
        .from('team_invitations')
        .select('email')
        .eq('token', token)
        .single();

      if (inviteData) {
        // Check if this email has any accepted invitations (means they're registered)
        const emailExists = await checkEmailExists(inviteData.email);
        // console.log('Email exists check:', inviteData.email, '→', emailExists);
        
        // Store whether this is a new user (for AuthPage to use)
        sessionStorage.setItem('inviteIsNewUser', emailExists ? 'false' : 'true');
      }
      
      // console.log('Stored token:', sessionStorage.getItem('pendingInviteToken'));
      // console.log('Performing hard redirect to /auth');
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error checking email:', error);
      // If error, just redirect to auth with default (signup)
      sessionStorage.setItem('pendingInviteToken', token);
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    // console.log('InviteAcceptPage useEffect - user:', user, 'token:', token, 'hasProcessed:', hasProcessed.current);
    
    if (!token) {
      navigate('/dashboard');
      return;
    }

    if (user && !hasProcessed.current) {
      // User is logged in, process invitation
      // console.log('User is logged in, processing invitation');
      hasProcessed.current = true;
      handleInvitation();
    } else if (!user) {
      // Store invite token and check if user exists
      checkAndRedirect();
    }
  }, [user, token, navigate]);

  const handleInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear the pending token from sessionStorage
      sessionStorage.removeItem('pendingInviteToken');
      // console.log('Cleared pendingInviteToken from sessionStorage');

      // Get invitation details (check both pending and accepted status)
      const { data: inviteData, error: inviteError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('email', user.email)
        .in('status', ['pending', 'accepted'])
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !inviteData) {
        console.error('Invitation error:', inviteError);
        setError('Inbjudan hittades inte eller har gått ut');
        setLoading(false);
        return;
      }

      // Check if already a member of this team
      const { data: existingMember, error: checkError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', inviteData.team_id)
        .eq('user_id', user.id)
        .single();

      // If already a member, just show success and redirect
      if (existingMember) {
        // console.log('User is already a member, skipping insert');
        const { data: teamData } = await supabase
          .from('teams')
          .select('name, description')
          .eq('id', inviteData.team_id)
          .single();

        setInvitation({ ...inviteData, teams: teamData });
        setSuccess(true);
        setLoading(false);

        // Mark invitation as accepted if it wasn't already
        if (inviteData.status === 'pending') {
          await supabase
            .from('team_invitations')
            .update({ status: 'accepted' })
            .eq('id', inviteData.id);
        }

        setTimeout(() => {
          navigate('/dashboard?view=teams');
        }, 2000);
        return;
      }

      // Get team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('name, description')
        .eq('id', inviteData.team_id)
        .single();

      if (teamError) {
        console.error('Team error:', teamError);
      }

      // Combine invitation with team data
      const invitationWithTeam = {
        ...inviteData,
        teams: teamData
      };

      setInvitation(invitationWithTeam);

      // Add user to team (should not fail since we checked above)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: inviteData.team_id,
            user_id: user.id,
            role: 'member'
          }
        ]);

      if (memberError) {
        console.error('Member insert error:', memberError);
        // If we somehow got here with a duplicate, that's actually OK
        if (memberError.code !== '23505') {
          throw memberError;
        }
      }

      // Update invitation status
      await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', inviteData.id);

      setSuccess(true);
      setLoading(false);

      // Redirect to teams after 2 seconds
      setTimeout(() => {
        navigate('/dashboard?view=teams');
      }, 2000);

    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Ett fel uppstod när inbjudan skulle accepteras');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Dirigerar till inloggning...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Behandlar inbjudan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-sm shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Kunde inte acceptera inbjudan
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            Gå till Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-sm shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Välkommen till teamet!
          </h1>
          <p className="text-gray-600 mb-2">
            Du har nu blivit medlem i <strong>{invitation?.teams?.name}</strong>
          </p>
          {invitation?.teams?.description && (
            <p className="text-sm text-gray-500 mb-6">
              {invitation.teams.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
            <Users className="w-4 h-4" />
            <span>Dirigerar till ditt team...</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
