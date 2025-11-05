// AI Assistant V2 - Using OpenAI Agents SDK
// Comprehensive multi-agent system with tools, handoffs, and guardrails
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

declare const Deno: any;

// Import from ESM for Supabase Edge Functions (Deno)
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import { Agent, run, tool, handoff, RunContext } from 'https://esm.sh/@openai/agents@0.1.9'
// @ts-ignore
import { z } from 'https://esm.sh/zod@3'
// @ts-ignore
import OpenAI from 'https://esm.sh/openai@4.73.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ═══════════════════════════════════════════════════════════════════
// TYPES & SCHEMAS
// ═══════════════════════════════════════════════════════════════════

// Context type that will be passed to all agents and tools
interface WheelContext {
  supabase: any
  wheelId: string
  userId: string
  currentYear: number
  currentPageId: string
  // Store ALL pages so AI knows what years exist
  allPages?: Array<{ id: string; year: number; title: string; page_order: number }>
  // Store suggestions for "suggest then create" workflow
  lastSuggestions?: {
    rings: Array<{ name: string; type: string; description?: string }>
    activityGroups: Array<{ name: string; color: string; description?: string }>
    activities: Array<{ name: string; startDate: string; endDate: string; ring: string; group: string; description?: string }>
  }
}

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

const UpdateRingInput = z.object({
  ringName: z.string().describe('Current name of the ring to update'),
  newName: z.string().nullable().describe('Optional: New name for the ring'),
  newColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().describe('Optional: New hex color code'),
})

const DeleteRingInput = z.object({
  name: z.string().describe('Name or partial name of the ring to delete'),
})

const UpdateGroupInput = z.object({
  groupName: z.string().describe('Current name of the activity group to update'),
  newName: z.string().nullable().describe('Optional: New name for the group'),
  newColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().describe('Optional: New hex color code'),
})

const DeleteGroupInput = z.object({
  name: z.string().describe('Name or partial name of the activity group to delete'),
})

const CreateLabelInput = z.object({
  name: z.string().describe('Label name'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Hex color code'),
})

const UpdateLabelInput = z.object({
  labelName: z.string().describe('Current name of the label to update'),
  newName: z.string().nullable().describe('Optional: New name for the label'),
  newColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().describe('Optional: New hex color code'),
})

const DeleteLabelInput = z.object({
  name: z.string().describe('Name or partial name of the label to delete'),
})

const SuggestStructureInput = z.object({
  domain: z.string().describe('The domain, purpose, or use case for the wheel (e.g., "HR planning", "Marketing campaigns", "School year planning", "Project management")'),
  additionalContext: z.string().nullable().describe('Optional: Additional context or specific requirements from the user'),
})

const CreateYearPageInput = z.object({
  year: z.number().describe('Year for the new page (e.g., 2026)'),
  copyStructure: z.boolean().default(true).describe('Whether to copy rings and activity groups from current page'),
})

const SmartCopyYearInput = z.object({
  sourceYear: z.number().describe('Year to copy from'),
  targetYear: z.number().describe('New year to create'),
})

const DateRangeInput = z.object({
  month: z.number().min(1).max(12).nullable(),
  year: z.number().nullable(),
})

// ═══════════════════════════════════════════════════════════════════
// DATABASE HELPERS
// All helper functions now receive context via RunContext parameter
// ═══════════════════════════════════════════════════════════════════

async function createActivity(
  ctx: RunContext<WheelContext>,
  args: z.infer<typeof CreateActivityInput>
) {
  const { supabase, wheelId } = ctx.context
  const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  console.log(`[createActivity ${callId}] ========== START ==========`)
  console.log(`[createActivity ${callId}] Input:`, { wheelId, ...args })

  // Fetch all pages for this wheel
  const { data: pages, error: pagesError } = await supabase
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('year')

  if (pagesError) {
    console.error('[createActivity] Pages query error:', pagesError)
    throw new Error('Kunde inte hämta sidor för hjulet. Försök igen.')
  }
  if (!pages || pages.length === 0) {
    throw new Error('Inga sidor hittades för detta hjul. Skapa minst en sida först.')
  }

  // Verify ring exists
  const { data: ring, error: ringError } = await supabase
    .from('wheel_rings')
    .select('id, name, wheel_id')
    .eq('id', args.ringId)
    .single()
  
  if (ringError || !ring) {
    console.error('[createActivity] Ring query error:', ringError)
    throw new Error(`Den valda ringen hittades inte. Kontrollera att ringen fortfarande finns.`)
  }
  
  if (ring.wheel_id !== wheelId) {
    throw new Error('Den valda ringen tillhör inte detta hjul.')
  }
  
  // Verify activity group exists
  const { data: group, error: groupError } = await supabase
    .from('activity_groups')
    .select('id, name, wheel_id')
    .eq('id', args.activityGroupId)
    .single()
  
  if (groupError || !group) {
    console.error('[createActivity] Group query error:', groupError)
    throw new Error(`Den valda aktivitetsgruppen hittades inte. Kontrollera att gruppen fortfarande finns.`)
  }
  
  if (group.wheel_id !== wheelId) {
    throw new Error('Den valda aktivitetsgruppen tillhör inte detta hjul.')
  }

  const startYear = new Date(args.startDate).getFullYear()
  const endYear = new Date(args.endDate).getFullYear()

  // Check if all required pages exist
  for (let year = startYear; year <= endYear; year++) {
    const pageExists = pages.find((p: { year: number }) => p.year === year)
    if (!pageExists) {
      console.log(`[createActivity] Creating missing page for year ${year}`)
      
      // CRITICAL: Copy structure from an existing page (rings, groups, labels)
      // Find the closest existing page to copy structure from
      const referencePage = pages[0] // Use first existing page as reference
      const referenceOrgData = referencePage.organization_data || {}
      
      // Copy structure but start with empty items array
      const organizationData = {
        rings: referenceOrgData.rings || [],
        activityGroups: referenceOrgData.activityGroups || referenceOrgData.activities || [],
        labels: referenceOrgData.labels || [],
        items: [] // Start empty, items will be added
      }
      
      console.log(`[createActivity] Copying structure from page ${referencePage.year} to new page ${year}`)
      
      const { data: newPage, error: pageError } = await supabase
        .from('wheel_pages')
        .insert({
          wheel_id: wheelId,
          year: year,
          title: `${year}`,
          organization_data: organizationData
        })
        .select()
        .single()
      
      if (pageError) {
        console.error(`[createActivity] Error creating page for year ${year}:`, pageError)
        throw new Error(`Kunde inte skapa sida för år ${year}. Skapa sidan manuellt först, eller välj ett annat datumintervall.`)
      }
      pages.push(newPage)
      console.log(`[createActivity] Successfully created page for year ${year} with copied structure`)
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

  console.log(`[createActivity ${callId}] Successfully created ${itemsCreated.length} item(s)`)
  console.log(`[createActivity ${callId}] ========== END ==========`)

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

  // Check if ring exists (wheel scoped - migration 015 reverted to wheel scope)
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

  // Auto-calculate ring_order for this wheel
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
    message: `Ring "${args.name}" skapad (typ: ${args.type === 'outer' ? 'yttre (aktiviteter)' : 'inre (text)'}, färg: ${finalColor})`,
    ringId: ring.id,
    ringName: ring.name,
  }
}

async function createGroup(
  supabase: any,
  wheelId: string,
  args: z.infer<typeof CreateGroupInput>
) {
  // Check if group exists (wheel scoped - migration 015 reverted to wheel scope)
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

async function updateRing(
  supabase: any,
  wheelId: string,
  ringName: string,
  updates: { newName?: string; newColor?: string }
) {
  const { data: ring, error: findError } = await supabase
    .from('wheel_rings')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${ringName}%`)
    .maybeSingle()

  if (findError) throw findError
  if (!ring) {
    return {
      success: false,
      message: `Hittade ingen ring med namnet "${ringName}"`
    }
  }

  const updateData: any = {}
  if (updates.newName) updateData.name = updates.newName
  if (updates.newColor) updateData.color = updates.newColor

  const { error: updateError } = await supabase
    .from('wheel_rings')
    .update(updateData)
    .eq('id', ring.id)

  if (updateError) throw updateError

  return {
    success: true,
    message: `Ring "${ringName}" uppdaterad`
  }
}

async function deleteRing(supabase: any, wheelId: string, ringName: string) {
  const { data: ring, error: findError } = await supabase
    .from('wheel_rings')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${ringName}%`)
    .maybeSingle()

  if (findError) throw findError
  if (!ring) {
    return {
      success: false,
      message: `Ingen ring hittades med namnet "${ringName}"`
    }
  }

  // Check if ring has activities
  const { count: itemsCount } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('ring_id', ring.id)

  if (itemsCount && itemsCount > 0) {
    return {
      success: false,
      message: `Ring "${ringName}" har ${itemsCount} aktivitet(er) och kan inte tas bort. Ta bort aktiviteterna först.`
    }
  }

  const { error: deleteError } = await supabase
    .from('wheel_rings')
    .delete()
    .eq('id', ring.id)

  if (deleteError) throw deleteError

  return {
    success: true,
    message: `Ring "${ringName}" har tagits bort`
  }
}

async function updateGroup(
  supabase: any,
  wheelId: string,
  groupName: string,
  updates: { newName?: string; newColor?: string }
) {
  const { data: group, error: findError } = await supabase
    .from('activity_groups')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${groupName}%`)
    .maybeSingle()

  if (findError) throw findError
  if (!group) {
    return {
      success: false,
      message: `Hittade ingen aktivitetsgrupp med namnet "${groupName}"`
    }
  }

  const updateData: any = {}
  if (updates.newName) updateData.name = updates.newName
  if (updates.newColor) updateData.color = updates.newColor

  const { error: updateError } = await supabase
    .from('activity_groups')
    .update(updateData)
    .eq('id', group.id)

  if (updateError) throw updateError

  return {
    success: true,
    message: `Aktivitetsgrupp "${groupName}" uppdaterad`
  }
}

async function deleteGroup(supabase: any, wheelId: string, groupName: string) {
  const { data: group, error: findError } = await supabase
    .from('activity_groups')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${groupName}%`)
    .maybeSingle()

  if (findError) throw findError
  if (!group) {
    return {
      success: false,
      message: `Ingen aktivitetsgrupp hittades med namnet "${groupName}"`
    }
  }

  // Check if group has activities
  const { count: itemsCount } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', group.id)

  if (itemsCount && itemsCount > 0) {
    return {
      success: false,
      message: `Aktivitetsgrupp "${groupName}" har ${itemsCount} aktivitet(er) och kan inte tas bort. Ta bort aktiviteterna först.`
    }
  }

  const { error: deleteError } = await supabase
    .from('activity_groups')
    .delete()
    .eq('id', group.id)

  if (deleteError) throw deleteError

  return {
    success: true,
    message: `Aktivitetsgrupp "${groupName}" har tagits bort`
  }
}

async function createLabel(
  supabase: any,
  wheelId: string,
  args: z.infer<typeof CreateLabelInput>
) {
  // Check if label exists
  const { data: existing } = await supabase
    .from('labels')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', args.name)
    .maybeSingle()

  if (existing) {
    return {
      success: true,
      message: `Label "${args.name}" finns redan`,
      labelId: existing.id,
      labelName: existing.name,
      alreadyExists: true,
    }
  }

  const { data: label, error } = await supabase
    .from('labels')
    .insert({
      wheel_id: wheelId,
      name: args.name,
      color: args.color,
      visible: true,
    })
    .select()
    .single()

  if (error) throw new Error(`Kunde inte skapa label: ${error.message}`)

  return {
    success: true,
    message: `Label "${args.name}" skapad med färg ${args.color}`,
    labelId: label.id,
    labelName: label.name,
  }
}

async function updateLabel(
  supabase: any,
  wheelId: string,
  labelName: string,
  updates: { newName?: string; newColor?: string }
) {
  const { data: label, error: findError } = await supabase
    .from('labels')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${labelName}%`)
    .maybeSingle()

  if (findError) throw findError
  if (!label) {
    return {
      success: false,
      message: `Hittade ingen label med namnet "${labelName}"`
    }
  }

  const updateData: any = {}
  if (updates.newName) updateData.name = updates.newName
  if (updates.newColor) updateData.color = updates.newColor

  const { error: updateError } = await supabase
    .from('labels')
    .update(updateData)
    .eq('id', label.id)

  if (updateError) throw updateError

  return {
    success: true,
    message: `Label "${labelName}" uppdaterad`
  }
}

async function deleteLabel(supabase: any, wheelId: string, labelName: string) {
  const { data: label, error: findError } = await supabase
    .from('labels')
    .select('id, name')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${labelName}%`)
    .maybeSingle()

  if (findError) throw findError
  if (!label) {
    return {
      success: false,
      message: `Ingen label hittades med namnet "${labelName}"`
    }
  }

  // Labels can be deleted even if in use (they're optional)
  const { error: deleteError } = await supabase
    .from('labels')
    .delete()
    .eq('id', label.id)

  if (deleteError) throw deleteError

  return {
    success: true,
    message: `Label "${labelName}" har tagits bort`
  }
}

