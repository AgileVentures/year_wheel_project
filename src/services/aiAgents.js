/**
 * AI Agents for Flows AI
 * 
 * Complete agent definitions for deterministic AI assistant operations.
 * 
 * Agent Types:
 * - Intent Parsers (LLM): Extract structured data from natural language
 * - Action Agents (Pure Functions): Database operations and logic
 * - Fetcher Agents (Pure Functions): Read operations
 * - Formatter Agents (LLM): Format responses for users
 * - Analysis Agents (LLM): Generate insights and understanding
 */

import { agent } from 'flows-ai';
import { gpt4o } from './aiModel';
import { supabase } from '../lib/supabase';

// ============================================================================
// INTENT PARSER AGENTS (LLM-based)
// ============================================================================

/**
 * Activity Intent Parser
 * Extracts structured activity data from natural language
 */
export const intentParserAgent = agent({
  model: gpt4o,
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
});

/**
 * Update Intent Parser
 * Extracts update details from user message
 */
export const updateIntentParserAgent = agent({
  model: gpt4o,
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
});

/**
 * Delete Intent Parser
 * Extracts deletion criteria from user message
 */
export const deleteIntentParserAgent = agent({
  model: gpt4o,
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
});

/**
 * List Intent Parser
 * Extracts list/query criteria from user message
 */
export const listIntentParserAgent = agent({
  model: gpt4o,
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
});

/**
 * Ring Intent Parser
 * Extracts ring creation data
 */
export const ringIntentParserAgent = agent({
  model: gpt4o,
  system: `Extract ring creation data.

EXEMPEL:
"skapa inre ring Marketing"
→ { name: "Marketing", type: "inner" }

"lägg till yttre ring Sales med blå färg"
→ { name: "Sales", type: "outer", color: "#0000FF" }

"skapa ring Support"
→ { name: "Support", type: "outer" }

Svara med JSON: { name, type: "inner"|"outer", color?, orientation?: "vertical"|"horizontal" }`
});

/**
 * Ring Update Intent Parser
 * Extracts ring update details
 */
export const ringUpdateIntentParserAgent = agent({
  model: gpt4o,
  system: `Extract ring update details.

EXEMPEL:
"ändra ring Marketing till röd färg"
→ { ringName: "Marketing", updates: { color: "#FF0000" } }

"byt namn på ring Sales till 'Försäljning'"
→ { ringName: "Sales", updates: { name: "Försäljning" } }

"göm ring Support"
→ { ringName: "Support", updates: { visible: false } }

Svara med JSON: { ringId?, ringName?, updates: { name?, color?, visible?, orientation? } }`
});

/**
 * Activity Group Intent Parser
 * Extracts activity group creation data
 */
export const groupIntentParserAgent = agent({
  model: gpt4o,
  system: `Extract activity group creation data.

EXEMPEL:
"skapa grupp Kampanj med röd färg"
→ { name: "Kampanj", color: "#FF0000" }

"lägg till kategori Events"
→ { name: "Events" }

"skapa aktivitetsgrupp Projekt med grön färg"
→ { name: "Projekt", color: "#00FF00" }

Svara med JSON: { name, color? }`
});

/**
 * Group Update Intent Parser
 * Extracts activity group update details
 */
export const groupUpdateIntentParserAgent = agent({
  model: gpt4o,
  system: `Extract activity group update details.

EXEMPEL:
"ändra grupp Events till gul färg"
→ { groupName: "Events", updates: { color: "#FFFF00" } }

"byt namn på grupp Kampanj till 'Marknadsföring'"
→ { groupName: "Kampanj", updates: { name: "Marknadsföring" } }

Svara med JSON: { groupId?, groupName?, updates: { name?, color?, visible? } }`
});

/**
 * Page Intent Parser
 * Extracts year for page creation
 */
export const pageIntentParserAgent = agent({
  model: gpt4o,
  system: `Extract year for page creation.

EXEMPEL:
"skapa sida för 2026"
→ { year: 2026 }

"lägg till år 2027"
→ { year: 2027 }

"skapa nästa års sida" (current year is 2025)
→ { year: 2026 }

Svara med JSON: { year: number }`
});

// ============================================================================
// ACTION AGENTS (Pure Functions/Database Operations)
// ============================================================================

