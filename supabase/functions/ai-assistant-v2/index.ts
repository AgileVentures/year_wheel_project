// AI Assistant V2 - Using OpenAI Agents SDK
// Comprehensive multi-agent system with tools, handoffs, and guardrails
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

declare const Deno: any;

// Import from ESM for Supabase Edge Functions (Deno)
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import { Agent, run, tool, handoff } from 'https://esm.sh/@openai/agents@0.1.9'
// @ts-ignore
import { z } from 'https://esm.sh/zod@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ═══════════════════════════════════════════════════════════════════
// TYPES & SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const CreateActivityInput = z.object({
  name: z.string().describe('Activity name'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
  ringId: z.string().uuid().describe('Ring UUID'),
  activityGroupId: z.string().uuid().describe('Activity group UUID'),
  labelId: z.string().uuid().nullable().describe('Optional label UUID'),
})

const CreateRingInput = z.object({
  name: z.string().describe('Ring name'),
  type: z.enum(['inner', 'outer']).describe('Ring type - outer for activities, inner for text'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().describe('Hex color code (defaults to #408cfb)'),
})

const CreateGroupInput = z.object({
  name: z.string().describe('Activity group name'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Hex color code'),
})

const DateRangeInput = z.object({
  month: z.number().min(1).max(12).nullable(),
  year: z.number().nullable(),
})

// ═══════════════════════════════════════════════════════════════════
// DATABASE HELPERS
// ═══════════════════════════════════════════════════════════════════

async function createActivity(
  supabase: any,
  wheelId: string,
  args: z.infer<typeof CreateActivityInput>
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

  // Verify ring exists
  const { data: ring, error: ringError } = await supabase
    .from('wheel_rings')
    .select('id, name')
    .eq('id', args.ringId)
    .single()
  
  if (ringError || !ring) {
    throw new Error(`Ring med ID ${args.ringId} hittades inte`)
  }
  
  // Verify activity group exists
  const { data: group, error: groupError } = await supabase
    .from('activity_groups')
    .select('id, name')
    .eq('id', args.activityGroupId)
    .single()
  
  if (groupError || !group) {
    throw new Error(`Aktivitetsgrupp med ID ${args.activityGroupId} hittades inte`)
  }

  const startYear = new Date(args.startDate).getFullYear()
  const endYear = new Date(args.endDate).getFullYear()

  // Check if all required pages exist
  for (let year = startYear; year <= endYear; year++) {
    const pageExists = pages.find((p: { year: number }) => p.year === year)
    if (!pageExists) {
      const { data: newPage, error: pageError } = await supabase
        .from('wheel_pages')
        .insert({
          wheel_id: wheelId,
          year: year,
          organization_data: { rings: [], activityGroups: [], labels: [], items: [] }
        })
        .select()
        .single()
      
      if (pageError) {
        throw new Error(`Kunde inte skapa sida för år ${year}: ${pageError.message}`)
      }
      pages.push(newPage)
    }
  }

  const itemsCreated = []

  if (startYear === endYear) {
    // Single year activity
    const page = pages.find((p: { year: number }) => p.year === startYear)
    if (!page) throw new Error(`Ingen sida hittades för år ${startYear}`)

    const { data: newItem, error: insertError } = await supabase
      .from('items')
      .insert({
        wheel_id: wheelId,
        page_id: page.id,
        ring_id: args.ringId,
        activity_id: args.activityGroupId,
        label_id: args.labelId || null,
        name: args.name,
        start_date: args.startDate,
        end_date: args.endDate,
      })
      .select()
      .single()

    if (insertError) throw insertError
    itemsCreated.push(newItem)
  } else {
    // Cross-year activity - split into segments
    for (let year = startYear; year <= endYear; year++) {
      const page = pages.find((p: { year: number }) => p.year === year)
      if (!page) throw new Error(`Ingen sida hittades för år ${year}`)

      const segmentStart = year === startYear ? args.startDate : `${year}-01-01`
      const segmentEnd = year === endYear ? args.endDate : `${year}-12-31`

      const { data: newItem, error: insertError } = await supabase
        .from('items')
        .insert({
          wheel_id: wheelId,
          page_id: page.id,
          ring_id: args.ringId,
          activity_id: args.activityGroupId,
          label_id: args.labelId || null,
          name: args.name,
          start_date: segmentStart,
          end_date: segmentEnd,
        })
        .select()
        .single()

      if (insertError) throw insertError
      itemsCreated.push(newItem)
    }
  }

  return {
    success: true,
    itemsCreated: itemsCreated.length,
    message: `Aktivitet "${args.name}" skapad (${args.startDate} till ${args.endDate})${itemsCreated.length > 1 ? ` - delad över ${itemsCreated.length} år` : ''}`,
    ringName: ring.name,
    groupName: group.name,
  }
}

async function createRing(
  supabase: any,
  wheelId: string,
  args: z.infer<typeof CreateRingInput>
) {
  const defaultColor = '#408cfb'
  const finalColor = args.color || defaultColor

  // Check if ring exists
  const { data: existingByName } = await supabase
    .from('wheel_rings')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', args.name)
    .maybeSingle()

  if (existingByName) {
    return {
      success: true,
      message: `Ring "${args.name}" finns redan`,
      ringId: existingByName.id,
      ringName: existingByName.name,
      alreadyExists: true,
    }
  }

  // Auto-calculate ring_order
  const { data: existingRings } = await supabase
    .from('wheel_rings')
    .select('ring_order')
    .eq('wheel_id', wheelId)
    .order('ring_order', { ascending: false })
    .limit(1)

  const ringOrder = existingRings && existingRings.length > 0 
    ? existingRings[0].ring_order + 1 
    : 0

  const { data: ring, error } = await supabase
    .from('wheel_rings')
    .insert({
      wheel_id: wheelId,
      name: args.name,
      type: args.type,
      color: finalColor,
      visible: true,
      orientation: args.type === 'inner' ? 'vertical' : null,
      ring_order: ringOrder,
    })
    .select()
    .single()

  if (error) throw new Error(`Kunde inte skapa ring: ${error.message}`)

  return {
    success: true,
    message: `Ring "${args.name}" skapad (typ: ${args.type}, färg: ${finalColor})`,
    ringId: ring.id,
    ringName: ring.name,
  }
}

async function createGroup(
  supabase: any,
  wheelId: string,
  args: z.infer<typeof CreateGroupInput>
) {
  // Check if group exists
  const { data: existing } = await supabase
    .from('activity_groups')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', args.name)
    .maybeSingle()

  if (existing) {
    return {
      success: true,
      message: `Aktivitetsgrupp "${args.name}" finns redan`,
      groupId: existing.id,
      groupName: existing.name,
      alreadyExists: true,
    }
  }

  const { data: group, error } = await supabase
    .from('activity_groups')
    .insert({
      wheel_id: wheelId,
      name: args.name,
      color: args.color,
      visible: true,
    })
    .select()
    .single()

  if (error) throw new Error(`Kunde inte skapa aktivitetsgrupp: ${error.message}`)

  return {
    success: true,
    message: `Aktivitetsgrupp "${args.name}" skapad med färg ${args.color}`,
    groupId: group.id,
    groupName: group.name,
  }
}

async function getCurrentRingsAndGroups(supabase: any, wheelId: string) {
  const [ringsRes, groupsRes] = await Promise.all([
    supabase.from('wheel_rings').select('id, name, type, color').eq('wheel_id', wheelId).order('ring_order'),
    supabase.from('activity_groups').select('id, name, color').eq('wheel_id', wheelId),
  ])

  if (ringsRes.error) throw new Error(`Kunde inte hämta ringar: ${ringsRes.error.message}`)
  if (groupsRes.error) throw new Error(`Kunde inte hämta aktivitetsgrupper: ${groupsRes.error.message}`)

  return {
    rings: ringsRes.data || [],
    groups: groupsRes.data || [],
  }
}

function getCurrentDate() {
  const now = new Date()
  return {
    date: now.toISOString().split('T')[0],
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    monthName: now.toLocaleString('sv-SE', { month: 'long' }),
  }
}

// ═══════════════════════════════════════════════════════════════════
// AGENT SYSTEM - MULTI-AGENT WITH HANDOFFS
// ═══════════════════════════════════════════════════════════════════

function createAgentSystem(supabase: any, wheelId: string, currentPageId: string) {
  
  // ──────────────────────────────────────────────────────────────────
  // CONTEXT TOOLS (shared across agents)
  // ──────────────────────────────────────────────────────────────────
  
  const getContextTool = tool({
    name: 'get_current_context',
    description: 'Get current rings, groups, and date. Call this when you need fresh IDs or date information.',
    parameters: z.object({}),
    async execute() {
      const { rings, groups } = await getCurrentRingsAndGroups(supabase, wheelId)
      const dateInfo = getCurrentDate()
      
      return JSON.stringify({
        date: dateInfo,
        rings: rings.map((r: any) => ({ id: r.id, name: r.name, type: r.type, color: r.color })),
        groups: groups.map((g: any) => ({ id: g.id, name: g.name, color: g.color })),
      })
    }
  })

  // ──────────────────────────────────────────────────────────────────
  // STRUCTURE AGENT - Handles rings and groups
  // ──────────────────────────────────────────────────────────────────
  
  const createRingTool = tool({
    name: 'create_ring',
    description: 'Create a new ring. Use "outer" type for activity rings (most common), "inner" for text rings.',
    parameters: CreateRingInput,
    async execute(input: z.infer<typeof CreateRingInput>) {
      const result = await createRing(supabase, wheelId, input)
      return JSON.stringify(result)
    }
  })

  const createGroupTool = tool({
    name: 'create_activity_group',
    description: 'Create a new activity group for organizing activities.',
    parameters: CreateGroupInput,
    async execute(input: z.infer<typeof CreateGroupInput>) {
      const result = await createGroup(supabase, wheelId, input)
      return JSON.stringify(result)
    }
  })

  const structureAgent = new Agent({
    name: 'Structure Agent',
    model: 'gpt-4.1',
    instructions: `You are the Structure Agent. Your job is to create rings and activity groups for the Year Wheel.

RESPONSIBILITIES:
- Create rings (outer type for activities, inner for text/labels)
- Create activity groups (categories for organizing activities)
- Suggest wheel structures based on use cases

RING COLORS (defaults):
- Blue (#408cfb) - General/default
- Green (#10b981) - Nature/growth/success
- Orange (#f59e0b) - Energy/urgency/highlights
- Red (#ef4444) - Critical/urgent/sales
- Purple (#8b5cf6) - Premium/creative

WORKFLOW:
1. When user requests structure, create rings and groups immediately
2. Return the IDs and names of created items
3. Speak Swedish to the user naturally

EXAMPLES:
- "Skapa ring Kampanjer" → Create outer ring "Kampanjer" with blue
- "Föreslå struktur för marknadsföring" → Create: Kampanjer, Innehåll, Event rings + REA, Produktlansering groups`,
    tools: [getContextTool, createRingTool, createGroupTool],
  })

  // ──────────────────────────────────────────────────────────────────
  // ACTIVITY AGENT - Handles creating/managing activities
  // ──────────────────────────────────────────────────────────────────

  const createActivityTool = tool({
    name: 'create_activity',
    description: 'Create an activity/event. Can span multiple years. Requires ring ID and activity group ID.',
    parameters: CreateActivityInput,
    async execute(input: z.infer<typeof CreateActivityInput>) {
      const result = await createActivity(supabase, wheelId, input)
      return JSON.stringify(result)
    }
  })

  const listActivitiesTool = tool({
    name: 'list_activities',
    description: 'List all activities for the current page',
    parameters: z.object({}),
    async execute() {
      const { data: items, error } = await supabase
        .from('items')
        .select('name, start_date, end_date')
        .eq('page_id', currentPageId)
        .order('start_date')

      if (error) throw error
      if (!items || items.length === 0) {
        return 'Inga aktiviteter hittades på denna sida'
      }

      return JSON.stringify(items)
    }
  })

  const activityAgent = new Agent({
    name: 'Activity Agent',
    model: 'gpt-4.1',
    instructions: `You are the Activity Agent. Your job is to create and manage activities on the Year Wheel.

RESPONSIBILITIES:
- Create activities with specific start/end dates
- Handle cross-year activities (e.g., Dec 2025 - Jan 2026)
- Smart inference: match activity names to appropriate rings/groups
- List and manage existing activities

SMART MATCHING:
- "julkampanj" → ring: Kampanjer, group: Kampanj (contains "kampanj")
- "påskrea" → ring: Kampanjer, group: REA (contains "rea")
- "produktlansering" → ring: Produktfokus (product focus)
- "nyårsevent" → ring: Händelser, group: Händelse (event keyword)
- Look at keywords in activity name and infer best match

CRITICAL RULES:
1. ALWAYS call get_current_context first to get fresh ring/group IDs
2. Use ONLY UUIDs for ringId and activityGroupId (never names)
3. Dates MUST be YYYY-MM-DD format
4. When user says "i december" without year, use get_current_context to determine if current or next year
5. If user confirms with "ja"/"gör det"/"okay", EXECUTE immediately - no more questions

WORKFLOW:
Message 1: User requests activities
You: [Call get_current_context to get date and IDs]
You: [Infer best ring/group from activity name]
You: [Call create_activity immediately with inferred IDs]
You: "Klart! Jag har skapat [activity] i ringen [ring] för [dates] ✅"

WRONG PATTERN (don't do this):
You: [Call get_current_context]
You: "Vilken ring vill du använda?" ❌ NO! Infer and execute!

Speak Swedish naturally.`,
    tools: [getContextTool, createActivityTool, listActivitiesTool],
  })

  // ──────────────────────────────────────────────────────────────────
  // ANALYSIS AGENT - Provides insights
  // ──────────────────────────────────────────────────────────────────

  const analyzeWheelTool = tool({
    name: 'analyze_wheel',
    description: 'Analyze the current wheel and provide insights about activity distribution',
    parameters: z.object({}),
    async execute() {
      // Get page's wheel_id
      const { data: page, error: pageError } = await supabase
        .from('wheel_pages')
        .select('wheel_id')
        .eq('id', currentPageId)
        .single()
      
      if (pageError || !page) throw new Error('Kunde inte hitta sida')
      
      // Fetch data
      const [ringsRes, groupsRes, itemsRes] = await Promise.all([
        supabase.from('wheel_rings').select('*').eq('wheel_id', page.wheel_id),
        supabase.from('activity_groups').select('*').eq('wheel_id', page.wheel_id),
        supabase.from('items').select('*').eq('page_id', currentPageId),
      ])

      if (ringsRes.error || groupsRes.error || itemsRes.error) {
        throw new Error('Kunde inte analysera hjulet')
      }

      const rings = ringsRes.data || []
      const groups = groupsRes.data || []
      const items = itemsRes.data || []

      // Analyze by quarter
      const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
      items.forEach((item: any) => {
        const month = new Date(item.start_date).getMonth()
        if (month < 3) quarters.Q1++
        else if (month < 6) quarters.Q2++
        else if (month < 9) quarters.Q3++
        else quarters.Q4++
      })

      return JSON.stringify({
        rings: rings.length,
        groups: groups.length,
        activities: items.length,
        quarters,
      })
    }
  })

  const analysisAgent = new Agent({
    name: 'Analysis Agent',
    model: 'gpt-4.1',
    instructions: `You are the Analysis Agent. You provide insights about the Year Wheel.

RESPONSIBILITIES:
- Analyze activity distribution across quarters
- Identify gaps and imbalances
- Provide recommendations

OUTPUT FORMAT (Swedish):
📊 **Översikt:**
- Ringar: X
- Aktivitetsgrupper: Y
- Aktiviteter: Z

📅 **Per kvartal:**
- Q1 (jan-mar): X aktiviteter
- Q2 (apr-jun): Y aktiviteter
- Q3 (jul-sep): Z aktiviteter
- Q4 (okt-dec): W aktiviteter

💡 **Tips:**
- [Provide actionable recommendations]

Be conversational and helpful.`,
    tools: [analyzeWheelTool],
  })

  // ──────────────────────────────────────────────────────────────────
  // MAIN ORCHESTRATOR AGENT
  // ──────────────────────────────────────────────────────────────────

  const orchestratorAgent = Agent.create({
    name: 'Year Wheel Assistant',
    model: 'gpt-4.1',
    instructions: `Du är Year Wheel Assistant - en AI-assistent för årsplanering.

DIN ROLL:
Du hjälper användare att planera och organisera aktiviteter i ett cirkulärt årshjul.

DINA SPECIALISTER:
1. Structure Agent - Skapar ringar och aktivitetsgrupper
2. Activity Agent - Skapar och hanterar aktiviteter
3. Analysis Agent - Analyserar hjulet och ger insikter

ARBETSFLÖDE:
1. Lyssna på användarens behov
2. Delegera till rätt specialist (handoff)
3. Sammanfatta resultatet för användaren

DELEGERINGSREGLER:
- User säger "skapa ring" eller "föreslå struktur" → Handoff to Structure Agent
- User säger "lägg till aktivitet" eller "skapa kampanj" → Handoff to Activity Agent
- User säger "analysera" eller "hur ser det ut" → Handoff to Analysis Agent

VAR PROAKTIV:
- Gissa INTE - delegera till rätt specialist
- Håll svar korta innan handoff
- Låt specialisterna göra jobbet

EXEMPEL:
User: "Skapa en ring för kampanjer"
You: [Handoff to Structure Agent immediately]

User: "Lägg till julkampanj i december"
You: [Handoff to Activity Agent immediately]

User: "Hur är aktiviteterna fördelade?"
You: [Handoff to Analysis Agent immediately]

Prata svenska naturligt.`,
    handoffs: [
      handoff(structureAgent, {
        toolDescriptionOverride: 'Delegate to Structure Agent for creating rings and groups',
      }),
      handoff(activityAgent, {
        toolDescriptionOverride: 'Delegate to Activity Agent for creating and managing activities',
      }),
      handoff(analysisAgent, {
        toolDescriptionOverride: 'Delegate to Analysis Agent for wheel analysis and insights',
      }),
    ],
  })

  return orchestratorAgent
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { userMessage, conversationHistory = [], wheelId, currentPageId } = await req.json()
    if (!userMessage || !wheelId) {
      throw new Error('Missing required fields: userMessage, wheelId')
    }

    console.log('[AI Assistant V2] Processing:', { userMessage, wheelId, currentPageId })

    // Create agent system
    const orchestrator = createAgentSystem(supabase, wheelId, currentPageId)

    // Build conversation history
    const messages = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Run agent with conversation history
    const result = await run(orchestrator, userMessage, {
      runConfig: {
        maxTurns: 20,
      },
      context: {
        messages,
      }
    })

    console.log('[AI Assistant V2] Result:', { finalOutput: result.finalOutput })

    return new Response(
      JSON.stringify({
        success: true,
        message: result.finalOutput,
        agentUsed: result.agent?.name || 'Year Wheel Assistant',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[AI Assistant V2] Error:', error)
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
