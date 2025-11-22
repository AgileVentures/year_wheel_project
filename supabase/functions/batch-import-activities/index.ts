// Batch import activities with optimized bulk inserts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequest {
  wheelId: string
  structure: {
    rings: Array<{id: string, name: string, type: string, visible: boolean, orientation?: string, color?: string}>
    activityGroups: Array<{id: string, name: string, color: string, visible: boolean}>
    labels: Array<{id: string, name: string, color: string, visible: boolean}>
  }
  pages: Array<{
    id: string
    year: number
    pageOrder: number
    title: string
    items: Array<{
      id: string
      name: string
      startDate: string
      endDate: string
      ringId: string
      activityId: string
      labelId?: string | null
      labelIds?: string[] | null
      description?: string | null
    }>
  }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { wheelId, structure, pages } = await req.json() as ImportRequest

    console.log('[BatchImport] Starting import for wheel:', wheelId)
    console.log('[BatchImport] Structure:', structure.rings.length, 'rings,', structure.activityGroups.length, 'groups,', structure.labels.length, 'labels')
    console.log('[BatchImport] Pages:', pages.length, 'pages with', pages.reduce((sum, p) => sum + p.items.length, 0), 'total items')

    // Verify user has access to this wheel
    const { data: wheel, error: wheelError } = await supabaseClient
      .from('year_wheels')
      .select('id')
      .eq('id', wheelId)
      .single()

    if (wheelError || !wheel) {
      return new Response(
        JSON.stringify({ error: 'Wheel not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 1: Bulk insert rings (ON CONFLICT DO NOTHING to handle existing)
    console.log('[BatchImport] Step 1: Inserting rings...')
    const ringInserts = structure.rings.map(ring => ({
      id: ring.id,
      wheel_id: wheelId,
      name: ring.name,
      type: ring.type,
      visible: ring.visible,
      orientation: ring.orientation || 'vertical',
      color: ring.color || null
    }))

    const { error: ringError } = await supabaseClient
      .from('wheel_rings')
      .upsert(ringInserts, { onConflict: 'id', ignoreDuplicates: false })

    if (ringError) {
      console.error('[BatchImport] Ring insert error:', ringError)
      throw new Error(`Failed to insert rings: ${ringError.message}`)
    }

    // STEP 2: Bulk insert activity groups
    console.log('[BatchImport] Step 2: Inserting activity groups...')
    const groupInserts = structure.activityGroups.map(group => ({
      id: group.id,
      wheel_id: wheelId,
      name: group.name,
      color: group.color,
      visible: group.visible
    }))

    const { error: groupError } = await supabaseClient
      .from('activity_groups')
      .upsert(groupInserts, { onConflict: 'id', ignoreDuplicates: false })

    if (groupError) {
      console.error('[BatchImport] Group insert error:', groupError)
      throw new Error(`Failed to insert activity groups: ${groupError.message}`)
    }

    // STEP 3: Bulk insert labels
    if (structure.labels.length > 0) {
      console.log('[BatchImport] Step 3: Inserting labels...')
      const labelInserts = structure.labels.map(label => ({
        id: label.id,
        wheel_id: wheelId,
        name: label.name,
        color: label.color,
        visible: label.visible
      }))

      const { error: labelError } = await supabaseClient
        .from('labels')
        .upsert(labelInserts, { onConflict: 'id', ignoreDuplicates: false })

      if (labelError) {
        console.error('[BatchImport] Label insert error:', labelError)
        throw new Error(`Failed to insert labels: ${labelError.message}`)
      }
    }

    // STEP 4: Ensure pages exist with correct page_order
    console.log('[BatchImport] Step 4: Ensuring pages exist...')
    for (const page of pages) {
      const { error: pageError } = await supabaseClient
        .from('wheel_pages')
        .upsert({
          id: page.id,
          wheel_id: wheelId,
          year: page.year,
          page_order: page.pageOrder,
          title: page.title,
          organization_data: {
            rings: structure.rings,
            activityGroups: structure.activityGroups,
            labels: structure.labels,
            items: page.items
          }
        }, { onConflict: 'id' })

      if (pageError) {
        console.error('[BatchImport] Page upsert error:', pageError)
        throw new Error(`Failed to upsert page ${page.year}: ${pageError.message}`)
      }
    }

    // STEP 5: Bulk insert ALL items across all pages
    console.log('[BatchImport] Step 5: Bulk inserting items...')
    const allItemInserts = []
    
    for (const page of pages) {
      for (const item of page.items) {
        allItemInserts.push({
          id: item.id,
          wheel_id: wheelId,
          page_id: page.id,
          ring_id: item.ringId,
          activity_id: item.activityId,
          label_id: item.labelId || null,
          name: item.name,
          start_date: item.startDate,
          end_date: item.endDate,
          description: item.description || null,
          time: null,
          depends_on_item_id: null,
          dependency_type: 'finish_to_start',
          dependency_lag_days: 0
        })
      }
    }

    console.log('[BatchImport] Inserting', allItemInserts.length, 'items in bulk...')

    // Use upsert with ON CONFLICT to handle duplicates gracefully
    const { error: itemError, count } = await supabaseClient
      .from('items')
      .upsert(allItemInserts, { 
        onConflict: 'id',
        ignoreDuplicates: false,
        count: 'exact'
      })

    if (itemError) {
      console.error('[BatchImport] Item insert error:', itemError)
      throw new Error(`Failed to insert items: ${itemError.message}`)
    }

    console.log('[BatchImport] Successfully inserted/updated', count, 'items')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Import complete: ${count} items saved`,
        stats: {
          rings: structure.rings.length,
          groups: structure.activityGroups.length,
          labels: structure.labels.length,
          pages: pages.length,
          items: count
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[BatchImport] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
