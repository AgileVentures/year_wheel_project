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
  type: z.enum(['inner', 'outer']).describe(
    'Ring type. BOTH inner and outer rings kan innehålla aktiviteter. ' +
    'Rekommendation: använd "outer" för mindre/externa händelser (helgdagar, lov, säsonger, terminer). ' +
    'Använd "inner" för huvudspår, strategiska aktiviteter eller textbaserad planering.'
  ),
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
      
      const { data: nextOrder, error: orderError } = await supabase
        .rpc('get_next_page_order', { p_wheel_id: wheelId })

      if (orderError) {
        console.error(`[createActivity] Error fetching page order for year ${year}:`, orderError)
        throw new Error(`Kunde inte hämta sidordning för år ${year}`)
      }

      const { data: newPage, error: pageError } = await supabase
        .from('wheel_pages')
        .insert({
          wheel_id: wheelId,
          year: year,
          title: `${year}`,
          page_order: nextOrder ?? pages.length,
          organization_data: organizationData
        })
        .select()
        .single()
      
      if (pageError) {
        console.error(`[createActivity] Error creating page for year ${year}:`, pageError)
        throw new Error(`Kunde inte skapa sida för år ${year}. Skapa sidan manuellt först, eller välj ett annat datumintervall.`)
      }
      pages.push(newPage)
      // Update in-memory context so subsequent tool calls know about the page
      const normalizedPages = ctx.context.allPages || []
      if (!normalizedPages.some((p: any) => p.id === newPage.id)) {
        normalizedPages.push({
          id: newPage.id,
          year: newPage.year,
          title: newPage.title,
          page_order: newPage.page_order,
        })
        ctx.context.allPages = normalizedPages
      }
      console.log(`[createActivity] Successfully created page for year ${year} with copied structure`)
    }
  }

  const itemsCreated = []
  const itemsByPage = new Map<string, any[]>()

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
    const byPage = itemsByPage.get(page.id) || []
    byPage.push(mapDbItemToOrgItem(newItem))
    itemsByPage.set(page.id, byPage)
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
      const byPage = itemsByPage.get(page.id) || []
      byPage.push(mapDbItemToOrgItem(newItem))
      itemsByPage.set(page.id, byPage)
    }
  }

  // Update organization_data JSONB so frontend + agent context stay in sync
  for (const [pageId, newItems] of itemsByPage.entries()) {
    await updatePageOrganizationData(supabase, pageId, (orgData) => {
      let changed = false
      newItems.forEach((item) => {
        const existingIndex = orgData.items.findIndex((existing: any) => existing.id === item.id)
        if (existingIndex !== -1) {
          orgData.items[existingIndex] = item
          changed = true
        } else {
          orgData.items.push(item)
          changed = true
        }
      })
      return changed
    })
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
    .select('id, name, type, color, visible, orientation')
    .eq('wheel_id', wheelId)
    .ilike('name', args.name)
    .maybeSingle()

  if (existingByName) {
    // Ensure organization_data JSON includes the ring with latest metadata
    await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
      const current = orgData.rings.find((r: any) => r.id === existingByName.id)
      const visible = existingByName.visible !== false
      const colorToUse = existingByName.type === 'outer'
        ? existingByName.color || finalColor
        : undefined

      if (current) {
        let changed = false
        if (current.name !== existingByName.name) {
          current.name = existingByName.name
          changed = true
        }
        if (existingByName.type === 'outer') {
          if (current.color !== colorToUse) {
            current.color = colorToUse
            changed = true
          }
        } else {
          const orientation = existingByName.orientation || current.orientation || 'vertical'
          if (current.orientation !== orientation) {
            current.orientation = orientation
            changed = true
          }
          if (!Array.isArray(current.data)) {
            current.data = cloneInnerRingData(current.data)
            changed = true
          }
        }
        if (current.visible !== visible) {
          current.visible = visible
          changed = true
        }
        return changed
      }

      const newEntry: any = {
        id: existingByName.id,
        name: existingByName.name,
        type: existingByName.type,
        visible,
      }

      if (existingByName.type === 'outer') {
        newEntry.color = colorToUse
      } else {
        newEntry.orientation = existingByName.orientation || 'vertical'
        newEntry.data = cloneInnerRingData([])
      }

      orgData.rings.push(newEntry)
      return true
    })

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

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    if (orgData.rings.some((r: any) => r.id === ring.id)) {
      return false
    }

    const entry: any = {
      id: ring.id,
      name: ring.name,
      type: ring.type,
      visible: ring.visible !== false,
    }

    if (ring.type === 'outer') {
      entry.color = ring.color || finalColor
    } else {
      entry.orientation = ring.orientation || 'vertical'
      entry.data = cloneInnerRingData([])
    }

    orgData.rings.push(entry)
    return true
  })

  return {
  success: true,
  message: `Ring "${args.name}" skapad (typ: ${args.type === 'outer' ? 'outer – extern händelselager' : 'inner – huvudspår/strategi'}, färg: ${finalColor})`,
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
    .select('id, name, color, visible')
    .eq('wheel_id', wheelId)
    .ilike('name', args.name)
    .maybeSingle()

  if (existing) {
    await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
      const current = orgData.activityGroups.find((g: any) => g.id === existing.id)
      const normalizedColor = existing.color || args.color
      const visible = existing.visible !== false

      if (current) {
        let changed = false
        if (current.name !== existing.name) {
          current.name = existing.name
          changed = true
        }
        if (normalizedColor && current.color !== normalizedColor) {
          current.color = normalizedColor
          changed = true
        }
        if (current.visible !== visible) {
          current.visible = visible
          changed = true
        }
        return changed
      }

      orgData.activityGroups.push({
        id: existing.id,
        name: existing.name,
        color: normalizedColor || args.color,
        visible,
      })
      return true
    })

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

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    if (orgData.activityGroups.some((g: any) => g.id === group.id)) {
      return false
    }

    orgData.activityGroups.push({
      id: group.id,
      name: group.name,
      color: group.color || args.color,
      visible: group.visible !== false,
    })
    return true
  })

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
    .select('id, name, type, color, visible, orientation')
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

  let updatedRing = ring

  if (Object.keys(updateData).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from('wheel_rings')
      .update(updateData)
      .eq('id', ring.id)
      .select('id, name, type, color, visible, orientation')
      .single()

    if (updateError) throw updateError
    updatedRing = updated
  }

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    const current = orgData.rings.find((r: any) => r.id === updatedRing.id)
    const visible = updatedRing.visible !== false
    const targetColor = updatedRing.type === 'outer'
      ? updatedRing.color || updates.newColor || ring.color
      : undefined

    if (current) {
      let changed = false
      if (current.name !== updatedRing.name) {
        current.name = updatedRing.name
        changed = true
      }
      if (current.visible !== visible) {
        current.visible = visible
        changed = true
      }
      if (updatedRing.type === 'outer' && targetColor && current.color !== targetColor) {
        current.color = targetColor
        changed = true
      }
      if (updatedRing.type === 'inner') {
        const orientation = updatedRing.orientation || current.orientation || 'vertical'
        if (current.orientation !== orientation) {
          current.orientation = orientation
          changed = true
        }
        if (!Array.isArray(current.data)) {
          current.data = cloneInnerRingData(current.data)
          changed = true
        }
      }
      return changed
    }

    const entry: any = {
      id: updatedRing.id,
      name: updatedRing.name,
      type: updatedRing.type,
      visible,
    }

    if (updatedRing.type === 'outer') {
      entry.color = targetColor || '#408cfb'
    } else {
      entry.orientation = updatedRing.orientation || 'vertical'
      entry.data = cloneInnerRingData([])
    }

    orgData.rings.push(entry)
    return true
  })

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

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    const index = orgData.rings.findIndex((r: any) => r.id === ring.id)
    if (index === -1) {
      return false
    }
    orgData.rings.splice(index, 1)
    return true
  })

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
    .select('id, name, color, visible')
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

  let updatedGroup = group

  if (Object.keys(updateData).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from('activity_groups')
      .update(updateData)
      .eq('id', group.id)
      .select('id, name, color, visible')
      .single()

    if (updateError) throw updateError
    updatedGroup = updated
  }

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    const current = orgData.activityGroups.find((g: any) => g.id === updatedGroup.id)
    const normalizedColor = updatedGroup.color || updates.newColor || group.color || '#3B82F6'
    const visible = updatedGroup.visible !== false

    if (current) {
      let changed = false
      if (current.name !== updatedGroup.name) {
        current.name = updatedGroup.name
        changed = true
      }
      if (current.color !== normalizedColor) {
        current.color = normalizedColor
        changed = true
      }
      if (current.visible !== visible) {
        current.visible = visible
        changed = true
      }
      return changed
    }

    orgData.activityGroups.push({
      id: updatedGroup.id,
      name: updatedGroup.name,
      color: normalizedColor,
      visible,
    })
    return true
  })

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

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    const index = orgData.activityGroups.findIndex((g: any) => g.id === group.id)
    if (index === -1) {
      return false
    }
    orgData.activityGroups.splice(index, 1)
    return true
  })

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
    .select('id, name, color, visible')
    .eq('wheel_id', wheelId)
    .ilike('name', args.name)
    .maybeSingle()

  if (existing) {
    await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
      const current = orgData.labels.find((l: any) => l.id === existing.id)
      const normalizedColor = existing.color || args.color
      const visible = existing.visible !== false

      if (current) {
        let changed = false
        if (current.name !== existing.name) {
          current.name = existing.name
          changed = true
        }
        if (normalizedColor && current.color !== normalizedColor) {
          current.color = normalizedColor
          changed = true
        }
        if (current.visible !== visible) {
          current.visible = visible
          changed = true
        }
        return changed
      }

      orgData.labels.push({
        id: existing.id,
        name: existing.name,
        color: normalizedColor || args.color,
        visible,
      })
      return true
    })

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

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    if (orgData.labels.some((l: any) => l.id === label.id)) {
      return false
    }

    orgData.labels.push({
      id: label.id,
      name: label.name,
      color: label.color || args.color,
      visible: label.visible !== false,
    })
    return true
  })

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
    .select('id, name, color, visible')
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

  let updatedLabel = label

  if (Object.keys(updateData).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from('labels')
      .update(updateData)
      .eq('id', label.id)
      .select('id, name, color, visible')
      .single()

    if (updateError) throw updateError
    updatedLabel = updated
  }

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    const current = orgData.labels.find((l: any) => l.id === updatedLabel.id)
    const normalizedColor = updatedLabel.color || updates.newColor || label.color || '#3B82F6'
    const visible = updatedLabel.visible !== false

    if (current) {
      let changed = false
      if (current.name !== updatedLabel.name) {
        current.name = updatedLabel.name
        changed = true
      }
      if (current.color !== normalizedColor) {
        current.color = normalizedColor
        changed = true
      }
      if (current.visible !== visible) {
        current.visible = visible
        changed = true
      }
      return changed
    }

    orgData.labels.push({
      id: updatedLabel.id,
      name: updatedLabel.name,
      color: normalizedColor,
      visible,
    })
    return true
  })

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

  await updateOrgDataAcrossPages(supabase, wheelId, (orgData) => {
    const index = orgData.labels.findIndex((l: any) => l.id === label.id)
    if (index === -1) {
      return false
    }
    orgData.labels.splice(index, 1)
    return true
  })

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
1. **Rings** - Horisontella band som organiserar aktiviteter (t.ex. "Marknadsföring", "HR", "Projekt")
  - BOTH ring types can contain activities – skillnaden är visuell och konceptuell
  - **"outer" ringar**: Rekommenderas för mindre eller externa händelser såsom helgdagar, lov, säsonger, terminer och externa milstolpar
  - **"inner" ringar**: Rekommenderas för huvudspår, strategiska initiativ, projektfaser eller textbaserad planering
   
