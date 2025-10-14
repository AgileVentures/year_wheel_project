// Modern AI Chat Edge Function
// Uses OpenAI's reasoning models with native tool calling
// Handles Swedish language naturally, supports cross-year activities
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Declare Deno global for TypeScript
declare const Deno: any;
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import OpenAI from 'https://esm.sh/openai@4.73.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Initialize OpenAI with reasoning model
// @ts-ignore: Deno global is available in Supabase Edge Functions
const openai = new OpenAI({
  apiKey: typeof Deno !== 'undefined' && Deno.env ? Deno.env.get('OPENAI_API_KEY') : '',
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
      name: 'update_activity',
      description: 'Update an existing activity. Can change dates, name, ring, or activity group. Find the activity by name first.',
      parameters: {
        type: 'object',
        properties: {
          activityName: {
            type: 'string',
            description: 'Current name of the activity to update',
          },
          newName: {
            type: 'string',
            description: 'Optional: New name for the activity',
          },
          newStartDate: {
            type: 'string',
            description: 'Optional: New start date in ISO format (YYYY-MM-DD)',
          },
          newEndDate: {
            type: 'string',
            description: 'Optional: New end date in ISO format (YYYY-MM-DD)',
          },
          newRingId: {
            type: 'string',
            description: 'Optional: New ring UUID',
          },
          newActivityGroupId: {
            type: 'string',
            description: 'Optional: New activity group UUID',
          },
        },
        required: ['activityName'],
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
  {
    type: 'function',
    function: {
      name: 'create_ring',
      description: 'Create a new ring on the wheel. Ring order is automatically calculated (newest ring becomes outermost). Use "outer" type for activity rings, "inner" for text-based rings.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the ring (e.g., "Kampanjer", "Produkter", "Event")',
          },
          type: {
            type: 'string',
            enum: ['inner', 'outer'],
            description: 'Ring type - "outer" for activity rings (most common), "inner" for text-based rings',
          },
          color: {
            type: 'string',
            description: 'Optional: Hex color code (e.g., "#408cfb" for blue, "#10b981" for green, "#f59e0b" for orange). Defaults to blue if not specified.',
          },
        },
        required: ['name', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_activity_group',
      description: 'Create a new activity group/category for organizing activities',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the group (e.g., "Kampanj", "Event", "REA")',
          },
          color: {
            type: 'string',
            description: 'Hex color code for the group (e.g., "#8B5CF6")',
          },
        },
        required: ['name', 'color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_wheel_structure',
      description: 'ONLY use when user asks for IDEAS/SUGGESTIONS. DO NOT call this after user confirms with "ja"/"alla" - use create_ring/create_activity_group instead. Returns recommendations for rings, groups, and typical activities based on use case.',
      parameters: {
        type: 'object',
        properties: {
          useCase: {
            type: 'string',
            description: 'What the user wants to plan (e.g., "marknadsföring", "projektstyrning", "butikskampanjer"). Only use this tool for initial suggestions, not after confirmation.',
          },
        },
        required: ['useCase'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_wheel',
      description: 'Analyze the current wheel and provide insights (activity density, gaps, recommendations)',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_rings_and_groups',
      description: 'CRITICAL: Call this tool when you need fresh ring/group IDs. Use this: 1) Before creating activities if unsure which ring/group to use, 2) After creating new rings/groups in previous messages, 3) When user mentions a ring/group name but you need the ID. Returns current rings and activity groups with their IDs.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_date',
      description: 'Get the current date and year. Call this when you need to know today\'s date for creating activities or when user refers to relative dates like "this month", "next week", "today", etc.',
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
  
  // Verify ring exists (just by ID - it might be on any page)
  const { data: ring, error: ringError } = await supabase
    .from('wheel_rings')
    .select('id, name, page_id')
    .eq('id', args.ringId)
    .single()
  
  if (ringError || !ring) {
    throw new Error(`Ring med ID ${args.ringId} hittades inte`)
  }
  
  // Verify activity group exists (just by ID - it might be on any page)
  const { data: group, error: groupError } = await supabase
    .from('activity_groups')
    .select('id, name, page_id')
    .eq('id', args.activityGroupId)
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
    const pageExists = pages.find((p: { year: number }) => p.year === year)
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
    const page = pages.find((p: { year: number }) => p.year === startYear)
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
      const page = pages.find((p: { year: number }) => p.year === year)
      
      if (!page) {
        console.error('[createActivity] No page found for year:', year, 'Available pages:', pages.map((p: any) => p.year))
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

async function updateActivity(
  supabase: any,
  wheelId: string,
  currentPageId: string,
  args: { activityName: string; newName?: string; newStartDate?: string; newEndDate?: string; newRingId?: string; newActivityGroupId?: string }
) {
  console.log('[updateActivity] Searching for:', args.activityName)

  // Find items matching the name on current page
  const { data: items, error: findError } = await supabase
    .from('items')
    .select('*')
    .eq('wheel_id', wheelId)
    .eq('page_id', currentPageId)
    .ilike('name', `%${args.activityName}%`)

  if (findError) throw findError

  if (!items || items.length === 0) {
    return {
      success: false,
      message: `Hittade ingen aktivitet med namnet "${args.activityName}"`
    }
  }

  // Update all matching items
  const updates: any = {}
  if (args.newName) updates.name = args.newName
  if (args.newStartDate) updates.start_date = args.newStartDate
  if (args.newEndDate) updates.end_date = args.newEndDate
  if (args.newRingId) updates.ring_id = args.newRingId
  if (args.newActivityGroupId) updates.activity_id = args.newActivityGroupId

  const itemIds = items.map((i: any) => i.id)
  
  const { error: updateError } = await supabase
    .from('items')
    .update(updates)
    .in('id', itemIds)

  if (updateError) throw updateError

  return {
    success: true,
    itemsUpdated: items.length,
    message: `Uppdaterade ${items.length} aktivitet(er) "${args.activityName}"`
  }
}

async function deleteActivity(supabase: any, wheelId: string, currentPageId: string, args: { name: string }) {
  console.log('[deleteActivity] Searching for:', args.name)

  // Find items matching the name
  const { data: items, error: findError} = await supabase
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
    items.map((i: any) => i.id)
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

  const list = items.map((item: { name: string; start_date: string; end_date: string }) => `- ${item.name} (${item.start_date} till ${item.end_date})`).join('\n')

  return {
    success: true,
    message: `Aktiviteter:\n${list}`,
  }
}

// --- Create Ring ---
async function createRing(supabase: any, wheelId: string, name: string, type: 'inner' | 'outer', color?: string) {
  const defaultColor = '#408cfb'
  const finalColor = color || defaultColor

  // Check if ring with this name already exists on this wheel
  const { data: existingByName, error: checkError } = await supabase
    .from('wheel_rings')
    .select('id, name, ring_order')
    .eq('wheel_id', wheelId)
    .ilike('name', name)
    .maybeSingle()

  if (checkError) {
    console.error('[createRing] Error checking existing ring:', checkError)
  }

  if (existingByName) {
    console.log('[createRing] Ring already exists:', existingByName)
    return {
      success: true,
      message: `Ring "${name}" finns redan`,
      alreadyExists: true,
    }
  }

  // Auto-calculate ring_order: get max ring_order for this wheel and add 1
  const { data: existingRings, error: fetchError } = await supabase
    .from('wheel_rings')
    .select('ring_order')
    .eq('wheel_id', wheelId)
    .order('ring_order', { ascending: false })
    .limit(1)

  if (fetchError) {
    console.error('[createRing] Error fetching existing rings:', fetchError)
    throw new Error(`Kunde inte hämta befintliga ringar: ${fetchError.message}`)
  }

  const ringOrder = existingRings && existingRings.length > 0 
    ? existingRings[0].ring_order + 1 
    : 0

  const { data: ring, error } = await supabase
    .from('wheel_rings')
    .insert({
      wheel_id: wheelId,
      name,
      type,
      color: finalColor,
      visible: true,
      orientation: type === 'inner' ? 'vertical' : null,
      ring_order: ringOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('[createRing] Error creating ring:', error)
    throw new Error(`Kunde inte skapa ring: ${error.message}`)
  }

  console.log('[createRing] Created ring:', ring)
  return {
    success: true,
    message: `Ring "${name}" skapad (typ: ${type}, färg: ${finalColor})`,
    ringId: ring.id,
    ringName: ring.name,
  }
}

// --- Create Activity Group ---
async function createActivityGroup(supabase: any, wheelId: string, name: string, color: string) {
  // Check if group with this name already exists on this wheel
  const { data: existing, error: checkError } = await supabase
    .from('activity_groups')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', name)
    .maybeSingle()

  if (checkError) {
    console.error('[createActivityGroup] Error checking existing group:', checkError)
  }

  if (existing) {
    console.log('[createActivityGroup] Group already exists:', existing)
    return {
      success: true,
      message: `Aktivitetsgrupp "${name}" finns redan`,
      alreadyExists: true,
    }
  }

  const { data: group, error } = await supabase
    .from('activity_groups')
    .insert({
      wheel_id: wheelId,
      name,
      color,
      visible: true,
    })
    .select()
    .single()

  if (error) {
    console.error('[createActivityGroup] Error creating group:', error)
    throw new Error(`Kunde inte skapa aktivitetsgrupp: ${error.message}`)
  }

  console.log('[createActivityGroup] Created group:', group)
  return {
    success: true,
    message: `Aktivitetsgrupp "${name}" skapad med färg ${color}`,
    groupId: group.id,
    groupName: group.name,
  }
}

// --- Suggest Wheel Structure ---
async function suggestWheelStructure(useCase: string) {
  const suggestions = {
    marknadsföring: {
      rings: [
        { name: 'Kampanjer', type: 'outer', color: '#408cfb' },
        { name: 'Innehåll', type: 'outer', color: '#10b981' },
        { name: 'Event', type: 'outer', color: '#f59e0b' },
      ],
      groups: [
        { name: 'REA', color: '#ef4444' },
        { name: 'Produktlansering', color: '#8b5cf6' },
        { name: 'Social Media', color: '#06b6d4' },
        { name: 'Email', color: '#f97316' },
      ],
      tips: 'För marknadsföring rekommenderar jag att lägga till aktiviteter för säsongskampanjer (jul, sommar, black friday), produktlanseringar och återkommande innehåll som nyhetsbrev.',
    },
    projektstyrning: {
      rings: [
        { name: 'Projekt', type: 'outer', color: '#8b5cf6' },
        { name: 'Milstolpar', type: 'outer', color: '#10b981' },
        { name: 'Resurser', type: 'inner', color: '#64748b' },
      ],
      groups: [
        { name: 'Planering', color: '#06b6d4' },
        { name: 'Utveckling', color: '#8b5cf6' },
        { name: 'Test', color: '#f59e0b' },
        { name: 'Lansering', color: '#10b981' },
      ],
      tips: 'För projektstyrning, lägg till viktiga deadlines som milstolpar och dela upp större projekt i faser. Använd färger för att skilja på olika projekttyper.',
    },
    butikskampanjer: {
      rings: [
        { name: 'Kampanjer', type: 'outer', color: '#ef4444' },
        { name: 'Säsong', type: 'outer', color: '#f59e0b' },
        { name: 'Event', type: 'outer', color: '#8b5cf6' },
      ],
      groups: [
        { name: 'REA', color: '#ef4444' },
        { name: 'Helgdagar', color: '#10b981' },
        { name: 'Tema', color: '#8b5cf6' },
        { name: 'Ordinarie', color: '#64748b' },
      ],
      tips: 'För butikskampanjer, planera kring högtider (jul, påsk, midsommar), skol-lov och säsongsskiften. Lägg till Black Friday, Cyber Monday och andra stora shoppingdagar.',
    },
  }

  // Find best match
  const lowerCase = useCase.toLowerCase()
  let suggestion = null

  if (lowerCase.includes('marknadsför') || lowerCase.includes('kampanj') || lowerCase.includes('marketing')) {
    suggestion = suggestions.marknadsföring
  } else if (lowerCase.includes('projekt') || lowerCase.includes('project')) {
    suggestion = suggestions.projektstyrning
  } else if (lowerCase.includes('butik') || lowerCase.includes('shop') || lowerCase.includes('retail')) {
    suggestion = suggestions.butikskampanjer
  } else {
    return {
      success: true,
      message: `Jag kan ge förslag för:\n- Marknadsföring\n- Projektstyrning\n- Butikskampanjer\n\nVad passar bäst för ditt syfte?`,
    }
  }

  let response = `**Förslag för ${useCase}:**\n\n`
  response += `**Ringar att skapa:**\n`
  suggestion.rings.forEach((r: any) => {
    response += `- ${r.name} (${r.type === 'outer' ? 'yttre' : 'inre'}, färg: ${r.color})\n`
  })
  response += `\n**Aktivitetsgrupper att skapa:**\n`
  suggestion.groups.forEach((g: any) => {
    response += `- ${g.name} (färg: ${g.color})\n`
  })
  response += `\n**Tips:** ${suggestion.tips}`

  return {
    success: true,
    message: response,
    // Include structured data so AI can remember and execute later
    suggestedRings: suggestion.rings,
    suggestedGroups: suggestion.groups,
  }
}

// --- Analyze Wheel ---
async function analyzeWheel(supabase: any, pageId: string) {
  // First get wheelId from page
  const { data: page, error: pageError } = await supabase
    .from('wheel_pages')
    .select('wheel_id')
    .eq('id', pageId)
    .single();
  
  if (pageError || !page) {
    throw new Error('Kunde inte hitta sida');
  }
  
  // Fetch all data (rings/groups are wheel-scoped, items are page-scoped)
  const [ringsRes, groupsRes, itemsRes] = await Promise.all([
    supabase.from('wheel_rings').select('*').eq('wheel_id', page.wheel_id),
    supabase.from('activity_groups').select('*').eq('wheel_id', page.wheel_id),
    supabase.from('items').select('*').eq('page_id', pageId),
  ])

  if (ringsRes.error || groupsRes.error || itemsRes.error) {
    throw new Error('Kunde inte analysera hjulet')
  }

  const rings = ringsRes.data || []
  const groups = groupsRes.data || []
  const items = itemsRes.data || []

  // Analyze
  let analysis = `**Analys av ditt årshjul:**\n\n`
  analysis += `📊 **Översikt:**\n`
  analysis += `- Ringar: ${rings.length}\n`
  analysis += `- Aktivitetsgrupper: ${groups.length}\n`
  analysis += `- Aktiviteter: ${items.length}\n\n`

  // Check for common issues
  const warnings = []
  const tips = []

  if (rings.length === 0) {
    warnings.push('⚠️ Inga ringar skapade ännu. Skapa minst en ring för att lägga till aktiviteter.')
  }

  if (groups.length === 0) {
    warnings.push('⚠️ Inga aktivitetsgrupper skapade. Grupper hjälper dig organisera aktiviteter.')
  }

  if (items.length === 0) {
    tips.push('💡 Börja med att lägga till några aktiviteter för att fylla hjulet.')
  }

  // Activity density by quarter
  if (items.length > 0) {
    const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    items.forEach((item: any) => {
      const month = new Date(item.start_date).getMonth()
      if (month < 3) quarters.Q1++
      else if (month < 6) quarters.Q2++
      else if (month < 9) quarters.Q3++
      else quarters.Q4++
    })

    analysis += `📅 **Aktiviteter per kvartal:**\n`
    analysis += `- Q1 (jan-mar): ${quarters.Q1}\n`
    analysis += `- Q2 (apr-jun): ${quarters.Q2}\n`
    analysis += `- Q3 (jul-sep): ${quarters.Q3}\n`
    analysis += `- Q4 (okt-dec): ${quarters.Q4}\n\n`

    // Check for imbalance
    const max = Math.max(...Object.values(quarters))
    const min = Math.min(...Object.values(quarters))
    if (max > min * 3) {
      tips.push('💡 Det verkar vara ojämn fördelning av aktiviteter över året. Överväg att sprida ut dem mer.')
    }
  }

  if (warnings.length > 0) {
    analysis += `\n⚠️ **Varningar:**\n${warnings.join('\n')}\n`
  }

  if (tips.length > 0) {
    analysis += `\n💡 **Tips:**\n${tips.join('\n')}\n`
  }

  return {
    success: true,
    message: analysis,
  }
}

// --- Get Current Rings and Groups ---
async function getCurrentRingsAndGroups(supabase: any, wheelId: string) {
  console.log('[getCurrentRingsAndGroups] Fetching for wheel:', wheelId)
  
  // Fetch current rings and groups
  const [ringsRes, groupsRes] = await Promise.all([
    supabase.from('wheel_rings').select('id, name, type, color').eq('wheel_id', wheelId).order('ring_order'),
    supabase.from('activity_groups').select('id, name, color').eq('wheel_id', wheelId),
  ])

  if (ringsRes.error) {
    throw new Error(`Kunde inte hämta ringar: ${ringsRes.error.message}`)
  }
  
  if (groupsRes.error) {
    throw new Error(`Kunde inte hämta aktivitetsgrupper: ${groupsRes.error.message}`)
  }

  const rings = ringsRes.data || []
  const groups = groupsRes.data || []

  console.log('[getCurrentRingsAndGroups] Found:', { rings: rings.length, groups: groups.length })

  return {
    success: true,
    rings: rings.map((r: any) => ({ id: r.id, name: r.name, type: r.type, color: r.color })),
    groups: groups.map((g: any) => ({ id: g.id, name: g.name, color: g.color })),
    message: `Hittade ${rings.length} ringar och ${groups.length} aktivitetsgrupper`,
  }
}

// --- Get Current Date ---
function getCurrentDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-indexed, so add 1
  const day = now.getDate()
  const monthName = now.toLocaleString('sv-SE', { month: 'long' })
  const dateISO = now.toISOString().split('T')[0]
  
  console.log('[getCurrentDate] Current date:', dateISO)
  
  return {
    success: true,
    date: dateISO,
    year,
    month,
    day,
    monthName,
    message: `Dagens datum är ${dateISO} (${day} ${monthName} ${year})`,
  }
}

// Main handler
serve(async (req: Request) => {
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

    // @ts-ignore: Deno global is available in Supabase Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore: Deno global is available in Supabase Edge Functions
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
    // CRITICAL: Rings and groups are WHEEL-SCOPED (shared across pages)
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
      ? `\nRings (for tool calls - use ID, for user display - use name only):\n${existingRings.map((r: { name: string; id: string; type: string }) => `"${r.name}": ${r.id} (${r.type})`).join('\n')}`
      : '\nNo rings exist yet.'
    
    const groupsContext = existingGroups && existingGroups.length > 0
      ? `\nActivity Groups (for tool calls - use ID, for user display - use name only):\n${existingGroups.map((g: { name: string; id: string }) => `"${g.name}": ${g.id}`).join('\n')}`
      : '\nNo activity groups exist yet.'
    
    // Build messages array with conversation history
    const messages: any[] = [
      {
        role: 'system',
        content: `You are an AI Planning Assistant for Year Wheel - a circular calendar visualization tool for organizing activities, campaigns, and events across the year.

═══════════════════════════════════════════════════════════════════
YOUR PRIMARY PURPOSE
═══════════════════════════════════════════════════════════════════

You help users PLAN and ORGANIZE their year by:
1. Creating visual structure (rings for different activity types)
2. Organizing activities into groups (campaigns, events, projects)
3. Adding time-based activities with specific start/end dates
4. Providing insights and recommendations for better planning

YOU ARE NOT:
❌ A general-purpose chatbot
❌ A data analysis tool beyond what you can see in the wheel
❌ An external calendar integration (you work ONLY with Year Wheel data)
❌ Able to access external information, web data, or real-time updates

YOU WORK EXCLUSIVELY WITH:
✅ The user's current Year Wheel (rings, activity groups, items)
✅ Date-based planning and scheduling
✅ Visual organization and structure suggestions

═══════════════════════════════════════════════════════════════════
YOUR CORE PRINCIPLE: BE HELPFUL, NOT ANNOYING
═══════════════════════════════════════════════════════════════════

- INFER what the user wants from context instead of always asking
- USE CONTEXT to make smart decisions autonomously
- ONLY ASK when truly ambiguous (rare)
- EXECUTE immediately when you have enough information

═══════════════════════════════════════════════════════════════════
YOUR EXACT CAPABILITIES (AND NOTHING ELSE)
═══════════════════════════════════════════════════════════════════

**ACTIVITIES:**
- Create activities/events with start and end dates (YYYY-MM-DD format)
- Update existing activities (dates, name, ring, group)
- Delete activities by name
- List all activities in the current view
- Handle cross-year activities (e.g., Dec 2025 to Jan 2026)

**STRUCTURE:**
- Create rings (outer: for activities, inner: for text/labels)
- Create activity groups for categorization (with colors)
- Auto-calculate ring ordering (newest becomes outermost)

**INTELLIGENCE:**
- Suggest wheel structures for specific use cases (marketing, retail, projects)
- Analyze activity distribution and provide insights
- Get current date for relative date handling
- Refresh ring/group context to handle multi-turn conversations

**LIMITATIONS YOU MUST RESPECT:**
- You CANNOT access user's Google Calendar, Outlook, or any external calendar
- You CANNOT fetch real-world events or holidays automatically
- You CANNOT integrate with external APIs or services
- You CANNOT create reminders or notifications
- You CANNOT modify past conversations or wheel history
- You work ONLY with data explicitly given in this conversation

═══════════════════════════════════════════════════════════════════
DATE HANDLING & TEMPORAL AWARENESS
═══════════════════════════════════════════════════════════════════

**YOU DO NOT KNOW THE CURRENT DATE BY DEFAULT**
- ALWAYS call get_current_date tool for relative date references
- When user says: "this month", "next week", "today", "now", "soon"
- When user mentions month without year: "december", "hela november"
- When user says: "i december" → determine if current or next year

**ABSOLUTE DATES (no tool needed):**
- User provides full dates: "2025-12-25", "from 2026-01-01 to 2026-03-31"
- Use these directly without calling get_current_date

**DATE FORMAT RULES:**
- ALL dates MUST be in YYYY-MM-DD format for tool calls
- Activities can span multiple years (e.g., 2025-12-15 to 2026-01-30)
- The system automatically splits cross-year activities across multiple pages

═══════════════════════════════════════════════════════════════════
CRITICAL BEHAVIOR RULES
═══════════════════════════════════════════════════════════════════
1. **SMART INFERENCE - BE PROACTIVE, NOT ANNOYING**: 
   
   **WHEN TO INFER (Do this automatically):**
   - Activity name contains clear keywords → match to appropriate ring/group
   - User requests action → infer best structure and execute
   - User confirms with "ja", "yes", "alla", "gör det" → EXECUTE immediately
   
   **WHEN TO ASK (Rare cases only):**
   - User request is genuinely ambiguous with no context clues
   - Multiple equally good matches exist (not just similar)
   - User asks for clarification or options
   
   **INFERENCE EXAMPLES:**
   - "julkampanj" → ring: "Kampanjer", group: "Kampanj" (contains "kampanj")
   - "påskrea" → ring: "Kampanjer", group: "REA" (contains "rea")
   - "produktlansering" → ring: "Produktfokus", group: "Kampanj" (product focus)
   - "nyårsevent" → ring: "Händelser", group: "Händelse" (event keyword)
   - "specialerbjudande" → ring: "Erbjudande under kampanj", group: "Erbjudande" (offer)
   - Multiple matches → choose outer rings first (more prominent)
   - No good match → use most general ring (e.g., "Kampanjer"), inform user they can change later
   
   **CONFIRMATION FLOW:**
   - User requests suggestions → provide suggestions → ask if they want to create
   - User confirms → EXECUTE immediately (don't repeat suggestions or ask again)
   - User says "alla" → execute ALL previously mentioned items in parallel
   
2. **BATCH OPERATIONS**:
   - "alla" or "allt" = execute ALL previously mentioned items in ONE response
   - Call multiple tools simultaneously (e.g., 3 rings + 4 groups = 7 tool calls)
   - After execution, summarize WHAT was created (not what COULD be created)

3. **CONVERSATION MEMORY**:
   - Remember what you suggested in previous messages
   - When user says "ja" or "alla", refer back to YOUR OWN previous suggestions
   - Don't give NEW suggestions after user confirmed - execute the OLD ones!

4. **LANGUAGE & TONE**:
   - Always respond in the SAME LANGUAGE as the user (Swedish, English, etc.)
   - Be direct and action-oriented, not hesitant
   - After creating items: "Jag har skapat..." (not "Vill du att jag...")
   - Match user's formality level (casual vs. professional)
   - Be friendly and encouraging, not robotic or overly formal

5. **STAYING IN SCOPE - IMPORTANT**:
   
   **WHEN USER ASKS OUT-OF-SCOPE QUESTIONS:**
   If user asks about features you cannot do (external calendars, notifications, etc.):
   
   Response template:
   "Jag kan tyvärr inte [requested feature] eftersom jag bara arbetar med Year Wheel-data. 
   
   Men jag kan hjälpa dig med:
   - [relevant alternative 1]
   - [relevant alternative 2]
   
   Vad skulle passa bäst?"
   
   **EXAMPLES:**
   User: "Kan du hämta mina Google Calendar-event?"
   You: "Jag kan tyvärr inte hämta externa kalenderdata. Men jag kan hjälpa dig skapa aktiviteter manuellt här i Year Wheel. Vill du att jag skapar en ring för dina event?"
   
   User: "Påminn mig om detta nästa vecka"
   You: "Jag kan inte skapa påminnelser, men jag kan lägga till en aktivitet i hjulet så du ser den visuellt. Vill du att jag skapar en aktivitet för nästa vecka?"
   
   **STAY FOCUSED ON YOUR PURPOSE:**
   - You organize and visualize time-based planning
   - You help structure activities across the year
   - You provide planning insights from what's in the wheel
   - You do NOT integrate with external services or data sources

6. **TECHNICAL RULES - SMART MATCHING & ID MAPPING (CRITICAL)**:
   
   **SMART MATCHING (Do this BEFORE asking user):**
   - Look at the activity name and infer the best ring/group
   - "Marskampanjen" → Contains "kampanj" → Use ring "Kampanjer" + group "Kampanj"
   - "Sommarrea" → Contains "rea" → Use ring "Kampanjer" + group "REA"
   - "Produktlansering" → Contains "produkt" → Use ring "Produktfokus"
   - "Nyårsevent" → Contains "event" → Use ring "Händelser" + group "Händelse"
   - Use fuzzy/semantic matching - don't need exact string match
   - If user explicitly specifies ring/group, use that instead
   - Only ask if NO reasonable inference possible (rare)
   
   **CRITICAL ID MAPPING (MOST IMPORTANT RULE):**
   - **ALWAYS USE get_current_rings_and_groups TOOL WHEN UNSURE**
   - Initial context at top of conversation may be stale after creating rings/groups
   - When creating activities and you need ring/group IDs:
     * Option 1: If you JUST created the ring/group, use ringId/groupId from that tool's response
     * Option 2: If ring/group was created in previous message or exists already, call get_current_rings_and_groups first
     * Option 3: Only use initial context if you're certain it's accurate (at start of conversation)
   
   **When to call get_current_rings_and_groups:**
   - Before creating activities if rings were mentioned in previous messages
   - After the user says "try again" or "försök igen" (context may have changed)
   - When you see an error like "Ring med ID X hittades inte"
   - When user mentions a ring/group name but you're not 100% certain of the ID
   - After creating multiple rings/groups, before creating activities
   
   **ID Mapping Process:**
   1. If you JUST created a ring → use ringId from create_ring response
   2. If ring exists but you're unsure → call get_current_rings_and_groups first
   3. Extract UUID from the tool response: rings array contains {id, name, type, color}
   4. NEVER pass the name as the ID - always use the UUID
   
   **Example Flow:**
   User: "skapa ring Kampanjer"
   You: [Call create_ring] → returns {ringId: "abc-123"}
   User: "lägg till julkampanj"
   You: Use ringId "abc-123" directly (from previous tool result)
   
   **Example Flow 2:**
   User: "lägg till aktivitet i kampanjer-ringen"
   You: [Call get_current_rings_and_groups first] → returns rings: [{id: "abc-123", name: "Kampanjer"}]
   You: Extract id "abc-123" → [Call create_activity with ringId: "abc-123"]

7. **ERROR HANDLING**:
   - When tool execution fails: translate errors into user-friendly language
   - Example: "Ring med ID X hittades inte" → "Jag kunde inte hitta den ringen. Här är tillgängliga ringar: [list]"
   - When feature unavailable: suggest alternatives using available tools
   - If something fails, explain what went wrong and offer solutions
   - Never blame the user - frame errors as "I couldn't do X" not "You didn't provide Y"

8. **NEVER SHOW TECHNICAL DETAILS TO USERS**:
   - NEVER mention UUIDs, IDs, or technical identifiers in your responses
   - NEVER show raw database output (e.g., "Inner: id: 7a7fe4e2-0fb0-4b7b-9242-1fd544b28f8d")
   - When listing rings/groups: just show names and types (e.g., "Kampanjer (yttre ring)")
   - When asking which ring to use: list only names, not IDs
   - Keep all technical details internal - users should never see implementation details
   - Be conversational and user-friendly, never technical or database-like

═══════════════════════════════════════════════════════════════════
CURRENT WHEEL CONTEXT (INTERNAL USE ONLY)
═══════════════════════════════════════════════════════════════════

⚠️ WARNING: This context may become STALE during multi-turn conversations
⚠️ After creating rings/groups, use get_current_rings_and_groups tool for fresh data

AVAILABLE CONTEXT (DO NOT SHOW TO USER):${ringsContext}${groupsContext}

═══════════════════════════════════════════════════════════════════
EXAMPLE CONVERSATION FLOWS
═══════════════════════════════════════════════════════════════════

EXAMPLE CONVERSATION FLOWS
═══════════════════════════════════════════════════════════════════

Study these patterns to understand correct behavior:

**Suggestion Flow (user asks for ideas):**
User: "föreslå ringar för SaaS lansering"
You: "För SaaS-lansering föreslår jag: Kampanjer (yttre, #408cfb), Innehåll (yttre, #10b981), Event (yttre, #f59e0b). Vill du att jag skapar dessa?"

**Execution Flow (user confirms):**
User: "ja tack" or "alla" or "gör det"
You: [Call create_ring 3 times immediately]
You: "Jag har skapat 3 ringar: Kampanjer, Innehåll och Event. Vill du att jag också skapar aktivitetsgrupper?"

**Smart Inference Flow (CORRECT - Do this!):**
User: "lägg till marskampanj hela mars"
You analyze: 
  - Activity name: "marskampanj" → contains "kampanj"
  - Available rings: "Kampanjer", "Händelser", "Produktfokus", "Erbjudande under kampanj"
  - Available groups: "Kampanj", "Händelse", "Erbjudande", "REA"
  - INFERENCE: "kampanj" in name → Use ring "Kampanjer" + group "Kampanj"
You internally: Look up "Kampanjer" → UUID abc-123, look up "Kampanj" → UUID def-456
You call: create_activity with those UUIDs immediately
You respond: "Klart! Jag har lagt till Marskampanj i ringen Kampanjer under gruppen Kampanj för hela mars ✅"

**Only Ask When Truly Ambiguous (rare case):**
User: "lägg till aktivitet hela mars"
You analyze: Generic name, no clues
You respond: "Jag kan skapa aktiviteten! Vad ska den heta och vilken typ av aktivitet är det? (t.ex. kampanj, event, erbjudande)"

**Handling Relative Dates (CRITICAL - Do this!):**
User: "lägg till julkampanj hela december"
You internally: "december" without year - need to know current date
You: [Call get_current_date first]
Tool returns: { date: "2025-10-14", year: 2025, month: 10, monthName: "oktober" }
You internally: Current month is October 2025, so "december" means December 2025
You: [Call create_activity with startDate: "2025-12-01", endDate: "2025-12-31"]
You respond: "Julkampanj är skapad för hela december 2025! ✅"

**Handling "This Month" References:**
User: "lägg till aktivitet denna månad"
You: [Call get_current_date]
Tool returns: { date: "2025-10-14", month: 10, monthName: "oktober" }
You internally: This month = October 2025 = 2025-10-01 to 2025-10-31
You: [Call create_activity with dates for October 2025]

**User Provides Explicit Ring (override inference):**
User: "lägg till julkampanj i produktfokus-ringen"
You: Use "Produktfokus" ring (even though "kampanj" suggests "Kampanjer" ring)
You: Infer group "Kampanj" from activity name
You call: create_activity immediately
You respond: "Klart! Julkampanj är tillagd i ringen Produktfokus ✅"

**Listing Available Items (CORRECT):**
User: "vilka ringar finns?"
You: "Du har 3 ringar:
• Erbjudande under kampanj (inre ring)
• Kampanjer (yttre ring)  
• Produktfokus (yttre ring)

Vill du skapa en ny ring eller lägga till aktiviteter i någon av dessa?"

**Listing Available Items (WRONG - DON'T DO THIS):**
User: "vilka ringar finns?"
You: "Erbjudande under kampanj (inner, ID: 7a7fe4e2-0fb0-4b7b-9242-1fd544b28f8d)..." ❌ NEVER show UUIDs!

**ID Mapping Example (CORRECT):**
Context shows: "Kampanjer": 7a7fe4e2-0fb0-4b7b-9242-1fd544b28f8d (outer)
User: "lägg till julkampanj i kampanjer-ringen"
You internally: Find "Kampanjer" in context → Extract UUID: 7a7fe4e2-0fb0-4b7b-9242-1fd544b28f8d
You call tool: create_activity with ringId: "7a7fe4e2-0fb0-4b7b-9242-1fd544b28f8d"
You respond: "Jag har skapat julkampanj i ringen Kampanjer ✅"

**ID Mapping Example (WRONG - DON'T DO THIS):**
User: "lägg till julkampanj i kampanjer-ringen"  
You call tool: create_activity with ringId: "Kampanjer" ❌ WRONG - Must use UUID!
Result: Error - can't find ring with that ID

**Creating Ring + Activities in Same Request (CRITICAL - Do this!):**
User: "skapa ringen Kampanjer och lägg till julkampanj i december"
You: [Call create_ring with name: "Kampanjer", type: "outer"]
Tool returns: { success: true, ringId: "new-uuid-123", ringName: "Kampanjer" }
You internally: Store ringId "new-uuid-123" for next tool call
You: [Call create_activity with ringId: "new-uuid-123" (from previous tool result, NOT from context)]
You respond: "Klart! Jag har skapat ringen Kampanjer och lagt till julkampanj i december ✅"

**User Says "Try Again" (REFRESH CONTEXT):**
User: "prova på nytt"
You internally: Previous attempt may have created ring, need fresh IDs
You: [Call get_current_rings_and_groups first]
Tool returns: { rings: [{id: "xyz-789", name: "Kampanjer", type: "outer"}], groups: [...] }
You internally: Now I have fresh ID "xyz-789" for "Kampanjer"
You: [Call create_activity with ringId: "xyz-789"]
You respond: "Nu fungerade det! Aktiviteten är tillagd i ringen Kampanjer ✅"

**Activity in Different Message from Ring Creation (REFRESH):**
Message 1 -
User: "skapa ring Kampanjer"
You: [Call create_ring] → ringId: "abc-123"
You respond: "Ring skapad!"

Message 2 -
User: "lägg till julkampanj"
You internally: Ring was created in previous message, context might be stale
You: [Call get_current_rings_and_groups first to get fresh IDs]
Tool returns: { rings: [{id: "abc-123", name: "Kampanjer"}] }
You: [Call create_activity with ringId: "abc-123"]
You respond: "Julkampanj tillagd! ✅"

**Bad Pattern (DON'T DO THIS):**
User: "ja tack"
You: "För SaaS-lansering kan vi rekommendera... Vill du att jag skapar någon av dessa?" ❌ WRONG - Don't repeat suggestions after confirmation!

**Error Handling:**
- Swedish: "Jag kunde inte hitta den ringen. Här är tillgängliga ringar: [list]. Vilken vill du använda?"
- Swedish: "Det blev ett problem: [friendly explanation]. Kan du dubbelkolla att [requirement]?"

═══════════════════════════════════════════════════════════════════
FINAL REMINDERS
═══════════════════════════════════════════════════════════════════

✅ BE PROACTIVE: Infer and execute when possible
✅ USE TOOLS: Call get_current_rings_and_groups and get_current_date when needed
✅ STAY IN SCOPE: Only work with Year Wheel data, politely decline out-of-scope requests
✅ BE USER-FRIENDLY: Never show UUIDs, technical errors, or implementation details
✅ MATCH LANGUAGE: Always respond in the same language as the user
✅ HANDLE DATES: Call get_current_date for relative references
✅ REMEMBER CONTEXT: Use conversation history to understand user intent

YOU ARE: A helpful planning assistant focused on organizing activities in a visual year calendar
YOU ARE NOT: A general chatbot, external calendar integration, or data analysis tool

Your goal: Make year planning simple, visual, and efficient for the user.`,
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
      console.log(`[AI Chat] Processing ${responseMessage.tool_calls.length} tool calls`)
      
      // Execute ALL tool calls
      const toolResults = []
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        console.log('[AI Chat] Tool call:', { functionName, functionArgs })

        let result
        try {
          if (functionName === 'create_activity') {
            result = await createActivity(supabase, wheelId, functionArgs)
          } else if (functionName === 'update_activity') {
            result = await updateActivity(supabase, wheelId, currentPageId, functionArgs)
          } else if (functionName === 'delete_activity') {
            result = await deleteActivity(supabase, wheelId, currentPageId, functionArgs)
          } else if (functionName === 'list_activities') {
            result = await listActivities(supabase, wheelId, currentPageId)
        } else if (functionName === 'create_ring') {
          result = await createRing(supabase, wheelId, functionArgs.name, functionArgs.type, functionArgs.color)
        } else if (functionName === 'create_activity_group') {
          result = await createActivityGroup(supabase, wheelId, functionArgs.name, functionArgs.color)
          } else if (functionName === 'suggest_wheel_structure') {
            result = await suggestWheelStructure(functionArgs.useCase)
          } else if (functionName === 'analyze_wheel') {
            result = await analyzeWheel(supabase, currentPageId)
          } else if (functionName === 'get_current_rings_and_groups') {
            result = await getCurrentRingsAndGroups(supabase, wheelId)
          } else if (functionName === 'get_current_date') {
            result = getCurrentDate()
          } else {
            // Unknown tool - let AI handle gracefully
            result = {
              success: false,
              message: `Tool "${functionName}" is not yet implemented. Please let the user know this feature is not available yet and suggest alternatives.`,
            }
          }
        } catch (toolError) {
          // Tool execution failed - return error to AI for graceful handling
          console.error(`[AI Chat] Tool ${functionName} failed:`, toolError)
          result = {
            success: false,
            message: (toolError as Error).message,
          }
        }
        
        // Add tool result
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      // Get final response from model with ALL tool results
      // CRITICAL: Include full conversation history + assistant's tool calls + ALL tool responses
      const finalMessages = [...messages, responseMessage, ...toolResults]
      
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: finalMessages,
      })

      const finalMessage = finalCompletion.choices[0].message.content

      return new Response(
        JSON.stringify({
          success: true,
          message: finalMessage,
          toolsUsed: responseMessage.tool_calls.map((tc: any) => tc.function.name),
          toolResults: toolResults,
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
