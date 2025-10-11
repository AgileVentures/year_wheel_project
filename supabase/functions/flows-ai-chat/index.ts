// Supabase Edge Function for Flows AI
// Handles deterministic AI agent workflows for Year Wheel assistant
// Using npm: imports with @ai-sdk/openai@2.0.49 and gpt-4o model
// Deploy version: 2

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { agent, execute } from 'npm:flows-ai@0.4.0'
import { openai } from 'npm:@ai-sdk/openai@1.0.0'
import { sequence, forEach, oneOf } from 'npm:flows-ai@0.4.0/flows'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

// Get OpenAI model
const getModel = () => openai('gpt-3.5-turbo')

// Intent Parser Agents
const intentParserAgent = agent({
  model: getModel(),
  system: `Extract structured activity data from user message.

EXEMPEL:
"skapa julkampanj 2025-12-15 till 2026-01-30 på ring Marketing i gruppen Kampanj"
→ {
  name: "julkampanj",
  startDate: "2025-12-15",
  endDate: "2026-01-30",
  ringName: "Marketing",
  activityGroupName: "Kampanj"
}

"lägg till sommarkampanj från 1 juni till 31 augusti"
→ {
  name: "sommarkampanj",
  startDate: "2025-06-01",
  endDate: "2025-08-31"
}

REGLER:
- Om år saknas, använd nuvarande år (2025)
- Om exakt datum saknas, anta första/sista dagen i månaden
- Extrahera ring från "på ring X" eller "i ring X"
- Extrahera grupp från "i gruppen X" eller "kategori X"
- Extrahera label från "med etikett X" eller "label X"
- Extrahera tid från "kl 14:00" eller "14.00"
- Returnera ALLTID giltiga datum i YYYY-MM-DD format

Svara med JSON: { name, startDate, endDate, ringName?, activityGroupName?, labelName?, time? }`
})

const updateIntentParserAgent = agent({
  model: getModel(),
  system: `Extract update details from user message.

EXEMPEL:
"ändra julkampanj till februari"
→ {
  itemIdentifier: "julkampanj",
  updates: { endDate: "2026-02-28" }
}

"byt namn på event med id abc-123 till 'Nyårsparty'"
→ {
  itemId: "abc-123",
  updates: { name: "Nyårsparty" }
}

"flytta sommarkampanj till hösten"
→ {
  itemIdentifier: "sommarkampanj",
  updates: { startDate: "2025-09-01", endDate: "2025-11-30" }
}

Svara med JSON: { itemIdentifier?, itemId?, updates: { name?, startDate?, endDate?, ringName?, activityGroupName?, labelName? } }`
})

const deleteIntentParserAgent = agent({
  model: getModel(),
  system: `Extract deletion criteria from user message.

EXEMPEL:
"ta bort julkampanj"
→ { namePattern: "julkampanj" }

"radera alla aktiviteter i december"
→ { startDate: "2025-12-01", endDate: "2025-12-31" }

"ta bort alla i ring Marketing"
→ { ringName: "Marketing" }

"radera aktiviteter i gruppen Kampanj"
→ { activityGroupName: "Kampanj" }

Svara med JSON: { namePattern?, itemIds?, startDate?, endDate?, ringName?, activityGroupName? }`
})

const listIntentParserAgent = agent({
  model: getModel(),
  system: `Extract list/query criteria from user message.

EXEMPEL:
"visa alla aktiviteter i mars"
→ { startDate: "2025-03-01", endDate: "2025-03-31" }

"lista aktiviteter på ring Marketing"
→ { ringName: "Marketing" }

"vad finns i gruppen Kampanj"
→ { activityGroupName: "Kampanj" }

"visa alla aktiviteter"
→ { currentPageOnly: false }

"visa aktiviteter på denna sida"
→ { currentPageOnly: true }

Svara med JSON: { startDate?, endDate?, ringName?, activityGroupName?, labelName?, currentPageOnly? }`
})

const confirmationFormatterAgent = agent({
  model: getModel(),
  system: `Format confirmation message in Swedish based on operation result.

EXEMPEL INPUT:
{
  success: true,
  operation: "create",
  items: [{ name: "julkampanj", startDate: "2025-12-15", endDate: "2026-01-30" }]
}

EXEMPEL OUTPUT:
"✅ Aktivitet 'julkampanj' skapad (2025-12-15 till 2026-01-30)"

REGLER:
- Använd emoji för visuell feedback (✅ ❌ ℹ️)
- Skriv på svenska
- Var kortfattad men informativ
- Om flera aktiviteter, lista dem

Svara med Markdown formaterad text.`
})

// ============================================================================
// ACTION AGENTS (Pure Functions)
// ============================================================================