async function suggestWheelStructure(
  domain: string,
  additionalContext?: string
): Promise<{
  rings: Array<{ name: string; type: 'inner' | 'outer'; color: string; description: string }>;
  activityGroups: Array<{ name: string; color: string; description: string }>;
  sampleActivities: Array<{ name: string; ringName: string; groupName: string; month: number; duration: string }>;
  explanation: string;
}> {
  console.log('[suggestWheelStructure] Generating structure for domain:', domain)
  
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
  
  const systemPrompt = `You are an expert in annual planning and organizational structure design. Your task is to suggest a Year Wheel structure based on the user's domain or use case.

A Year Wheel consists of:
1. **Rings** - Horizontal bands that categorize activities (e.g., "Marketing", "Sales", "HR")
   - "outer" type: For main activity categories (most common)
   - "inner" type: For supporting information or detailed breakdowns
   
2. **Activity Groups** - Color-coded categories that help organize activities within rings (e.g., "Campaign", "Event", "Training")

3. **Activities** - Individual tasks/events placed on specific rings with start/end dates

BEST PRACTICES:
- Use 3-6 rings for clarity (too many = cluttered, too few = not useful)
- Outer rings should represent major functional areas or themes
- Inner rings can be used for subtasks, notes, or supporting information
- Activity groups should be distinct and meaningful color categories
- Colors should be visually distinguishable and professional
- Think about natural workflows and annual cycles
- Consider seasonal patterns and recurring events
- Use descriptive, clear names in Swedish

EXAMPLE DOMAINS & PATTERNS:
- **HR/Personnel**: Rings for Recruitment, Onboarding, Training, Operations → Groups for different HR functions
- **Marketing**: Rings for Digital, Events, Content, Campaigns → Groups for different campaign types or channels
- **Education**: Rings for Terms, Holidays, Projects, Exams → Groups for subjects or grade levels
- **Project Management**: Rings for Planning, Execution, Review, Resources → Groups for project phases or teams
- **Sales**: Rings for Prospecting, Closing, Account Management, Planning → Groups for product lines or regions

COLOR PALETTE (use these professional colors):
- Blues: #408cfb, #60a5fa, #3b82f6, #2563eb
- Greens: #10b981, #34d399, #059669, #047857
- Purples: #8b5cf6, #a78bfa, #7c3aed, #6d28d9
- Oranges: #f59e0b, #fbbf24, #d97706, #b45309
- Reds: #ef4444, #f87171, #dc2626, #b91c1c
- Pinks: #ec4899, #f472b6, #db2777, #be185d
- Teals: #14b8a6, #2dd4bf, #0d9488, #0f766e

RESPONSE FORMAT (JSON):
{
  "rings": [
    {"name": "Ring name in Swedish", "type": "outer", "color": "#hex", "description": "Why this ring"},
    ...
  ],
  "activityGroups": [
    {"name": "Group name in Swedish", "color": "#hex", "description": "Purpose of this group"},
    ...
  ],
  "sampleActivities": [
    {"name": "Activity name", "ringName": "Which ring", "groupName": "Which group", "month": 1-12, "duration": "1 week|2 weeks|1 month|etc"},
    ...
  ],
  "explanation": "A brief explanation in Swedish of the proposed structure and how to use it"
}

Respond ONLY with valid JSON, no other text.`

  const userPrompt = `Suggest a Year Wheel structure for: ${domain}${additionalContext ? `\n\nAdditional context: ${additionalContext}` : ''}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const responseText = completion.choices[0].message.content || '{}'
  console.log('[suggestWheelStructure] OpenAI response:', responseText)
  
  const suggestion = JSON.parse(responseText)
  return suggestion
}

async function updateActivity(
  ctx: RunContext<WheelContext>,
  activityName: string,
  updates: {
    newName?: string
    newStartDate?: string
    newEndDate?: string
    newRingId?: string
    newActivityGroupId?: string
  }
) {
  const { supabase, wheelId } = ctx.context
  console.log('[updateActivity] Searching for EXACT match:', activityName)

  // Find items with EXACT name match across ALL pages in this wheel
  // CRITICAL: Use .eq() for exact match, not .ilike() for partial match
  const { data: items, error: findError } = await supabase
    .from('items')
    .select('*, wheel_pages!inner(wheel_id, year)')
    .eq('wheel_pages.wheel_id', wheelId)
    .eq('name', activityName)

  if (findError) throw findError

  if (!items || items.length === 0) {
    return {
      success: false,
      message: `Hittade ingen aktivitet med exakt namnet "${activityName}"`
    }
  }

  console.log('[updateActivity] Found items:', items.length)

  // If only changing simple properties (name, ring, group) and NOT dates, do in-place update
  if (!updates.newStartDate && !updates.newEndDate) {
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

    let message = `Uppdaterade ${items.length} objekt för "${activityName}"`
    if (updates.newName) message += ` → nytt namn: "${updates.newName}"`

    return {
      success: true,
      itemsUpdated: items.length,
      message
    }
  }

  // DATES ARE CHANGING - Need to recreate across potentially different years
  const firstItem = items[0]
  const oldStartDate = firstItem.start_date
  const oldEndDate = firstItem.end_date
  const newStartDate = updates.newStartDate || oldStartDate
  const newEndDate = updates.newEndDate || oldEndDate
  
  const newStartYear = new Date(newStartDate).getFullYear()
  const newEndYear = new Date(newEndDate).getFullYear()

  // Get all existing rings and activity groups to preserve references
  const finalRingId = updates.newRingId || firstItem.ring_id
  const finalActivityGroupId = updates.newActivityGroupId || firstItem.activity_id
  const finalLabelId = firstItem.label_id
  const finalName = updates.newName || firstItem.name

  // Fetch all pages for this wheel
  const { data: pages, error: pagesError } = await supabase
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('year')

  if (pagesError) throw pagesError

  // Ensure all required pages exist
  const allPages = pages || []
  for (let year = newStartYear; year <= newEndYear; year++) {
    const pageExists = allPages.find((p: { year: number }) => p.year === year)
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
      allPages.push(newPage)
    }
  }

  // Delete old items
  const oldItemIds = items.map((i: any) => i.id)
  const { error: deleteError } = await supabase
    .from('items')
    .delete()
    .in('id', oldItemIds)

  if (deleteError) throw deleteError

  // Create new items across the new date range
  const itemsCreated = []

  if (newStartYear === newEndYear) {
    // Single year activity
    const page = allPages.find((p: { year: number }) => p.year === newStartYear)
    if (!page) throw new Error(`Ingen sida hittades för år ${newStartYear}`)

    const { data: newItem, error: insertError } = await supabase
      .from('items')
      .insert({
        wheel_id: wheelId,
        page_id: page.id,
        ring_id: finalRingId,
        activity_id: finalActivityGroupId,
        label_id: finalLabelId,
        name: finalName,
        start_date: newStartDate,
        end_date: newEndDate,
      })
      .select()
      .single()

    if (insertError) throw insertError
    itemsCreated.push(newItem)
  } else {
    // Cross-year activity - split into segments
    for (let year = newStartYear; year <= newEndYear; year++) {
      const page = allPages.find((p: { year: number }) => p.year === year)
      if (!page) throw new Error(`Ingen sida hittades för år ${year}`)

      const segmentStart = year === newStartYear ? newStartDate : `${year}-01-01`
      const segmentEnd = year === newEndYear ? newEndDate : `${year}-12-31`

      const { data: newItem, error: insertError } = await supabase
        .from('items')
        .insert({
          wheel_id: wheelId,
          page_id: page.id,
          ring_id: finalRingId,
          activity_id: finalActivityGroupId,
          label_id: finalLabelId,
          name: finalName,
          start_date: segmentStart,
          end_date: segmentEnd,
        })
        .select()
        .single()

      if (insertError) throw insertError
      itemsCreated.push(newItem)
    }
  }

  let message = `Uppdaterade "${activityName}" (${oldStartDate} → ${newStartDate} till ${oldEndDate} → ${newEndDate})`
  if (itemsCreated.length > 1) {
    message += ` - nu spänner över ${itemsCreated.length} år`
  }
  if (updates.newName) {
    message += ` - nytt namn: "${updates.newName}"`
  }

  return {
    success: true,
    itemsUpdated: itemsCreated.length,
    message
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

async function createYearPage(
  supabase: any,
  wheelId: string,
  year: number,
  copyStructure: boolean
) {
  // Check if page already exists
  const { data: existing } = await supabase
    .from('wheel_pages')
    .select('id, year')
    .eq('wheel_id', wheelId)
    .eq('year', year)
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      message: `En sida för år ${year} finns redan`,
      pageId: existing.id
    }
  }

  // Get next page order
  const { data: nextOrder, error: orderError } = await supabase
    .rpc('get_next_page_order', { p_wheel_id: wheelId })

  if (orderError) throw orderError

  // Get current rings and groups if copying structure
  let organizationData = {
    rings: [],
    activityGroups: [],
    labels: [],
    items: []
  }

  if (copyStructure) {
    const { rings, groups } = await getCurrentRingsAndGroups(supabase, wheelId)
    const { data: labels } = await supabase
      .from('labels')
      .select('id, name, color')
      .eq('wheel_id', wheelId)

    organizationData = {
      rings: rings.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        color: r.color,
        visible: true,
        orientation: r.type === 'inner' ? 'vertical' : null
      })),
      activityGroups: groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        color: g.color,
        visible: true
      })),
      labels: (labels || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        visible: true
      })),
      items: []
    }
  }

  // Create new page
  const { data: newPage, error: pageError } = await supabase
    .from('wheel_pages')
    .insert({
      wheel_id: wheelId,
      page_order: nextOrder,
      year: year,
      title: `${year}`,
      organization_data: organizationData
    })
    .select()
    .single()

  if (pageError) throw pageError

  return {
    success: true,
    message: `Sida för år ${year} skapad${copyStructure ? ' med struktur kopierad' : ''}`,
    pageId: newPage.id,
    year: year
  }
}

async function smartCopyYear(
  supabase: any,
  wheelId: string,
  sourceYear: number,
  targetYear: number
) {
  // Check if target year already exists
  const { data: existingTarget } = await supabase
    .from('wheel_pages')
    .select('id')
    .eq('wheel_id', wheelId)
    .eq('year', targetYear)
    .maybeSingle()

  if (existingTarget) {
    return {
      success: false,
      message: `En sida för år ${targetYear} finns redan`
    }
  }

  // Get source page
  const { data: sourcePage, error: sourceError } = await supabase
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', wheelId)
    .eq('year', sourceYear)
    .single()

  if (sourceError || !sourcePage) {
    return {
      success: false,
      message: `Hittade ingen sida för år ${sourceYear}`
    }
  }

  // Get source page items
  const { data: sourceItems, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('page_id', sourcePage.id)

  if (itemsError) throw itemsError

  // Create new page with structure
  const createResult = await createYearPage(supabase, wheelId, targetYear, true)
  if (!createResult.success) {
    return createResult
  }

  const newPageId = createResult.pageId
  const yearOffset = targetYear - sourceYear

  // Helper function to adjust dates
  const adjustDate = (dateString: string) => {
    const date = new Date(dateString)
    date.setFullYear(date.getFullYear() + yearOffset)
    return date.toISOString().split('T')[0]
  }

  // Copy all items with adjusted dates
  const itemsToInsert = (sourceItems || []).map((item: any) => ({
    wheel_id: wheelId,
    page_id: newPageId,
    ring_id: item.ring_id,
    activity_id: item.activity_id,
    label_id: item.label_id,
    name: item.name,
    start_date: adjustDate(item.start_date),
    end_date: adjustDate(item.end_date),
    time: item.time
  }))

  if (itemsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('items')
      .insert(itemsToInsert)

    if (insertError) throw insertError
  }

  return {
    success: true,
    message: `Sida för år ${targetYear} skapad med ${itemsToInsert.length} aktivitet(er) kopierade från ${sourceYear}`,
    pageId: newPageId,
    itemsCopied: itemsToInsert.length,
    year: targetYear
  }
}


// ═══════════════════════════════════════════════════════════════════
// AGENT SYSTEM - MULTI-AGENT WITH HANDOFFS
// All tools now receive RunContext<WheelContext> for proper context management
// ═══════════════════════════════════════════════════════════════════

function createAgentSystem() {
  
  // ──────────────────────────────────────────────────────────────────
  // CONTEXT TOOLS (shared across agents)
  // ──────────────────────────────────────────────────────────────────
  
  const getContextTool = tool<WheelContext>({
    name: 'get_current_context',
    description: 'Get current rings, groups, labels, pages (years), and date. Call this when you need fresh IDs or to check which years exist. Returns ONLY visible items from the current page.',
    parameters: z.object({}),
    async execute(_input: {}, ctx: RunContext<WheelContext>) {
      console.log('🔧 [TOOL] get_current_context called')
      const { supabase, wheelId, currentPageId } = ctx.context
      
      // CRITICAL FIX: Fetch current page's organization_data (source of truth for visibility)
      const { data: currentPage, error: pageError } = await supabase
        .from('wheel_pages')
        .select('organization_data, year')
        .eq('id', currentPageId)
        .single()
      
      if (pageError || !currentPage) {
        console.error('[get_current_context] Failed to fetch current page:', pageError)
        throw new Error('Kunde inte hitta aktuell sida')
      }
      
      // Extract organization_data (handles legacy 'activities' → 'activityGroups' rename)
      const orgData = currentPage.organization_data || { 
        rings: [], 
        activityGroups: [], 
        labels: [], 
        items: [] 
      }
      
      // Ensure activityGroups exists (handle legacy 'activities' field)
      const activityGroups = orgData.activityGroups || orgData.activities || []
      
      const dateInfo = getCurrentDate()
      
      // Fetch all pages for this wheel to show which years exist
      const { data: pages, error: pagesError } = await supabase
        .from('wheel_pages')
        .select('id, year, title')
        .eq('wheel_id', wheelId)
        .order('year')
      
      if (pagesError) {
        console.error('[get_current_context] Pages query error:', pagesError)
      }
      
      // Return ONLY visible items from organization_data
      const result = {
        date: dateInfo,
        currentPageId,
        currentYear: currentPage.year,
        rings: (orgData.rings || [])
          .filter((r: any) => r.visible !== false)
          .map((r: any) => ({ 
            id: r.id, 
            name: r.name, 
            type: r.type, 
            color: r.color 
          })),
        groups: activityGroups
          .filter((g: any) => g.visible !== false)
          .map((g: any) => ({ 
            id: g.id, 
            name: g.name, 
            color: g.color 
          })),
        labels: (orgData.labels || [])
          .filter((l: any) => l.visible !== false)
          .map((l: any) => ({
            id: l.id,
            name: l.name,
            color: l.color
          })),
        pages: (pages || []).map((p: any) => ({ 
          id: p.id, 
          year: p.year, 
          title: p.title 
        })),
      }
      console.log('✅ [TOOL] get_current_context result:', JSON.stringify(result, null, 2))
      return JSON.stringify(result)
    }
  })

  // ──────────────────────────────────────────────────────────────────
  // STRUCTURE AGENT - Handles rings and groups
  // ──────────────────────────────────────────────────────────────────
  
  const createRingTool = tool<WheelContext>({
    name: 'create_ring',
    description: 'Create a new ring. Use "inner" type for activity rings (most common), "outer" for text rings.',
    parameters: CreateRingInput,
    async execute(input: z.infer<typeof CreateRingInput>, ctx: RunContext<WheelContext>) {
      console.log('🔧 [TOOL] create_ring called with:', JSON.stringify(input, null, 2))
      const { supabase, wheelId } = ctx.context
      const result = await createRing(supabase, wheelId, input)
      console.log('✅ [TOOL] create_ring result:', JSON.stringify(result, null, 2))
      return JSON.stringify(result)
    }
  })

  const createGroupTool = tool<WheelContext>({
    name: 'create_activity_group',
    description: 'Create a new activity group for organizing activities.',
    parameters: CreateGroupInput,
    async execute(input: z.infer<typeof CreateGroupInput>, ctx: RunContext<WheelContext>) {
      console.log('🔧 [TOOL] create_activity_group called with:', JSON.stringify(input, null, 2))
      const { supabase, wheelId } = ctx.context
      const result = await createGroup(supabase, wheelId, input)
      console.log('✅ [TOOL] create_activity_group result:', JSON.stringify(result, null, 2))
      return JSON.stringify(result)
    }
  })

  // Add update/delete ring tools
  const updateRingTool = tool<WheelContext>({
    name: 'update_ring',
    description: 'Update an existing ring name or color',
    parameters: UpdateRingInput,
    async execute(input: z.infer<typeof UpdateRingInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await updateRing(supabase, wheelId, input.ringName, {
        newName: input.newName || undefined,
        newColor: input.newColor || undefined,
      })
      return JSON.stringify(result)
    }
  })

  const deleteRingTool = tool<WheelContext>({
    name: 'delete_ring',
    description: 'Delete a ring by name. Will fail if ring has activities.',
    parameters: DeleteRingInput,
    async execute(input: z.infer<typeof DeleteRingInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await deleteRing(supabase, wheelId, input.name)
      return JSON.stringify(result)
    }
  })

  const updateGroupTool = tool<WheelContext>({
    name: 'update_activity_group',
    description: 'Update an existing activity group name or color',
    parameters: UpdateGroupInput,
    async execute(input: z.infer<typeof UpdateGroupInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await updateGroup(supabase, wheelId, input.groupName, {
        newName: input.newName || undefined,
        newColor: input.newColor || undefined,
      })
      return JSON.stringify(result)
    }
  })

  const deleteGroupTool = tool<WheelContext>({
    name: 'delete_activity_group',
    description: 'Delete an activity group by name. Will fail if group has activities.',
    parameters: DeleteGroupInput,
    async execute(input: z.infer<typeof DeleteGroupInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await deleteGroup(supabase, wheelId, input.name)
      return JSON.stringify(result)
    }
  })

  const createLabelTool = tool<WheelContext>({
    name: 'create_label',
    description: 'Create a new label for categorizing activities',
    parameters: CreateLabelInput,
    async execute(input: z.infer<typeof CreateLabelInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await createLabel(supabase, wheelId, input)
      return JSON.stringify(result)
    }
  })

  const updateLabelTool = tool<WheelContext>({
    name: 'update_label',
    description: 'Update an existing label name or color',
    parameters: UpdateLabelInput,
    async execute(input: z.infer<typeof UpdateLabelInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await updateLabel(supabase, wheelId, input.labelName, {
        newName: input.newName || undefined,
        newColor: input.newColor || undefined,
      })
      return JSON.stringify(result)
    }
  })

  const deleteLabelTool = tool<WheelContext>({
    name: 'delete_label',
    description: 'Delete a label by name. Can be deleted even if in use.',
    parameters: DeleteLabelInput,
    async execute(input: z.infer<typeof DeleteLabelInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await deleteLabel(supabase, wheelId, input.name)
      return JSON.stringify(result)
    }
  })

  const toggleRingVisibilityTool = tool<WheelContext>({
    name: 'toggle_ring_visibility',
    description: 'Show or hide a ring without deleting it. Updates visibility in the current page\'s organization_data.',
    parameters: z.object({
      ringName: z.string().describe('Name or partial name of the ring to toggle'),
      visible: z.boolean().describe('true to show the ring, false to hide it'),
    }),
    async execute(input: { ringName: string; visible: boolean }, ctx: RunContext<WheelContext>) {
      const { supabase, currentPageId } = ctx.context
      console.log('🔧 [TOOL] toggle_ring_visibility called:', input)
      
      // Get current page's organization_data
      const { data: page, error: pageError } = await supabase
        .from('wheel_pages')
        .select('organization_data')
        .eq('id', currentPageId)
        .single()
      
      if (pageError || !page) {
        throw new Error('Kunde inte hitta sida')
      }
      
      const orgData = page.organization_data || { rings: [], activityGroups: [], labels: [], items: [] }
      
      // Find matching ring (case-insensitive partial match)
      const ringNameLower = input.ringName.toLowerCase()
      let matchCount = 0
      const updatedRings = (orgData.rings || []).map((r: any) => {
        if (r.name.toLowerCase().includes(ringNameLower)) {
          matchCount++
          return { ...r, visible: input.visible }
        }
        return r
      })
      
      if (matchCount === 0) {
        return JSON.stringify({
          success: false,
          message: `Ingen ring hittades med namnet "${input.ringName}"`
        })
      }
      
      // Update page's organization_data
      const { error: updateError } = await supabase
        .from('wheel_pages')
        .update({ 
          organization_data: { ...orgData, rings: updatedRings },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPageId)
      
      if (updateError) {
        console.error('[toggle_ring_visibility] Update error:', updateError)
        throw new Error(`Kunde inte uppdatera ring: ${updateError.message}`)
      }
      
      const result = {
        success: true,
        ringsUpdated: matchCount,
        message: `${matchCount} ring(ar) med namnet "${input.ringName}" är nu ${input.visible ? 'synlig(a)' : 'dold(a)'}`
      }
      
      console.log('✅ [TOOL] toggle_ring_visibility result:', result)
      return JSON.stringify(result)
    }
  })

  const toggleGroupVisibilityTool = tool<WheelContext>({
    name: 'toggle_group_visibility',
    description: 'Show or hide an activity group without deleting it. Updates visibility in the current page\'s organization_data.',
    parameters: z.object({
      groupName: z.string().describe('Name or partial name of the activity group to toggle'),
      visible: z.boolean().describe('true to show the group, false to hide it'),
    }),
    async execute(input: { groupName: string; visible: boolean }, ctx: RunContext<WheelContext>) {
      const { supabase, currentPageId } = ctx.context
      console.log('🔧 [TOOL] toggle_group_visibility called:', input)
      
      // Get current page's organization_data
      const { data: page, error: pageError } = await supabase
        .from('wheel_pages')
        .select('organization_data')
        .eq('id', currentPageId)
        .single()
      
      if (pageError || !page) {
        throw new Error('Kunde inte hitta sida')
      }
      
      const orgData = page.organization_data || { rings: [], activityGroups: [], labels: [], items: [] }
      const activityGroups = orgData.activityGroups || orgData.activities || []
      
      // Find matching group (case-insensitive partial match)
      const groupNameLower = input.groupName.toLowerCase()
      let matchCount = 0
      const updatedGroups = activityGroups.map((g: any) => {
        if (g.name.toLowerCase().includes(groupNameLower)) {
          matchCount++
          return { ...g, visible: input.visible }
        }
        return g
      })
      
      if (matchCount === 0) {
        return JSON.stringify({
          success: false,
          message: `Ingen aktivitetsgrupp hittades med namnet "${input.groupName}"`
        })
      }
      
      // Update page's organization_data (use activityGroups, not activities)
      const { error: updateError } = await supabase
        .from('wheel_pages')
        .update({ 
          organization_data: { ...orgData, activityGroups: updatedGroups },
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPageId)
      
      if (updateError) {
        console.error('[toggle_group_visibility] Update error:', updateError)
        throw new Error(`Kunde inte uppdatera aktivitetsgrupp: ${updateError.message}`)
      }
      
      const result = {
        success: true,
        groupsUpdated: matchCount,
        message: `${matchCount} aktivitetsgrupp(er) med namnet "${input.groupName}" är nu ${input.visible ? 'synlig(a)' : 'dold(a)'}`
      }
      
      console.log('✅ [TOOL] toggle_group_visibility result:', result)
      return JSON.stringify(result)
    }
  })

  const createYearPageTool = tool<WheelContext>({
    name: 'create_year_page',
    description: 'Create a new year page. Can copy structure (rings, groups, labels) from current pages or start blank.',
    parameters: CreateYearPageInput,
    async execute(input: z.infer<typeof CreateYearPageInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await createYearPage(supabase, wheelId, input.year, input.copyStructure)
      return JSON.stringify(result)
    }
  })

  const smartCopyYearTool = tool<WheelContext>({
    name: 'smart_copy_year',
    description: 'Create a new year page and copy ALL activities from a source year with dates automatically adjusted to the new year.',
    parameters: SmartCopyYearInput,
    async execute(input: z.infer<typeof SmartCopyYearInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await smartCopyYear(supabase, wheelId, input.sourceYear, input.targetYear)
      return JSON.stringify(result)
    }
  })

  const suggestStructureTool = tool<WheelContext>({
    name: 'suggest_wheel_structure',
    description: 'AI-powered tool that suggests a complete Year Wheel structure (rings, activity groups, sample activities) based on a domain or use case. Use this when user wants ideas or a starting point.',
    parameters: SuggestStructureInput,
    async execute(input: z.infer<typeof SuggestStructureInput>, _ctx: RunContext<WheelContext>) {
      console.log('[TOOL] suggest_wheel_structure called with:', JSON.stringify(input, null, 2))
      const suggestion = await suggestWheelStructure(input.domain, input.additionalContext)
      console.log('[TOOL] suggest_wheel_structure result:', JSON.stringify(suggestion, null, 2))
      return JSON.stringify(suggestion)
    }
  })

  const structureAgent = new Agent<WheelContext>({
    name: 'Structure Agent',
    model: 'gpt-4o',
    instructions: `You are the Structure Agent. Your job is to manage the structure of the Year Wheel (rings, activity groups, and labels).

CRITICAL RULES:
- NEVER use emojis in responses (no ✅ 🔵 🎨 etc.)
- Keep responses concise and professional
- Always respond in well formmatted markdown

RESPONSIBILITIES:
- Create, update, and delete rings (outer type for activities, inner for text/labels)
- Create, update, and delete activity groups (categories for organizing activities)
- Create, update, and delete labels (optional tags for activities)
- Create new year pages (blank or with structure copied)
- Smart copy years (copy all activities with adjusted dates)
- **SUGGEST complete wheel structures** using AI for any domain/use case

STRUCTURE SUGGESTIONS (NEW):
When user asks for structure ideas, suggestions, or setup for a specific domain:
1. Call suggest_wheel_structure with the domain/purpose
2. Present the suggested structure clearly with:
   - Rings (what they represent)
   - Activity groups (categories)
   - Sample activities (examples to get started)
3. Ask if they want to CREATE this structure
4. If yes, execute the creates in sequence (rings → groups → sample activities)

EXAMPLES:
- "Föreslå struktur för marknadsföring" → suggest_wheel_structure("marknadsföring")
- "Jag behöver ett årshjul för HR-planering" → suggest_wheel_structure("HR-planering")
- "Hur skulle ett skolårshjul kunna se ut?" → suggest_wheel_structure("skolår")

YEAR PAGE MANAGEMENT:
- "Skapa år 2026" → create_year_page with copyStructure: true (copies rings/groups from current pages)
- "Skapa tom sida för 2027" → create_year_page with copyStructure: false  
- "Kopiera 2025 till 2026" → smart_copy_year (copies ALL activities with dates adjusted)
- Smart copy automatically adjusts all dates: if activity was Jan 15 2025, it becomes Jan 15 2026

WORKFLOW:
1. When user requests structure operations, execute them immediately
2. Return the IDs and names of created/updated items
3. For structure suggestions: suggest → present → ask → create if confirmed

STRUCTURE SUGGESTION WORKFLOW:
User: "Föreslå struktur för marknadsföring"
Step 1: Call suggest_wheel_structure with domain: "marknadsföring"
Step 2: Present the result clearly:
  "### Förslag för marknadsföringsårshjul
  
  **Ringar:**
  - [Ring names and descriptions]
  
  **Aktivitetsgrupper:**
  - [Group names and descriptions]
  
  **Exempelaktiviteter:**
  - [Sample activities]
  
  [Explanation from AI]
  
  Vill du att jag skapar denna struktur?"
Step 3: Wait for confirmation
Step 4: If user says yes → Create rings (get IDs) → Create groups (using ring IDs) → Done
Step 5: Tell user they can now ask Activity Agent to add activities based on the samples

IMPORTANT: After creating suggested structure, the rings and groups are ready. User can then ask Activity Agent to create activities.

CRUD OPERATIONS:
- "Skapa ring X" → create_ring
- "Ändra ring X till Y" → update_ring
- "Ta bort ring X" → delete_ring (will fail if has activities)
- Same pattern for groups and labels

EXAMPLES:
- "Skapa ring Kampanjer" → Create outer ring "Kampanjer" with blue
- "Föreslå struktur för marknadsföring" → suggest_wheel_structure → present → ask
- "Byt namn på ringen Kampanjer till Marketing" → update_ring
- "Ta bort gruppen REA" → delete_activity_group
- "Skapa år 2026" → create_year_page with year: 2026, copyStructure: true
- "Kopiera alla aktiviteter från 2025 till 2026" → smart_copy_year with sourceYear: 2025, targetYear: 2026

VISIBILITY MANAGEMENT (NEW):
- "Dölj ringen Kampanjer" → toggle_ring_visibility with visible: false
- "Visa ringen Marketing igen" → toggle_ring_visibility with visible: true
- "Göm aktivitetsgruppen REA" → toggle_group_visibility with visible: false
- Hidden rings/groups are not deleted - they're just not visible on the wheel
- Use this when user wants to temporarily hide something without losing data`,
    tools: [
      getContextTool, 
      createRingTool, 
      updateRingTool, 
      deleteRingTool,
      toggleRingVisibilityTool,
      createGroupTool,
      updateGroupTool,
      deleteGroupTool,
      toggleGroupVisibilityTool,
      createLabelTool,
      updateLabelTool,
      deleteLabelTool,
      createYearPageTool,
      smartCopyYearTool,
      suggestStructureTool
    ],
  })

  // ──────────────────────────────────────────────────────────────────
  // ACTIVITY AGENT - Handles creating/managing activities
  // ──────────────────────────────────────────────────────────────────

  const createActivityTool = tool<WheelContext>({
    name: 'create_activity',
    description: 'Create an activity/event. Can span multiple years. Requires ring ID and activity group ID.',
    parameters: CreateActivityInput,
    async execute(input: z.infer<typeof CreateActivityInput>, ctx: RunContext<WheelContext>) {
      console.log('🔧 [TOOL] create_activity called with:', JSON.stringify(input, null, 2))
      const result = await createActivity(ctx, input)
      console.log('✅ [TOOL] create_activity result:', JSON.stringify(result, null, 2))
      return JSON.stringify(result)
    }
  })

  const batchCreateActivitiesTool = tool<WheelContext>({
    name: 'batch_create_activities',
    description: 'Create multiple activities in one operation for faster bulk creation. Use this for use cases like "create 12 monthly campaigns" or "add quarterly reviews".',
    parameters: z.object({
      activities: z.array(z.object({
        name: z.string().describe('Activity name'),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
        ringId: z.string().uuid().describe('Ring UUID'),
        activityGroupId: z.string().uuid().describe('Activity group UUID'),
        labelId: z.string().uuid().nullable().describe('Optional label UUID (set to null if not needed)'),
        description: z.string().nullable().describe('Optional description (set to null if not needed)'),
      })).min(1).max(50).describe('Array of activities to create (max 50)')
    }),
    async execute(input: { activities: any[] }, ctx: RunContext<WheelContext>) {
      console.log('🔧 [TOOL] batch_create_activities called with:', input.activities.length, 'activities')
      
      const results: Array<{ index: number; name: string; itemsCreated: number }> = []
      const errors: Array<{ index: number; name: string; error: string }> = []
      
      // Create activities in parallel for speed
      const promises = input.activities.map(async (activity: any, index: number) => {
        try {
          const result = await createActivity(ctx, {
            name: activity.name,
            startDate: activity.startDate,
            endDate: activity.endDate,
            ringId: activity.ringId,
            activityGroupId: activity.activityGroupId,
            labelId: activity.labelId || null,
          })
          
          if (result.success) {
            results.push({
              index,
              name: activity.name,
              itemsCreated: result.itemsCreated || 1
            })
          }
          return result
        } catch (error) {
          console.error('[batch_create_activities] Error creating activity:', activity.name, error)
          errors.push({
            index,
            name: activity.name,
            error: (error as Error).message
          })
          return null
        }
      })
      
      await Promise.all(promises)
      
      const totalCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0)
      
      const summary = {
        success: true,
        created: totalCreated,
        requested: input.activities.length,
        successfulActivities: results.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Skapade ${totalCreated} aktivitet(er) från ${input.activities.length} förfrågningar${errors.length > 0 ? ` (${errors.length} fel)` : ''}`
      }
      
      console.log('✅ [TOOL] batch_create_activities result:', summary)
      return JSON.stringify(summary)
    }
  })

  const queryActivitiesTool = tool<WheelContext>({
    name: 'query_activities',
    description: 'Search and filter activities across ALL years/pages in the wheel by name, date range, ring, or group. Use this to find specific activities like "all activities named Månadsbrev" or "activities containing REA".',
    parameters: z.object({
      nameContains: z.string().nullable().describe('Filter by activity name (partial match, case-insensitive, null to skip)'),
      ringName: z.string().nullable().describe('Filter by ring name (partial match, null to skip)'),
      groupName: z.string().nullable().describe('Filter by activity group name (partial match, null to skip)'),
      startAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().describe('Filter: activities starting on or after this date (null to skip)'),
      endBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().describe('Filter: activities ending on or before this date (null to skip)'),
      quarter: z.number().min(1).max(4).nullable().describe('Filter by quarter 1-4 (null to skip)'),
    }),
    async execute(input: any, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId, currentPageId } = ctx.context
      console.log('🔧 [TOOL] query_activities called with filters:', input)
      
      // Build base query with joins - search ENTIRE wheel, not just current page
      let query = supabase
        .from('items')
        .select('*, wheel_rings!inner(name, type), activity_groups!inner(name, color), wheel_pages!inner(year)')
        .eq('wheel_id', wheelId)
      
      // Apply date filters
      if (input.startAfter) {
        query = query.gte('start_date', input.startAfter)
      }
      if (input.endBefore) {
        query = query.lte('end_date', input.endBefore)
      }
      
      // Apply quarter filter (convert to date range)
      if (input.quarter) {
        const { data: pageData } = await supabase
          .from('wheel_pages')
          .select('year')
          .eq('id', currentPageId)
          .single()
        
        if (pageData) {
          const year = pageData.year
          const quarterStarts = [
            `${year}-01-01`, // Q1
            `${year}-04-01`, // Q2
            `${year}-07-01`, // Q3
            `${year}-10-01`, // Q4
          ]
          const quarterEnds = [
            `${year}-03-31`,
            `${year}-06-30`,
            `${year}-09-30`,
            `${year}-12-31`,
          ]
          
          const qStart = quarterStarts[input.quarter - 1]
          const qEnd = quarterEnds[input.quarter - 1]
          
          // Activity overlaps with quarter if it starts before quarter ends AND ends after quarter starts
          query = query.lte('start_date', qEnd).gte('end_date', qStart)
        }
      }
      
      const { data: items, error } = await query.order('start_date')
      
      if (error) {
        console.error('[query_activities] Query error:', error)
        throw new Error(`Kunde inte söka aktiviteter: ${error.message}`)
      }
      
      // Post-filter by name, ring, and group (case-insensitive partial match)
      let filtered = items || []
      
      if (input.nameContains) {
        const nameLower = input.nameContains.toLowerCase()
        filtered = filtered.filter((i: any) => 
          i.name.toLowerCase().includes(nameLower)
        )
      }
      
      if (input.ringName) {
        const ringLower = input.ringName.toLowerCase()
        filtered = filtered.filter((i: any) => 
          i.wheel_rings?.name.toLowerCase().includes(ringLower)
        )
      }
      
      if (input.groupName) {
        const groupLower = input.groupName.toLowerCase()
        filtered = filtered.filter((i: any) => 
          i.activity_groups?.name.toLowerCase().includes(groupLower)
        )
      }
      
      const result = {
        success: true,
        count: filtered.length,
        filters: input,
        activities: filtered.map((i: any) => ({
          id: i.id,
          name: i.name,
          startDate: i.start_date,
          endDate: i.end_date,
          ring: i.wheel_rings?.name || 'Unknown',
          group: i.activity_groups?.name || 'Unknown',
          description: i.description,
        }))
      }
      
      console.log('✅ [TOOL] query_activities found:', result.count, 'activities')
      return JSON.stringify(result)
    }
  })

  const updateActivityTool = tool<WheelContext>({
    name: 'update_activity',
    description: 'Update an existing activity. Can change dates, name, ring, or activity group. Supports moving activities across years and multi-year spans.',
    parameters: UpdateActivityInput,
    async execute(input: z.infer<typeof UpdateActivityInput>, ctx: RunContext<WheelContext>) {
      console.log('[updateActivityTool] Input received:', JSON.stringify(input, null, 2));
      
      // Only include properties that are actually provided (not null, undefined, or empty string)
      const updates: any = {};
      // IMPORTANT: Only update name if explicitly provided and not null/empty
      if (input.newName !== null && input.newName !== undefined && input.newName.trim()) {
        updates.newName = input.newName.trim();
      }
      if (input.newStartDate) updates.newStartDate = input.newStartDate;
      if (input.newEndDate) updates.newEndDate = input.newEndDate;
      if (input.newRingId) updates.newRingId = input.newRingId;
      if (input.newActivityGroupId) updates.newActivityGroupId = input.newActivityGroupId;
      
      console.log('[updateActivityTool] Updates to apply:', JSON.stringify(updates, null, 2));
      
      const result = await updateActivity(ctx, input.activityName, updates);
      return JSON.stringify(result)
    }
  })

  const deleteActivityTool = tool<WheelContext>({
    name: 'delete_activity',
    description: 'Delete an activity by name. Searches for activities matching the name.',
    parameters: DeleteActivityInput,
    async execute(input: z.infer<typeof DeleteActivityInput>, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const result = await deleteActivity(supabase, wheelId, input.name)
      return JSON.stringify(result)
    }
  })

  const listActivitiesTool = tool<WheelContext>({
    name: 'list_activities',
    description: 'List all activities for the entire wheel (all years/pages)',
    parameters: z.object({}),
    async execute(_input: {}, ctx: RunContext<WheelContext>) {
      const { supabase, wheelId } = ctx.context
      const { data: items, error } = await supabase
        .from('items')
        .select('name, start_date, end_date, wheel_pages!inner(year)')
        .eq('wheel_id', wheelId)
        .order('start_date')

      if (error) throw error
      if (!items || items.length === 0) {
        return 'Inga aktiviteter hittades i detta hjul'
      }

      return JSON.stringify(items)
    }
  })

  const activityAgent = new Agent<WheelContext>({
    name: 'Activity Agent',
    model: 'gpt-4o',
    instructions: `You are the Activity Agent. Your job is to CREATE, UPDATE, and DELETE activities when asked.

⚠️ ANTI-HALLUCINATION PROTOCOL (MANDATORY):
1. You MUST call create_activity, update_activity, or delete_activity tool BEFORE responding
2. You MUST check if the tool result contains success:true
3. You MUST ONLY say "Klart!" if success:true in tool result
4. If tool returns success:false or throws error, you MUST explain the error to the user
5. NEVER generate a response without first seeing a successful tool result
6. If you respond without calling a tool, YOU ARE HALLUCINATING - DON'T DO IT!

CRITICAL RULES:
- DO NOT JUST SAY YOU DID IT - ACTUALLY CALL THE TOOLS!
- NEVER CLAIM SUCCESS WITHOUT SEEING {success: true} IN TOOL RESULT
- ABSOLUTELY NO EMOJIS EVER (no ✅ 📌 📅 🎯 💡 🔧 📊 etc.)
- Use proper markdown formatting (### for headers, - for lists, **bold**)
- Handle MULTI-STEP requests by executing ALL steps in sequence

MULTI-STEP WORKFLOW:
If user requests multiple actions (e.g., "1. Lägg till X, 2. Omstrukturera Y, 3. Inför Z"):
1. Execute EACH step in order
2. Call create_activity/update_activity/delete_activity for EACH action
3. Report back with ALL results
4. Example: "Klart! Jag har gjort: 1. Skapat X 2. Flyttat Y 3. Lagt till Z"

SINGLE-STEP WORKFLOW:
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
You respond: "**Klart!** Jag har skapat aktiviteten:\n\n**Kampanj**\nNovember 2025 (2025-11-01 till 2025-11-30)\nRing: Kampanjer\nGrupp: Kampanj"

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
- If tool call fails, explain the error in friendly Swedish and suggest solutions
- If page doesn't exist for a year, explain that pages are auto-created but there might be structural issues

UPDATE/MOVE/CHANGE ACTIVITIES:
When user says "flytta", "ändra", "uppdatera", "byt", "move", "change":
✅ update_activity now FULLY SUPPORTS all date changes including:
- Moving activities to different months (same year)
- Moving activities to different years (cross-year)
- Extending activities to span multiple years
- All updates are seamless - old items are replaced with new segments

Examples:
✅ "Flytta Google kampanj till augusti" (same year)
  → Call update_activity with {activityName: "Google", newStartDate: "2025-08-01", newEndDate: "2025-08-31"}

✅ "Flytta Google till 2026" (cross-year move)
  → Call update_activity with {activityName: "Google", newStartDate: "2026-01-01", newEndDate: "2026-12-31"}

✅ "Gör så att kampanjen varar från november 2025 till mars 2026" (multi-year span)
  → Call update_activity with {activityName: "kampanj", newStartDate: "2025-11-01", newEndDate: "2026-03-31"}

✅ "Byt namn på Oktoberfest till Höstfest"
  → Call update_activity with {activityName: "Oktoberfest", newName: "Höstfest"}

✅ "Flytta kampanj till ringen Marknadsföring"
  → First get_current_context to get ring ID, then update_activity with {activityName: "kampanj", newRingId: "..."}

AUTOMATIC PAGE CREATION:
- If moving activity to a year that doesn't have a page yet, the system auto-creates it
- If extending activity to span years, all required pages are auto-created
- User never needs to worry about page management

BATCH UPDATE WORKFLOW (CRITICAL):
When user says "ändra alla X", "uppdatera alla Y till Z", "gör alla förekomster av A till B":
1. Call query_activities to find all matching activities (searches ALL years automatically!)
   - Example: "ändra alla Månadsbrev till 1 dag" → query_activities with nameContains: "Månadsbrev"
   - This finds activities across ALL pages/years in the wheel
   - Query returns EXACT name for each activity
2. For EACH activity found, call update_activity with its EXACT FULL NAME from query result
   - CRITICAL: Use the exact "name" field from query result, NOT the search term!
   - Example: If query returns name: "Månadsbrev Januari", use "Månadsbrev Januari" in update_activity
   - Example: If 12 activities found → call update_activity 12 times with 12 different exact names
3. Report results: "Uppdaterade 12 aktiviteter: [list names and years]"

BATCH UPDATE EXAMPLE:
User: "Ändra alla förekomster av Månadsbrev till att vara 1 dag långa"
Step 1: query_activities({nameContains: "Månadsbrev"}) → Returns 12 activities
  Example result: [{name: "Månadsbrev Januari", startDate: "2026-01-15", endDate: "2026-01-31"}, ...]
Step 2: For EACH activity, use its EXACT FULL NAME from query result:
  - Activity 1: update_activity({activityName: "Månadsbrev Januari", newStartDate: "2026-01-15", newEndDate: "2026-01-15"})
  - Activity 2: update_activity({activityName: "Månadsbrev Februari", newStartDate: "2026-02-15", newEndDate: "2026-02-15"})
  - ... (repeat for all 12, using EXACT name from query result for each!)
Step 3: Report: "Klart! Jag har uppdaterat alla 12 Månadsbrev-aktiviteter till att vara 1 dag långa."

CRITICAL FOR BATCH UPDATES:
- query_activities returns the EXACT name field for each activity
- You MUST use that EXACT name when calling update_activity
- Do NOT use partial names or search terms
- Example: If query returns name: "Månadsbrev Januari", use "Månadsbrev Januari" (not "Månadsbrev")

IMPORTANT FOR BATCH UPDATES:
- query_activities automatically searches ALL years/pages - you don't need to specify
- ALWAYS query first to find activities
- Use the EXACT "name" field from each query result when calling update_activity
- update_activity requires EXACT name match (not partial match!)
- If you use partial name, it will update ALL matching activities to same value (BUG!)
- Update each one individually (no batch update tool exists yet)
- Keep original start dates, just adjust end dates for duration changes
- Report total count, years covered, and success/failures

DELETE ACTIVITIES:
When user says "ta bort", "radera", "delete":
1. Call delete_activity with the activity name
Example: User says "Ta bort Oktoberfest"
→ Call delete_activity with {name: "Oktoberfest"}

BULK OPERATIONS (NEW - VERY EFFICIENT):
When user asks to create MULTIPLE similar activities, use batch_create_activities:
- "Skapa 12 månadskampanjer" → Build array of 12 activities, call batch_create_activities
- "Lägg till kvartalsrapporter" → Build array of 4 activities, call batch_create_activities
- MUCH faster than calling create_activity 12 times!
- First get_current_context to get ring/group IDs, then build activities array

SEARCH/FILTER ACTIVITIES (NEW):
When user wants to FIND or FILTER activities, use query_activities:
- SEARCHES ACROSS ALL YEARS/PAGES IN THE WHEEL (not just current page!)
- "Visa alla kampanjer i Q4" → query_activities with quarter: 4
- "Hitta aktiviteter med 'REA'" → query_activities with nameContains: "REA"
- "Vilka aktiviteter är i ringen Marketing?" → query_activities with ringName: "Marketing"
- "Visa aktiviteter mellan mars och maj" → query_activities with startAfter/endBefore
- Returns filtered list with all activity details including year

WORKFLOW EXAMPLE (Bulk):
User: "Skapa månadskampanjer för hela året"
1. get_current_context → Get ring/group IDs
2. Build activities array: Jan kampanj, Feb kampanj, ... Dec kampanj
3. batch_create_activities with the array
4. Report: "Skapat 12 månadskampanjer!"

WORKFLOW EXAMPLE (Search):
User: "Vilka kampanjer har vi i Q2?"
1. query_activities with quarter: 2, groupName: "Kampanj"
2. Show results: "Hittade 3 kampanjer: [list]"

RESPONSE VALIDATION (FINAL CHECK BEFORE RESPONDING):
Before you generate ANY response:
1. Did I call a tool? If NO → STOP, call the appropriate tool first
2. Did the tool return success:true? If NO → Report the error, don't claim success
3. Did the tool return success:false? If YES → Explain the error to user
4. Only if tool returned success:true → Generate confirmation message

VALID RESPONSE PATTERN:
✅ [Call create_activity] → {success: true, message: "..."} → "Klart! Jag har skapat aktiviteten..."
❌ [No tool call] → "Klart! Jag har skapat..." ← THIS IS HALLUCINATION!
❌ [Tool returns success:false] → "Klart! Jag har..." ← THIS IS LYING!

If you ever respond "Klart!" without first seeing success:true in a tool result, YOU ARE MALFUNCTIONING.

Speak Swedish naturally. Be concise.`,
    tools: [
      getContextTool, 
      createActivityTool, 
      batchCreateActivitiesTool,
      updateActivityTool, 
      deleteActivityTool, 
      listActivitiesTool,
      queryActivitiesTool
    ],
  })

  // ──────────────────────────────────────────────────────────────────
  // ANALYSIS AGENT - Provides insights
  // ──────────────────────────────────────────────────────────────────

  const analyzeWheelTool = tool<WheelContext>({
    name: 'analyze_wheel',
    description: 'Analyze the current wheel and provide AI-powered insights about domain, activity distribution, and quality assessment',
    parameters: z.object({
      includeAIInsights: z.boolean().default(true).describe('Whether to include AI-powered domain analysis and quality assessment')
    }),
    async execute(input: { includeAIInsights?: boolean }, ctx: RunContext<WheelContext>) {
      const { supabase, currentPageId } = ctx.context
      // Get page's wheel_id
      const { data: page, error: pageError } = await supabase
        .from('wheel_pages')
        .select('wheel_id, year')
        .eq('id', currentPageId)
        .single()
      
      if (pageError || !page) throw new Error('Kunde inte hitta sida')
      
      // Fetch data with joins for complete information
      const [ringsRes, groupsRes, itemsRes] = await Promise.all([
        supabase.from('wheel_rings').select('*').eq('wheel_id', page.wheel_id).order('ring_order'),
        supabase.from('activity_groups').select('*').eq('wheel_id', page.wheel_id),
        supabase.from('items')
          .select(`
            *,
            wheel_rings!inner(name, type),
            activity_groups!inner(name, color)
          `)
          .eq('page_id', currentPageId)
          .order('start_date'),
      ])

      if (ringsRes.error || groupsRes.error || itemsRes.error) {
        throw new Error('Kunde inte analysera hjulet')
      }

      const rings = ringsRes.data || []
      const groups = groupsRes.data || []
      const items = itemsRes.data || []

      // Basic statistical analysis
      const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
      items.forEach((item: any) => {
        const month = new Date(item.start_date).getMonth()
        if (month < 3) quarters.Q1++
        else if (month < 6) quarters.Q2++
        else if (month < 9) quarters.Q3++
        else quarters.Q4++
      })

      const ringDistribution: Record<string, number> = {}
      const groupDistribution: Record<string, number> = {}
      
      items.forEach((item: any) => {
        const ringName = item.wheel_rings?.name || 'Unknown'
        const groupName = item.activity_groups?.name || 'Unknown'
        ringDistribution[ringName] = (ringDistribution[ringName] || 0) + 1
        groupDistribution[groupName] = (groupDistribution[groupName] || 0) + 1
      })

      const basicStats = {
        year: page.year,
        rings: rings.length,
        groups: groups.length,
        activities: items.length,
        quarters,
        ringDistribution,
        groupDistribution,
      }

      // AI-powered domain analysis and quality assessment
      if (input.includeAIInsights && items.length > 0) {
        try {
          const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY'),
          })

          // Prepare activity summary for AI analysis
          const activitySummary = items.map((item: any) => ({
            name: item.name,
            group: item.activity_groups?.name || 'Unknown',
            ring: item.wheel_rings?.name || 'Unknown',
            duration: `${item.start_date} till ${item.end_date}`,
            startMonth: new Date(item.start_date).toLocaleString('sv-SE', { month: 'long' }),
            endMonth: new Date(item.end_date).toLocaleString('sv-SE', { month: 'long' })
          }))

          const analysisPrompt = `Analysera denna Year Wheel planeringsdata:

**AKTIVITETER (${items.length} st):**
${JSON.stringify(activitySummary, null, 2)}

**FÖRDELNING PER KVARTAL:**
${JSON.stringify(quarters, null, 2)}

**GRUPPFÖRDELNING:**
${JSON.stringify(groupDistribution, null, 2)}

**RINGFÖRDELNING:**
${JSON.stringify(ringDistribution, null, 2)}

Ge en strukturerad analys med:

1. **DOMÄNIDENTIFIERING**: 
   - Vilket huvudsakligt område/domän representerar detta hjul? (t.ex. "Produktlansering", "Marknadsföringsstrategi", "Personlig utveckling", "Utbildningsplanering")
   - Vilka teman syns i aktiviteterna?

2. **KVALITETSBEDÖMNING**:
   - Är aktiviteterna lämpliga för denna domän?
   - Är de tillräckligt specifika eller för vaga?
   - Saknas kritiska aktiviteter som borde finnas?
   - Är tidsplaneringen realistisk för varje aktivitet?
   - Finns det beroenden som borde beaktas?

3. **BÄSTA PRAXIS**:
   - Vad kännetecknar god planering inom denna domän?
   - Specifika förbättringar för svaga aktiviteter
   - Luckor i nuvarande planering
   - Rekommenderade faser eller milstolpar som saknas

4. **REKOMMENDATIONER** (topp 3):
   - Konkreta, handlingsbara förbättringar
   - Aktiviteter att lägga till, ta bort eller omstrukturera
   - Tidsplaneringsförbättringar

Var konkret och åsiktsstark. Använd domänexpertis. Svara på svenska.`

          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Du är en expert på planering och projektledning som utvärderar planeringskvalitet inom olika domäner som affärsverksamhet, personlig utveckling, utbildning, marknadsföring och mer. Du ger konkreta, åsiktsstarka råd baserade på bästa praxis.'
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1500
          })

          const aiInsights = response.choices[0].message.content

          return JSON.stringify({
            success: true,
            basicStats,
            aiInsights,
            message: 'Analys klar med AI-drivna domäninsikter och kvalitetsbedömning'
          })
        } catch (aiError) {
          console.error('[analyze_wheel] AI analysis failed:', aiError)
          return JSON.stringify({
            success: true,
            basicStats,
            aiInsights: null,
            aiError: (aiError as Error).message,
            message: 'Grundläggande analys klar (AI-insikter ej tillgängliga)'
          })
        }
      }

      return JSON.stringify({
        success: true,
        basicStats,
        aiInsights: null,
        message: 'Grundläggande statistisk analys klar'
      })
    }
  })

  const analysisAgent = new Agent<WheelContext>({
    name: 'Analysis Agent',
    model: 'gpt-4o',
    modelSettings: {
      tool_choice: 'auto' // Allow tool call first, then text response
    },
    instructions: `Du är Analysis Agent. 

⚠️ CRITICAL: Du HAR ENDAST ETT VERKTYG: analyze_wheel
⚠️ Du MÅSTE ANROPA det FÖRST innan du ger något svar
⚠️ FABRICERA ALDRIG ANALYS - använd verktygets data

REGLER:
- ANVÄND ALDRIG EMOJIS (inga 📊 📅 🎯 💡 ✅ 🔧 etc.)
- Använd bara ren svensk text
- Proper markdown: ### för rubriker, - för listor, **bold** för viktig text

ARBETSFLÖDE (OBLIGATORISKT):
1. Call analyze_wheel tool IMMEDIATELY 
2. Wait for tool result
3. Format the tool's output nicely with markdown
4. Present to user

Du har INGET annat jobb än att:
1. Anropa verktyget
2. Visa resultatet snyggt formaterat

Gör ALDRIG en egen analys - verktyget gör allt

OUTPUTFORMAT (Svenska, proper markdown):

### Översikt för år {year}

- Ringar: {X} st
- Aktivitetsgrupper: {Y} st  
- Aktiviteter: {Z} st

### Fördelning per kvartal

- Q1 (jan-mar): {X} aktiviteter
- Q2 (apr-jun): {Y} aktiviteter
- Q3 (jul-sep): {Z} aktiviteter
- Q4 (okt-dec): {W} aktiviteter

### AI-ANALYS

{Presentera aiInsights från verktyget - formatera den snyggt med markdown}

### Sammanfattning

{Kort sammanfattning av key takeaways}

VIKTIGT:
- Visa alltid både statistik OCH AI-insikter
- Formatera AI-analysen så den är lätt att läsa
- Om AI-analys misslyckas, visa bara statistik och förklara varför
- Var samtalsam och hjälpsam

EXEMPEL på bra output (NO EMOJIS, proper markdown):

### Översikt för år 2025

- Ringar: 3 st (Kampanjer, Produkter, Event)
- Aktivitetsgrupper: 5 st
- Aktiviteter: 12 st

### Fördelning per kvartal

- Q1: 4 aktiviteter
- Q2: 3 aktiviteter  
- Q3: 2 aktiviteter (lägst!)
- Q4: 3 aktiviteter

### AI-ANALYS

**Domän:** Marknadsföringsstrategi för e-handel

**Kvalitetsbedömning:**

- Bra spridning av kampanjer över året
- "Produktlansering" är för vag - vad ska lanseras exakt?
- Saknas: Resultatuppföljning efter kampanjer

### Rekommendationer

1. Lägg till "Kampanjanalys" 1-2 veckor efter varje stor kampanj
2. Byt ut "Produktlansering" mot "Sommarkollektion 2025 - Lansering"
3. Fyll Q3 med mer innehåll - det är för tomt just nu

### Sammanfattning

Bra grundstruktur men behöver mer specificitet i aktivitetsnamn och mer balans mellan kvartalen."`,
    tools: [analyzeWheelTool],
  })

  // ──────────────────────────────────────────────────────────────────
  // PLANNING AGENT - AI-powered suggestions for new projects
  // ──────────────────────────────────────────────────────────────────

  const suggestPlanTool = tool<WheelContext>({
    name: 'suggest_plan',
    description: 'AI-powered suggestion of complete planning structure (rings, activity groups, activities) for a specific goal/project',
    parameters: z.object({
      goal: z.string().describe('User\'s goal or project description (e.g., "Lansera en SaaS-applikation", "Marknadsföra ny produkt")'),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Project start date (YYYY-MM-DD)'),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Project end date (YYYY-MM-DD)'),
    }),
    async execute(input: { goal: string; startDate: string; endDate: string }, ctx: RunContext<WheelContext>) {
      try {
        const openai = new OpenAI({
          apiKey: Deno.env.get('OPENAI_API_KEY'),
        })

        const suggestionPrompt = `Generera en komplett projektplan för: "${input.goal}"

Tidsperiod: ${input.startDate} till ${input.endDate}

Skapa en strukturerad JSON-response med:

1. **RINGAR** (2-4 ringar för att organisera aktiviteter):
   - Name (t.ex. "Strategi", "Exekvering", "Tillväxt")
   - Type ("inner" för textringar, "outer" för aktivitetsringar - använd främst outer)
   - Description (varför denna ring behövs)

2. **AKTIVITETSGRUPPER** (4-8 kategorier):
   - Name (t.ex. "Produktutveckling", "Marknadsföring", "Försäljning")
   - Color (hex-kod som matchar kategorins syfte):
     * Blå (#3B82F6) - Produkt/Tech
     * Grön (#10B981) - Tillväxt/Framgång
     * Orange (#F59E0B) - Marknadsföring/Energy
     * Röd (#EF4444) - Kritiskt/Brådskande
     * Lila (#8B5CF6) - Premium/Kreativt
     * Gul (#EAB308) - Planering/Research
   - Description (vad denna grupp innehåller)

3. **AKTIVITETER** (15-25 nyckelmilstolpar/uppgifter):
   - Name (specifik och handlingsbar)
   - StartDate (YYYY-MM-DD, inom projekttidsramen)
   - EndDate (YYYY-MM-DD, realistisk varaktighet)
   - Ring (vilket ringnamn den tillhör)
   - Group (vilket gruppnamn den tillhör)
   - Description (varför denna aktivitet är viktig)

VIKTIGT:
- Sprid aktiviteter jämnt över tidslinjen
- Använd realistiska varaktigheter (t.ex. "Betatestning" = 4 veckor, inte 1 dag)
- Inkludera pre-lansering, lansering och post-lanseringsfaser
- Tänk på beroenden (t.ex. "Produktutveckling" före "Betatestning")

DOMÄNSPECIFIKA RIKTLINJER:
- SaaS: MVP, testning, lansering, marknadsföring, kundsupport, analytics
- Marknadsföring: strategi, innehållsskapande, kampanjer, analys
- Personliga mål: lärande, övning, milstolpar, reflektion
- Utbildning: planering, innehållsskapande, genomförande, utvärdering

Returnera ENDAST giltig JSON i detta format:
{
  "rings": [
    { "name": "Strategi", "type": "inner", "description": "Planering och analys" }
  ],
  "activityGroups": [
    { "name": "Produktutveckling", "color": "#3B82F6", "description": "Bygga och förbättra produkten" }
  ],
  "activities": [
    { 
      "name": "Bygga MVP", 
      "startDate": "2025-10-01", 
      "endDate": "2025-12-31",
      "ring": "Strategi",
      "group": "Produktutveckling",
      "description": "Utveckla minimum viable product med kärnfunktioner"
    }
  ]
}`

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Du är en expert på projektplanering. Svara ALLTID med giltig JSON endast, ingen annan text.'
            },
            {
              role: 'user',
              content: suggestionPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: "json_object" }
        })

        const suggestions = JSON.parse(response.choices[0].message.content || '{}')

        console.log('💾 [suggest_plan] Storing suggestions in context')
        console.log('[suggest_plan] Rings:', suggestions.rings?.length || 0)
        console.log('[suggest_plan] Groups:', suggestions.activityGroups?.length || 0)
        console.log('[suggest_plan] Activities:', suggestions.activities?.length || 0)

        // Store suggestions in context for potential later use
        ctx.context.lastSuggestions = suggestions

        return JSON.stringify({
          success: true,
          suggestions,
          message: `Genererat förslag med ${suggestions.rings?.length || 0} ringar, ${suggestions.activityGroups?.length || 0} grupper och ${suggestions.activities?.length || 0} aktiviteter`
        })
      } catch (error) {
        console.error('[suggest_plan] Error:', error)
        return JSON.stringify({
          success: false,
          error: (error as Error).message,
          message: 'Kunde inte generera förslag'
        })
      }
    }
  })

  const applySuggestedPlanTool = tool<WheelContext>({
    name: 'apply_suggested_plan',
    description: 'Creates rings, activity groups, and activities from AI suggestions. Pass the EXACT JSON string returned by suggest_plan (do not modify it). Use this after suggest_plan when user confirms.',
    parameters: z.object({
      suggestionsJson: z.string().describe('The complete suggestions JSON string returned from suggest_plan tool - pass it exactly as received')
    }),
    async execute(input: { suggestionsJson: string }, ctx: RunContext<WheelContext>) {
      console.log('🚀 [apply_suggested_plan] TOOL CALLED!')
      console.log('[apply_suggested_plan] Received JSON length:', input.suggestionsJson?.length || 0)
      
      let suggestions: any
      try {
        // Parse the JSON string
        const parsed = JSON.parse(input.suggestionsJson)
        // Handle both direct suggestions and wrapped in success response
        suggestions = parsed.suggestions || parsed
        console.log('[apply_suggested_plan] Parsed suggestions - Rings:', suggestions?.rings?.length || 0)
        console.log('[apply_suggested_plan] Parsed suggestions - Groups:', suggestions?.activityGroups?.length || 0)
        console.log('[apply_suggested_plan] Parsed suggestions - Activities:', suggestions?.activities?.length || 0)
      } catch (error) {
        console.error('[apply_suggested_plan] JSON parse error:', error)
        return JSON.stringify({
          success: false,
          error: 'Invalid JSON format',
          message: 'Kunde inte tolka förslagen. Försök anropa suggest_plan igen.'
        })
      }
      
      const { supabase, wheelId } = ctx.context

      try {
        const createdRings = new Map<string, string>() // ring name -> ringId
        const createdGroups = new Map<string, string>() // group name -> groupId
        const errors: string[] = []

        // 1. Create rings (wheel scoped - shared across all pages)
        console.log('[apply_suggested_plan] Creating rings:', suggestions.rings?.length || 0)
        for (const ring of suggestions.rings || []) {
          try {
            const result = await createRing(supabase, wheelId, {
              name: ring.name,
              type: ring.type,
              color: ring.type === 'outer' ? '#408cfb' : null
            })
            
            if (result.success && result.ringId) {
              createdRings.set(ring.name, result.ringId)
              console.log('[apply_suggested_plan] Created ring:', ring.name, '→', result.ringId)
            }
          } catch (error) {
            console.error('[apply_suggested_plan] Error creating ring:', ring.name, error)
            errors.push(`Ring "${ring.name}": ${(error as Error).message}`)
          }
        }

        // 2. Create activity groups (wheel scoped - shared across all pages)
        console.log('[apply_suggested_plan] Creating activity groups:', suggestions.activityGroups?.length || 0)
        for (const group of suggestions.activityGroups || []) {
          try {
            const result = await createGroup(supabase, wheelId, {
              name: group.name,
              color: group.color
            })
            
            if (result.success && result.groupId) {
              createdGroups.set(group.name, result.groupId)
              console.log('[apply_suggested_plan] Created group:', group.name, '→', result.groupId)
            }
          } catch (error) {
            console.error('[apply_suggested_plan] Error creating group:', group.name, error)
            errors.push(`Grupp "${group.name}": ${(error as Error).message}`)
          }
        }

        // 3. Create activities
        console.log('[apply_suggested_plan] Creating activities:', suggestions.activities?.length || 0)
        console.log('[apply_suggested_plan] Available rings:', Array.from(createdRings.keys()))
        console.log('[apply_suggested_plan] Available groups:', Array.from(createdGroups.keys()))
        let activitiesCreated = 0
        
        for (const activity of suggestions.activities || []) {
          try {
            console.log(`[apply_suggested_plan] Processing activity: "${activity.name}" (ring: "${activity.ring}", group: "${activity.group}")`)
            const ringId = createdRings.get(activity.ring)
            const groupId = createdGroups.get(activity.group)

            if (!ringId) {
              console.error(`[apply_suggested_plan] RING NOT FOUND: "${activity.ring}" for activity "${activity.name}"`)
              errors.push(`Aktivitet "${activity.name}": Ring "${activity.ring}" hittades inte`)
              continue
            }
            if (!groupId) {
              console.error(`[apply_suggested_plan] GROUP NOT FOUND: "${activity.group}" for activity "${activity.name}"`)
              errors.push(`Aktivitet "${activity.name}": Grupp "${activity.group}" hittades inte`)
              continue
            }

            console.log(`[apply_suggested_plan] Creating activity with ringId=${ringId}, groupId=${groupId}`)
            const result = await createActivity(ctx, {
              name: activity.name,
              startDate: activity.startDate,
              endDate: activity.endDate,
              ringId: ringId,
              activityGroupId: groupId,
              labelId: null
            })

            if (result.success) {
              activitiesCreated += result.itemsCreated || 1
              console.log('[apply_suggested_plan] Created activity:', activity.name)
            } else {
              console.error('[apply_suggested_plan] Activity creation returned failure:', activity.name, result)
              errors.push(`Aktivitet "${activity.name}": ${result.message || 'Okänt fel'}`)
            }
          } catch (error) {
            console.error('[apply_suggested_plan] Error creating activity:', activity.name, error)
            errors.push(`Aktivitet "${activity.name}": ${(error as Error).message}`)
          }
        }

        // Determine overall success: all rings/groups created AND most activities created
        const expectedActivities = suggestions.activities?.length || 0
        const successRate = expectedActivities > 0 ? (activitiesCreated / expectedActivities) : 1
        const overallSuccess = createdRings.size > 0 && createdGroups.size > 0 && successRate >= 0.8

        const summary = {
          success: overallSuccess,
          created: {
            rings: createdRings.size,
            groups: createdGroups.size,
            activities: activitiesCreated
          },
          expected: {
            rings: suggestions.rings?.length || 0,
            groups: suggestions.activityGroups?.length || 0,
            activities: expectedActivities
          },
          errors: errors.length > 0 ? errors : undefined,
          message: overallSuccess 
            ? `Skapade: ${createdRings.size} ringar, ${createdGroups.size} grupper, ${activitiesCreated} aktiviteter`
            : `VARNING: Endast ${activitiesCreated} av ${expectedActivities} aktiviteter skapades! Fel: ${errors.join(', ')}`
        }

        console.log('[apply_suggested_plan] Summary:', JSON.stringify(summary, null, 2))
        return JSON.stringify(summary)
      } catch (error) {
        console.error('[apply_suggested_plan] Fatal error:', error)
        return JSON.stringify({
          success: false,
          error: (error as Error).message,
          message: 'Kunde inte applicera förslag'
        })
      }
    }
  })

  const planningAgent = new Agent<WheelContext>({
    name: 'Planning Agent',
    model: 'gpt-4o',
    instructions: `Du är Planning Agent. Du hjälper användare att skapa kompletta planeringsstrukturer för nya projekt och mål.

KRITISKA REGLER:
- Använd ALDRIG emojis i svar (inga 🎯 📅 🔵 🎨 etc.)
- Använd bara ren svensk text
- Håll svar koncisa och professionella

ANSVAR:
- Generera AI-drivna förslag på ringar, aktivitetsgrupper och aktiviteter
- Basera förslag på domänspecifik expertis
- Skapa realistiska tidsplaner
- Föreslå lämpliga färgkoder och struktur
- Applicera förslag när användaren godkänner

MULTI-YEAR PAGES (KRITISKT):
- Hjul kan ha FLERA sidor (pages) - en för varje år
- Anropa get_current_context för att se vilka år som finns: {pages: [{id, year, title}]}
- Aktiviteter måste matcha befintliga år!
- Om aktivitet sträcker sig 2025-11-01 till 2026-01-31 OCH båda årens sidor finns:
  → suggest_plan skapar automatiskt rätt aktiviteter
  → createActivity i apply_suggested_plan delar upp i två segments (2025-11-01 till 2025-12-31 + 2026-01-01 till 2026-01-31)
- Om användaren ber om aktiviteter för år som INTE finns:
  → Säg tydligt: "Jag ser att sidan för {år} inte finns ännu. Vill du att jag skapar den först?"

ARBETSFLÖDE:
1. Anropa get_current_context för att se vilka år/sidor som finns
2. Anropa suggest_plan med användarens mål och tidsperiod → SPARA DEN RÅA JSON-STRÄNGEN SOM RETURNERAS
3. Presentera förslagen på ett lättläst sätt (ringar, grupper OCH aktiviteter)
4. Vänta på användarens godkännande
5. När användaren säger "ja", "applicera", "skapa det", etc. → Anropa apply_suggested_plan med DEN EXAKTA JSON-STRÄNGEN från steg 1

KRITISKT VIKTIGT FÖR STEG 4:
- Skicka den KOMPLETTA JSON-strängen från suggest_plan till apply_suggested_plan
- Parametern ska vara: { suggestionsJson: "<hela JSON-strängen från suggest_plan>" }
- ÄNDRA INTE JSON-strängen, skicka den exakt som du fick den
- JSON-strängen innehåller rings, activityGroups OCH activities
- Om du inte skickar hela JSON-strängen kommer INGA aktiviteter att skapas!

ANDRA KRITISKA REGLER:
- Presentera ALLA förslagen tydligt så användaren kan granska dem (ringar, grupper OCH aktiviteter)
- Förklara varför varje del är viktig
- VÄNTA på godkännande innan du anropar apply_suggested_plan
- Efter apply_suggested_plan, bekräfta EXAKT vad som skapades med antal (X ringar, Y grupper, Z aktiviteter)
- Om apply_suggested_plan returnerar errors array, rapportera dessa till användaren

OUTPUTFORMAT (Svenska - INGEN EMOJIS):

**Projektplan för: {goal}**
**Period:** {startDate} till {endDate}

**RINGAR ({X} st):**
1. {Ring namn} ({type}) - {beskrivning}

**AKTIVITETSGRUPPER ({Y} st):**
1. {Grupp namn} - {beskrivning}

**AKTIVITETER ({Z} st):**

**Q1 (Jan-Mar):**
- {Aktivitet} ({startdatum} till {slutdatum}) i {ring} / {grupp}

**Q2 (Apr-Jun):**
...

**Översikt:**
{Kort förklaring av planens logik och struktur}

**Vill du att jag skapar denna struktur på ditt hjul?** (Svara "ja" för att applicera)

EXEMPEL på bra output:
"**Projektplan för: Lansera SaaS-applikation**
**Period:** 2025-10-01 till 2026-12-31

**RINGAR (3 st):**
1. Strategi (inner) - Planering och analys
2. Produkt (outer) - Produktutveckling och lansering  
3. Marknad (outer) - Marknadsföring och tillväxt

**AKTIVITETSGRUPPER (5 st):**
1. Produktutveckling - Bygga och förbättra produkten
2. Marknadsföring - Skapa medvetenhet och driva trafik
3. Försäljning - Konvertera leads till kunder
4. Kundsupport - Hjälpa och behålla kunder
5. Analytics - Mäta och optimera

**AKTIVITETER (18 st):**

**Q4 2025 (Okt-Dec):**
- Bygga MVP (2025-10-01 till 2025-12-31) i Produkt / Produktutveckling
- Marknadsundersökning (2025-10-01 till 2025-10-31) i Strategi / Analytics
- Lansera landningssida (2025-11-15 till 2025-11-20) i Marknad / Marknadsföring

**Q1 2026 (Jan-Mar):**
- Betatestning (2026-01-05 till 2026-02-05) i Produkt / Produktutveckling
- SEO-optimering (2026-01-01 till 2026-03-31) i Marknad / Marknadsföring
- Sätt upp kundsupport (2026-02-01 till 2026-02-15) i Marknad / Kundsupport

**Q2 2026 (Apr-Jun):**
- Offentlig lansering (2026-04-01 till 2026-04-05) i Produkt / Produktutveckling
- Lanseringskampanj (2026-04-01 till 2026-04-30) i Marknad / Marknadsföring
- Första försäljningsutskick (2026-04-15 till 2026-05-15) i Marknad / Försäljning

**Q3-Q4 2026:**
... (fortsättning)

**Översikt:**
Denna plan fokuserar på en typisk SaaS-lansering: börjar med MVP-utveckling i Q4 2025, går genom betatestning i Q1 2026, lanserar publikt i Q2 2026, och fokuserar sedan på tillväxt och optimering resten av året. Varje fas bygger på den föregående.

**Vill du att jag skapar denna struktur på ditt hjul?**"

EFTER APPLICERING:
När apply_suggested_plan returnerar, KONTROLLERA resultatet och ge användaren en EXAKT sammanfattning baserad på faktiska siffror:
"**Klart!** Jag har skapat:
- {EXAKT antal} ringar
- {EXAKT antal} aktivitetsgrupper  
- {EXAKT antal} aktiviteter

Din projektplan är nu redo! Du kan börja justera och anpassa den efter dina behov."

VIKTIGT: Läs resultatet från apply_suggested_plan och rapportera FAKTISKA siffror, inte förväntade siffror.`,
    tools: [getContextTool, suggestPlanTool, applySuggestedPlanTool],
  })

  // ──────────────────────────────────────────────────────────────────
  // MAIN ORCHESTRATOR AGENT - Using proper handoff() pattern
  // ──────────────────────────────────────────────────────────────────

  const orchestratorAgent = Agent.create<WheelContext>({
    name: 'Year Wheel Assistant',
    model: 'gpt-4o',
    instructions: `Du är Year Wheel Assistant - en AI-assistent för årsplanering.

KRITISKA REGLER:
- Använd ALDRIG emojis i svar (inga ✅ 📊 🎯 💡 ⚠️ etc.)
- Använd bara ren svensk text
- Håll svar koncisa och professionella
- Delegera omedelbart till rätt specialist - prata inte för mycket

DIN ROLL:
Du hjälper användare att planera och organisera aktiviteter i ett cirkulärt årshjul.

DINA SPECIALISTER (4 st):
1. **Structure Agent** - Skapar ringar, aktivitetsgrupper och etiketter
2. **Activity Agent** - Skapar och hanterar aktiviteter/events
3. **Analysis Agent** - Analyserar hjulet och ger AI-drivna insikter
4. **Planning Agent** - Genererar kompletta projektplaner med AI

ARBETSFLÖDE:
1. Läs användarens meddelande
2. Identifiera det PRIMÄRA syftet (skapa något? analysera? planera?)
3. Välj EXAKT EN specialist
4. Delegera OMEDELBART till den specialisten
5. Gör ALDRIG flera handoffs samtidigt - välj den VIKTIGASTE åtgärden

DELEGERINGSREGLER (KRITISKA):

→ **Transfer to Structure Agent** när:
- "skapa ring", "ny ring", "lägg till ring"
- "skapa aktivitetsgrupp", "ny grupp"
- "skapa etikett", "ny label"
- "ändra färg på", "byt namn på ring/grupp"
- "ta bort ring/grupp/etikett"
- "skapa år", "lägg till årssida", "kopiera år"
- **"föreslå struktur för [domain]"**, **"hur skulle ett årshjul för [X] se ut?"**
- **"jag behöver ett årshjul för [purpose]"**, **"ge förslag på struktur"**

→ **Transfer to Activity Agent** när (HÖGSTA PRIORITET):
- ANY form of "lägg till", "skapa", "ny" + activity/event/kampanj/uppgift
- "lägg till utvärderingsaktivitet", "skapa feedback-möte", etc.
- "skapa kampanj", "lägg till event", "schemalägg"
- "flytta aktivitet", "ändra datum", "byt ring"
- "ta bort aktivitet", "radera"
- "lista aktiviteter", "visa aktiviteter"
- **"ändra alla förekomster", "uppdatera alla X", "byt alla Y"** - BATCH UPDATES
- **"titta på ringen X", "visa aktiviteter i ring Y"** - QUERIES
- If user mentions creating/adding something WITH a date or time period → Activity Agent
- ⚠️ ÄVEN OM användaren säger "1. Lägg till X, 2. Analysera Y" → Välj Activity Agent!
- ⚠️ Skapa först, analysera senare!

→ **Transfer to Analysis Agent** när (LÄGSTA PRIORITET):
- ONLY when NOTHING else is requested: "analysera", "hur ser det ut", "ge insikter"
- "vilken domän", "kvalitetsbedömning"
- "hur är fördelningen", "statistik"
- "ge rekommendationer", "tips"
- ⚠️ ALDRIG om användaren nämner "lägg till", "skapa", "omstrukturera" i samma meddelande!
- ⚠️ Analysis kommer EFTER skapande, INTE samtidigt!

→ **Transfer to Planning Agent** när:
- "föreslå aktiviteter för", "skapa plan för"
- "generera projektplan", "AI-förslag"
- "jag vill lansera", "jag ska starta"
- "hjälp mig planera", "skapa struktur för nytt projekt"
- Användaren beskriver ett NYT projekt/mål som behöver komplett planering

EXEMPEL PÅ RÄTT DELEGERING:

User: "Skapa en ring för kampanjer"
→ [Transfer to Structure Agent OMEDELBART]

User: "Lägg till julkampanj i december"
→ [Transfer to Activity Agent OMEDELBART]

User: "Hur är aktiviteterna fördelade?"
→ [Transfer to Analysis Agent OMEDELBART]

User: "Föreslå aktiviteter för att lansera en SaaS från oktober till december"
→ [Transfer to Planning Agent OMEDELBART]

User: "Jag ska starta en marknadsföringskampanj, vad behöver jag?"
→ [Transfer to Planning Agent OMEDELBART]

User: "1. Lägg till utvärdering 2. Omstrukturera möten 3. Inför buffertar"
→ [Transfer to Activity Agent OMEDELBART - GÖR SKAPANDE FÖRST!]

User: "Analysera hjulet och lägg till feedback-möte"
→ [Transfer to Activity Agent OMEDELBART - SKAPA först, analysera sen!]

User: "Föreslå en struktur för HR-planering"
→ [Transfer to Structure Agent OMEDELBART]

User: "Hur skulle ett marknadsföringsårshjul kunna se ut?"
→ [Transfer to Structure Agent OMEDELBART]

VIKTIGT:
- GÖR HANDOFF OMEDELBART - prata inte för mycket innan
- Håll din intro KORT (max 1 mening)
- Låt specialisten göra ALLT arbete
- Försök INTE lösa uppgiften själv

FEL OCH LÖSNINGAR (för när användare frågar):
- "Det finns ett strukturellt problem" → Sidor för året finns inte, användaren behöver skapa dem först eller välja rätt år
- "Ring/Grupp hittades inte" → Strukturen saknas, användaren behöver skapa ringar och grupper först
- "foreign key" fel → Databasproblem, föreslå att kontakta support eller skapa saknade strukturer

FELAKTIGT ❌:
User: "Skapa ring Kampanjer"
You: "Javisst! För att skapa en ring behöver jag veta vilken typ... [lång förklaring]"

KORREKT ✅:
User: "Skapa ring Kampanjer"
You: [Call transfer_to_structure_agent DIREKT]

Prata svenska naturligt.`,
    handoffs: [
      handoff(structureAgent, {
        toolDescriptionOverride: 'Transfer to Structure Agent when user wants to create, update, or delete rings, activity groups, or labels. Also for AI-powered structure suggestions (e.g., "suggest structure for HR", "how would a marketing wheel look").',
      }),
      handoff(activityAgent, {
        toolDescriptionOverride: 'Transfer to Activity Agent when user wants to create, update, delete, or list activities/events. Also for moving or rescheduling activities.',
      }),
      handoff(analysisAgent, {
        toolDescriptionOverride: 'Transfer to Analysis Agent when user wants insights about activity distribution, domain identification, quality assessment, or recommendations for existing wheels.',
      }),
      handoff(planningAgent, {
        toolDescriptionOverride: 'Transfer to Planning Agent when user wants AI-generated suggestions for a NEW project/goal with complete structure (rings, groups, activities). Use for "suggest activities for", "create plan for", "help me plan", etc.',
      }),
    ],
  })

  return orchestratorAgent
}

