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

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use UTC for consistent timezone handling
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get new users today
    const { count: usersToday } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    // Get new users last 7 days
    const { count: usersLast7Days } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    // Get new users this month
    const { count: usersThisMonth } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())

    // Get total wheels (excluding templates)
    const { count: totalWheels } = await supabaseAdmin
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false)

    // Get wheels created today (excluding templates)
    const { count: wheelsToday } = await supabaseAdmin
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false)
      .gte('created_at', todayStart.toISOString())

    // Get wheels created last 7 days (excluding templates)
    const { count: wheelsLast7Days } = await supabaseAdmin
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false)
      .gte('created_at', sevenDaysAgo.toISOString())

    // Get wheels created this month (excluding templates)
    const { count: wheelsThisMonth } = await supabaseAdmin
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false)
      .gte('created_at', monthStart.toISOString())

    // Get premium users count
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan_type, status')
      .eq('status', 'active')
      .in('plan_type', ['monthly', 'yearly', 'gift'])

    const premiumUsers = subscriptions?.length || 0
    const monthlyCount = subscriptions?.filter(s => s.plan_type === 'monthly').length || 0
    const yearlyCount = subscriptions?.filter(s => s.plan_type === 'yearly').length || 0

    // Get public wheels count (excluding templates)
    const { count: publicWheels } = await supabaseAdmin
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('is_template', false)

    // Get template wheels count
    const { count: templateWheels } = await supabaseAdmin
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', true)

    // Get active teams
    const { count: activeTeams } = await supabaseAdmin
      .from('teams')
      .select('*', { count: 'exact', head: true })

    return new Response(
      JSON.stringify({
        users: {
          total: totalUsers || 0,
          today: usersToday || 0,
          last7Days: usersLast7Days || 0,
          thisMonth: usersThisMonth || 0,
        },
        wheels: {
          total: totalWheels || 0,
          today: wheelsToday || 0,
          last7Days: wheelsLast7Days || 0,
          thisMonth: wheelsThisMonth || 0,
        },
        premium: premiumUsers,
        subscriptionStats: {
          monthly: monthlyCount,
          yearly: yearlyCount,
          total: premiumUsers,
        },
        publicWheels: publicWheels || 0,
        templates: templateWheels || 0,
        teams: activeTeams || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
