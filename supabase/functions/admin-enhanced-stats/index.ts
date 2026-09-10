import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface PeriodDates {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
}

const getPeriodDates = (period: string, customStart?: string, customEnd?: string): PeriodDates => {
  const now = new Date()
  const end = new Date(now)
  let start: Date
  let prevStart: Date
  let prevEnd: Date

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate())
      break
    case 'week': { // This week (Monday to now)
      const dayOfWeek = now.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0 days back
      start = new Date(now)
      start.setDate(start.getDate() - daysFromMonday)
      start.setHours(0, 0, 0, 0)
      prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 6)
      break
    }
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
    case 'custom':
      if (customStart && customEnd) {
        start = new Date(customStart)
        const customEndDate = new Date(customEnd)
        const daysDiff = Math.ceil((customEndDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        prevEnd = new Date(start)
        prevEnd.setDate(prevEnd.getDate() - 1)
        prevStart = new Date(prevEnd)
        prevStart.setDate(prevStart.getDate() - daysDiff)
        return { start, end: customEndDate, prevStart, prevEnd }
      }
      // Fall through to default if no custom dates
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

    const { period = '30d', customStart, customEnd } = await req.json()
    const dates = getPeriodDates(period, customStart, customEnd)

    // Helper function to get stats for a period
    const getStatsForPeriod = async (startDate: Date, endDate: Date) => {
      const startIso = startDate.toISOString()
      const endIso = endDate.toISOString()

      // Users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso)

      // Active users are users who changed a wheel during the selected period.
      const { data: activeWheelUsers } = await supabase
        .from('year_wheels')
        .select('user_id')
        .gte('updated_at', startIso)
        .lte('updated_at', endIso)
      
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
        .eq('is_template', false)

      const { count: newWheels } = await supabase
        .from('year_wheels')
        .select('*', { count: 'exact', head: true })
        .eq('is_template', false)
        .gte('created_at', startIso)
        .lte('created_at', endIso)

      // Wheels with activities
      const { data: realWheels } = await supabase
        .from('year_wheels')
        .select('id')
        .eq('is_template', false)

      const { data: wheelsWithItems } = realWheels?.length
        ? await supabase
        .from('items')
        .select('wheel_id')
        .in('wheel_id', realWheels.map(wheel => wheel.id))
        : { data: [] }
      
      const wheelsWithActivities = new Set((wheelsWithItems || []).map(i => i.wheel_id)).size

      // Premium subscriptions. Free rows are present for many users, so plan_type
      // must be checked explicitly instead of relying on status alone.
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')

      const activeSubscriptions = (subscriptions || []).filter(s => (
        s.status === 'active' &&
        ['monthly', 'yearly', 'gift'].includes(s.plan_type) &&
        (!s.current_period_end || new Date(s.current_period_end) > new Date())
      ))
      const activeSubscriberIds = new Set(activeSubscriptions.map(s => s.user_id))
      const monthlyPremium = activeSubscriptions.filter(s => s.plan_type === 'monthly').length || 0
      const yearlyPremium = activeSubscriptions.filter(s => s.plan_type === 'yearly').length || 0
      const giftPremium = activeSubscriptions.filter(s => s.plan_type === 'gift').length || 0
      
      // Paying subscribers = monthly + yearly (excludes gift)
      const payingSubscribers = monthlyPremium + yearlyPremium
      // Total premium includes gift subscriptions
      const totalPremium = payingSubscribers + giftPremium

      const newSubscriptions = (subscriptions || []).filter(s => (
        ['monthly', 'yearly', 'gift'].includes(s.plan_type) &&
        s.created_at >= startIso &&
        s.created_at <= endIso
      ))
      const newPremium = newSubscriptions.length
      const newPaying = newSubscriptions.filter(s => ['monthly', 'yearly'].includes(s.plan_type)).length
      const newGift = newSubscriptions.filter(s => s.plan_type === 'gift').length

      // Calculate MRR (Monthly Recurring Revenue) - only from paying subscribers
      // Pricing: monthly = 79 SEK, yearly = 768 SEK/year (64 SEK/month)
      const mrr = (monthlyPremium * 79) + (yearlyPremium * 64)
      // ARPU based on paying subscribers only (gift subs don't generate revenue)
      const arpu = payingSubscribers > 0 ? mrr / payingSubscribers : 0

      // Activities/Items
      const { count: totalActivities } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })

      const { count: newActivities } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso)

      // AI Usage - check ai_conversation_logs if exists
      let aiRequests = 0
      let aiUniqueUsers = 0
      try {
        const { count: aiCount } = await supabase
          .from('ai_conversation_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startIso)
          .lte('created_at', endIso)
        
        const { data: aiUsers } = await supabase
          .from('ai_conversation_logs')
          .select('user_id')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
        
        aiRequests = aiCount || 0
        aiUniqueUsers = new Set((aiUsers || []).map(u => u.user_id)).size
      } catch {
        // Table might not exist
      }

      // Teams
      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })

      const { count: newTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso)

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
      const { count: canceledSubscriptionEvents } = await supabase
        .from('subscription_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'customer.subscription.deleted')
        .gte('created_at', startIso)
        .lte('created_at', endIso)

      // At risk - users who haven't been active in 14+ days but have subscription
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      let atRiskCount = 0
      if (activeSubscriberIds.size > 0) {
        const { data: subscriberWheels } = await supabase
          .from('year_wheels')
          .select('user_id, updated_at')
          .in('user_id', [...activeSubscriberIds])
        const lastActivityByUser = new Map<string, string>()
        for (const wheel of subscriberWheels || []) {
          const previousActivity = lastActivityByUser.get(wheel.user_id)
          if (!previousActivity || wheel.updated_at > previousActivity) {
            lastActivityByUser.set(wheel.user_id, wheel.updated_at)
          }
        }
        atRiskCount = [...activeSubscriberIds].filter(userId => {
          const lastActivity = lastActivityByUser.get(userId)
          return !lastActivity || new Date(lastActivity) < twoWeeksAgo
        }).length
      }

      const expiredGiftCount = (subscriptions || []).filter(s => (
        s.plan_type === 'gift' &&
        s.current_period_end &&
        s.current_period_end >= startIso &&
        s.current_period_end <= endIso
      )).length
      const canceledSubs = (canceledSubscriptionEvents || 0) + expiredGiftCount
      const churnRate = totalPremium > 0 ? (canceledSubs / totalPremium) * 100 : 0

      // Leads
      let quizStarts = 0
      let quizCompleted = 0
      let newsletterSubs = 0
      try {
        const { count: quizStartCount } = await supabase
          .from('quiz_leads')
          .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso)
        
        const { count: quizCompleteCount } = await supabase
          .from('quiz_leads')
          .select('*', { count: 'exact', head: true })
          .not('pain_points', 'is', null)
          .gte('created_at', startIso)
          .lte('created_at', endIso)

        quizStarts = quizStartCount || 0
        quizCompleted = quizCompleteCount || 0
      } catch {
        // Table might not exist
      }

      try {
        const { count: newsCount } = await supabase
          .from('newsletter_subscribers')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startIso)
          .lte('created_at', endIso)
        
        newsletterSubs = newsCount || 0
      } catch {
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
          paying: payingSubscribers,
          monthly: monthlyPremium,
          yearly: yearlyPremium,
          gift: giftPremium,
          new: newPremium || 0,
          newPaying,
          newGift
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
    const current = await getStatsForPeriod(dates.start, dates.end)
    const previous = isAllTime 
      ? current // No comparison for all-time
      : await getStatsForPeriod(dates.prevStart, dates.prevEnd)

    return new Response(
      JSON.stringify({ statsVersion: 2, current, previous }),
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