// ═══════════════════════════════════════════════════════════════════
// SSE STREAMING HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get user-friendly Swedish status message for tool execution
 */
function getToolStatusMessage(toolName: string, args?: any): string {
  const messages: Record<string, (args?: any) => string> = {
    'get_current_context': () => 'Hämtar aktuell kontext...',
    'create_activity': (a) => `Skapar aktivitet "${a?.name || 'ny aktivitet'}"...`,
    'batch_create_activities': (a) => `Skapar ${a?.activities?.length || 'flera'} aktiviteter...`,
    'query_activities': () => 'Söker efter aktiviteter...',
    'update_activity': (a) => `Uppdaterar "${a?.activityName || 'aktivitet'}"...`,
    'delete_activity': (a) => `Tar bort "${a?.name || 'aktivitet'}"...`,
    'list_activities': () => 'Hämtar aktivitetslista...',
    'create_ring': (a) => `Skapar ring "${a?.name || 'ny ring'}"...`,
    'update_ring': (a) => `Uppdaterar ring "${a?.ringName || 'ring'}"...`,
    'delete_ring': (a) => `Tar bort ring "${a?.name || 'ring'}"...`,
    'toggle_ring_visibility': (a) => `${a?.visible ? 'Visar' : 'Döljer'} ring "${a?.ringName || 'ring'}"...`,
    'create_activity_group': (a) => `Skapar aktivitetsgrupp "${a?.name || 'ny grupp'}"...`,
    'update_activity_group': (a) => `Uppdaterar grupp "${a?.groupName || 'grupp'}"...`,
    'delete_activity_group': (a) => `Tar bort grupp "${a?.name || 'grupp'}"...`,
    'toggle_group_visibility': (a) => `${a?.visible ? 'Visar' : 'Döljer'} grupp "${a?.groupName || 'grupp'}"...`,
    'create_label': (a) => `Skapar etikett "${a?.name || 'ny etikett'}"...`,
    'update_label': (a) => `Uppdaterar etikett "${a?.labelName || 'etikett'}"...`,
    'delete_label': (a) => `Tar bort etikett "${a?.name || 'etikett'}"...`,
    'create_year_page': (a) => `Skapar sida för år ${a?.year || ''}...`,
    'smart_copy_year': (a) => `Kopierar år ${a?.sourceYear || ''} till ${a?.targetYear || ''}...`,
    'suggest_wheel_structure': () => 'Genererar strukturförslag med AI...',
    'analyze_wheel': () => 'Analyserar hjulet med AI...',
    'suggest_plan': () => 'Skapar projektplan med AI...',
    'apply_suggested_plan': () => 'Applicerar förslag...',
  }

  const messageFunc = messages[toolName]
  if (messageFunc) {
    return messageFunc(args)
  }
  
  // Fallback for unknown tools
  return `Kör ${toolName}...`
}

