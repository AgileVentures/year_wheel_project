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

const UpdateActivityInput = z.object({
  activityName: z.string().describe('Current name of the activity to update'),
  newName: z.string().nullable().describe('Optional: New name for the activity'),
  newStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().describe('Optional: New start date (YYYY-MM-DD)'),
  newEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().describe('Optional: New end date (YYYY-MM-DD)'),
  newRingId: z.string().uuid().nullable().describe('Optional: New ring UUID'),
  newActivityGroupId: z.string().uuid().nullable().describe('Optional: New activity group UUID'),
})

const DeleteActivityInput = z.object({
  name: z.string().describe('Name or partial name of the activity to delete'),
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

async function updateActivity(
  supabase: any,
  wheelId: string,
  activityName: string,
  updates: {
    newName?: string
    newStartDate?: string
    newEndDate?: string
    newRingId?: string
    newActivityGroupId?: string
  }
) {
  console.log('[updateActivity] Searching for:', activityName)

  // Find items matching the name across ALL pages in this wheel
  const { data: items, error: findError } = await supabase
    .from('items')
    .select('*, wheel_pages!inner(wheel_id)')
    .eq('wheel_pages.wheel_id', wheelId)
    .ilike('name', `%${activityName}%`)

  if (findError) throw findError

  if (!items || items.length === 0) {
    return {
      success: false,
      message: `Hittade ingen aktivitet med namnet "${activityName}"`
    }
  }

  console.log('[updateActivity] Found items:', items.length)

  // If updating dates, we need to handle cross-year activities
  if (updates.newStartDate || updates.newEndDate) {
    // Delete all existing items for this activity
    const itemIds = items.map((i: any) => i.id)
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .in('id', itemIds)

    if (deleteError) throw deleteError

    // Get the first item's data to preserve ring/group
    const firstItem = items[0]
    const newName = updates.newName || firstItem.name
    const newStartDate = updates.newStartDate || firstItem.start_date
    const newEndDate = updates.newEndDate || firstItem.end_date
    const newRingId = updates.newRingId || firstItem.ring_id
    const newActivityGroupId = updates.newActivityGroupId || firstItem.activity_id

    // Create new activity with updated dates
    const result = await createActivity(supabase, wheelId, {
      name: newName,
      startDate: newStartDate,
      endDate: newEndDate,
      ringId: newRingId,
      activityGroupId: newActivityGroupId,
      labelId: firstItem.label_id,
    })

    return {
      success: true,
      message: `Uppdaterade "${activityName}" till nya datum: ${newStartDate} - ${newEndDate}`,
      itemsUpdated: result.itemsCreated,
    }
  } else {
    // Simple update (name, ring, or group only)
    const updateData: any = {}
    if (updates.newName) updateData.name = updates.newName
    if (updates.newRingId) updateData.ring_id = updates.newRingId
    if (updates.newActivityGroupId) updateData.activity_id = updates.newActivityGroupId

    const itemIds = items.map((i: any) => i.id)
    const { error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .in('id', itemIds)

    if (updateError) throw updateError

    return {
      success: true,
      itemsUpdated: items.length,
      message: `Uppdaterade ${items.length} objekt för "${activityName}"`
    }
  }
}

async function deleteActivity(
  supabase: any,
  wheelId: string,
  activityName: string
) {
  console.log('[deleteActivity] Searching for:', activityName)

  // Find items matching the name across ALL pages in this wheel
  const { data: items, error: findError } = await supabase
    .from('items')
    .select('*, wheel_pages!inner(wheel_id)')
    .eq('wheel_pages.wheel_id', wheelId)
    .ilike('name', `%${activityName}%`)

  if (findError) throw findError

  if (!items || items.length === 0) {
    return {
      success: false,
      message: `Ingen aktivitet hittades med namnet "${activityName}"`,
    }
  }

  // Delete all matching items
  const { error: deleteError } = await supabase
    .from('items')
    .delete()
    .in('id', items.map((i: any) => i.id))

  if (deleteError) throw deleteError

  console.log('[deleteActivity] Deleted items:', items.length)

  return {
    success: true,
    itemsDeleted: items.length,
    message: `${items.length} aktivitet(er) med namnet "${activityName}" togs bort`,
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

  const updateActivityTool = tool({
    name: 'update_activity',
    description: 'Update an existing activity. Can change dates, name, ring, or activity group. Finds the activity by name.',
    parameters: UpdateActivityInput,
    async execute(input: z.infer<typeof UpdateActivityInput>) {
      const result = await updateActivity(supabase, wheelId, input.activityName, {
        newName: input.newName || undefined,
        newStartDate: input.newStartDate || undefined,
        newEndDate: input.newEndDate || undefined,
        newRingId: input.newRingId || undefined,
        newActivityGroupId: input.newActivityGroupId || undefined,
      })
      return JSON.stringify(result)
    }
  })

  const deleteActivityTool = tool({
    name: 'delete_activity',
    description: 'Delete an activity by name. Searches for activities matching the name.',
    parameters: DeleteActivityInput,
    async execute(input: z.infer<typeof DeleteActivityInput>) {
      const result = await deleteActivity(supabase, wheelId, input.name)
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
    model: 'gpt-4o',
    instructions: `You are the Activity Agent. Your ONLY job is to CREATE activities immediately when asked.

⚠️ CRITICAL: DO NOT JUST SAY YOU DID IT - ACTUALLY CALL THE TOOLS!

WORKFLOW (MANDATORY):
1. User asks to create activity
2. You MUST call get_current_context tool (returns date + all ring/group IDs)
3. You MUST match activity name to best ring/group from the IDs you got
4. You MUST call create_activity tool with the matched UUIDs
5. You MUST report back with the actual result from create_activity tool

EXAMPLE EXECUTION:
User: "skapa kampanj i november"
You internally:
  Step 1: [Call get_current_context] → Gets {date: "2025-10-14", rings: [{id: "abc-123", name: "Kampanjer"}], groups: [{id: "def-456", name: "Kampanj"}]}
  Step 2: Activity name "kampanj" → matches ring "Kampanjer" (abc-123) + group "Kampanj" (def-456)
  Step 3: Date logic: user said "november" + current date is 2025-10-14 → november 2025 → "2025-11-01" to "2025-11-30"
  Step 4: [Call create_activity with {name: "kampanj", startDate: "2025-11-01", endDate: "2025-11-30", ringId: "abc-123", activityGroupId: "def-456"}]
  Step 5: Tool returns {success: true, message: "Aktivitet skapad"}
You respond: "Klart! Jag har skapat kampanj i november (2025-11-01 till 2025-11-30) i ringen Kampanjer ✅"

SMART MATCHING KEYWORDS:
- Contains "kampanj" → ring: "Kampanjer", group: "Kampanj"
- Contains "rea" → ring: "Kampanjer", group: "REA"
- Contains "produkt" → ring: "Produktfokus"
- Contains "event" → ring: "Händelser", group: "Händelse"
- Look for keywords and match to closest ring/group name

DATE HANDLING:
- "idag" → Use date from get_current_context
- "november" without year → Use current year if month >= current month, else next year
- "en vecka" → 7 days from start date
- Always YYYY-MM-DD format

CRITICAL RULES:
- NEVER say "jag skapar" or "jag kommer skapa" - ACTUALLY CALL THE TOOL!
- NEVER respond without calling the appropriate tool
- ALWAYS use UUIDs from get_current_context, NEVER use ring/group names as IDs
- If no rings/groups exist, tell user to create structure first

UPDATE/MOVE/CHANGE ACTIVITIES:
When user says "flytta", "ändra", "uppdatera", "move":
1. Call get_current_context to get current date (if needed for relative dates)
2. Call update_activity with activityName and new values
Example: User says "Flytta Oktoberfest till oktober 2026"
→ Call update_activity with {activityName: "Oktoberfest", newStartDate: "2026-10-01", newEndDate: "2026-10-31"}

DELETE ACTIVITIES:
When user says "ta bort", "radera", "delete":
1. Call delete_activity with the activity name
Example: User says "Ta bort Oktoberfest"
→ Call delete_activity with {name: "Oktoberfest"}

Speak Swedish naturally. Be concise.`,
    tools: [getContextTool, createActivityTool, updateActivityTool, deleteActivityTool, listActivitiesTool],
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
