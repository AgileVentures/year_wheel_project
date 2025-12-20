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

    // Get request body
    const { page = 1, limit = 50, search = '', sortBy = 'created_at', sortOrder = 'desc' } = await req.json()

    const offset = (page - 1) * limit

    // Build query for year_wheels (bypassing RLS)
    let query = supabaseAdmin
      .from('year_wheels')
      .select(`
        id,
        title,
        year,
        user_id,
        team_id,
        is_public,
        is_template,
        show_on_landing,
        created_at,
        updated_at
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: wheels, error: wheelsError, count } = await query

    if (wheelsError) {
      console.error('Error fetching wheels:', wheelsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch wheels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user profiles for wheels
    const userIds = [...new Set((wheels || []).map(w => w.user_id).filter(Boolean))]
    
    let profileMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile
        return acc
      }, {} as Record<string, any>)
    }

    // Fetch team names for team wheels
    const teamIds = [...new Set((wheels || []).map(w => w.team_id).filter(Boolean))]
    
    let teamMap: Record<string, any> = {}
    if (teamIds.length > 0) {
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id, name')
        .in('id', teamIds)

      teamMap = (teams || []).reduce((acc, team) => {
        acc[team.id] = team
        return acc
      }, {} as Record<string, any>)
    }

    // Fetch page counts for each wheel
    const wheelIds = (wheels || []).map(w => w.id)
    let pageCountMap: Record<string, number> = {}
    let ringCountMap: Record<string, number> = {}
    let activityGroupCountMap: Record<string, number> = {}
    
    if (wheelIds.length > 0) {
      // Fetch page counts
      const { data: pageCounts, error: pageError } = await supabaseAdmin
        .from('wheel_pages')
        .select('wheel_id')
        .in('wheel_id', wheelIds)

      if (pageError) {
        console.error('Error fetching page counts:', pageError)
      }

      // Count pages per wheel
      pageCountMap = (pageCounts || []).reduce((acc, page) => {
        acc[page.wheel_id] = (acc[page.wheel_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Fetch ring counts
      const { data: ringCounts, error: ringError } = await supabaseAdmin
        .from('wheel_rings')
        .select('wheel_id')
        .in('wheel_id', wheelIds)

      if (ringError) {
        console.error('Error fetching ring counts:', ringError)
      }
      console.log('Ring counts raw:', ringCounts?.length, 'for', wheelIds.length, 'wheels')

      ringCountMap = (ringCounts || []).reduce((acc, ring) => {
        acc[ring.wheel_id] = (acc[ring.wheel_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Fetch activity counts using SQL aggregation for efficiency
      // Items have wheel_id directly, so we can count by wheel_id
      const { data: itemCountData, error: itemCountError } = await supabaseAdmin
        .rpc('admin_count_items_by_wheel', { wheel_ids: wheelIds })

      if (itemCountError) {
        console.error('Error fetching item counts via RPC:', itemCountError)
        // Fallback: try direct count query
        const { data: fallbackCounts, error: fallbackError } = await supabaseAdmin
          .from('items')
          .select('wheel_id')
          .in('wheel_id', wheelIds)
        
        if (!fallbackError && fallbackCounts) {
          fallbackCounts.forEach(item => {
            activityGroupCountMap[item.wheel_id] = (activityGroupCountMap[item.wheel_id] || 0) + 1
          })
        }
      } else if (itemCountData) {
        itemCountData.forEach((row: { wheel_id: string; count: number }) => {
          activityGroupCountMap[row.wheel_id] = row.count
        })
      }
      
      console.log('Activity counts:', activityGroupCountMap)
    }

    // Combine data
    const enrichedWheels = (wheels || []).map(wheel => ({
      ...wheel,
      owner: profileMap[wheel.user_id] || null,
      team: teamMap[wheel.team_id] || null,
      page_count: pageCountMap[wheel.id] || 0,
      ring_count: ringCountMap[wheel.id] || 0,
      activity_count: activityGroupCountMap[wheel.id] || 0
    }))

    return new Response(
      JSON.stringify({
        wheels: enrichedWheels,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
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