/**
 * Safe JSON stringifier that handles circular references
 */
function safeStringify(obj: any): string {
  const seen = new WeakSet()
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]'
      }
      seen.add(value)
    }
    return value
  })
}

/**
 * Send SSE event to client
 */
function sendSSEEvent(controller: ReadableStreamDefaultController, type: string, data: any) {
  const encoder = new TextEncoder()
  const event = {
    type,
    timestamp: Date.now(),
    ...data
  }
  try {
    const message = `data: ${safeStringify(event)}\n\n`
    controller.enqueue(encoder.encode(message))
  } catch (error) {
    console.error('[SSE] Failed to send event:', error)
    // Send a simplified error event
    const fallbackEvent = {
      type: 'error',
      timestamp: Date.now(),
      message: 'Ett tekniskt fel uppstod',
      error: 'Serialization error'
    }
    const message = `data: ${JSON.stringify(fallbackEvent)}\n\n`
    controller.enqueue(encoder.encode(message))
  }
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

    const { userMessage, previousResponseId, wheelId, currentPageId } = await req.json()
    if (!userMessage || !wheelId) {
      throw new Error('Missing required fields: userMessage, wheelId')
    }

    console.log('[AI Assistant V2] Processing:', { 
      userMessage, 
      wheelId, 
      currentPageId,
      previousResponseId: previousResponseId || '(fresh start)'
    })

    // Create agent system (no parameters - uses RunContext)
    const orchestrator = createAgentSystem()

    // Fetch current wheel page data for context
    const { data: pageData, error: pageError } = await supabase
      .from('wheel_pages')
      .select('*')
      .eq('id', currentPageId || wheelId)
      .single()

    if (pageError) throw pageError

    // Fetch ALL pages for this wheel so AI knows what years exist
    const { data: allPages, error: allPagesError } = await supabase
      .from('wheel_pages')
      .select('id, year, title, page_order')
      .eq('wheel_id', wheelId)
      .order('year', { ascending: true })

    if (allPagesError) {
      console.error('[AI] Error fetching pages:', allPagesError)
    }

    console.log(`[AI] Wheel has ${allPages?.length || 0} pages:`, allPages?.map((p: any) => `${p.year} (${p.id})`).join(', '))
    console.log(`[AI] Current page: ${pageData.year} (${pageData.id})`)

    // Create wheel context that will be passed to all tools
    const wheelContext: WheelContext = {
      supabase,
      wheelId,
      userId: user.id,
      currentYear: pageData.year,
      currentPageId: currentPageId || wheelId,
      lastSuggestions: undefined, // Will be populated by tools if needed
      allPages: allPages || [], // ✅ NEW: AI knows what pages exist
    }

    // OPENAI AGENTS SDK RECOMMENDED APPROACH:
    // Use previousResponseId to let OpenAI manage conversation state server-side
    // See: https://openai.github.io/openai-agents-js/guides/running-agents/#2-previousresponseid-to-continue-from-the-last-turn
    const runOptions: any = {
      context: wheelContext,
      maxTurns: 20,
    }

    // If we have a previousResponseId, pass it to chain the conversation
    if (previousResponseId) {
      runOptions.previousResponseId = previousResponseId
      console.log('🔗 [AI] Chaining from previous response:', previousResponseId)
    } else {
      console.log('🆕 [AI] Fresh conversation - no previous context')
    }

    // SSE STREAMING RESPONSE - Always stream for better UX
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          sendSSEEvent(controller, 'status', { 
            message: 'Startar AI-assistent...',
            stage: 'init'
          })

          // Run agent with just the new user message (OpenAI SDK handles history)
          console.log('🚀 [AI] Starting agent execution...')
          sendSSEEvent(controller, 'status', { 
            message: 'AI arbetar...',
            stage: 'thinking'
          })

          const result = await run(orchestrator, userMessage, runOptions)

          console.log('✅ [AI] Agent execution complete')
          console.log('[AI] Result keys:', Object.keys(result))
          console.log('[AI] result.finalOutput type:', typeof result.finalOutput)
          console.log('[AI] result.finalOutput value:', result.finalOutput)
          console.log('[AI] result.history length:', result.history?.length || 0)
          
          // Log last few history items to understand what's happening
          if (result.history && result.history.length > 0) {
            const lastThree = result.history.slice(-3)
            console.log('[AI] Last 3 history items:')
            lastThree.forEach((item: any, i: number) => {
              console.log(`  [${i}] role=${item.role}, name=${item.name || 'none'}, content type=${typeof item.content}`)
              if (Array.isArray(item.content)) {
                console.log(`      content parts:`, item.content.map((p: any) => p.type).join(', '))
              }
            })
          }
          
          // Extract the actual response text
          // According to OpenAI Agents SDK docs, it should be result.finalOutput
          let finalOutput = ''
          
          if (result.finalOutput && typeof result.finalOutput === 'string') {
            console.log('[AI] Using result.finalOutput (primary)')
            finalOutput = result.finalOutput
          } else if (result.finalOutput && typeof result.finalOutput === 'object') {
            console.log('[AI] result.finalOutput is object, stringifying')
            finalOutput = JSON.stringify(result.finalOutput)
          } else if (result.history && result.history.length > 0) {
            console.log('[AI] Fallback: extracting from result.history')
            // Find the last assistant message that's not a tool call
            const assistantMessages = result.history.filter((h: any) => h.role === 'assistant')
            console.log('[AI] Found', assistantMessages.length, 'assistant messages')
            
            // Get the last one
            const lastMessage = assistantMessages[assistantMessages.length - 1]
            if (lastMessage) {
              console.log('[AI] Last message content type:', typeof lastMessage.content)
              if (typeof lastMessage.content === 'string') {
                finalOutput = lastMessage.content
              } else if (Array.isArray(lastMessage.content)) {
                const textParts = lastMessage.content.filter((p: any) => p.type === 'text')
                console.log('[AI] Text parts found:', textParts.length)
                if (textParts.length > 0) {
                  finalOutput = textParts.map((p: any) => p.text).join('\n')
                }
              }
            }
          }
          
          console.log('[AI] Final extracted output length:', finalOutput.length)
          if (finalOutput) {
            console.log('[AI] Output preview:', finalOutput.substring(0, 150))
          }
          
          // Analyze history for tool executions and agent handoffs
          const toolExecutionSummary: string[] = []
          const agentHandoffs: string[] = []
          let currentAgent = 'Year Wheel Assistant'
          
          // SIMPLIFIED: Just send processing status, analyze after completion
          sendSSEEvent(controller, 'status', {
            message: 'Bearbetar resultat...',
            stage: 'processing'
          })
          
          if (result.history) {
            result.history.forEach((item: any) => {
              // Detect agent handoffs
              if (item.role === 'assistant' && item.name && item.name !== currentAgent) {
                currentAgent = item.name
                agentHandoffs.push(currentAgent)
              }
              
              // Detect tool calls
              if (item.role === 'assistant' && item.content && Array.isArray(item.content)) {
                item.content.forEach((part: any) => {
                  if (part.type === 'tool_use') {
                    const toolName = part.name
                    toolExecutionSummary.push(toolName)
                    console.log(`🔧 [AI] Tool: ${toolName}`)
                  }
                })
              }
            })
          }
          
          console.log('📊 [AI] Tools executed:', toolExecutionSummary.length > 0 ? toolExecutionSummary.join(', ') : 'None')
          console.log('👥 [AI] Agent handoffs:', agentHandoffs.length > 0 ? agentHandoffs.join(' → ') : 'None')

          // Extract lastResponseId from the result for OpenAI Agents SDK state management
          const lastResponseId = result.lastResponseId || null
          console.log('🔑 [AI] lastResponseId for next turn:', lastResponseId || '(none)')

          // CRITICAL: Ensure finalOutput exists and is valid
          if (!finalOutput || typeof finalOutput !== 'string' || finalOutput.trim().length === 0) {
            console.error('[AI] Invalid finalOutput:', finalOutput)
            console.error('[AI] Full result keys:', Object.keys(result))
            throw new Error('AI returnerade inget giltigt svar. Försök igen.')
          }

          // Send completion event with full response
          const completeEvent = {
            success: true,
            message: finalOutput,
            agentUsed: result.agent?.name || currentAgent,
            lastResponseId,
            toolsExecuted: toolExecutionSummary,
            agentPath: agentHandoffs.length > 0 ? agentHandoffs : undefined,
            stage: 'done'
          }
          
          console.log('[AI] Sending complete event:', { messageLength: completeEvent.message.length })
          sendSSEEvent(controller, 'complete', completeEvent)

          // Small delay to ensure event is sent
          await new Promise(resolve => setTimeout(resolve, 50))

          // Close stream
          controller.close()
          console.log('[AI] Stream closed successfully')
        } catch (error) {
          console.error('[AI Assistant V2] Error:', error)
          
          // Send error event
          sendSSEEvent(controller, 'error', {
            success: false,
            error: (error as Error).message,
            message: `Fel: ${(error as Error).message}`,
            stage: 'error'
          })
          
          // Small delay to ensure error event is sent
          await new Promise(resolve => setTimeout(resolve, 50))
          
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      status: 200,
    })
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
