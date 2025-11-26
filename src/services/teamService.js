import { supabase } from '../lib/supabase';

export const TEAM_LIMIT_ERROR_CODE = 'TEAM_MEMBER_LIMIT_REACHED';

const createTeamLimitError = () => {
  const error = new Error(TEAM_LIMIT_ERROR_CODE);
  error.code = TEAM_LIMIT_ERROR_CODE;
  return error;
};

async function ensureTeamHasCapacity(teamId, actingUserId) {
  const { data, error } = await supabase.rpc('can_add_team_member', {
    team_uuid: teamId,
    user_uuid: actingUserId,
  });

  if (error) throw error;
  if (!data) throw createTeamLimitError();
}

/**
 * Team Management Service
 * Handles all team-related database operations
 */

// =============================================
// TEAM CRUD
// =============================================

/**
 * Create a new team
 */
export async function createTeam(name, description = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('teams')
    .insert([
      {
        name,
        description,
        owner_id: user.id
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all teams for current user
 */
export async function getUserTeams() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members!inner(role)
    `)
    .eq('team_members.user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get team by ID with members
 */
export async function getTeam(teamId) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members(
        id,
        role,
        joined_at,
        user_id
      )
    `)
    .eq('id', teamId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update team
 */
export async function updateTeam(teamId, updates) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete team
 */
export async function deleteTeam(teamId) {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) throw error;
}

// =============================================
// TEAM MEMBERS
// =============================================

/**
 * Get team members with user details
 */
export async function getTeamMembers(teamId) {
  // Use the RPC function to get members with their emails
  // This function is defined in TEAM_MEMBERS_EMAIL_LOOKUP.sql
  const { data, error } = await supabase
    .rpc('get_team_members_with_emails', { p_team_id: teamId });

  if (error) throw error;
  return data;
}

/**
 * Remove member from team
 */
export async function removeTeamMember(teamId, userId) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Update member role
 */
export async function updateMemberRole(teamId, userId, role) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// INVITATIONS
// =============================================

/**
 * Send team invitation
 */
/**
 * Check if an email exists in the system
 * Note: This queries team_invitations to infer if email might be registered
 * Returns true if ANY accepted invitation exists for this email (means they signed up)
 */
export async function checkEmailExists(email) {
  // Check if there are any accepted invitations for this email
  // This indicates the user has signed up
  const { data, error } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'accepted')
    .limit(1);

  if (error) {
    console.error('Error checking email:', error);
    return false; // Default to new user if error
  }

  return data && data.length > 0;
}

export async function sendTeamInvitation(teamId, email) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await ensureTeamHasCapacity(teamId, user.id);

  // Create the invitation record first
  const { data, error } = await supabase
    .from('team_invitations')
    .insert([
      {
        team_id: teamId,
        email: email.toLowerCase().trim(),
        invited_by: user.id
      }
    ])
    .select()
    .single();

  if (error) throw error;

  // Get team details and inviter profile for the email
  const [teamResult, profileResult] = await Promise.all([
    supabase.from('teams').select('name').eq('id', teamId).single(),
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
  ]);

  const teamName = teamResult.data?.name || 'the team';
  const inviterName = profileResult.data?.full_name || profileResult.data?.email || 'A team member';

  // Get user's language preference from localStorage or browser
  const userLanguage = localStorage.getItem('i18nextLng') || navigator.language.split('-')[0] || 'sv';
  const language = ['en', 'sv'].includes(userLanguage) ? userLanguage : 'sv';

  // Send invitation email via Edge Function
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-team-invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invitationId: data.id,
        teamName,
        inviterName,
        recipientEmail: email.toLowerCase().trim(),
        inviteToken: data.token,
        language
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send invitation email:', errorData);
      // Don't throw - invitation was created, email failure is non-critical
    } else {
      console.log('Invitation email sent successfully');
    }
  } catch (emailError) {
    console.error('Error sending invitation email:', emailError);
    // Don't throw - invitation was created, email failure is non-critical
  }

  return data;
}

/**
 * Get pending invitations for a team
 */
export async function getTeamInvitations(teamId) {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Cancel/delete a pending invitation (for team owners/admins)
 */
export async function cancelInvitation(invitationId) {
  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;
}

/**
 * Get invitations for current user's email
 */
export async function getMyInvitations() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      teams(name, description)
    `)
    .eq('email', user.email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false});

  if (error) throw error;
  return data;
}

/**
 * Accept team invitation
 */
export async function acceptInvitation(invitationId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the invitation
  const { data: invitation, error: invError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('email', user.email)
    .single();

  if (invError) throw invError;
  if (!invitation) throw new Error('Invitation not found');

  const { data: existingMember, error: existingMemberError } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', invitation.team_id)
    .eq('user_id', user.id)
    .limit(1);

  if (existingMemberError) throw existingMemberError;

  if (existingMember && existingMember.length > 0) {
    await supabase
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);
    return invitation.team_id;
  }

  await ensureTeamHasCapacity(invitation.team_id, invitation.invited_by);

  // Add user to team
  const { error: memberError } = await supabase
    .from('team_members')
    .insert([
      {
        team_id: invitation.team_id,
        user_id: user.id,
        role: 'member'
      }
    ]);

  if (memberError) throw memberError;

  // Update invitation status
  const { error: updateError } = await supabase
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId);

  if (updateError) throw updateError;

  return invitation.team_id;
}

/**
 * Decline team invitation
 */
export async function declineInvitation(invitationId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId)
    .eq('email', user.email);

  if (error) throw error;
}

// =============================================
// WHEEL-TEAM ASSOCIATION
// =============================================

/**
 * Assign wheel to team
 */
export async function assignWheelToTeam(wheelId, teamId) {
  const { data, error } = await supabase
    .from('year_wheels')
    .update({ team_id: teamId })
    .eq('id', wheelId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove wheel from team
 */
export async function removeWheelFromTeam(wheelId) {
  const { data, error } = await supabase
    .from('year_wheels')
    .update({ team_id: null })
    .eq('id', wheelId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get wheels for a team
 */
export async function getTeamWheels(teamId) {
  const { data, error } = await supabase
    .from('year_wheels')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}
