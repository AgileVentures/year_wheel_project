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

    const { action, wheelId, currentPageId, csvStructure, csvData, suggestions, inviteEmails, refinementPrompt, previousSuggestions } = await req.json()

    if (action === 'analyze') {
      // Analyze CSV structure and generate AI suggestions
      const result = await analyzeCsvWithAI(csvStructure, wheelId, currentPageId, supabase, refinementPrompt, previousSuggestions)
      
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
 * Analyze CSV structure using OpenAI and generate mapping suggestions
 */
async function analyzeCsvWithAI(csvStructure: any, wheelId: string, currentPageId: string, supabase: any, refinementPrompt?: string, previousSuggestions?: any) {
  console.log('[analyzeCsvWithAI] Analyzing CSV structure...', {
    totalRows: csvStructure.totalRows,
    sampleRows: csvStructure.sampleRows?.length,
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

Your task is to analyze a CSV file structure and generate intelligent mapping suggestions that will be executed by the AI Assistant V2.

CONTEXT:
- Wheel: "${wheel?.title || 'Unknown'}" (Year: ${page?.year || wheel?.year || 'Unknown'})
- Page Year: ${page?.year}
- Existing Rings: ${existingRings?.length ? existingRings.map((r: any) => r.name).join(', ') : 'None yet'}
- Existing Groups: ${existingGroups?.length ? existingGroups.map((g: any) => g.name).join(', ') : 'None yet'}

CSV STRUCTURE:
- Headers: ${JSON.stringify(csvStructure.headers)}
- Sample Rows (first 5): ${JSON.stringify(csvStructure.sampleRows.slice(0, 5))}
- Total Rows: ${csvStructure.totalRows}

CRITICAL: You MUST generate mappings for ALL ${csvStructure.totalRows} rows, not just samples!
For each row in the CSV, create an activity entry in the activities array.

YOUR TASK:
1. Identify which columns map to: activity name, start date, end date, description, ring, category/group, person/owner, comments
2. Detect date formats and convert ALL to YYYY-MM-DD
3. Suggest rings to create (REUSE existing rings if they match!)
4. Suggest activity groups to create (REUSE existing groups if they match!)
5. Generate activity mappings for EVERY ROW in the CSV (all ${csvStructure.totalRows} activities)
6. Detect people mentioned (names, emails) for team invitations
7. Handle any special columns (status, priority, tags, etc.)

DATE HANDLING:
- Excel serial dates (numbers like 45321): Convert to YYYY-MM-DD
- Text dates (DD/MM/YYYY, MM/DD/YYYY): Parse and convert to YYYY-MM-DD
- If only end date exists, use it for both start and end
- If no date column, distribute activities evenly across ${page?.year}

RING STRATEGY:
- "outer" rings: For external events, holidays, milestones, deadlines
- "inner" rings: For main tracks, strategic initiatives, team-specific work
- Keep it simple: 1-3 rings for most cases

RESPONSE FORMAT (JSON):
{
  "mapping": {
    "columns": {
      "activityName": "column_name_or_null",
      "startDate": "column_name_or_null",
      "endDate": "column_name_or_null",
      "description": "column_name_or_null",
      "ring": "column_name_or_null",
      "group": "column_name_or_null",
      "person": "column_name_or_null",
      "comments": "column_name_or_null"
    },
    "dateFormat": "detected_format",
    "explanation": "Brief explanation"
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
  "activities": [
    // ⚠️ MUST INCLUDE ALL ${csvStructure.totalRows} ACTIVITIES!
    {
      "name": "Activity name from row",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "ring": "ring_name_matching_above",
      "group": "group_name_matching_above",
      "description": "Optional"
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
- activities array MUST contain ${csvStructure.totalRows} entries (one per CSV row)
- ALL dates MUST be YYYY-MM-DD format
- Use existing rings/groups when possible
- Activity dates must be in year ${page?.year}

Respond ONLY with valid JSON, no other text.`

  let userPrompt = refinementPrompt 
    ? `Previous suggestions: ${JSON.stringify(previousSuggestions, null, 2)}\n\nREFINEMENT REQUEST: ${refinementPrompt}\n\nGenerate updated suggestions based on the refinement request.`
    : `Analyze this CSV and generate import suggestions for ALL ${csvStructure.totalRows} rows.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3, // Lower temperature for more consistent mapping
    response_format: { type: 'json_object' }
  })

  const responseText = completion.choices[0].message.content || '{}'
  console.log('[analyzeCsvWithAI] OpenAI response:', responseText)
  
  const suggestions = JSON.parse(responseText)
  
  return {
    success: true,
    suggestions,
    message: `AI har analyserat ${csvStructure.totalRows} rader och genererat importförslag`
  }
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
    // Step 1: Use AI Assistant V2's suggest_plan and apply_suggested_plan workflow
    // This leverages all the existing logic for creating rings, groups, and activities
    
    console.log('[executeImport] Calling AI Assistant V2 with plan...')
    
    const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-assistant-v2', {
      body: {
        wheelId,
        currentPageId,
        message: 'apply_csv_import_plan',
        context: {
          // Pass the suggestions directly to be applied
          lastSuggestions: {
            rings: suggestions.rings,
            activityGroups: suggestions.activityGroups,
            activities: suggestions.activities
          },
          lastSuggestionsRaw: JSON.stringify({
            success: true,
            suggestions: {
              rings: suggestions.rings,
              activityGroups: suggestions.activityGroups,
              activities: suggestions.activities
            }
          })
        }
      }
    })

    if (aiError) {
      console.error('[executeImport] AI Assistant error:', aiError)
      throw aiError
    }

    console.log('[executeImport] AI Assistant result:', aiResult)
    
    // Parse the AI response to extract what was created
    if (aiResult?.summary) {
      results.created = {
        rings: aiResult.summary.created?.rings || 0,
        groups: aiResult.summary.created?.groups || 0,
        activities: aiResult.summary.created?.activities || 0,
        invitations: 0
      }
      
      if (aiResult.summary.errors) {
        results.errors.push(...aiResult.summary.errors)
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