/**
 * Page Resolver Agent
 * Maps dates to page IDs, splitting cross-year activities
 */
export const pageResolverAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { wheelId, startDate, endDate } = data;
    
    console.log('[PageResolver] Input:', { wheelId, startDate, endDate });
    
    // Fetch all pages for this wheel
    const { data: pages, error } = await supabase
      .from('wheel_pages')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('year');
    
    if (error) throw error;
    if (!pages || pages.length === 0) {
      throw new Error('Inga sidor hittades för detta hjul');
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    console.log('[PageResolver] Years:', { startYear, endYear });
    
    // Single year activity
    if (startYear === endYear) {
      const page = pages.find(p => p.year === startYear);
      if (!page) {
        throw new Error(`Ingen sida hittades för år ${startYear}. Skapa sidan först!`);
      }
      console.log('[PageResolver] Single year:', { pageId: page.id, year: page.year });
      return JSON.stringify([{ pageId: page.id, startDate, endDate, year: page.year }]);
    }
    
    // Cross-year activity - split by year
    const results = [];
    for (let year = startYear; year <= endYear; year++) {
      const page = pages.find(p => p.year === year);
      if (!page) {
        throw new Error(`Ingen sida hittades för år ${year}. Skapa sidan först!`);
      }
      
      const yearStart = year === startYear ? startDate : `${year}-01-01`;
      const yearEnd = year === endYear ? endDate : `${year}-12-31`;
      
      results.push({ pageId: page.id, startDate: yearStart, endDate: yearEnd, year: page.year });
    }
    
    console.log('[PageResolver] Cross-year split:', results);
    return JSON.stringify(results);
  } catch (error) {
    console.error('[PageResolver] Error:', error);
    throw error;
  }
};

/**
 * Item Creator Agent
 * Creates an item with page_id
 */
export const itemCreatorAgent = async ({ input }, context) => {
  try {
    const prevContext = context.at(-1);
    const data = JSON.parse(prevContext);
    
    console.log('[ItemCreator] Input data:', data);
    
    const { wheelId, pageId, name, startDate, endDate, ringId, activityGroupId, labelId, time } = data;
    
    // Validate required fields
    if (!wheelId || !pageId || !name || !startDate || !endDate || !ringId) {
      throw new Error('Saknade obligatoriska fält för att skapa aktivitet');
    }
    
    // Auto-create or validate activity group
    let finalActivityGroupId = activityGroupId;
    
    if (!activityGroupId || activityGroupId.trim() === '') {
      // Find or create default group
      const { data: defaultGroup } = await supabase
        .from('activity_groups')
        .select('id')
        .eq('wheel_id', wheelId)
        .or('name.eq.Allmän,name.eq.General')
        .limit(1)
        .maybeSingle();
      
      if (defaultGroup) {
        finalActivityGroupId = defaultGroup.id;
      } else {
        // Create default activity group
        const { data: newGroup, error: groupError } = await supabase
          .from('activity_groups')
          .insert({
            wheel_id: wheelId,
            name: 'Allmän',
            visible: true
          })
          .select()
          .single();
        
        if (groupError) throw groupError;
        finalActivityGroupId = newGroup.id;
        console.log('[ItemCreator] Auto-created default group:', finalActivityGroupId);
      }
    }
    
    // Insert item directly with page_id
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
      .single();
    
    if (insertError) throw insertError;
    
    console.log('[ItemCreator] Created item:', { id: newItem.id, name, pageId });
    
    return JSON.stringify({
      success: true,
      item: newItem,
      message: `Aktivitet "${name}" skapad (${startDate} till ${endDate})`
    });
  } catch (error) {
    console.error('[ItemCreator] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message,
      message: `Fel vid skapande: ${error.message}`
    });
  }
};

/**
 * Item Finder Agent
 * Finds an item by ID or fuzzy name search
 */