2. **Activity Groups** - Color-coded categories that help organize activities within rings (e.g., "Campaign", "Event", "Training")

3. **Activities** - Individual tasks/events placed on specific rings with start/end dates

BEST PRACTICES:
- Use 3-6 rings for tydlighet (för många = rörigt, för få = inte användbart)
- Outer ringar fungerar bäst som kontextlager (helgdagar, externa kampanjer, terminer)
- Inner ringar håller huvudspåren (team, projekt, strategier) eller detaljerad text
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
    const { data: updatedRows, error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .in('id', itemIds)
      .select('*')

    if (updateError) throw updateError

    if (updatedRows && updatedRows.length > 0) {
      const updatesByPage = new Map<string, any[]>()
      updatedRows.forEach((row: any) => {
        if (!row.page_id) return
        const list = updatesByPage.get(row.page_id) || []
        list.push(mapDbItemToOrgItem(row))
        updatesByPage.set(row.page_id, list)
      })

      for (const [pageId, updateItems] of updatesByPage.entries()) {
        await updatePageOrganizationData(supabase, pageId, (orgData) => {
          let changed = false
          updateItems.forEach((item) => {
            const index = orgData.items.findIndex((existing: any) => existing.id === item.id)
            if (index !== -1) {
              const existing = orgData.items[index]
              // Update relevant fields while preserving optional metadata
              orgData.items[index] = { ...existing, ...item }
              changed = true
            }
          })
          return changed
        })
      }
    }

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

  const itemsByPageToRemove = new Map<string, string[]>()
  items.forEach((item: any) => {
    if (!item.page_id) return
    const list = itemsByPageToRemove.get(item.page_id) || []
    list.push(item.id)
    itemsByPageToRemove.set(item.page_id, list)
  })
  
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
      const referencePage = allPages[0]
      const referenceOrgData = referencePage?.organization_data || {}
      const organizationData = {
        rings: referenceOrgData.rings || [],
        activityGroups: referenceOrgData.activityGroups || referenceOrgData.activities || [],
        labels: referenceOrgData.labels || [],
        items: [],
      }

      const { data: nextOrder, error: orderError } = await supabase
        .rpc('get_next_page_order', { p_wheel_id: wheelId })

      if (orderError) {
        throw new Error(`Kunde inte hämta sidordning för år ${year}: ${orderError.message}`)
      }

      const { data: newPage, error: pageError } = await supabase
        .from('wheel_pages')
        .insert({
          wheel_id: wheelId,
          year: year,
          title: `${year}`,
          page_order: nextOrder ?? allPages.length,
          organization_data: organizationData
        })
        .select()
        .single()
      
      if (pageError) {
        throw new Error(`Kunde inte skapa sida för år ${year}: ${pageError.message}`)
      }
      allPages.push(newPage)

      const normalizedPages = ctx.context.allPages || []
      if (!normalizedPages.some((p: any) => p.id === newPage.id)) {
        normalizedPages.push({
          id: newPage.id,
          year: newPage.year,
          title: newPage.title,
          page_order: newPage.page_order,
        })
        ctx.context.allPages = normalizedPages
      }
    }
  }

  // Delete old items
  const oldItemIds = items.map((i: any) => i.id)
  const { error: deleteError } = await supabase
    .from('items')
    .delete()
    .in('id', oldItemIds)

  if (deleteError) throw deleteError

  for (const [pageId, ids] of itemsByPageToRemove.entries()) {
    await updatePageOrganizationData(supabase, pageId, (orgData) => {
      const before = orgData.items.length
      orgData.items = orgData.items.filter((item: any) => !ids.includes(item.id))
      return orgData.items.length !== before
    })
  }

  // Create new items across the new date range
  const itemsCreated = []
  const newItemsByPage = new Map<string, any[]>()

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
    const list = newItemsByPage.get(page.id) || []
    list.push(mapDbItemToOrgItem(newItem))
    newItemsByPage.set(page.id, list)
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
      const list = newItemsByPage.get(page.id) || []
      list.push(mapDbItemToOrgItem(newItem))
      newItemsByPage.set(page.id, list)
    }
  }

  for (const [pageId, newItems] of newItemsByPage.entries()) {
    await updatePageOrganizationData(supabase, pageId, (orgData) => {
      let changed = false
      newItems.forEach((item) => {
        const index = orgData.items.findIndex((existing: any) => existing.id === item.id)
        if (index !== -1) {
          orgData.items[index] = { ...orgData.items[index], ...item }
        } else {
          orgData.items.push(item)
        }
        changed = true
      })
      return changed
    })
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

  const itemsByPage = new Map<string, string[]>()
  items.forEach((item: any) => {
    if (!item.page_id) return
    const list = itemsByPage.get(item.page_id) || []
    list.push(item.id)
    itemsByPage.set(item.page_id, list)
  })

  for (const [pageId, ids] of itemsByPage.entries()) {
    await updatePageOrganizationData(supabase, pageId, (orgData) => {
      const before = orgData.items.length
      orgData.items = orgData.items.filter((item: any) => !ids.includes(item.id))
      return orgData.items.length !== before
    })
  }

  return {
    success: true,
    itemsDeleted: items.length,
    message: `${items.length} aktivitet(er) med namnet "${activityName}" togs bort`,
  }
}

