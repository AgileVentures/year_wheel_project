// Modern AI Chat Edge Function
// Uses OpenAI's reasoning models with native tool calling
// Handles Swedish language naturally, supports cross-year activities

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.73.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Initialize OpenAI with reasoning model
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
})

// Tool definitions for OpenAI function calling
const tools = [
  {
    type: 'function',
    function: {
      name: 'create_activity',
      description: 'Create a new activity/event on the year wheel. Can span multiple years (e.g., 2025-12-15 to 2026-01-30).',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the activity (e.g., "Sommarkampanj", "Julrea")',
          },
          startDate: {
            type: 'string',
            description: 'Start date in ISO format (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            description: 'End date in ISO format (YYYY-MM-DD)',
          },
          ringId: {
            type: 'string',
            description: 'REQUIRED: Ring UUID where the activity should be placed. User MUST specify which ring to use.',
          },
          activityGroupId: {
            type: 'string',
            description: 'REQUIRED: Activity group UUID. User MUST specify which group to use.',
          },
          labelId: {
            type: 'string',
            description: 'Optional: Label UUID for categorization',
          },
        },
        required: ['name', 'startDate', 'endDate', 'ringId', 'activityGroupId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_activity',
      description: 'Delete an activity by name. Searches for activities matching the name.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name or partial name of the activity to delete',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_activities',
      description: 'List all activities for the current wheel and page',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

// Tool implementations
async function createActivity(
  supabase: any,
  wheelId: string,
  args: { name: string; startDate: string; endDate: string; ringId: string; activityGroupId: string; labelId?: string }
) {
  console.log('[createActivity] Input:', { wheelId, ...args })

  // Fetch all pages for this wheel
  const { data: pages, error: pagesError } = await supabase
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('year')

  if (pagesError) throw pagesError
  if (!pages || pages.length === 0) {
    throw new Error('Inga sidor hittades för detta hjul')
  }

  // Validate required parameters
  if (!args.ringId) {
    throw new Error('Ring ID måste anges. Fråga användaren vilken ring som ska användas.')
  }
  
  if (!args.activityGroupId) {
    throw new Error('Aktivitetsgrupp ID måste anges. Fråga användaren vilken grupp som ska användas.')
  }
  
  // Verify ring exists
  const { data: ring, error: ringError } = await supabase
    .from('wheel_rings')
    .select('id, name')
    .eq('id', args.ringId)
    .eq('wheel_id', wheelId)
    .single()
  
  if (ringError || !ring) {
    throw new Error(`Ring med ID ${args.ringId} hittades inte`)
  }
  
  // Verify activity group exists
  const { data: group, error: groupError } = await supabase
    .from('activity_groups')
    .select('id, name')
    .eq('id', args.activityGroupId)
    .eq('wheel_id', wheelId)
    .single()
  
  if (groupError || !group) {
    throw new Error(`Aktivitetsgrupp med ID ${args.activityGroupId} hittades inte`)
  }
  
  const ringId = args.ringId
  const activityGroupId = args.activityGroupId
  
  console.log('[createActivity] Using ring:', ring.name, 'and group:', group.name)

  // Determine if single-year or cross-year
  const startYear = new Date(args.startDate).getFullYear()
  const endYear = new Date(args.endDate).getFullYear()

  console.log('[createActivity] Year range:', { startYear, endYear, isCrossYear: startYear !== endYear })

  // Check if all required pages exist
  for (let year = startYear; year <= endYear; year++) {
    const pageExists = pages.find((p) => p.year === year)
    if (!pageExists) {
      console.log('[createActivity] Creating missing page for year:', year)
      const { data: newPage, error: pageError } = await supabase
        .from('wheel_pages')
        .insert({
          wheel_id: wheelId,
          year: year,
          organization_data: {
            rings: [],
            activityGroups: [],
            labels: [],
            items: []
          }
        })
        .select()
        .single()
      
      if (pageError) {
        console.error('[createActivity] Failed to create page:', pageError)
        throw new Error(`Kunde inte skapa sida för år ${year}: ${pageError.message}`)
      }
      
      pages.push(newPage)
      console.log('[createActivity] Created page:', newPage.id)
    }
  }

  const itemsCreated = []

  if (startYear === endYear) {
    // Single year activity
    const page = pages.find((p) => p.year === startYear)
    if (!page) {
      throw new Error(`Ingen sida hittades för år ${startYear}`)
    }

    const itemToInsert = {
      wheel_id: wheelId,
      page_id: page.id,
      ring_id: ringId,
      activity_id: activityGroupId,
      label_id: args.labelId || null,
      name: args.name,
      start_date: args.startDate,
      end_date: args.endDate,
    }
    
    console.log('[createActivity] Inserting item:', itemToInsert)

    const { data: newItem, error: insertError } = await supabase
      .from('items')
      .insert(itemToInsert)
      .select()
      .single()

    if (insertError) {
      console.error('[createActivity] Insert error:', insertError)
      throw insertError
    }
    
    console.log('[createActivity] Created item in DB:', newItem)
    itemsCreated.push(newItem)
    console.log('[createActivity] Created single-year item:', newItem.id)
  } else {
    // Cross-year activity - split into segments
    console.log('[createActivity] Cross-year detected:', { startYear, endYear, yearsToCreate: endYear - startYear + 1 })
    
    for (let year = startYear; year <= endYear; year++) {
      console.log('[createActivity] Processing year:', year)
      const page = pages.find((p) => p.year === year)
      
      if (!page) {
        console.error('[createActivity] No page found for year:', year, 'Available pages:', pages.map(p => p.year))
        throw new Error(`Ingen sida hittades för år ${year}. Skapa en sida för ${year} först!`)
      }

      const segmentStart = year === startYear ? args.startDate : `${year}-01-01`
      const segmentEnd = year === endYear ? args.endDate : `${year}-12-31`
      
      console.log('[createActivity] Creating segment:', { year, pageId: page.id, segmentStart, segmentEnd })

      const { data: newItem, error: insertError } = await supabase
        .from('items')
        .insert({
          wheel_id: wheelId,
          page_id: page.id,
          ring_id: ringId,
          activity_id: activityGroupId,
          label_id: args.labelId || null,
          name: args.name,
          start_date: segmentStart,
          end_date: segmentEnd,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[createActivity] Cross-year insert error for year', year, ':', insertError)
        throw insertError
      }
      
      itemsCreated.push(newItem)
      console.log('[createActivity] Created cross-year segment:', { year, itemId: newItem.id, pageId: page.id })
    }
    
    console.log('[createActivity] Cross-year complete. Total segments created:', itemsCreated.length)
  }

  return {
    success: true,
    itemsCreated: itemsCreated.length,
    message: `Aktivitet "${args.name}" skapad (${args.startDate} till ${args.endDate})${itemsCreated.length > 1 ? ` - delad över ${itemsCreated.length} år` : ''}`,
  }
}

async function deleteActivity(supabase: any, wheelId: string, currentPageId: string, args: { name: string }) {
  console.log('[deleteActivity] Searching for:', args.name)

  // Find items matching the name
  const { data: items, error: findError } = await supabase
    .from('items')
    .select('*')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${args.name}%`)

  if (findError) throw findError

  if (!items || items.length === 0) {
    return {
      success: false,
      message: `Ingen aktivitet hittades med namnet "${args.name}"`,
    }
  }

  // Delete all matching items
  const { error: deleteError } = await supabase.from('items').delete().in(
    'id',
    items.map((i) => i.id)
  )

  if (deleteError) throw deleteError

  console.log('[deleteActivity] Deleted items:', items.length)

  return {
    success: true,
    itemsDeleted: items.length,
    message: `${items.length} aktivitet(er) med namnet "${args.name}" togs bort`,
  }
}

async function listActivities(supabase: any, wheelId: string, currentPageId: string) {
  console.log('[listActivities] Fetching for page:', currentPageId)

  const { data: items, error } = await supabase
    .from('items')
    .select('name, start_date, end_date')
    .eq('page_id', currentPageId)
    .order('start_date')

  if (error) throw error

  if (!items || items.length === 0) {
    return {
      success: true,
      message: 'Inga aktiviteter hittades på denna sida',
    }
  }

  const list = items.map((item) => `- ${item.name} (${item.start_date} till ${item.end_date})`).join('\n')

  return {
    success: true,
    message: `Aktiviteter:\n${list}`,
  }
}

// Main handler
serve(async (req) => {
  try {
    console.log('[AI Chat] Request method:', req.method)

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      })
    }

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { userMessage, conversationHistory = [], wheelId, currentPageId } = await req.json()

    if (!userMessage || !wheelId) {
      throw new Error('Missing required fields: userMessage, wheelId')
    }

    console.log('[AI Chat] Processing:', { userMessage, wheelId, currentPageId })

    // Fetch existing rings and activity groups to give AI context
    const { data: existingRings } = await supabase
      .from('wheel_rings')
      .select('id, name, type')
      .eq('wheel_id', wheelId)
      .order('ring_order')
    
    const { data: existingGroups } = await supabase
      .from('activity_groups')
      .select('id, name, color')
      .eq('wheel_id', wheelId)
    
    const ringsContext = existingRings && existingRings.length > 0
      ? `\n\nTillgängliga ringar:\n${existingRings.map(r => `- ${r.name} (${r.type}, ID: ${r.id})`).join('\n')}`
      : '\n\nInga ringar finns ännu.'
    
    const groupsContext = existingGroups && existingGroups.length > 0
      ? `\n\nTillgängliga aktivitetsgrupper:\n${existingGroups.map(g => `- ${g.name} (färg: ${g.color || 'ingen'}, ID: ${g.id})`).join('\n')}`
      : '\n\nInga aktivitetsgrupper finns ännu.'
    
    // Build messages array with conversation history
    const messages: any[] = [
      {
        role: 'system',
        content: `Du är en assistent för en svensk kalenderapplikation (Year Wheel). 
Du hjälper användare att skapa, radera och lista aktiviteter.

Viktigt:
- Alla datum ska vara i formatet YYYY-MM-DD
- Aktiviteter kan sträcka sig över flera år (t.ex. 2025-12-15 till 2026-01-30)
- När användaren nämner en ring eller grupp NAMN, hitta motsvarande ID från listan ovan
- Om användaren säger "Kammpanjer", använd ID:t för ringen "Kammpanjer" från listan ovan
- Om användaren säger "Allmän", använd ID:t för gruppen "Allmän" från listan ovan
- Du MÅSTE använda de exakta UUID:na från listorna ovan, inte namnen
- Svara alltid på svenska
- Var kortfattad men informativ${ringsContext}${groupsContext}

EXEMPEL: Om användaren säger "lägg på Ring 1 i Allmän", kolla listorna ovan och använd UUID:na för "Ring 1" och "Allmän".`,
      }
    ]
    
    // Add conversation history (convert from frontend format)
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    })
    
    // Call OpenAI with tool calling
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: tools as any,
      tool_choice: 'auto',
    })

    const responseMessage = completion.choices[0].message
    console.log('[AI Chat] Response:', { hasToolCalls: !!responseMessage.tool_calls })

    // Handle tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0]
      const functionName = toolCall.function.name
      const functionArgs = JSON.parse(toolCall.function.arguments)

      console.log('[AI Chat] Tool call:', { functionName, functionArgs })

      let result
      if (functionName === 'create_activity') {
        result = await createActivity(supabase, wheelId, functionArgs)
      } else if (functionName === 'delete_activity') {
        result = await deleteActivity(supabase, wheelId, currentPageId, functionArgs)
      } else if (functionName === 'list_activities') {
        result = await listActivities(supabase, wheelId, currentPageId)
      } else {
        throw new Error(`Unknown tool: ${functionName}`)
      }

      // Get final response from model with tool result
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Du är en assistent för en svensk kalenderapplikation. Svara kortfattat och informativt på svenska.`,
          },
          {
            role: 'user',
            content: userMessage,
          },
          responseMessage,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          },
        ],
      })

      const finalMessage = finalCompletion.choices[0].message.content

      return new Response(
        JSON.stringify({
          success: true,
          message: finalMessage,
          toolUsed: functionName,
          toolResult: result,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      // No tool call needed, just return the response
      return new Response(
        JSON.stringify({
          success: true,
          message: responseMessage.content,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