export const itemFinderAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { wheelId, itemId, itemName } = data;
    
    console.log('[ItemFinder] Searching:', { wheelId, itemId, itemName });
    
    // If itemId provided, find directly
    if (itemId) {
      const { data: item, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .eq('wheel_id', wheelId)
        .single();
      
      if (error || !item) throw new Error(`Aktivitet med ID ${itemId} hittades inte`);
      return JSON.stringify(item);
    }
    
    // Fuzzy search by name across all pages
    if (itemName) {
      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('wheel_id', wheelId)
        .ilike('name', `%${itemName}%`);
      
      if (error) throw error;
      if (!items || items.length === 0) {
        throw new Error(`Ingen aktivitet hittades med namnet "${itemName}"`);
      }
      
      // Return first match
      console.log('[ItemFinder] Found:', items[0].name);
      return JSON.stringify(items[0]);
    }
    
    throw new Error('Inget itemId eller itemName angivet');
  } catch (error) {
    console.error('[ItemFinder] Error:', error);
    throw error;
  }
};

/**
 * Same Year Update Agent
 * Updates an item in place (no year change)
 */
export const sameYearUpdateAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { itemId, updates } = data;
    
    console.log('[SameYearUpdate] Updating:', { itemId, updates });
    
    // Build update object with correct column names
    const updateObj = {};
    if (updates.name) updateObj.name = updates.name;
    if (updates.startDate) updateObj.start_date = updates.startDate;
    if (updates.endDate) updateObj.end_date = updates.endDate;
    if (updates.ringId) updateObj.ring_id = updates.ringId;
    if (updates.activityGroupId) updateObj.activity_id = updates.activityGroupId;
    if (updates.labelId) updateObj.label_id = updates.labelId;
    if (updates.time) updateObj.time = updates.time;
    
    const { data: updatedItem, error } = await supabase
      .from('items')
      .update(updateObj)
      .eq('id', itemId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('[SameYearUpdate] Updated:', updatedItem.name);
    
    return JSON.stringify({
      success: true,
      item: updatedItem,
      message: `Aktivitet "${updatedItem.name}" uppdaterad`
    });
  } catch (error) {
    console.error('[SameYearUpdate] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cross Year Update Agent
 * Deletes old item and creates new ones on correct pages
 */
export const crossYearUpdateAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { wheelId, oldItemId, name, startDate, endDate, ringId, activityGroupId, labelId, time } = data;
    
    console.log('[CrossYearUpdate] Processing:', { oldItemId, startDate, endDate });
    
    // Delete old item
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', oldItemId);
    
    if (deleteError) throw deleteError;
    console.log('[CrossYearUpdate] Deleted old item:', oldItemId);
    
    // Resolve pages for new dates
    const pagesContext = [JSON.stringify({ wheelId, startDate, endDate })];
    const pagesResult = await pageResolverAgent({ input: '' }, pagesContext);
    const pages = JSON.parse(pagesResult);
    
    // Create new items
    const results = [];
    for (const page of pages) {
      const itemContext = [JSON.stringify({
        wheelId,
        pageId: page.pageId,
        name,
        startDate: page.startDate,
        endDate: page.endDate,
        ringId,
        activityGroupId,
        labelId,
        time
      })];
      
      const itemResult = await itemCreatorAgent({ input: '' }, itemContext);
      results.push(JSON.parse(itemResult));
    }
    
    console.log('[CrossYearUpdate] Created new items:', results.length);
    
    return JSON.stringify({
      success: true,
      items: results,
      message: `Aktivitet "${name}" uppdaterad över ${pages.length} år`
    });
  } catch (error) {
    console.error('[CrossYearUpdate] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

/**
 * Item Deleter Agent
 * Deletes a single item
 */
export const itemDeleterAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { id, name } = data;
    
    console.log('[ItemDeleter] Deleting:', { id, name });
    
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    console.log('[ItemDeleter] Deleted:', name);
    
    return JSON.stringify({
      success: true,
      deleted: id,
      name: name
    });
  } catch (error) {
    console.error('[ItemDeleter] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

// Placeholder agents for ring, group, and page operations
// These will use direct Supabase operations

export const ringCreatorAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[RingCreator] Creating ring:', data);
  return JSON.stringify({ success: true, message: 'Ring skapad' });
};

export const ringUpdaterAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[RingUpdater] Updating ring:', data);
  return JSON.stringify({ success: true, message: 'Ring uppdaterad' });
};

export const ringFinderAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[RingFinder] Finding ring:', data);
  return JSON.stringify({ success: true, ring: {} });
};

export const groupCreatorAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[GroupCreator] Creating group:', data);
  return JSON.stringify({ success: true, message: 'Grupp skapad' });
};