const pageResolverAgent = async ({ input }, context) => {
  const supabase = context.supabase
  const wheelId = context.wheelId
  const intentData = JSON.parse(context.at(-1))
  const { name, startDate, endDate, ringId, activityGroupId, labelId, time } = intentData
  
  // Store activity metadata in context for itemCreator to access
  context.activityName = name
  context.ringId = ringId
  context.activityGroupId = activityGroupId
  context.labelId = labelId
  context.time = time
  
  console.log('[PageResolver] Input:', { wheelId, name, startDate, endDate })
  
  const { data: pages, error } = await supabase
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('year')
  
  if (error) throw error
  if (!pages || pages.length === 0) {
    throw new Error('Inga sidor hittades för detta hjul')
  }
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  
  console.log('[PageResolver] Years:', { startYear, endYear })
  
  // Single year activity
  if (startYear === endYear) {
    const page = pages.find(p => p.year === startYear)
    if (!page) {
      throw new Error(`Ingen sida hittades för år ${startYear}. Skapa sidan först!`)
    }
    console.log('[PageResolver] Single year:', { pageId: page.id, year: page.year })
    return JSON.stringify([{ pageId: page.id, startDate, endDate, year: page.year }])
  }
  
  // Cross-year activity - split by year
  const results = []
  for (let year = startYear; year <= endYear; year++) {
    const page = pages.find(p => p.year === year)
    if (!page) {
      throw new Error(`Ingen sida hittades för år ${year}. Skapa sidan först!`)
    }
    
    const yearStart = year === startYear ? startDate : `${year}-01-01`
    const yearEnd = year === endYear ? endDate : `${year}-12-31`
    
    results.push({ pageId: page.id, startDate: yearStart, endDate: yearEnd, year: page.year })
  }
  
  console.log('[PageResolver] Cross-year split:', results)
  return JSON.stringify(results)
}

const itemCreatorAgent = async ({ input }, context) => {
  const supabase = context.supabase
  const wheelId = context.wheelId
  
  // Current page segment from pageResolver (via forEach)
  const pageSegment = JSON.parse(context.at(-1))
  console.log('[ItemCreator] Page segment:', pageSegment)
  
  // Activity metadata from context (set by pageResolver)
  const name = context.activityName
  const activityGroupId = context.activityGroupId
  const labelId = context.labelId
  const time = context.time
  
  const { pageId, startDate, endDate } = pageSegment
  
  console.log('[ItemCreator] Creating:', { name, pageId, startDate, endDate })
  
  if (!wheelId || !pageId || !name || !startDate || !endDate) {
    throw new Error('Saknade obligatoriska fält för att skapa aktivitet')
  }
  
  // Get or create default ring
  let ringId = context.ringId
  if (!ringId) {
    const { data: defaultRing } = await supabase
      .from('rings')
      .select('id')
      .eq('wheel_id', wheelId)
      .limit(1)
      .maybeSingle()
    
    if (!defaultRing) {
      throw new Error('Inga ringar hittades. Skapa en ring först!')
    }
    ringId = defaultRing.id
    console.log('[ItemCreator] Using default ring:', ringId)
  }
  
  let finalActivityGroupId = activityGroupId
  
  if (!activityGroupId || activityGroupId.trim() === '') {
    const { data: defaultGroup } = await supabase
      .from('activity_groups')
      .select('id')
      .eq('wheel_id', wheelId)
      .or('name.eq.Allmän,name.eq.General')
      .limit(1)
      .maybeSingle()
    
    if (defaultGroup) {
      finalActivityGroupId = defaultGroup.id
    } else {
      const { data: newGroup, error: groupError } = await supabase
        .from('activity_groups')
        .insert({
          wheel_id: wheelId,
          name: 'Allmän',
          visible: true
        })
        .select()
        .single()
      
      if (groupError) throw groupError
      finalActivityGroupId = newGroup.id
      console.log('[ItemCreator] Auto-created default group:', finalActivityGroupId)
    }
  }
  
  const { data: newItem, error: insertError } = await supabase
    .from('items')
    .insert({
      wheel_id: wheelId,
      page_id: pageId,
      ring_id: ringId,
      activity_id: finalActivityGroupId,
      label_id: labelId || null,
      name: name,
      start_date: startDate,
      end_date: endDate,
      time: time || null
    })
    .select()
    .single()
  
  if (insertError) throw insertError
  
  console.log('[ItemCreator] Created item:', { id: newItem.id, name, pageId })
  
  return JSON.stringify({
    success: true,
    item: newItem,
    message: `Aktivitet "${name}" skapad (${startDate} till ${endDate})`
  })
}

