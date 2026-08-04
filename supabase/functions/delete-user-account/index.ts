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

    // Wheel-owned data uses ON DELETE CASCADE, including items, pages, rings,
    // activity groups, labels, versions, comments, and import jobs.
    const { error: wheelsError } = await supabaseAdmin
      .from('year_wheels')
      .delete()
      .eq('user_id', userId)
    
    if (wheelsError) {
      console.error('Error deleting wheels:', wheelsError)
      throw wheelsError
    }

    // Delete user-scoped records that are not owned by a wheel.
    const { error: teamMembersError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('user_id', userId)
    
    if (teamMembersError) {
      console.error('Error deleting team memberships:', teamMembersError)
      throw teamMembersError
    }

    // Teams owned by the user cascade their remaining memberships.
    const { error: teamsError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('owner_id', userId)
    
    if (teamsError) {
      console.error('Error deleting teams:', teamsError)
      throw teamsError
    }

    const { error: invitesError } = await supabaseAdmin
      .from('team_invitations')
      .delete()
      .or(`invited_by.eq.${userId},email.eq.${user.email}`)
    
    if (invitesError) {
      console.error('Error deleting team invitations:', invitesError)
      throw invitesError
    }

    const { error: integrationsError } = await supabaseAdmin
      .from('user_integrations')
      .delete()
      .eq('user_id', userId)
    
    if (integrationsError) {
      console.error('Error deleting integrations:', integrationsError)
      throw integrationsError
    }

    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)
    
    if (subscriptionError) {
      console.error('Error deleting subscription:', subscriptionError)
      throw subscriptionError
    }

    const { error: mondayError } = await supabaseAdmin
      .from('monday_users')
      .delete()
      .eq('user_profile_id', userId)
    
    if (mondayError) {
      console.error('Error deleting Monday user:', mondayError)
      throw mondayError
    }

    const { error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .delete()
      .eq('user_id', userId)
    
    if (affiliateError) {
      console.error('Error deleting affiliate:', affiliateError)
      throw affiliateError
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      throw profileError
    }

    // Delete auth user last so the authenticated request cannot orphan data.
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