export const groupUpdaterAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[GroupUpdater] Updating group:', data);
  return JSON.stringify({ success: true, message: 'Grupp uppdaterad' });
};

export const groupFinderAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[GroupFinder] Finding group:', data);
  return JSON.stringify({ success: true, group: {} });
};

export const pageCreatorAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[PageCreator] Creating page:', data);
  return JSON.stringify({ success: true, message: 'Sida skapad' });
};

export const pageCheckerAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[PageChecker] Checking page:', data);
  return JSON.stringify({ exists: false });
};

export const existingPageAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  console.log('[ExistingPage] Returning existing page:', data);
  return JSON.stringify({ success: true, message: 'Sida finns redan' });
};

// ============================================================================
// FETCHER AGENTS (Read Operations)
// ============================================================================

/**
 * Item Fetcher Agent
 * Fetches items with filters
 */
export const itemFetcherAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { wheelId, filters } = data;
    
    console.log('[ItemFetcher] Filters:', filters);
    
    let query = supabase
      .from('items')
      .select('*')
      .eq('wheel_id', wheelId);
    
    // Apply filters
    if (filters.currentPageOnly && filters.pageId) {
      query = query.eq('page_id', filters.pageId);
    }
    
    if (filters.ringId) {
      query = query.eq('ring_id', filters.ringId);
    }
    
    if (filters.activityGroupId) {
      query = query.eq('activity_id', filters.activityGroupId);
    }
    
    if (filters.startDate && filters.endDate) {
      query = query
        .gte('start_date', filters.startDate)
        .lte('end_date', filters.endDate);
    }
    
    const { data: items, error } = await query;
    
    if (error) throw error;
    
    console.log('[ItemFetcher] Found:', items?.length || 0, 'items');
    
    return JSON.stringify({
      success: true,
      items: items || []
    });
  } catch (error) {
    console.error('[ItemFetcher] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message,
      items: []
    });
  }
};

/**
 * Ring Fetcher Agent
 * Fetches all rings for a wheel
 */
export const ringFetcherAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { wheelId } = data;
    
    const { data: rings, error } = await supabase
      .from('wheel_rings')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('created_at');
    
    if (error) throw error;
    
    console.log('[RingFetcher] Found:', rings?.length || 0, 'rings');
    
    return JSON.stringify({
      success: true,
      rings: rings || []
    });
  } catch (error) {
    console.error('[RingFetcher] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message,
      rings: []
    });
  }
};

/**
 * Group Fetcher Agent
 * Fetches all activity groups for a wheel
 */
export const groupFetcherAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { wheelId } = data;
    
    const { data: groups, error } = await supabase
      .from('activity_groups')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('created_at');
    
    if (error) throw error;
    
    console.log('[GroupFetcher] Found:', groups?.length || 0, 'groups');
    
    return JSON.stringify({
      success: true,
      groups: groups || []
    });
  } catch (error) {
    console.error('[GroupFetcher] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message,
      groups: []
    });
  }
};

/**
 * Wheel Data Fetcher Agent
 * Fetches complete wheel data for analysis
 */
