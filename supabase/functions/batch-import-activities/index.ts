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

    // STEP 1: Bulk insert rings (let database generate UUIDs)
    console.log('[BatchImport] Step 1: Inserting rings...')
    const ringInserts = structure.rings.map(ring => ({
      wheel_id: wheelId,
      name: ring.name,
      type: ring.type,
      visible: ring.visible,
      orientation: ring.orientation || 'vertical',
      color: ring.color || null,
      ring_order: 0 // Will be updated if needed
    }))

    const { data: insertedRings, error: ringError } = await supabaseClient
      .from('wheel_rings')
      .insert(ringInserts)
      .select('id, name')

    if (ringError) {
      console.error('[BatchImport] Ring insert error:', ringError)
      throw new Error(`Failed to insert rings: ${ringError.message}`)
    }

    // Build ring name -> database ID mapping
    const ringNameToId = new Map<string, string>()
    insertedRings.forEach((ring: any) => {
      ringNameToId.set(ring.name, ring.id)
    })
    console.log('[BatchImport] Inserted', insertedRings.length, 'rings with IDs')

    // STEP 2: Bulk insert activity groups
    console.log('[BatchImport] Step 2: Inserting activity groups...')
    const groupInserts = structure.activityGroups.map(group => ({
      wheel_id: wheelId,
      name: group.name,
      color: group.color,
      visible: group.visible
    }))

    const { data: insertedGroups, error: groupError } = await supabaseClient
      .from('activity_groups')
      .insert(groupInserts)
      .select('id, name')

    if (groupError) {
      console.error('[BatchImport] Group insert error:', groupError)
      throw new Error(`Failed to insert activity groups: ${groupError.message}`)
    }

    // Build group name -> database ID mapping
    const groupNameToId = new Map<string, string>()
    insertedGroups.forEach((group: any) => {
      groupNameToId.set(group.name, group.id)
    })
    console.log('[BatchImport] Inserted', insertedGroups.length, 'activity groups with IDs')

    // STEP 3: Bulk insert labels
    const labelNameToId = new Map<string, string>()
    if (structure.labels.length > 0) {
      console.log('[BatchImport] Step 3: Inserting labels...')
      const labelInserts = structure.labels.map(label => ({
        wheel_id: wheelId,
        name: label.name,
        color: label.color,
        visible: label.visible
      }))

      const { data: insertedLabels, error: labelError } = await supabaseClient
        .from('labels')
        .insert(labelInserts)
        .select('id, name')

      if (labelError) {
        console.error('[BatchImport] Label insert error:', labelError)
        throw new Error(`Failed to insert labels: ${labelError.message}`)
      }

      insertedLabels.forEach((label: any) => {
        labelNameToId.set(label.name, label.id)
      })
      console.log('[BatchImport] Inserted', insertedLabels.length, 'labels with IDs')
    }

    // STEP 4: Ensure pages exist and map ring/group names to their database IDs
    console.log('[BatchImport] Step 4: Ensuring pages exist...')
    const pageIdMap = new Map<string, string>() // temp ID -> database ID
    
    for (const page of pages) {
      // Map ring IDs and group IDs in items to database IDs
      const mappedItems = page.items.map(item => {
        const dbRingId = ringNameToId.get(structure.rings.find(r => r.id === item.ringId)?.name || '')
        const dbActivityId = groupNameToId.get(structure.activityGroups.find(g => g.id === item.activityId)?.name || '')
        
        let dbLabelId = null
        if (item.labelId && structure.labels.length > 0) {
          const labelName = structure.labels.find(l => l.id === item.labelId)?.name
          dbLabelId = labelName ? labelNameToId.get(labelName) : null
        }
        
        return {
          ...item,
          ringId: dbRingId,
          activityId: dbActivityId,
          labelId: dbLabelId
        }
      })
      
      const { data: upsertedPage, error: pageError } = await supabaseClient
        .from('wheel_pages')
        .upsert({
          id: page.id, // Keep the page ID from ensurePageForYear
          wheel_id: wheelId,
          year: page.year,
          page_order: page.pageOrder,
          title: page.title,
          organization_data: {
            rings: structure.rings,
            activityGroups: structure.activityGroups,
            labels: structure.labels,
            items: mappedItems
          }
        }, { onConflict: 'id' })
        .select('id')
        .single()

      if (pageError) {
        console.error('[BatchImport] Page upsert error:', pageError)
        throw new Error(`Failed to upsert page ${page.year}: ${pageError.message}`)
      }
      
      pageIdMap.set(page.id, upsertedPage.id)
    }

    // STEP 5: Bulk insert ALL items across all pages with mapped IDs
    console.log('[BatchImport] Step 5: Bulk inserting items...')
    const allItemInserts = []
    
    for (const page of pages) {
      const dbPageId = pageIdMap.get(page.id)
      
      for (const item of page.items) {
        const dbRingId = ringNameToId.get(structure.rings.find(r => r.id === item.ringId)?.name || '')
        const dbActivityId = groupNameToId.get(structure.activityGroups.find(g => g.id === item.activityId)?.name || '')
        
        let dbLabelId = null
        if (item.labelId && structure.labels.length > 0) {
          const labelName = structure.labels.find(l => l.id === item.labelId)?.name
          dbLabelId = labelName ? labelNameToId.get(labelName) : null
        }
        
        if (!dbRingId || !dbActivityId || !dbPageId) {
          console.warn('[BatchImport] Skipping item with missing IDs:', item.name, {
            dbRingId, dbActivityId, dbPageId
          })
          continue
        }
        
        allItemInserts.push({
          wheel_id: wheelId,
          page_id: dbPageId,
          ring_id: dbRingId,
          activity_id: dbActivityId,
          label_id: dbLabelId,
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

    // Insert items without IDs - let database generate them
    const { error: itemError, count } = await supabaseClient
      .from('items')
      .insert(allItemInserts)
      .select('id', { count: 'exact', head: true })

    if (itemError) {
      console.error('[BatchImport] Item insert error:', itemError)
      throw new Error(`Failed to insert items: ${itemError.message}`)
    }

    console.log('[BatchImport] Successfully inserted', count || allItemInserts.length, 'items')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Import complete: ${count || allItemInserts.length} items saved`,
        stats: {
          rings: insertedRings.length,
          groups: insertedGroups.length,
          labels: structure.labels.length,
          pages: pages.length,
          items: count || allItemInserts.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('[BatchImport] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
