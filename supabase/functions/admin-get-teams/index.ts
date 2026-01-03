import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Create a Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all teams using service role (bypasses RLS)
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, name, description, owner_id, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (teamsError) throw teamsError

    // Fetch all team members
    const teamIds = teams.map(t => t.id)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('team_members')
      .select('team_id, user_id, role, joined_at')
      .in('team_id', teamIds)

    if (membersError) throw membersError

    // Get all unique user IDs (owners + members)
    const ownerIds = teams.map(t => t.owner_id)
    const memberIds = (members || []).map(m => m.user_id)
    const allUserIds = [...new Set([...ownerIds, ...memberIds])]

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', allUserIds)

    if (profilesError) throw profilesError

    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {})

    // Fetch wheel counts per team
    const { data: wheelCounts, error: wheelError } = await supabaseAdmin
      .from('year_wheels')
      .select('team_id')
      .not('team_id', 'is', null)
      .in('team_id', teamIds)

    if (wheelError) throw wheelError

    const wheelCountMap = (wheelCounts || []).reduce((acc, w) => {
      acc[w.team_id] = (acc[w.team_id] || 0) + 1
      return acc
    }, {})

    // Group members by team and enrich with profile data
    const membersByTeam = (members || []).reduce((acc, member) => {
      if (!acc[member.team_id]) {
        acc[member.team_id] = []
      }
      const profile = profileMap[member.user_id]
      acc[member.team_id].push({
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        email: profile?.email,
        full_name: profile?.full_name
      })
      return acc
    }, {})

    // Combine all data
    const enrichedTeams = teams.map(team => ({
      ...team,
      owner_email: profileMap[team.owner_id]?.email,
      owner_name: profileMap[team.owner_id]?.full_name,
      members: membersByTeam[team.id] || [],
      wheel_count: wheelCountMap[team.id] || 0
    }))

    return new Response(
      JSON.stringify(enrichedTeams),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-get-teams:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