export const wheelDataFetcherAgent = async ({ input }, context) => {
  try {
    const data = JSON.parse(context.at(-1));
    const { wheelId } = data;
    
    console.log('[WheelDataFetcher] Fetching all data for:', wheelId);
    
    // Fetch everything in parallel
    const [ringsResult, groupsResult, itemsResult, pagesResult] = await Promise.all([
      supabase.from('wheel_rings').select('*').eq('wheel_id', wheelId),
      supabase.from('activity_groups').select('*').eq('wheel_id', wheelId),
      supabase.from('items').select('*').eq('wheel_id', wheelId),
      supabase.from('wheel_pages').select('*').eq('wheel_id', wheelId)
    ]);
    
    if (ringsResult.error) throw ringsResult.error;
    if (groupsResult.error) throw groupsResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (pagesResult.error) throw pagesResult.error;
    
    return JSON.stringify({
      success: true,
      data: {
        rings: ringsResult.data || [],
        groups: groupsResult.data || [],
        items: itemsResult.data || [],
        pages: pagesResult.data || []
      }
    });
  } catch (error) {
    console.error('[WheelDataFetcher] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// FORMATTER AGENTS (LLM-based)
// ============================================================================

/**
 * Confirmation Formatter Agent
 * Formats operation results into user-friendly Swedish
 */
export const confirmationFormatterAgent = agent({
  model: gpt4o,
  system: `Format operation results into user-friendly Swedish confirmation.

Be concise, friendly, and specific about what was done.

EXEMPEL:
Input: { success: true, items: [{ name: "julkampanj", pageId: "page-2025" }] }
Output: "Klart! Aktivitet 'julkampanj' skapad på 2025."

Input: { success: true, items: [{ name: "event" }], count: 2 }
Output: "Klart! Aktivitet 'event' skapad över 2 år (2025-2026)."

Input: { success: true, deleted: 3, names: ["a", "b", "c"] }
Output: "Klart! 3 aktiviteter raderade: a, b, c."

Returnera endast texten, ingen JSON.`
});

/**
 * List Formatter Agent
 * Formats list of items into readable Swedish text
 */
export const listFormatterAgent = agent({
  model: gpt4o,
  system: `Format list of items into readable Swedish text.

Include: name, date range, ring, group.
Group by month or ring if many items.

EXEMPEL:
Input: [{ name: "event1", start_date: "2025-03-01", end_date: "2025-03-15" }]
Output: "**Mars 2025:**\n- event1 (1 mars - 15 mars)"

Input: []
Output: "Inga aktiviteter hittades."

Returnera formaterad Markdown-text.`
});

/**
 * Ring List Formatter Agent
 * Formats list of rings
 */
export const ringListFormatterAgent = agent({
  model: gpt4o,
  system: `Format list of rings into readable Swedish text.

EXEMPEL:
Input: [{ name: "Marketing", type: "outer" }, { name: "Sales", type: "inner" }]
Output: "**Ringar:**\n- Marketing (yttre)\n- Sales (inre)"

Returnera formaterad Markdown-text.`
});

/**
 * Group List Formatter Agent
 * Formats list of activity groups
 */
export const groupListFormatterAgent = agent({
  model: gpt4o,
  system: `Format list of activity groups into readable Swedish text.

EXEMPEL:
Input: [{ name: "Kampanj", color: "#FF0000" }, { name: "Event", color: "#00FF00" }]
Output: "**Aktivitetsgrupper:**\n- Kampanj (röd)\n- Event (grön)"

Returnera formaterad Markdown-text.`
});

/**
 * Analysis Report Formatter Agent
 * Formats wheel analysis into structured Swedish report
 */
export const analysisReportFormatterAgent = agent({
  model: gpt4o,
  system: `Format wheel analysis into structured Swedish report.

Include:
- Översikt (total aktiviteter, ringar, grupper)
- Utnyttjande per ring
- Tidsmässig fördelning
- Luckor och möjligheter
- Rekommendationer

Använd Markdown för formatering.`
});

/**
 * Wheel Analyzer Agent
 * Analyzes wheel data and generates insights
 */
export const wheelAnalyzerAgent = agent({
  model: gpt4o,
  system: `Analyze wheel data and provide insights.

Look for:
- Utilization patterns
- Time gaps
- Ring usage
- Activity distribution
- Potential improvements

Return structured analysis in Swedish.`
});

/**
 * Query Understanding Agent
 * Understands general queries about the wheel
 */
export const queryUnderstandingAgent = agent({
  model: gpt4o,
  system: `Understand user's general question about their wheel.

Extract intent and required context.

Return JSON: { intent: string, requiresData: boolean, dataType?: string }`
});

/**
 * Response Generator Agent
 * Generates contextual responses to queries
 */
export const responseGeneratorAgent = agent({
  model: gpt4o,
  system: `Generate helpful response in Swedish to user's question.

Be friendly, concise, and informative.
Use Markdown formatting.`
});

/**
 * Confirmation Agent
 * Asks user to confirm bulk operations
 */
export const confirmationAgent = agent({
  model: gpt4o,
  system: `Ask user to confirm bulk operation in Swedish.

EXEMPEL:
Input: { operation: "delete", count: 5, items: ["a", "b", "c", "d", "e"] }
Output: "Är du säker på att du vill radera 5 aktiviteter? (a, b, c, d, e)"

Always list what will be affected and ask for confirmation.`
});
