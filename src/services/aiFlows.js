/**
 * AI Flows for Flows AI
 * 
 * Complete flow definitions for deterministic AI assistant operations.
 * 
 * Flow Types:
 * - CRUD Flows: Create, update, delete activities
 * - Ring Flows: Manage rings
 * - Group Flows: Manage activity groups
 * - Page Flows: Manage year pages
 * - Analysis Flows: Analyze wheel data
 * - Master Routing: Route to correct flow based on intent
 */

import { sequence, forEach, oneOf } from 'flows-ai/flows';
import { z } from 'zod';

// ============================================================================
// ACTIVITY CRUD FLOWS
// ============================================================================

/**
 * Create Activity Flow
 * Handles single-year AND cross-year activities
 */
export const createActivityFlow = sequence([
  {
    name: 'parseIntent',
    agent: 'intentParserAgent',
    input: 'Extract activity details: name, startDate, endDate, ringName, activityGroupName, labelName, time'
  },
  {
    name: 'resolvePages',
    agent: 'pageResolverAgent',
    input: 'Map dates to page IDs (split by year if cross-year)'
  },
  forEach({
    item: z.object({
      pageId: z.string().describe('Page UUID'),
      startDate: z.string().describe('YYYY-MM-DD'),
      endDate: z.string().describe('YYYY-MM-DD'),
      year: z.number().describe('Year number')
    }),
    input: {
      name: 'createItemOnPage',
      agent: 'itemCreatorAgent',
      input: 'Create item with page_id'
    }
  }),
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format user-friendly confirmation message'
  }
]);

/**
 * Update Activity Flow
 * Handles same-year and cross-year updates
 */
export const updateActivityFlow = sequence([
  {
    name: 'parseUpdateIntent',
    agent: 'updateIntentParserAgent',
    input: 'Extract: itemId or itemName, fields to update (name, dates, ring, group, label)'
  },
  {
    name: 'findItem',
    agent: 'itemFinderAgent',
    input: 'Find item by ID or fuzzy match by name'
  },
  oneOf([
    {
      when: 'Date change crosses year boundary',
      input: {
        name: 'handleCrossYearUpdate',
        agent: 'crossYearUpdateAgent',
        input: 'Delete old item, create new items on correct pages'
      }
    },
    {
      when: 'Date change stays within same year',
      input: {
        name: 'handleSameYearUpdate',
        agent: 'sameYearUpdateAgent',
        input: 'Update item in place'
      }
    }
  ]),
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format confirmation'
  }
]);

/**
 * Delete Activities Flow
 * Handles single and bulk deletion
 */
export const deleteActivitiesFlow = sequence([
  {
    name: 'parseDeleteIntent',
    agent: 'deleteIntentParserAgent',
    input: 'Extract: itemIds or search criteria (name pattern, date range, ring, group)'
  },
  {
    name: 'findItemsToDelete',
    agent: 'itemFetcherAgent',
    input: 'Find all matching items'
  },
  forEach({
    item: z.object({
      id: z.string().describe('Item UUID'),
      name: z.string().describe('Item name')
    }),
    input: {
      name: 'deleteItem',
      agent: 'itemDeleterAgent',
      input: 'Delete item from database'
    }
  }),
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format confirmation with deleted items list'
  }
]);

/**
 * List/Query Items Flow
 * Fetches and displays items with filters
 */
export const listItemsFlow = sequence([
  {
    name: 'parseListIntent',
    agent: 'listIntentParserAgent',
    input: 'Extract filters: dateRange, ringName, activityGroupName, labelName, currentPageOnly'
  },
  {
    name: 'fetchItems',
    agent: 'itemFetcherAgent',
    input: 'Fetch items matching filters'
  },
  {
    name: 'formatList',
    agent: 'listFormatterAgent',
    input: 'Format items into readable list with dates, rings, groups'
  }
]);

// ============================================================================
// RING FLOWS
// ============================================================================

/**
 * Create Ring Flow
 */
export const createRingFlow = sequence([
  {
    name: 'parseRingIntent',
    agent: 'ringIntentParserAgent',
    input: 'Extract: name, type (inner/outer), orientation, color'
  },
  {
    name: 'createRing',
    agent: 'ringCreatorAgent',
    input: 'Create ring in database'
  },
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format confirmation'
  }
]);

/**
 * Update Ring Flow
 */
export const updateRingFlow = sequence([
  {
    name: 'parseUpdateIntent',
    agent: 'ringUpdateIntentParserAgent',
    input: 'Extract: ringId or name, fields to update'
  },
  {
    name: 'findRing',
    agent: 'ringFinderAgent',
    input: 'Find ring by ID or name'
  },
  {
    name: 'updateRing',
    agent: 'ringUpdaterAgent',
    input: 'Update ring in database'
  },
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format confirmation'
  }
]);

/**
 * List Rings Flow
 */
export const listRingsFlow = sequence([
  {
    name: 'fetchRings',
    agent: 'ringFetcherAgent',
    input: 'Fetch all rings with metadata'
  },
  {
    name: 'formatList',
    agent: 'ringListFormatterAgent',
    input: 'Format rings into readable list'
  }
]);

// ============================================================================
// ACTIVITY GROUP FLOWS
// ============================================================================