async function getCurrentRingsAndGroups(supabase: any, wheelId: string) {
  const [ringsRes, groupsRes] = await Promise.all([
    supabase.from('wheel_rings').select('id, name, type, color, visible, orientation').eq('wheel_id', wheelId).order('ring_order'),
    supabase.from('activity_groups').select('id, name, color, visible').eq('wheel_id', wheelId),
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

function cloneInnerRingData(data: any) {
  if (!Array.isArray(data) || data.length === 0) {
    return Array.from({ length: 12 }, () => [''])
  }
  return data.map((entry: any) => (Array.isArray(entry) ? [...entry] : ['']))
}

function cloneRing(ring: any) {
  const cloned: any = { ...ring }
  if (ring.type === 'inner') {
    cloned.data = cloneInnerRingData(ring.data)
    cloned.orientation = ring.orientation || 'vertical'
  }
  return cloned
}

function cloneItem(item: any) {
  return { ...item }
}

function normalizeOrgData(raw: any = {}) {
  const rings = Array.isArray(raw.rings)
    ? raw.rings.map((ring: any) => cloneRing(ring))
    : []

  const legacyGroups = Array.isArray(raw.activities)
    ? raw.activities.map((group: any) => ({ ...group }))
    : []

  const activityGroups = Array.isArray(raw.activityGroups)
    ? raw.activityGroups.map((group: any) => ({ ...group }))
    : legacyGroups

  const labels = Array.isArray(raw.labels)
    ? raw.labels.map((label: any) => ({ ...label }))
    : []

  const items = Array.isArray(raw.items)
    ? raw.items.map((item: any) => cloneItem(item))
    : []

  const normalized: any = {
    ...raw,
    rings,
    activityGroups,
    labels,
    items,
  }

  // Maintain legacy alias so older clients remain compatible
  normalized.activities = normalized.activityGroups

  return normalized
}

async function updateOrgDataAcrossPages(
  supabase: any,
  wheelId: string,
  mutate: (orgData: any, pageId: string) => boolean,
  targetPageIds?: string[]
) {
  let query = supabase
    .from('wheel_pages')
    .select('id, organization_data')
    .eq('wheel_id', wheelId)

  if (targetPageIds && targetPageIds.length > 0) {
    query = query.in('id', targetPageIds)
  }

  const { data: pages, error } = await query

  if (error) {
    throw new Error(`Kunde inte hämta sidor för att uppdatera struktur: ${error.message}`)
  }

  if (!pages || pages.length === 0) {
    return 0
  }

  let updatedCount = 0

  for (const page of pages) {
    const normalized = normalizeOrgData(page.organization_data)
    const changed = mutate(normalized, page.id)

    if (!changed) {
      continue
    }

    const { error: updateError } = await supabase
      .from('wheel_pages')
      .update({
        organization_data: {
          ...normalized,
          activities: normalized.activityGroups,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', page.id)

    if (updateError) {
      throw new Error(`Kunde inte uppdatera organization_data för sida ${page.id}: ${updateError.message}`)
    }

    updatedCount++
  }

  return updatedCount
}

async function updatePageOrganizationData(
  supabase: any,
  pageId: string,
  mutate: (orgData: any) => boolean
) {
  const { data: page, error } = await supabase
    .from('wheel_pages')
    .select('organization_data')
    .eq('id', pageId)
    .single()

  if (error) {
    throw new Error(`Kunde inte hämta sida ${pageId}: ${error.message}`)
  }

  const normalized = normalizeOrgData(page?.organization_data || {})
  const changed = mutate(normalized)

  if (!changed) {
    return false
  }

  const { error: updateError } = await supabase
    .from('wheel_pages')
    .update({
      organization_data: {
        ...normalized,
        activities: normalized.activityGroups,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', pageId)

  if (updateError) {
    throw new Error(`Kunde inte uppdatera organization_data för sida ${pageId}: ${updateError.message}`)
  }

  return true
}

function mapDbItemToOrgItem(dbItem: any) {
  const orgItem: any = {
    id: dbItem.id,
    ringId: dbItem.ring_id,
    activityId: dbItem.activity_id,
    labelId: dbItem.label_id ?? null,
    name: dbItem.name,
    startDate: dbItem.start_date,
    endDate: dbItem.end_date,
    time: dbItem.time ?? null,
    pageId: dbItem.page_id ?? null,
  }

  if (dbItem.description) orgItem.description = dbItem.description
  if (dbItem.linked_wheel_id) orgItem.linkedWheelId = dbItem.linked_wheel_id
  if (dbItem.link_type) orgItem.linkType = dbItem.link_type
  if (dbItem.source) orgItem.source = dbItem.source
  if (dbItem.external_id) orgItem.externalId = dbItem.external_id
  if (dbItem.sync_metadata) orgItem.syncMetadata = dbItem.sync_metadata

  return orgItem
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
      .select('id, name, color, visible')
      .eq('wheel_id', wheelId)

    organizationData = {
      rings: rings.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        color: r.color,
        visible: r.visible !== false,
        orientation: r.type === 'inner' ? r.orientation || 'vertical' : null
      })),
      activityGroups: groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        color: g.color,
        visible: g.visible !== false
      })),
      labels: (labels || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        visible: l.visible !== false
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

  let insertedItems: any[] = []
  if (itemsToInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select('*')

    if (insertError) throw insertError
    insertedItems = inserted || []

    if (insertedItems.length > 0) {
      await updatePageOrganizationData(supabase, newPageId, (orgData) => {
        const insertedIds = new Set(insertedItems.map((item) => item.id))
        orgData.items = orgData.items.filter((item: any) => !insertedIds.has(item.id))
        insertedItems.forEach((item) => {
          orgData.items.push(mapDbItemToOrgItem(item))
        })
        return insertedItems.length > 0
      })
    }
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
    description: 'Skapa en ny ring. Både "inner" och "outer" kan innehålla aktiviteter. ' +
      'Rekommendation: "outer" för mindre/externa händelser (helgdagar, lov, säsonger, terminer). ' +
      '"inner" för huvudspår, strategiska aktiviteter eller textbaserad planering.',
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
      if (result.success && result.pageId) {
        const pages = ctx.context.allPages || []
        if (!pages.some((p: any) => p.id === result.pageId)) {
          pages.push({
            id: result.pageId,
            year: result.year ?? input.year,
            title: `${result.year ?? input.year}`,
            page_order: pages.length,
          })
          ctx.context.allPages = pages
        }
      }
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
      if (result.success && result.pageId) {
        const pages = ctx.context.allPages || []
        if (!pages.some((p: any) => p.id === result.pageId)) {
          pages.push({
            id: result.pageId,
            year: result.year ?? input.targetYear,
            title: `${result.year ?? input.targetYear}`,
            page_order: pages.length,
          })
          ctx.context.allPages = pages
        }
      }
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
  instructions: `Du ansvarar för årshjulets struktur: ringar, aktivitetsgrupper, etiketter och årssidor. Svara på svenska med markdown-formattering. Inga emojis.

RINGTYPER (KRITISKT):
- Både "inner" och "outer" kan innehålla aktiviteter
- **Outer**: Används typiskt för mindre/externa händelser (helgdagar, lov, säsonger, terminer, externa milstolpar)
- **Inner**: Används för huvudspår, strategiska initiativ, projektfaser eller textbaserad planering

STRUCTURE SUGGESTIONS:
When user asks for structure ideas for a domain:
1. Call suggest_wheel_structure with the domain/purpose
2. Present the suggestion clearly (rings, groups, sample activities)
3. Ask if they want to create it
4. If yes: Create rings → Get IDs → Create groups with ring IDs → Done
5. User can then ask Activity Agent to add activities based on samples

YEAR PAGE MANAGEMENT:
- create_year_page: Creates new year page, optionally copying structure from existing pages
- smart_copy_year: Copies ALL activities from one year to another with adjusted dates

VISIBILITY:
- toggle_ring_visibility / toggle_group_visibility: Hide without deleting (preserves data)

CRUD OPERATIONS:
- create/update/delete tools for rings, groups, and labels
- Update/delete operations search by partial name match
- Delete fails if items still reference the structure (prevents orphaned data)
`,
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
      
      // Run sequentially to avoid organization_data race conditions
      for (let index = 0; index < input.activities.length; index++) {
        const activity = input.activities[index]
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
        } catch (error) {
          console.error('[batch_create_activities] Error creating activity:', activity.name, error)
          errors.push({
            index,
            name: activity.name,
            error: (error as Error).message
          })
        }
      }
      
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
    instructions: `Du skapar, uppdaterar och tar bort aktiviteter i årshjulet. Svara på svenska med markdown-formattering. Inga emojis.

RINGVAL:
- Både "inner" och "outer" ringar kan innehålla aktiviteter
- Matcha användarens beskrivning mot ringar baserat på betydelse:
  * Outer → mindre/externa händelser (helgdagar, lov, säsonger, externa deadlines)
  * Inner → huvudspår, teamarbete, projektfaser, strategiska initiativ
- Om båda passar: välj den ring vars namn ligger närmast användarens formulering

WORKFLOW:
1. Call get_current_context (provides current date and all ring/group IDs)
2. Match user's request to appropriate ring/group by name similarity
3. Parse dates relative to current date from context
4. Call the appropriate tool with matched UUIDs
5. Report the actual tool result

EXAMPLE - Creating an activity:
User: "skapa kampanj i november"
→ get_current_context returns: {date: "2025-11-05", rings: [{id: "abc", name: "Kampanjer"}], groups: [{id: "def", name: "Kampanj"}]}
→ Match: "kampanj" → ring "Kampanjer" (abc) + group "Kampanj" (def)
→ Parse: "november" → "2025-11-01" to "2025-11-30" (current year since Nov >= current month)
→ create_activity({name: "kampanj", startDate: "2025-11-01", endDate: "2025-11-30", ringId: "abc", activityGroupId: "def"})
→ Tool returns: {success: true, itemsCreated: 1}
→ Respond: "Klart! Jag har skapat aktiviteten **Kampanj** i november 2025."

DATE PARSING:
- "idag" → Current date from context
- "november" without year → Current year if month >= current month, else next year
- "en vecka" → 7 days duration
- Always use YYYY-MM-DD format

UPDATING ACTIVITIES:
update_activity supports all changes including:
- Same year moves: "flytta till augusti" → Change dates within year
- Cross-year moves: "flytta till 2026" → Move to different year
- Multi-year spans: "från nov 2025 till mars 2026" → Extends across years (auto-splits)
- Property changes: "byt namn till X" → Change name, ring, or group

BATCH UPDATES:
For "ändra alla X" requests:
1. query_activities to find matches (searches ALL years automatically)
2. Use EXACT name from each query result when calling update_activity
3. Update each individually (query returns exact names, update requires exact match)
4. Report summary with count and affected years

Example:
User: "Ändra alla Månadsbrev till 1 dag"
→ query_activities({nameContains: "Månadsbrev"}) returns [{name: "Månadsbrev Januari", ...}, {name: "Månadsbrev Februari", ...}]
→ update_activity({activityName: "Månadsbrev Januari", newEndDate: "2026-01-15"})
→ update_activity({activityName: "Månadsbrev Februari", newEndDate: "2026-02-15"})
→ Report: "Uppdaterade 12 aktiviteter"

BULK CREATION:
Use batch_create_activities for multiple similar activities:
- "Skapa 12 månadskampanjer" → Build array of 12 activities, call batch_create_activities once
- Much faster than individual creates

SEARCH/FILTER:
Use query_activities to find activities (searches ALL years/pages automatically):
- "Visa kampanjer i Q4" → query_activities({quarter: 4, groupName: "Kampanj"})
- "Hitta aktiviteter med REA" → query_activities({nameContains: "REA"})

MULTI-YEAR ACTIVITIES:
Activities spanning multiple years are automatically split into segments. Missing year pages are auto-created with structure from existing pages.

IMPORTANT:
- Always use UUIDs from get_current_context, never use names as IDs
- Only confirm success after seeing success:true in tool result
- If tool fails, explain the error and suggest solutions`,
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
      tool_choice: 'auto'
    },
    instructions: `You analyze the Year Wheel and provide insights. Respond in Swedish with markdown formatting. No emojis.

WORKFLOW:
1. Call analyze_wheel tool immediately
2. Format the tool result with clear markdown structure
3. Present statistics and AI insights

OUTPUT STRUCTURE:
### Översikt för år {year}
- Basic counts (rings, groups, activities)

### Fördelning per kvartal  
- Q1-Q4 activity distribution

### AI-ANALYS
- Domain identification
- Quality assessment
- Recommendations

Only present data from the tool - never fabricate analysis

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
    instructions: `You generate AI-powered project plans with complete structure (rings, groups, activities). Respond in Swedish with markdown formatting. No emojis.

MULTI-YEAR AWARENESS:
- Wheels can have multiple year pages
- Call get_current_context to see available years: {pages: [{id, year, title}]}
- Activities spanning multiple years are auto-split into segments
- If user requests activities for non-existent year, offer to create that year page first

WORKFLOW:
1. Call get_current_context to see available years
2. Call suggest_plan with user's goal and time period → Save the RAW JSON string returned
3. Present the suggestions clearly (rings, groups, AND activities organized by quarter)
4. Wait for user approval ("ja", "applicera", etc.)
5. Call apply_suggested_plan with the EXACT JSON string from step 2 (unchanged)

CRITICAL FOR STEP 5:
- Send the COMPLETE JSON string from suggest_plan to apply_suggested_plan
- Parameter: { suggestionsJson: "<exact JSON string from suggest_plan>" }
- Do NOT modify the JSON - it contains rings, activityGroups AND activities
- If you don't send the full JSON, NO activities will be created

PRESENTATION FORMAT:
**Projektplan för: {goal}**
**Period:** {startDate} - {endDate}

**RINGAR ({X} st):**
List with descriptions

**AKTIVITETSGRUPPER ({Y} st):**  
List with descriptions

**AKTIVITETER ({Z} st):**
Organize by quarter with dates, ring, and group

**Översikt:** Brief explanation of plan logic

**Vill du att jag skapar denna struktur?**

AFTER APPLYING:
Read the actual result from apply_suggested_plan and report EXACT counts of what was created (not expected counts)`,
    tools: [getContextTool, suggestPlanTool, applySuggestedPlanTool],
  })

  // ──────────────────────────────────────────────────────────────────
  // MAIN ORCHESTRATOR AGENT - Using proper handoff() pattern
  // ──────────────────────────────────────────────────────────────────

  const orchestratorAgent = Agent.create<WheelContext>({
    name: 'Year Wheel Assistant',
    model: 'gpt-4o',
    instructions: `You help users plan and organize activities in a circular year wheel. Respond in Swedish. No emojis.

Immediately delegate to the appropriate specialist:

→ **Structure Agent**: Rings, activity groups, labels, year pages, structure suggestions
→ **Activity Agent**: Create/update/delete/query activities and events
→ **Analysis Agent**: Insights, statistics, quality assessment  
→ **Planning Agent**: AI-generated project plans for new goals

PRIORITY RULES:
1. Creation/modification requests → Act on them first (Activity or Structure Agent)
2. Activity operations always prioritized over analysis
3. If user asks to create AND analyze → Choose Activity Agent (create first)
4. Only transfer to ONE specialist per request

Keep your intro brief (1 sentence max) then transfer immediately.`,
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