const itemFinderAgent = async ({ input }, context) => {
  const supabase = context.supabase
  const data = JSON.parse(context.at(-1))
  const { wheelId, itemId, itemName } = data
  
  console.log('[ItemFinder] Searching:', { wheelId, itemId, itemName })
  
  if (itemId) {
    const { data: item, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('wheel_id', wheelId)
      .single()
    
    if (error || !item) throw new Error(`Aktivitet med ID ${itemId} hittades inte`)
    return JSON.stringify(item)
  }
  
  if (itemName) {
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('wheel_id', wheelId)
      .ilike('name', `%${itemName}%`)
    
    if (error) throw error
    if (!items || items.length === 0) {
      throw new Error(`Ingen aktivitet hittades med namnet "${itemName}"`)
    }
    
    console.log('[ItemFinder] Found:', items[0].name)
    return JSON.stringify(items[0])
  }
  
  throw new Error('Inget itemId eller itemName angivet')
}

const itemDeleterAgent = async ({ input }, context) => {
  const supabase = context.supabase
  const data = JSON.parse(context.at(-1))
  const { itemId } = data
  
  console.log('[ItemDeleter] Deleting item:', itemId)
  
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId)
  
  if (error) throw error
  
  console.log('[ItemDeleter] Deleted item:', itemId)
  return JSON.stringify({ success: true, deletedId: itemId })
}

// ============================================================================
// FLOWS
// ============================================================================

const createActivityFlow = sequence([
  { agent: 'intentParserAgent', input: '' },
  { agent: 'pageResolverAgent', input: '' },
  forEach({ item: 'Page segment with dates', input: { agent: 'itemCreatorAgent', input: '' } }),
  { agent: 'confirmationFormatterAgent', input: '' }
])

const deleteActivityFlow = sequence([
  { agent: 'deleteIntentParserAgent', input: '' },
  { agent: 'itemFinderAgent', input: '' },
  { agent: 'itemDeleterAgent', input: '' },
  { agent: 'confirmationFormatterAgent', input: '' }
])

const listActivitiesFlow = sequence([
  { agent: 'listIntentParserAgent', input: '' },
  { agent: 'confirmationFormatterAgent', input: '' }
])

const masterRoutingFlow = oneOf([
  { 
    when: 'The user message contains words like "skapa", "lägg till", "ny", or "create" - they want to CREATE a new activity', 
    input: createActivityFlow 
  },
  { 
    when: 'The user message contains words like "ta bort", "radera", "delete", or "remove" - they want to DELETE an activity', 
    input: deleteActivityFlow 
  },
  { 
    when: 'The user message contains words like "visa", "lista", "list", or "show" - they want to LIST activities', 
    input: listActivitiesFlow 
  },
])

// ============================================================================
// SERVER
// ============================================================================

serve(async (req) => {
  try {
    console.log('[FlowsAI] Request method:', req.method)
    
    if (req.method === 'OPTIONS') {
      console.log('[FlowsAI] Handling OPTIONS preflight')
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      })
    }

    console.log('[FlowsAI] Processing POST request')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { userMessage, wheelId, currentPageId } = await req.json()
    
    if (!userMessage || !wheelId) {
      throw new Error('Missing required fields: userMessage, wheelId')
    }

    console.log('[FlowsAI] Executing:', { userMessage, wheelId, currentPageId })

    // Wrap agents with context
    const wrappedPageResolverAgent = async (flow: any, context: any) => {
      const wrappedContext: any = context
      wrappedContext.supabase = supabase
      wrappedContext.wheelId = wheelId
      wrappedContext.currentPageId = currentPageId
      return pageResolverAgent(flow, wrappedContext)
    }

    const wrappedItemCreatorAgent = async (flow: any, context: any) => {
      const wrappedContext: any = context
      wrappedContext.supabase = supabase
      wrappedContext.wheelId = wheelId
      wrappedContext.currentPageId = currentPageId
      return itemCreatorAgent(flow, wrappedContext)
    }

    const wrappedItemFinderAgent = async (flow: any, context: any) => {
      const wrappedContext: any = context
      wrappedContext.supabase = supabase
      wrappedContext.wheelId = wheelId
      wrappedContext.currentPageId = currentPageId
      return itemFinderAgent(flow, wrappedContext)
    }

    const wrappedItemDeleterAgent = async (flow: any, context: any) => {
      const wrappedContext: any = context
      wrappedContext.supabase = supabase
      wrappedContext.wheelId = wheelId
      wrappedContext.currentPageId = currentPageId
      return itemDeleterAgent(flow, wrappedContext)
    }

    // Execute master routing flow
    const result = await execute(masterRoutingFlow, {
      agents: {
        intentParserAgent,
        updateIntentParserAgent,
        deleteIntentParserAgent,
        listIntentParserAgent,
        confirmationFormatterAgent,
        pageResolverAgent: wrappedPageResolverAgent,
        itemCreatorAgent: wrappedItemCreatorAgent,
        itemFinderAgent: wrappedItemFinderAgent,
        itemDeleterAgent: wrappedItemDeleterAgent
      },
      input: userMessage
    })

    console.log('[FlowsAI] Result:', result)

    return new Response(
      JSON.stringify({ 
        success: true,
        result: result,
        message: typeof result === 'string' ? result : JSON.stringify(result)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('[FlowsAI] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
