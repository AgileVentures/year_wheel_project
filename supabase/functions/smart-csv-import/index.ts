// Smart CSV Import - Leverages existing AI Assistant V2 infrastructure
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

declare const Deno: any;

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import OpenAI from 'https://esm.sh/openai@4.73.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, wheelId, currentPageId, csvStructure, csvData, suggestions, inviteEmails, refinementPrompt, previousSuggestions, allRows } = await req.json()

    if (action === 'analyze') {
      // Analyze CSV structure and generate AI mapping rules + apply to ALL rows
      const result = await analyzeCsvWithAI(csvStructure, allRows, wheelId, currentPageId, supabase, refinementPrompt, previousSuggestions)
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'import') {
      // Execute import using AI Assistant V2 tools
      const result = await executeImport(wheelId, currentPageId, csvData, suggestions, inviteEmails, supabase, user)
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('[smart-csv-import] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Analyze CSV structure using OpenAI and generate mapping rules, then apply to ALL rows
 */
async function analyzeCsvWithAI(csvStructure: any, allRows: any[], wheelId: string, currentPageId: string, supabase: any, refinementPrompt?: string, previousSuggestions?: any) {
  console.log('[analyzeCsvWithAI] Analyzing CSV structure...', {
    totalRows: csvStructure.totalRows,
    sampleRows: csvStructure.sampleRows?.length,
    allRows: allRows?.length,
    isRefinement: !!refinementPrompt
  })
  
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
  
  // Get current wheel context for smarter suggestions
  const { data: wheel } = await supabase
    .from('year_wheels')
    .select('title, year, colors')
    .eq('id', wheelId)
    .single()

  const { data: page } = await supabase
    .from('wheel_pages')
    .select('year, title')
    .eq('id', currentPageId)
    .single()

  const { data: existingRings } = await supabase
    .from('wheel_rings')
    .select('name, type')
    .eq('wheel_id', wheelId)

  const { data: existingGroups } = await supabase
    .from('activity_groups')
    .select('name, color')
    .eq('wheel_id', wheelId)

  const systemPrompt = `You are an expert data analyst specializing in CSV import and mapping for Year Wheel planning applications.

${refinementPrompt ? `USER REFINEMENT REQUEST: "${refinementPrompt}"

You must adjust the previous suggestions based on this request while maintaining data integrity.` : ''}

Your task is to analyze a CSV file structure and generate MAPPING RULES that will be applied to ALL ${csvStructure.totalRows} rows on the server.

CONTEXT:
- Wheel: "${wheel?.title || 'Unknown'}" (Year: ${page?.year || wheel?.year || 'Unknown'})
- Page Year: ${page?.year}
- Existing Rings: ${existingRings?.length ? existingRings.map((r: any) => r.name).join(', ') : 'None yet'}
- Existing Groups: ${existingGroups?.length ? existingGroups.map((g: any) => g.name).join(', ') : 'None yet'}

CSV STRUCTURE:
- Headers: ${JSON.stringify(csvStructure.headers)}
- Sample Rows (first 20): ${JSON.stringify(csvStructure.sampleRows)}
- Total Rows: ${csvStructure.totalRows}

YOUR TASK:
1. Identify which columns map to: activity name, start date, end date, description, ring, category/group, person/owner, comments
2. Detect date formats (Excel serial, DD/MM/YYYY, MM/DD/YYYY, etc.)
3. Suggest rings to create (REUSE existing rings if they match!)
4. Suggest activity groups to create (REUSE existing groups if they match!)
5. Define MAPPING RULES that will be applied server-side to all ${csvStructure.totalRows} rows
6. Detect people mentioned (names, emails) for team invitations
7. Handle any special columns (status, priority, tags, etc.)

IMPORTANT: You define the RULES, the server will apply them to ALL rows.
Do NOT generate ${csvStructure.totalRows} individual activities - just define the mapping logic.

DATE HANDLING:
- Excel serial dates (numbers like 45321): Specify conversion formula
- Text dates: Specify parse pattern
- If only end date exists, use it for both start and end
- If no date column, specify default behavior

RING STRATEGY:
- "outer" rings: For external events, holidays, milestones, deadlines
- "inner" rings: For main tracks, strategic initiatives, team-specific work
- Keep it simple: 1-3 rings for most cases

RESPONSE FORMAT (JSON):
{
  "mapping": {
    "columns": {
      "activityName": "exact_column_name_or_null",
      "startDate": "exact_column_name_or_null",
      "endDate": "exact_column_name_or_null",
      "description": "exact_column_name_or_null",
      "ring": "exact_column_name_or_null_or_constant",
      "group": "exact_column_name_or_null",
      "person": "exact_column_name_or_null",
      "comments": "exact_column_name_or_null"
    },
    "dateFormat": "detected_format_with_conversion_rules",
    "explanation": "Brief explanation of mapping logic",
    "ringAssignmentLogic": "How to assign activities to rings (e.g., 'all to outer ring X' or 'based on column Y')",
    "groupAssignmentLogic": "How to assign activities to groups (e.g., 'based on column Z' or 'default to group A')"
  },
  "rings": [
    {
      "name": "Ring name in Swedish",
      "type": "outer|inner",
      "color": "#hex_color_for_outer_only",
      "description": "Why this ring"
    }
  ],
  "activityGroups": [
    {
      "name": "Group name in Swedish",
      "color": "#hex_color",
      "description": "Purpose"
    }
  ],
  "detectedPeople": [
    {
      "name": "Person name|null",
      "email": "email@example.com|null",
      "context": "Where mentioned"
    }
  ]
}

CRITICAL RULES:
- Provide MAPPING RULES, not individual activities
- ALL column names must match CSV headers EXACTLY
- Specify date conversion logic clearly
- Use existing rings/groups when possible
- Activities will be assigned to year ${page?.year}

Respond ONLY with valid JSON, no other text.`

  let userPrompt = refinementPrompt 
    ? `Previous suggestions: ${JSON.stringify(previousSuggestions, null, 2)}\n\nREFINEMENT REQUEST: ${refinementPrompt}\n\nGenerate updated mapping rules based on the refinement request.`
    : `Analyze this CSV structure and generate mapping rules that will be applied to ALL ${csvStructure.totalRows} rows server-side.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2, // Low for consistent mapping rules
    response_format: { type: 'json_object' }
  })

  const responseText = completion.choices[0].message.content || '{}'
  console.log('[analyzeCsvWithAI] OpenAI response length:', responseText.length)
  
  const mapping = JSON.parse(responseText)
  
  // Step 2: Apply mapping rules to ALL rows server-side
  console.log('[analyzeCsvWithAI] Applying mapping rules to', allRows.length, 'rows...')
  
  const activities = allRows.map((row, index) => {
    try {
      // Extract values based on mapping rules
      const activityName = mapping.mapping.columns.activityName 
        ? row[csvStructure.headers.indexOf(mapping.mapping.columns.activityName)]
        : `Aktivitet ${index + 1}`
      
      const startDateRaw = mapping.mapping.columns.startDate
        ? row[csvStructure.headers.indexOf(mapping.mapping.columns.startDate)]
        : null
      
      const endDateRaw = mapping.mapping.columns.endDate
        ? row[csvStructure.headers.indexOf(mapping.mapping.columns.endDate)]
        : startDateRaw
      
      // Convert dates based on detected format
      const startDate = convertDate(startDateRaw, mapping.mapping.dateFormat, page?.year)
      const endDate = convertDate(endDateRaw, mapping.mapping.dateFormat, page?.year)
      
      // Determine ring assignment
      let ringName = mapping.rings[0]?.name || 'Aktiviteter' // Default to first ring
      if (mapping.mapping.columns.ring && typeof mapping.mapping.columns.ring === 'string') {
        const ringColIndex = csvStructure.headers.indexOf(mapping.mapping.columns.ring)
        if (ringColIndex >= 0) {
          ringName = row[ringColIndex] || ringName
        }
      }
      
      // Determine group assignment
      let groupName = mapping.activityGroups[0]?.name || 'Allmänt' // Default to first group
      if (mapping.mapping.columns.group) {
        const groupColIndex = csvStructure.headers.indexOf(mapping.mapping.columns.group)
        if (groupColIndex >= 0) {
          groupName = row[groupColIndex] || groupName
        }
      }
      
      // Extract description
      const description = mapping.mapping.columns.description
        ? row[csvStructure.headers.indexOf(mapping.mapping.columns.description)]
        : undefined
      
      return {
        name: activityName,
        startDate,
        endDate,
        ring: ringName,
        group: groupName,
        description: description || undefined
      }
    } catch (err) {
      console.error('[analyzeCsvWithAI] Error processing row', index, err)
      return {
        name: `Aktivitet ${index + 1}`,
        startDate: `${page?.year}-01-01`,
        endDate: `${page?.year}-01-01`,
        ring: mapping.rings[0]?.name || 'Aktiviteter',
        group: mapping.activityGroups[0]?.name || 'Allmänt'
      }
    }
  })
  
  console.log('[analyzeCsvWithAI] Generated', activities.length, 'activities from', allRows.length, 'rows')
  
  const suggestions = {
    mapping: mapping.mapping,
    rings: mapping.rings,
    activityGroups: mapping.activityGroups,
    activities, // All activities generated server-side
    detectedPeople: mapping.detectedPeople || []
  }
  
  return {
    success: true,
    suggestions,
    message: `AI har analyserat ${csvStructure.totalRows} rader och genererat ${activities.length} aktiviteter`
  }
}

/**
 * Convert date from various formats to YYYY-MM-DD
 */
function convertDate(dateValue: any, format: string, defaultYear: number): string {
  if (!dateValue) {
    return `${defaultYear}-01-01`
  }
  
  // Excel serial date (number)
  if (typeof dateValue === 'number' && format.toLowerCase().includes('excel')) {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // ISO format already
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue
  }
  
  // Try parsing common formats
  if (typeof dateValue === 'string') {
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = dateValue.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0')
      const month = ddmmyyyy[2].padStart(2, '0')
      const year = ddmmyyyy[3]
      return `${year}-${month}-${day}`
    }
    
    // YYYY/MM/DD or YYYY-MM-DD
    const yyyymmdd = dateValue.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/)
    if (yyyymmdd) {
      const year = yyyymmdd[1]
      const month = yyyymmdd[2].padStart(2, '0')
      const day = yyyymmdd[3].padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
  
  // Fallback
  console.warn('[convertDate] Could not parse date:', dateValue)
  return `${defaultYear}-01-01`
}

/**
 * Execute import by calling AI Assistant V2 with the generated plan
 */
async function executeImport(
  wheelId: string,
  currentPageId: string,
  csvData: any,
  suggestions: any,
  inviteEmails: string[],
  supabase: any,
  user: any
) {
  console.log('[executeImport] Starting import process...')
  console.log('[executeImport] Suggestions counts:', {
    rings: suggestions.rings?.length || 0,
    activityGroups: suggestions.activityGroups?.length || 0,
    activities: suggestions.activities?.length || 0
  })
  
  const results = {
    success: true,
    created: {
      rings: 0,
      groups: 0,
      activities: 0,
      invitations: 0
    },
    errors: [] as string[],
    warnings: [] as string[]
  }

  try {
    // Step 1: Format suggestions in the exact structure AI Assistant V2 expects
    const formattedSuggestions = {
      success: true,
      suggestions: {
        rings: suggestions.rings || [],
        activityGroups: suggestions.activityGroups || [],
        activities: suggestions.activities || []
      }
    }
    
    const suggestionsJson = JSON.stringify(formattedSuggestions)
    console.log('[executeImport] Formatted suggestions JSON length:', suggestionsJson.length)
    console.log('[executeImport] First 500 chars:', suggestionsJson.substring(0, 500))
    
    // Step 2: Call AI Assistant V2 with clear tool call request
    console.log('[executeImport] Calling AI Assistant V2...')
    
    const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-assistant-v2', {
      body: {
        wheelId,
        currentPageId,
        message: `Applicera CSV-importförslag med apply_suggested_plan verktyget. Använd suggestionsJson från context.`,
        context: {
          lastSuggestions: formattedSuggestions.suggestions,
          lastSuggestionsRaw: suggestionsJson
        }
      }
    })

    if (aiError) {
      console.error('[executeImport] AI Assistant error:', aiError)
      throw aiError
    }

    console.log('[executeImport] AI Assistant raw result:', JSON.stringify(aiResult).substring(0, 1000))
    
    // Parse the AI response - it might be a streaming response or direct result
    let parsedResult = aiResult
    
    // If it's a string response, try to extract JSON from it
    if (typeof aiResult === 'string') {
      try {
        parsedResult = JSON.parse(aiResult)
      } catch (e) {
        console.error('[executeImport] Could not parse AI result as JSON')
      }
    }
    
    // Extract creation counts from the result
    if (parsedResult?.summary) {
      results.created = {
        rings: parsedResult.summary.created?.rings || 0,
        groups: parsedResult.summary.created?.groups || 0,
        activities: parsedResult.summary.created?.activities || 0,
        invitations: 0
      }
      
      if (parsedResult.summary.errors) {
        results.errors.push(...parsedResult.summary.errors)
      }
    } else if (parsedResult?.result) {
      // Alternative format
      const match = parsedResult.result.match(/skapade (\d+) ringar.*?(\d+) grupper.*?(\d+) aktiviteter/i)
      if (match) {
        results.created.rings = parseInt(match[1])
        results.created.groups = parseInt(match[2])
        results.created.activities = parseInt(match[3])
      }
    }

    // Step 2: Handle team invitations if any people were detected
    if (inviteEmails && inviteEmails.length > 0) {
      console.log('[executeImport] Sending team invitations...')
      
      // Get the wheel's team_id
      const { data: wheel } = await supabase
        .from('year_wheels')
        .select('team_id')
        .eq('id', wheelId)
        .single()

      if (wheel?.team_id) {
        for (const email of inviteEmails) {
          try {
            const { error: inviteError } = await supabase
              .from('team_invitations')
              .insert({
                team_id: wheel.team_id,
                email: email.toLowerCase().trim(),
                invited_by: user.id
              })

            if (inviteError) {
              // Check if already invited
              if (inviteError.code === '23505') {
                results.warnings.push(`${email} har redan en väntande inbjudan`)
              } else {
                results.warnings.push(`Kunde inte bjuda in ${email}: ${inviteError.message}`)
              }
            } else {
              results.created.invitations++
              console.log(`[executeImport] Sent invitation to ${email}`)
            }
          } catch (err) {
            console.error('[executeImport] Invitation error:', err)
            results.warnings.push(`Fel vid inbjudan till ${email}`)
          }
        }
      } else {
        results.warnings.push('Hjulet har inget team - inbjudningar kunde inte skickas')
      }
    }

    // Step 3: Add descriptions/comments if they exist in the CSV
    // This could be enhanced to call AI Assistant to add notes to items
    if (suggestions.activities.some((a: any) => a.description)) {
      results.warnings.push('Beskrivningar detekterades men är inte implementerade ännu')
    }

    console.log('[executeImport] Import complete:', results)

  } catch (error) {
    console.error('[executeImport] Critical error:', error)
    results.success = false
    const errorMessage = error instanceof Error ? error.message : 'Okänt fel vid import'
    results.errors.push(errorMessage)
  }

  return {
    success: results.success,
    results,
    message: results.success 
      ? `Import klar! Skapade ${results.created.rings} ringar, ${results.created.groups} grupper, ${results.created.activities} aktiviteter${results.created.invitations > 0 ? `, och skickade ${results.created.invitations} inbjudningar` : ''}`
      : 'Import misslyckades. Se fel nedan.'
  }
}
