import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const userId = user.id

    console.log(`Starting account deletion for user: ${userId}`)

    // Delete user data in order (some will cascade automatically via foreign keys)
    // But we'll be explicit for clarity and logging

    // 1. Delete wheel versions (linked to wheels via FK, will cascade but being explicit)
    const { error: versionsError } = await supabaseAdmin
      .from('wheel_versions')
      .delete()
      .in('wheel_id', supabaseAdmin
        .from('year_wheels')
        .select('id')
        .eq('user_id', userId)
      )
    
    if (versionsError) {
      console.error('Error deleting wheel versions:', versionsError)
    }

    // 2. Delete items (linked to wheels, will cascade)
    const { error: itemsError } = await supabaseAdmin
      .from('items')
      .delete()
      .in('wheel_id', supabaseAdmin
        .from('year_wheels')
        .select('id')
        .eq('user_id', userId)
      )
    
    if (itemsError) {
      console.error('Error deleting items:', itemsError)
    }

    // 3. Delete wheel pages (linked to wheels)
    const { error: pagesError } = await supabaseAdmin
      .from('wheel_pages')
      .delete()
      .in('wheel_id', supabaseAdmin
        .from('year_wheels')
        .select('id')
        .eq('user_id', userId)
      )
    
    if (pagesError) {
      console.error('Error deleting wheel pages:', pagesError)
    }

    // 4. Delete rings, activity groups, labels (linked to wheels)
    const { error: ringsError } = await supabaseAdmin
      .from('wheel_rings')
      .delete()
      .in('wheel_id', supabaseAdmin
        .from('year_wheels')
        .select('id')
        .eq('user_id', userId)
      )
    
    if (ringsError) {
      console.error('Error deleting rings:', ringsError)
    }

    const { error: groupsError } = await supabaseAdmin
      .from('activity_groups')
      .delete()
      .in('wheel_id', supabaseAdmin
        .from('year_wheels')
        .select('id')
        .eq('user_id', userId)
      )
    
    if (groupsError) {
      console.error('Error deleting activity groups:', groupsError)
    }

    const { error: labelsError } = await supabaseAdmin
      .from('labels')
      .delete()
      .in('wheel_id', supabaseAdmin
        .from('year_wheels')
        .select('id')
        .eq('user_id', userId)
      )
    
    if (labelsError) {
      console.error('Error deleting labels:', labelsError)
    }

    // 5. Delete wheels
    const { error: wheelsError } = await supabaseAdmin
      .from('year_wheels')
      .delete()
      .eq('user_id', userId)
    
    if (wheelsError) {
      console.error('Error deleting wheels:', wheelsError)
      throw wheelsError
    }

    // 6. Delete team memberships
    const { error: teamMembersError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('user_id', userId)
    
    if (teamMembersError) {
      console.error('Error deleting team memberships:', teamMembersError)
    }

    // 7. Delete teams owned by user (will cascade delete team members)
    const { error: teamsError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('owner_id', userId)
    
    if (teamsError) {
      console.error('Error deleting teams:', teamsError)
    }

    // 8. Delete team invitations
    const { error: invitesError } = await supabaseAdmin
      .from('team_invitations')
      .delete()
      .or(`invited_by.eq.${userId},email.eq.${user.email}`)
    
    if (invitesError) {
      console.error('Error deleting team invitations:', invitesError)
    }

    // 9. Delete user integrations
    const { error: integrationsError } = await supabaseAdmin
      .from('user_integrations')
      .delete()
      .eq('user_id', userId)
    
    if (integrationsError) {
      console.error('Error deleting integrations:', integrationsError)
    }

    // 10. Delete subscription records
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)
    
    if (subscriptionError) {
      console.error('Error deleting subscription:', subscriptionError)
    }

    // 11. Delete monday.com user data
    const { error: mondayError } = await supabaseAdmin
      .from('monday_users')
      .delete()
      .eq('user_profile_id', userId)
    
    if (mondayError) {
      console.error('Error deleting Monday user:', mondayError)
    }

    // 12. Delete affiliate data if exists
    const { error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .delete()
      .eq('user_id', userId)
    
    if (affiliateError) {
      console.error('Error deleting affiliate:', affiliateError)
    }

    // 13. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw profileError
    }

    // 14. Delete auth user (this is the final step)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      throw authDeleteError
    }

    console.log(`Successfully deleted account for user: ${userId}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in delete-user-account:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
