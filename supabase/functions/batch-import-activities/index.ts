// Async batch import with background processing and realtime progress
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequest {
  wheelId: string
  importMode?: 'replace' | 'append'
  notifyEmail?: string | null
  fileName?: string
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
    // Create service role client for job management
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create user-scoped client for auth
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { wheelId, importMode = 'append', structure, pages, notifyEmail, fileName } = await req.json() as ImportRequest

    console.log('[BatchImport] Creating async job for wheel:', wheelId, 'user:', user.id)

    // Verify user has access to this wheel
    const { data: wheel, error: wheelError } = await supabaseUserClient
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

    const totalItems = pages.reduce((sum, p) => sum + p.items.length, 0)

    // Create import job record
    const { data: job, error: jobError } = await supabaseServiceClient
      .from('import_jobs')
      .insert({
        wheel_id: wheelId,
        user_id: user.id,
        file_name: fileName || 'import.csv',
        import_mode: importMode,
        status: 'pending',
        progress: 0,
        total_items: totalItems,
        processed_items: 0,
        payload: { structure, pages, notifyEmail, userEmail: user.email }
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('[BatchImport] Failed to create job:', jobError)
      return new Response(
        JSON.stringify({ error: 'Failed to create import job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[BatchImport] Job created:', job.id, 'starting background processing...')

    // Start background processing (don't await - let it run async)
    processImportJob(job.id, supabaseServiceClient).catch(err => {
      console.error('[BatchImport] Background error:', err)
    })

    // Return immediately with job ID
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: `Import job created with ${totalItems} items. Watch for realtime progress updates.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[BatchImport] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Background job processor
async function processImportJob(jobId: string, supabase: any) {
  try {
    console.log('[ProcessJob', jobId, '] Starting...')

    // Fetch job
    const { data: job, error: fetchError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      console.error('[ProcessJob] Job not found:', fetchError)
      return
    }

    const { wheel_id: wheelId, import_mode: importMode, payload } = job
    const { structure, pages, notifyEmail, userEmail } = payload

    // Update to processing
    await updateJobProgress(supabase, jobId, {
      status: 'processing',
      started_at: new Date().toISOString(),
      current_step: 'Initierar import...',
      progress: 5
    })

    // STEP 0: Delete existing data if replace mode
    if (importMode === 'replace') {
      await updateJobProgress(supabase, jobId, {
        current_step: 'Raderar befintlig data...',
        progress: 10
      })

      await supabase.from('items').delete().eq('wheel_id', wheelId)
      await supabase.from('labels').delete().eq('wheel_id', wheelId)
      await supabase.from('activity_groups').delete().eq('wheel_id', wheelId)
      await supabase.from('wheel_rings').delete().eq('wheel_id', wheelId)
    }

    // STEP 1: Insert rings
    await updateJobProgress(supabase, jobId, {
      current_step: `Skapar ${structure.rings.length} ringar...`,
      progress: 20
    })

    const ringInserts = structure.rings.map(ring => ({
      wheel_id: wheelId,
      name: ring.name,
      type: ring.type,
      visible: ring.visible,
      orientation: ring.orientation || 'vertical',
      color: ring.color || null,
      ring_order: structure.rings.indexOf(ring)
    }))

    const { data: createdRings, error: ringsError } = await supabase
      .from('wheel_rings')
      .upsert(ringInserts, { onConflict: 'wheel_id,name', ignoreDuplicates: false })
      .select()

    if (ringsError) throw new Error(`Ring creation failed: ${ringsError.message}`)

    // STEP 2: Insert activity groups
    await updateJobProgress(supabase, jobId, {
      current_step: `Skapar ${structure.activityGroups.length} aktivitetsgrupper...`,
      progress: 30,
      created_rings: createdRings?.length || 0
    })

    const groupInserts = structure.activityGroups.map(group => ({
      wheel_id: wheelId,
      name: group.name,
      color: group.color,
      visible: group.visible
    }))

    const { data: createdGroups, error: groupsError } = await supabase
      .from('activity_groups')
      .upsert(groupInserts, { onConflict: 'wheel_id,name', ignoreDuplicates: false })
      .select()

    if (groupsError) throw new Error(`Group creation failed: ${groupsError.message}`)

    // STEP 3: Insert labels
    let createdLabels: any[] = []
    if (structure.labels.length > 0) {
      await updateJobProgress(supabase, jobId, {
        current_step: `Skapar ${structure.labels.length} etiketter...`,
        progress: 40,
        created_groups: createdGroups?.length || 0
      })

      const labelInserts = structure.labels.map(label => ({
        wheel_id: wheelId,
        name: label.name,
        color: label.color,
        visible: label.visible
      }))

      const { data: labels, error: labelsError } = await supabase
        .from('labels')
        .upsert(labelInserts, { onConflict: 'wheel_id,name', ignoreDuplicates: false })
        .select()

      if (labelsError) throw new Error(`Label creation failed: ${labelsError.message}`)
      createdLabels = labels || []
    }

    // Build ID mappings
    const ringIdMap = new Map(createdRings?.map((r: any) => [r.name, r.id]))
    const groupIdMap = new Map(createdGroups?.map((g: any) => [g.name, g.id]))
    const labelIdMap = new Map(createdLabels.map((l: any) => [l.name, l.id]))

    // STEP 4: Insert pages and items
    let totalCreatedPages = 0
    let totalCreatedItems = 0

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex]
      const pageProgress = 40 + ((pageIndex / pages.length) * 50)

      await updateJobProgress(supabase, jobId, {
        current_step: `Bearbetar sida ${pageIndex + 1}/${pages.length} (${page.year})...`,
        progress: Math.round(pageProgress),
        created_labels: createdLabels.length,
        created_pages: totalCreatedPages
      })

      // Find or create page
      const { data: existingPages } = await supabase
        .from('wheel_pages')
        .select('id')
        .eq('wheel_id', wheelId)
        .eq('year', page.year)
        .order('page_order')

      let pageId: string
      if (existingPages && existingPages.length > 0) {
        pageId = existingPages[0].id
      } else {
        const { data: newPage, error: pageError } = await supabase
          .from('wheel_pages')
          .insert({
            wheel_id: wheelId,
            year: page.year,
            page_order: page.pageOrder,
            title: page.title || `${page.year}`
          })
          .select()
          .single()

        if (pageError) throw new Error(`Page creation failed: ${pageError.message}`)
        pageId = newPage.id
        totalCreatedPages++
      }

      // Insert items in batches
      const BATCH_SIZE = 100
      for (let i = 0; i < page.items.length; i += BATCH_SIZE) {
        const batch = page.items.slice(i, i + BATCH_SIZE)
        
        const itemInserts = batch.map(item => {
          const ringId = ringIdMap.get(item.ringId)
          const activityId = groupIdMap.get(item.activityId)
          
          if (!ringId || !activityId) {
            console.warn(`[ProcessJob] Missing IDs for item: ${item.name}`)
            return null
          }

          return {
            wheel_id: wheelId,
            page_id: pageId,
            ring_id: ringId,
            activity_id: activityId,
            label_id: item.labelId ? labelIdMap.get(item.labelId) : null,
            name: item.name,
            start_date: item.startDate,
            end_date: item.endDate,
            description: item.description || null,
            source: 'manual'
          }
        }).filter(Boolean)

        if (itemInserts.length > 0) {
          const { error: itemsError } = await supabase
            .from('items')
            .insert(itemInserts)

          if (itemsError) throw new Error(`Items batch insert failed: ${itemsError.message}`)
          totalCreatedItems += itemInserts.length
        }

        // Update progress after each batch
        await updateJobProgress(supabase, jobId, {
          processed_items: totalCreatedItems
        })
      }
    }

    // Complete the job
    await updateJobProgress(supabase, jobId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      current_step: 'Import slutförd!',
      progress: 100,
      created_rings: createdRings?.length || 0,
      created_groups: createdGroups?.length || 0,
      created_labels: createdLabels.length,
      created_pages: totalCreatedPages,
      created_items: totalCreatedItems
    })

    console.log('[ProcessJob', jobId, '] Completed successfully')

    // Send email notification if requested
    if (notifyEmail && userEmail) {
      await sendCompletionEmail({
        email: userEmail,
        wheelId,
        fileName: job.file_name,
        stats: {
          rings: createdRings?.length || 0,
          groups: createdGroups?.length || 0,
          labels: createdLabels.length,
          pages: totalCreatedPages,
          items: totalCreatedItems
        }
      })
    }

  } catch (error) {
    console.error('[ProcessJob', jobId, '] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await updateJobProgress(supabase, jobId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
      error_details: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined }
    })
  }
}

// Helper to update job progress
async function updateJobProgress(supabase: any, jobId: string, updates: any) {
  const { error } = await supabase
    .from('import_jobs')
    .update(updates)
    .eq('id', jobId)
  
  if (error) {
    console.error('[UpdateProgress] Failed:', error)
  }
}

// Send completion email
async function sendCompletionEmail(params: {
  email: string
  wheelId: string
  fileName: string
  stats: { rings: number, groups: number, labels: number, pages: number, items: number }
}) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured')
    return
  }

  const wheelUrl = `${Deno.env.get('APP_URL') || 'https://app.yearwheel.com'}/wheel/${params.wheelId}`
  
  const htmlContent = `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>✅ CSV Import Slutförd!</h2>
  <p>Din import av <strong>${params.fileName}</strong> har slutförts.</p>
  <ul>
    <li>Ringar: ${params.stats.rings}</li>
    <li>Aktivitetsgrupper: ${params.stats.groups}</li>
    <li>Etiketter: ${params.stats.labels}</li>
    <li>Sidor: ${params.stats.pages}</li>
    <li>Aktiviteter: ${params.stats.items}</li>
  </ul>
  <p><a href="${wheelUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Öppna Årshjul</a></p>
</body>
</html>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'YearWheel <noreply@yearwheel.com>',
        to: [params.email],
        subject: `✅ CSV Import Klar - ${params.stats.items} aktiviteter`,
        html: htmlContent
      })
    })
  } catch (error) {
    console.error('[Email] Send failed:', error)
  }
}
