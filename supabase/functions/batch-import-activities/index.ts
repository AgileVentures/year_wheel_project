// Batch import activities with optimized bulk inserts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequest {
  wheelId: string
  importMode?: 'replace' | 'append'  // Default: 'append' for backwards compatibility
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

    const { wheelId, importMode = 'append', structure, pages } = await req.json() as ImportRequest

    console.log('[BatchImport] Starting import for wheel:', wheelId, 'mode:', importMode)
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

    // STEP 0: Delete existing data if replace mode
    if (importMode === 'replace') {
      console.log('[BatchImport] Replace mode: Deleting existing wheel data...')
      
      // Delete in correct order to avoid FK violations:
      // 1. Items (references rings, activity_groups, labels, pages)
      // 2. Labels (references wheel)
      // 3. Activity groups (references wheel)
      // 4. Rings (references wheel)
      // Note: We do NOT delete pages or the wheel itself
      
      const { error: itemsDeleteError } = await supabaseClient
        .from('items')
        .delete()
        .eq('wheel_id', wheelId)
      
      if (itemsDeleteError) {
        console.error('[BatchImport] Failed to delete items:', itemsDeleteError)
        throw new Error(`Failed to delete items: ${itemsDeleteError.message}`)
      }
      console.log('[BatchImport] Deleted items')
      
      const { error: labelsDeleteError } = await supabaseClient
        .from('labels')
        .delete()
        .eq('wheel_id', wheelId)
      
      if (labelsDeleteError) {
        console.error('[BatchImport] Failed to delete labels:', labelsDeleteError)
        throw new Error(`Failed to delete labels: ${labelsDeleteError.message}`)
      }
      console.log('[BatchImport] Deleted labels')
      
      const { error: groupsDeleteError } = await supabaseClient
        .from('activity_groups')
        .delete()
        .eq('wheel_id', wheelId)
      
      if (groupsDeleteError) {
        console.error('[BatchImport] Failed to delete activity groups:', groupsDeleteError)
        throw new Error(`Failed to delete activity groups: ${groupsDeleteError.message}`)
      }
      console.log('[BatchImport] Deleted activity groups')
      
      const { error: ringsDeleteError } = await supabaseClient
        .from('wheel_rings')
        .delete()
        .eq('wheel_id', wheelId)
      
      if (ringsDeleteError) {
        console.error('[BatchImport] Failed to delete rings:', ringsDeleteError)
        throw new Error(`Failed to delete rings: ${ringsDeleteError.message}`)
      }
      console.log('[BatchImport] Deleted rings')
      console.log('[BatchImport] All existing data deleted successfully')
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

    // STEP 4: Ensure pages exist (don't update structure - it's a cache that will be rebuilt)
    console.log('[BatchImport] Step 4: Ensuring pages exist...')
    const pageIdMap = new Map<string, string>() // temp ID -> database ID
    
    for (const page of pages) {
      // Check if page already exists by wheel_id + year (unique constraint)
      const { data: existingPage, error: selectError } = await supabaseClient
        .from('wheel_pages')
        .select('id')
        .eq('wheel_id', wheelId)
        .eq('year', page.year)
        .maybeSingle()
      
      if (existingPage) {
        // Page already exists, use its ID
        console.log('[BatchImport] Page for year', page.year, 'already exists with ID:', existingPage.id)
        pageIdMap.set(page.id, existingPage.id)
      } else {
        // Page doesn't exist, get next available page_order and create it
        const { data: nextOrderData, error: orderError } = await supabaseClient
          .rpc('get_next_page_order', { p_wheel_id: wheelId })
        
        if (orderError) {
          console.error('[BatchImport] Failed to get next page order:', orderError)
          throw new Error(`Failed to get next page order: ${orderError.message}`)
        }
        
        const nextPageOrder = nextOrderData || 1
        
        const { data: newPage, error: insertError } = await supabaseClient
          .from('wheel_pages')
          .insert({
            wheel_id: wheelId,
            year: page.year,
            page_order: nextPageOrder,
            title: page.title || `${page.year}`
          })
          .select('id')
          .single()
        
        if (insertError) {
          console.error('[BatchImport] Page insert error:', insertError)
          throw new Error(`Failed to insert page ${page.year}: ${insertError.message}`)
        }
        
        console.log('[BatchImport] Created new page for year', page.year, 'with ID:', newPage.id, 'page_order:', nextPageOrder)
        pageIdMap.set(page.id, newPage.id)
      }
    }
    
    // CRITICAL: Reorder all pages chronologically after creating new ones
    console.log('[BatchImport] Reordering pages chronologically...')
    const { data: allPages, error: fetchError } = await supabaseClient
      .from('wheel_pages')
      .select('id, year')
      .eq('wheel_id', wheelId)
      .order('year', { ascending: true })
    
    if (fetchError) {
      console.error('[BatchImport] Failed to fetch pages for reordering:', fetchError)
    } else if (allPages) {
      // Update page_order to match chronological year order
      const updates = allPages.map((pg: any, index: number) => 
        supabaseClient
          .from('wheel_pages')
          .update({ page_order: index + 1 })
          .eq('id', pg.id)
      )
      
      await Promise.all(updates)
      console.log('[BatchImport] Reordered', allPages.length, 'pages by year')
    }

    // STEP 5: Build ID mappings by matching on names (since temp IDs from frontend need to map to DB UUIDs)
    // Frontend sends: {id: "ring-1", name: "Klientaktiviteter"}
    // We inserted and got back: {id: "uuid-abc", name: "Klientaktiviteter"}
    // Map: "ring-1" -> "uuid-abc" by matching names
    
    const tempToDbRingId = new Map<string, string>()
    structure.rings.forEach(tempRing => {
      const dbId = ringNameToId.get(tempRing.name)
      if (dbId) {
        tempToDbRingId.set(tempRing.id, dbId)
      }
    })
    
    const tempToDbGroupId = new Map<string, string>()
    structure.activityGroups.forEach(tempGroup => {
      const dbId = groupNameToId.get(tempGroup.name)
      if (dbId) {
        tempToDbGroupId.set(tempGroup.id, dbId)
      }
    })
    
    const tempToDbLabelId = new Map<string, string>()
    structure.labels.forEach(tempLabel => {
      const dbId = labelNameToId.get(tempLabel.name)
      if (dbId) {
        tempToDbLabelId.set(tempLabel.id, dbId)
      }
    })

    // STEP 6: Bulk insert ALL items across all pages with mapped IDs
    const allItemInserts = []
    
    for (const page of pages) {
      const dbPageId = pageIdMap.get(page.id)
      
      for (const item of page.items) {
        // Use temp-to-DB ID mapping from Step 5
        const dbRingId = tempToDbRingId.get(item.ringId)
        const dbActivityId = tempToDbGroupId.get(item.activityId)
        const dbLabelId = item.labelId ? tempToDbLabelId.get(item.labelId) : null
        
        if (!dbRingId || !dbActivityId || !dbPageId) {
          console.warn('[BatchImport] Skipping item with missing IDs:', item.name, {
            tempRingId: item.ringId,
            tempActivityId: item.activityId,
            dbRingId,
            dbActivityId,
            dbPageId
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
    console.log('[BatchImport] Sample items (first 3):', allItemInserts.slice(0, 3))
    console.log('[BatchImport] ID mapping stats:', {
      totalRingMappings: tempToDbRingId.size,
      totalGroupMappings: tempToDbGroupId.size,
      totalLabelMappings: tempToDbLabelId.size,
      totalPageMappings: pageIdMap.size,
      pagesWithItems: pages.map(p => ({ pageId: p.id, itemCount: p.items.length }))
    })

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
