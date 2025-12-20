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
    const { wheelId } = await req.json()

    if (!wheelId) {
      return new Response(
        JSON.stringify({ error: 'wheelId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch wheel (bypassing RLS)
    const { data: wheel, error: wheelError } = await supabaseAdmin
      .from('year_wheels')
      .select('*')
      .eq('id', wheelId)
      .single()

    if (wheelError) {
      console.error('Error fetching wheel:', wheelError)
      return new Response(
        JSON.stringify({ error: 'Wheel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch rings
    const { data: rings, error: ringsError } = await supabaseAdmin
      .from('wheel_rings')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('ring_order')

    if (ringsError) {
      console.error('Error fetching rings:', ringsError)
    }

    // Fetch ring data for inner rings
    const ringIds = (rings || []).filter(r => r.type === 'inner').map(r => r.id)
    let ringData: any[] = []
    if (ringIds.length > 0) {
      const { data, error: ringDataError } = await supabaseAdmin
        .from('ring_data')
        .select('*')
        .in('ring_id', ringIds)
      
      if (ringDataError) {
        console.error('Error fetching ring data:', ringDataError)
      }
      ringData = data || []
    }

    // Fetch activity groups
    const { data: activityGroups, error: activityGroupsError } = await supabaseAdmin
      .from('activity_groups')
      .select('*')
      .eq('wheel_id', wheelId)

    if (activityGroupsError) {
      console.error('Error fetching activity groups:', activityGroupsError)
    }

    // Fetch labels
    const { data: labels, error: labelsError } = await supabaseAdmin
      .from('labels')
      .select('*')
      .eq('wheel_id', wheelId)

    if (labelsError) {
      console.error('Error fetching labels:', labelsError)
    }

    // Fetch pages
    const { data: pages, error: pagesError } = await supabaseAdmin
      .from('wheel_pages')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('page_order')

    if (pagesError) {
      console.error('Error fetching pages:', pagesError)
    }

    // Fetch all items for this wheel (across all pages)
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('wheel_id', wheelId)

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
    }

    // Get owner info
    let owner = null
    if (wheel.user_id) {
      const { data: ownerProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', wheel.user_id)
        .single()
      owner = ownerProfile
    }

    // Get team info
    let team = null
    if (wheel.team_id) {
      const { data: teamData } = await supabaseAdmin
        .from('teams')
        .select('id, name')
        .eq('id', wheel.team_id)
        .single()
      team = teamData
    }

    // Transform rings to match app structure
    const wheelColors = wheel.colors || ['#F5E6D3', '#A8DCD1', '#F4A896', '#B8D4E8']
    
    const normalizedRings = (rings || []).map((ring: any, index: number) => {
      if (ring.type === 'inner') {
        const monthData = ringData
          .filter(rd => rd.ring_id === ring.id)
          .sort((a, b) => a.month_index - b.month_index)

        return {
          id: ring.id,
          name: ring.name,
          type: ring.type,
          visible: ring.visible,
          orientation: ring.orientation || 'vertical',
          data: monthData.length > 0
            ? monthData.map(md => md.content)
            : Array.from({ length: 12 }, () => [''])
        }
      }

      const outerRingIndex = (rings || []).filter((r: any, i: number) => i < index && r.type === 'outer').length
      return {
        id: ring.id,
        name: ring.name,
        type: ring.type,
        color: ring.color || wheelColors[outerRingIndex % wheelColors.length],
        visible: ring.visible
      }
    })

    const normalizedActivityGroups = (activityGroups || []).map((ag: any, index: number) => ({
      id: ag.id,
      name: ag.name,
      color: ag.color || wheelColors[index % wheelColors.length],
      visible: ag.visible
    }))

    const normalizedLabels = (labels || []).map((l: any, index: number) => ({
      id: l.id,
      name: l.name,
      color: l.color || wheelColors[index % wheelColors.length],
      visible: l.visible
    }))

    // Normalize items
    const normalizedItems = (items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      startDate: item.start_date,
      endDate: item.end_date,
      ringId: item.ring_id,
      activityId: item.activity_id,
      labelId: item.label_id,
      pageId: item.page_id,
      time: item.time,
      description: item.description
    }))

    return new Response(
      JSON.stringify({
        wheel: {
          id: wheel.id,
          title: wheel.title,
          year: wheel.year,
          colors: wheelColors,
          showWeekRing: wheel.show_week_ring,
          showMonthRing: wheel.show_month_ring,
          showRingNames: wheel.show_ring_names,
          weekRingDisplayMode: wheel.week_ring_display_mode,
          showLabels: wheel.show_labels,
          isPublic: wheel.is_public,
          isTemplate: wheel.is_template,
          showOnLanding: wheel.show_on_landing,
          createdAt: wheel.created_at,
          updatedAt: wheel.updated_at,
          owner,
          team
        },
        structure: {
          rings: normalizedRings,
          activityGroups: normalizedActivityGroups,
          labels: normalizedLabels
        },
        pages: pages || [],
        items: normalizedItems
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