/**
 * Create Activity Group Flow
 */
export const createActivityGroupFlow = sequence([
  {
    name: 'parseGroupIntent',
    agent: 'groupIntentParserAgent',
    input: 'Extract: name, color'
  },
  {
    name: 'createGroup',
    agent: 'groupCreatorAgent',
    input: 'Create activity group in database'
  },
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format confirmation'
  }
]);

/**
 * Update Activity Group Flow
 */
export const updateActivityGroupFlow = sequence([
  {
    name: 'parseUpdateIntent',
    agent: 'groupUpdateIntentParserAgent',
    input: 'Extract: groupId or name, fields to update'
  },
  {
    name: 'findGroup',
    agent: 'groupFinderAgent',
    input: 'Find group by ID or name'
  },
  {
    name: 'updateGroup',
    agent: 'groupUpdaterAgent',
    input: 'Update group in database'
  },
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format confirmation'
  }
]);

/**
 * List Activity Groups Flow
 */
export const listActivityGroupsFlow = sequence([
  {
    name: 'fetchGroups',
    agent: 'groupFetcherAgent',
    input: 'Fetch all activity groups'
  },
  {
    name: 'formatList',
    agent: 'groupListFormatterAgent',
    input: 'Format groups into readable list with colors'
  }
]);

// ============================================================================
// PAGE FLOWS
// ============================================================================

/**
 * Create Page Flow
 */
export const createPageFlow = sequence([
  {
    name: 'parsePageIntent',
    agent: 'pageIntentParserAgent',
    input: 'Extract: year'
  },
  {
    name: 'checkExisting',
    agent: 'pageCheckerAgent',
    input: 'Check if page for year already exists'
  },
  oneOf([
    {
      when: 'Page already exists',
      input: {
        name: 'returnExisting',
        agent: 'existingPageAgent',
        input: 'Return existing page info'
      }
    },
    {
      when: 'Page does not exist',
      input: {
        name: 'createNewPage',
        agent: 'pageCreatorAgent',
        input: 'Create new page for year'
      }
    }
  ]),
  {
    name: 'formatConfirmation',
    agent: 'confirmationFormatterAgent',
    input: 'Format confirmation'
  }
]);

// ============================================================================
// ANALYSIS & QUERY FLOWS
// ============================================================================

/**
 * Analyze Wheel Flow
 * Comprehensive analysis of wheel data
 */
export const analyzeWheelFlow = sequence([
  {
    name: 'fetchAllData',
    agent: 'wheelDataFetcherAgent',
    input: 'Fetch complete wheel data (rings, groups, items across all pages)'
  },
  {
    name: 'performAnalysis',
    agent: 'wheelAnalyzerAgent',
    input: 'Analyze: utilization, gaps, conflicts, patterns, recommendations'
  },
  {
    name: 'formatReport',
    agent: 'analysisReportFormatterAgent',
    input: 'Format analysis into structured report'
  }
]);

/**
 * General Query Flow
 * Fallback for questions and help requests
 */
export const generalQueryFlow = sequence([
  {
    name: 'understandQuery',
    agent: 'queryUnderstandingAgent',
    input: 'Understand user intent and context'
  },
  {
    name: 'generateResponse',
    agent: 'responseGeneratorAgent',
    input: 'Generate contextual response'
  }
]);

// ============================================================================
// MASTER ROUTING FLOW
// ============================================================================

/**
 * Master Routing Flow
 * Routes user request to appropriate flow based on intent
 */
export const masterRoutingFlow = oneOf([
  {
    when: 'User wants to create activity/event/item (keywords: skapa, lägg till, ny aktivitet)',
    input: createActivityFlow
  },
  {
    when: 'User wants to update/modify/change activity (keywords: ändra, uppdatera, ändra, flytta)',
    input: updateActivityFlow
  },
  {
    when: 'User wants to delete/remove activity (keywords: ta bort, radera, remove)',
    input: deleteActivitiesFlow
  },
  {
    when: 'User wants to list/show activities or query items (keywords: visa, lista, vad finns)',
    input: listItemsFlow
  },
  {
    when: 'User wants to create ring (keywords: skapa ring, lägg till ring)',
    input: createRingFlow
  },
  {
    when: 'User wants to update/modify ring (keywords: ändra ring, uppdatera ring)',
    input: updateRingFlow
  },
  {
    when: 'User wants to list/show rings (keywords: visa ringar, lista ringar)',
    input: listRingsFlow
  },
  {
    when: 'User wants to create activity group/category (keywords: skapa grupp, lägg till kategori)',
    input: createActivityGroupFlow
  },
  {
    when: 'User wants to update/modify group (keywords: ändra grupp, uppdatera kategori)',
    input: updateActivityGroupFlow
  },
  {
    when: 'User wants to list/show groups (keywords: visa grupper, lista kategorier)',
    input: listActivityGroupsFlow
  },
  {
    when: 'User wants to create page for year (keywords: skapa sida, lägg till år)',
    input: createPageFlow
  },
  {
    when: 'User wants analysis/overview/insights about wheel (keywords: analysera, översikt, insights)',
    input: analyzeWheelFlow
  },
  {
    when: 'User asks general question or needs help (keywords: hur, vad är, hjälp)',
    input: generalQueryFlow
  }
]);
