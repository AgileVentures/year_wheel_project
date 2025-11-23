// Batch import activities with optimized bulk inserts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to send import completion email
async function sendImportCompletionEmail(params: {
  email: string
  wheelId: string
  fileName: string
  stats: {
    rings: number
    groups: number
    labels: number
    pages: number
    items: number
  }
}) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email')
    return
  }

  const wheelUrl = `${Deno.env.get('APP_URL') || 'https://app.yearwheel.com'}/wheel/${params.wheelId}`
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .stats { background: white; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: #6b7280; }
    .stat-value { font-weight: 600; color: #111827; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Import Klar!</h1>
    </div>
    <div class="content">
      <p>Din CSV-import har slutförts framgångsrikt.</p>
      
      <div class="stats">
        <h3 style="margin-top: 0;">Import Statistik</h3>
        <div class="stat-row">
          <span class="stat-label">Fil</span>
          <span class="stat-value">${params.fileName}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Ringar</span>
          <span class="stat-value">${params.stats.rings}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Aktivitetsgrupper</span>
          <span class="stat-value">${params.stats.groups}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Etiketter</span>
          <span class="stat-value">${params.stats.labels}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Sidor (år)</span>
          <span class="stat-value">${params.stats.pages}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Aktiviteter</span>
          <span class="stat-value">${params.stats.items}</span>
        </div>
      </div>
      
      <p>Ditt årshjul är nu redo att använda!</p>
      
      <a href="${wheelUrl}" class="button">Öppna Årshjul</a>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Länken är giltig i 30 dagar. Du kan också hitta ditt hjul i din instrumentpanel.
      </p>
    </div>
    <div class="footer">
      <p>YearWheel - Visualisera ditt år</p>
    </div>
  </div>
</body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'YearWheel <noreply@yearwheel.com>',
        to: [params.email],
        subject: `✅ Din CSV-import är klar! (${params.stats.items} aktiviteter)`,
        html: htmlContent
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] Resend API error:', error)
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await response.json()
    console.log('[Email] Successfully sent completion email:', data)
  } catch (error) {
    console.error('[Email] Failed to send completion email:', error)
    // Don't throw - email failure shouldn't fail the import
  }
}

interface ImportRequest {
  wheelId: string
  importMode?: 'replace' | 'append'  // Default: 'append' for backwards compatibility
  notifyEmail?: string | null  // Send email notification when import completes
  fileName?: string  // Original filename for email
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

    const { wheelId, importMode = 'append', structure, pages, notifyEmail, fileName } = await req.json() as ImportRequest

    console.log('[BatchImport] Starting import for wheel:', wheelId, 'mode:', importMode, 'notifyEmail:', notifyEmail)
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

    // Send email notification for large imports
    if (notifyEmail) {
      console.log('[BatchImport] Sending completion email to:', notifyEmail)
      await sendImportCompletionEmail({
        email: notifyEmail,
        wheelId,
        fileName: fileName || 'CSV-fil',
        stats: {
          rings: insertedRings.length,
          groups: insertedGroups.length,
          labels: structure.labels.length,
          pages: pages.length,
          items: count || allItemInserts.length
        }
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Import complete: ${count || allItemInserts.length} items saved${notifyEmail ? '. Email notification sent.' : ''}`,
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
