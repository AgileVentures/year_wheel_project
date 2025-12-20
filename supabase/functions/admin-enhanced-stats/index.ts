import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface PeriodDates {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
}

const getPeriodDates = (period: string): PeriodDates => {
  const now = new Date()
  const end = new Date(now)
  let start: Date
  let prevStart: Date
  let prevEnd: Date

  switch (period) {
    case '7d':
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      prevEnd = new Date(start)
      prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 7)
      break
    case '30d':
      start = new Date(now)
      start.setDate(start.getDate() - 30)
      prevEnd = new Date(start)
      prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 30)
      break
    case '90d':
      start = new Date(now)
      start.setDate(start.getDate() - 90)
      prevEnd = new Date(start)
      prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 90)
      break
    case 'mtd': // Month to date
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1)
      break
    case 'ytd': // Year to date
      start = new Date(now.getFullYear(), 0, 1)
      prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      prevStart = new Date(prevEnd.getFullYear(), 0, 1)
      break
    case 'all':
    default:
      start = new Date('2024-01-01') // App launch date
      prevStart = new Date('2024-01-01')
      prevEnd = new Date('2024-01-01')
      break
  }

  return { start, end, prevStart, prevEnd }
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check if user is admin
    const { data: profile } = await supabase
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

    const { period = '30d' } = await req.json()
    const dates = getPeriodDates(period)

    // Helper function to get stats for a period
    const getStatsForPeriod = async (startDate: Date, endDate: Date, isAllTime: boolean = false) => {
      const startStr = formatDate(startDate)
      const endStr = formatDate(endDate)

      // Users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr)

      // Active users (logged in within period) - check auth.users last_sign_in_at
      // We'll estimate based on updated_at in profiles or wheels
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: activeWheelUsers } = await supabase
        .from('year_wheels')
        .select('user_id')
        .gte('updated_at', formatDate(thirtyDaysAgo))
      
      const activeUserIds = new Set((activeWheelUsers || []).map(w => w.user_id))

      const today = formatDate(new Date())
      const { count: todayUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      // Wheels
      const { count: totalWheels } = await supabase
        .from('year_wheels')
        .select('*', { count: 'exact', head: true })

      const { count: newWheels } = await supabase
        .from('year_wheels')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr)

      // Wheels with activities
      const { data: wheelsWithItems } = await supabase
        .from('items')
        .select('wheel_id')
      
      const wheelsWithActivities = new Set((wheelsWithItems || []).map(i => i.wheel_id)).size

      // Premium subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')

      const totalPremium = subscriptions?.length || 0
      const monthlyPremium = subscriptions?.filter(s => s.plan_type === 'monthly').length || 0
      const yearlyPremium = subscriptions?.filter(s => s.plan_type === 'yearly').length || 0

      const { count: newPremium } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', startStr)
        .lte('created_at', endStr)

      // Calculate MRR (Monthly Recurring Revenue)
      // Assume: monthly = 99 SEK, yearly = 79 SEK/month (948/12)
      const mrr = (monthlyPremium * 99) + (yearlyPremium * 79)
      const arpu = totalPremium > 0 ? mrr / totalPremium : 0

      // Activities/Items
      const { count: totalActivities } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })

      const { count: newActivities } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr)

      // AI Usage - check ai_conversation_logs if exists
      let aiRequests = 0
      let aiUniqueUsers = 0
      try {
        const { count: aiCount } = await supabase
          .from('ai_conversation_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startStr)
          .lte('created_at', endStr)
        
        const { data: aiUsers } = await supabase
          .from('ai_conversation_logs')
          .select('user_id')
          .gte('created_at', startStr)
          .lte('created_at', endStr)
        
        aiRequests = aiCount || 0
        aiUniqueUsers = new Set((aiUsers || []).map(u => u.user_id)).size
      } catch (e) {
        // Table might not exist
      }

      // Teams
      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })

      const { count: newTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr)

      const { count: totalMembers } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })

      // Sharing
      const { count: publicWheels } = await supabase
        .from('year_wheels')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true)

      const { count: templates } = await supabase
        .from('year_wheels')
        .select('*', { count: 'exact', head: true })
        .eq('is_template', true)

      const { count: onLanding } = await supabase
        .from('year_wheels')
        .select('*', { count: 'exact', head: true })
        .eq('show_on_landing', true)

      // Churn
      const { count: canceledSubs } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'canceled')
        .gte('updated_at', startStr)
        .lte('updated_at', endStr)

      // At risk - users who haven't been active in 14+ days but have subscription
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const { data: inactiveSubUsers } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')

      let atRiskCount = 0
      if (inactiveSubUsers && inactiveSubUsers.length > 0) {
        const { count } = await supabase
          .from('year_wheels')
          .select('user_id', { count: 'exact', head: true })
          .in('user_id', inactiveSubUsers.map(s => s.user_id))
          .lt('updated_at', formatDate(twoWeeksAgo))
        atRiskCount = count || 0
      }

      const churnRate = totalPremium > 0 ? ((canceledSubs || 0) / totalPremium) * 100 : 0

      // Leads
      let quizStarts = 0
      let quizCompleted = 0
      let newsletterSubs = 0
      try {
        const { count: quizStartCount } = await supabase
          .from('quiz_leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startStr)
          .lte('created_at', endStr)
        
        const { count: quizCompleteCount } = await supabase
          .from('quiz_leads')
          .select('*', { count: 'exact', head: true })
          .not('pain_points', 'is', null)
          .gte('created_at', startStr)
          .lte('created_at', endStr)

        quizStarts = quizStartCount || 0
        quizCompleted = quizCompleteCount || 0
      } catch (e) {
        // Table might not exist
      }

      try {
        const { count: newsCount } = await supabase
          .from('newsletter_subscribers')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startStr)
          .lte('created_at', endStr)
        
        newsletterSubs = newsCount || 0
      } catch (e) {
        // Table might not exist
      }

      return {
        users: {
          total: totalUsers || 0,
          new: newUsers || 0,
          active: activeUserIds.size,
          today: todayUsers || 0
        },
        wheels: {
          total: totalWheels || 0,
          new: newWheels || 0,
          withActivities: wheelsWithActivities
        },
        premium: {
          total: totalPremium,
          monthly: monthlyPremium,
          yearly: yearlyPremium,
          new: newPremium || 0
        },
        revenue: {
          mrr,
          arpu
        },
        activities: {
          total: totalActivities || 0,
          new: newActivities || 0
        },
        ai: {
          requests: aiRequests,
          uniqueUsers: aiUniqueUsers
        },
        teams: {
          total: totalTeams || 0,
          new: newTeams || 0,
          members: totalMembers || 0
        },
        sharing: {
          publicWheels: publicWheels || 0,
          templates: templates || 0,
          exports: 0, // Would need to track this separately
          onLanding: onLanding || 0
        },
        retention: {
          newUsers: newUsers || 0,
          returning: activeUserIds.size - (newUsers || 0)
        },
        churn: {
          canceled: canceledSubs || 0,
          rate: churnRate,
          atRisk: atRiskCount
        },
        leads: {
          quizStarts,
          quizCompleted,
          signups: newUsers || 0,
          newsletter: newsletterSubs
        }
      }
    }

    // Get current and previous period stats
    const isAllTime = period === 'all'
    const current = await getStatsForPeriod(dates.start, dates.end, isAllTime)
    const previous = isAllTime 
      ? current // No comparison for all-time
      : await getStatsForPeriod(dates.prevStart, dates.prevEnd)

    return new Response(
      JSON.stringify({ current, previous }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
