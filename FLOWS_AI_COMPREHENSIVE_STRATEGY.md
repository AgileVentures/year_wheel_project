# Flows AI Comprehensive Implementation Strategy

## Overview
Replace the current Vercel AI SDK `streamText` approach with Flows AI as the primary orchestration layer for ALL AI assistant operations in Year Wheel POC.

## Why Go All-In on Flows AI?

### Current Problems with streamText + tools
1. **Unreliable Multi-Step Execution** - Model decides when to stop
2. **Tool Execution is Optional** - Model can ignore tools
3. **No Guaranteed Workflow** - Prompt engineering doesn't force behavior
4. **Reactive Rather Than Deterministic** - Can't predict execution path

### Benefits of Full Flows AI Migration
1. **Deterministic Execution** - Every operation follows defined flow
2. **Guaranteed Tool Usage** - Flow structure ensures functions are called
3. **Better Context Management** - Automatic context passing between steps
4. **Easier Debugging** - onFlowStart/onFlowFinish trace every step
5. **Composable Workflows** - Build complex operations from simple flows
6. **Future-Proof** - Easy to add new operations (batch, conditional, etc.)

---

## Architecture Redesign

### Before (Current - Unreliable)
```javascript
// All operations use streamText with tools
streamText({
  model: openai('gpt-4o'),
  messages: chatMessages,
  maxSteps: 12, // ← Not guaranteed!
  tools: {
    getAvailablePages: tool({ ... }),
    createItem: tool({ ... }),
    updateItem: tool({ ... }),
    deleteItems: tool({ ... }),
    // ... etc
  }
});

// Problem: Model decides IF and WHEN to use tools
```

### After (New - Deterministic)
```javascript
// All operations use Flows AI with defined workflows
const operation = detectOperation(userMessage);

const flows = {
  'create-activity': createActivityFlow,
  'update-activity': updateActivityFlow,
  'delete-activities': deleteActivitiesFlow,
  'list-items': listItemsFlow,
  'create-ring': createRingFlow,
  'update-ring': updateRingFlow,
  'list-rings': listRingsFlow,
  'create-group': createActivityGroupFlow,
  'update-group': updateActivityGroupFlow,
  'list-groups': listActivityGroupsFlow,
  'create-page': createPageFlow,
  'analyze-wheel': analyzeWheelFlow,
  'general-query': generalQueryFlow
};

await execute(flows[operation], {
  agents: { ... },
  input: userMessage
});

// Guaranteed: Flow structure ensures correct execution
```

---

## Complete Flow Definitions

### 1. Create Activity Flow (Handles ALL Cases)

```javascript
// src/services/aiFlows.js

import { sequence, forEach, oneOf } from 'flows-ai/flows';
import { z } from 'zod';

export const createActivityFlow = sequence([
  {
    name: 'parseIntent',
    agent: 'intentParserAgent',
    input: 'Extract activity details: name, startDate, endDate, ringId, activityGroupId, labelId, time'
  },
  {
    name: 'getAvailablePages',
    agent: 'pageResolverAgent',
    input: 'Map dates to page IDs (split by year if cross-year)'
  },
  forEach({
    item: z.object({
      pageId: z.string().describe('Page UUID'),
      startDate: z.string().describe('YYYY-MM-DD'),
      endDate: z.string().describe('YYYY-MM-DD')
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
```

### 2. Update Activity Flow

```javascript
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
```

### 3. Delete Activities Flow

```javascript
export const deleteActivitiesFlow = sequence([
  {
    name: 'parseDeleteIntent',
    agent: 'deleteIntentParserAgent',
    input: 'Extract: itemIds or search criteria (name pattern, date range, ring, group)'
  },
  {
    name: 'findItemsToDelete',
    agent: 'itemFinderAgent',
    input: 'Find all matching items'
  },
  {
    name: 'confirmDeletion',
    agent: 'confirmationAgent',
    input: 'Ask user to confirm deletion count'
  },
  forEach({
    item: z.object({
      id: z.string(),
      name: z.string()
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
```

### 4. List/Query Items Flow

```javascript
export const listItemsFlow = sequence([
  {
    name: 'parseListIntent',
    agent: 'listIntentParserAgent',
    input: 'Extract filters: dateRange, ringId, activityGroupId, labelId, currentPageOnly'
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
```

### 5. Create Ring Flow

```javascript
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
```

### 6. Update Ring Flow

```javascript
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
```

### 7. List Rings Flow

```javascript
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
```

### 8. Create Activity Group Flow

```javascript
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
```

### 9. Update Activity Group Flow

```javascript
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
```

### 10. List Activity Groups Flow

```javascript
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
```

### 11. Create Page Flow

```javascript
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
```

### 12. Analyze Wheel Flow

```javascript
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
```

### 13. General Query Flow (Fallback)

```javascript
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
```

---

## Master Routing Flow

```javascript
// src/services/aiFlows.js

export const masterRoutingFlow = oneOf([
  {
    when: 'User wants to create activity/event/item',
    input: createActivityFlow
  },
  {
    when: 'User wants to update/modify/change activity',
    input: updateActivityFlow
  },
  {
    when: 'User wants to delete/remove activity',
    input: deleteActivitiesFlow
  },
  {
    when: 'User wants to list/show activities or query items',
    input: listItemsFlow
  },
  {
    when: 'User wants to create ring',
    input: createRingFlow
  },
  {
    when: 'User wants to update/modify ring',
    input: updateRingFlow
  },
  {
    when: 'User wants to list/show rings',
    input: listRingsFlow
  },
  {
    when: 'User wants to create activity group/category',
    input: createActivityGroupFlow
  },
  {
    when: 'User wants to update/modify group',
    input: updateActivityGroupFlow
  },
  {
    when: 'User wants to list/show groups',
    input: listActivityGroupsFlow
  },
  {
    when: 'User wants to create page for year',
    input: createPageFlow
  },
  {
    when: 'User wants analysis/overview/insights about wheel',
    input: analyzeWheelFlow
  },
  {
    when: 'User asks general question or needs help',
    input: generalQueryFlow
  }
]);
```

---

## Complete Agent Definitions

### Core Parser Agents (LLM-based)

```javascript
// src/services/aiAgents.js

import { agent } from 'flows-ai';
import { openai } from '@ai-sdk/openai';

// Activity Intent Parser
export const intentParserAgent = agent({
  model: openai('gpt-4o'),
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

REGLER:
- Om år saknas, använd nuvarande år (2025)
- Om exakt datum saknas, anta första/sista dagen i månaden
- Extrahera ring från "på ring X" eller "i ring X"
- Extrahera grupp från "i gruppen X" eller "kategori X"
- Extrahera label från "med etikett X" eller "label X"
- Extrahera tid från "kl 14:00" eller "14.00"

Svara med JSON.`
});

// Update Intent Parser
export const updateIntentParserAgent = agent({
  model: openai('gpt-4o'),
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

Svara med JSON: { itemIdentifier?, itemId?, updates: {...} }`
});

// Delete Intent Parser
export const deleteIntentParserAgent = agent({
  model: openai('gpt-4o'),
  system: `Extract deletion criteria from user message.

EXEMPEL:
"ta bort julkampanj"
→ { namePattern: "julkampanj" }

"radera alla aktiviteter i december"
→ { startDate: "2025-12-01", endDate: "2025-12-31" }

"ta bort alla i ring Marketing"
→ { ringName: "Marketing" }

Svara med JSON: { namePattern?, itemIds?, dateRange?, ringName?, groupName? }`
});

// List Intent Parser
export const listIntentParserAgent = agent({
  model: openai('gpt-4o'),
  system: `Extract list/query criteria from user message.

EXEMPEL:
"visa alla aktiviteter i mars"
→ { startDate: "2025-03-01", endDate: "2025-03-31" }

"lista aktiviteter på ring Marketing"
→ { ringName: "Marketing" }

"vad finns i gruppen Kampanj"
→ { activityGroupName: "Kampanj" }

Svara med JSON: { dateRange?, ringName?, groupName?, currentPageOnly? }`
});

// Ring Intent Parser
export const ringIntentParserAgent = agent({
  model: openai('gpt-4o'),
  system: `Extract ring creation data.

EXEMPEL:
"skapa inre ring Marketing"
→ { name: "Marketing", type: "inner" }

"lägg till yttre ring Sales med blå färg"
→ { name: "Sales", type: "outer", color: "#0000FF" }

Svara med JSON: { name, type: "inner"|"outer", color?, orientation? }`
});

// Group Intent Parser
export const groupIntentParserAgent = agent({
  model: openai('gpt-4o'),
  system: `Extract activity group creation data.

EXEMPEL:
"skapa grupp Kampanj med röd färg"
→ { name: "Kampanj", color: "#FF0000" }

"lägg till kategori Events"
→ { name: "Events" }

Svara med JSON: { name, color? }`
});

// Page Intent Parser
export const pageIntentParserAgent = agent({
  model: openai('gpt-4o'),
  system: `Extract year for page creation.

EXEMPEL:
"skapa sida för 2026"
→ { year: 2026 }

"lägg till år 2027"
→ { year: 2027 }

Svara med JSON: { year: number }`
});
```

### Action Agents (Pure Functions/Database Operations)

```javascript
// Page Resolver - Maps dates to page IDs
export const pageResolverAgent = async ({ input }, context) => {
  const { wheelId, startDate, endDate } = JSON.parse(context.at(-1));
  
  const { aiGetAvailablePages } = await import('./aiWheelService.js');
  const pages = await aiGetAvailablePages(wheelId);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  if (startYear === endYear) {
    const page = pages.find(p => p.year === startYear);
    if (!page) throw new Error(`No page for year ${startYear}`);
    return [{ pageId: page.id, startDate, endDate }];
  } else {
    const results = [];
    for (let year = startYear; year <= endYear; year++) {
      const page = pages.find(p => p.year === year);
      if (!page) throw new Error(`No page for year ${year}`);
      
      const yearStart = year === startYear ? startDate : `${year}-01-01`;
      const yearEnd = year === endYear ? endDate : `${year}-12-31`;
      
      results.push({ pageId: page.id, startDate: yearStart, endDate: yearEnd });
    }
    return results;
  }
};

// Item Creator
export const itemCreatorAgent = async ({ input }, context) => {
  const data = JSON.parse(context.at(-1));
  const { wheelId, pageId, name, startDate, endDate, ringId, activityGroupId, labelId, time } = data;
  
  const { aiCreateItem } = await import('./aiWheelService.js');
  return await aiCreateItem(wheelId, pageId, {
    name, startDate, endDate, ringId, activityGroupId, labelId, time
  });
};

// Item Finder
export const itemFinderAgent = async ({ input }, context) => {
  const { wheelId, itemId, itemName } = JSON.parse(context.at(-1));
  
  const { fetchPageData } = await import('./wheelService.js');
  const { fetchPages } = await import('./wheelService.js');
  
  // If itemId provided, find directly
  if (itemId) {
    // Fetch from items table
    const { default: supabase } = await import('../supabaseClient.js');
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .eq('wheel_id', wheelId)
      .single();
    return data;
  }
  
  // Otherwise, fuzzy search by name across all pages
  const pages = await fetchPages(wheelId);
  for (const page of pages) {
    const items = await fetchPageData(page.id);
    const found = items.find(item => 
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    if (found) return found;
  }
  
  throw new Error(`Item not found: ${itemName}`);
};

// Item Updater
export const sameYearUpdateAgent = async ({ input }, context) => {
  const { itemId, updates } = JSON.parse(context.at(-1));
  
  const { default: supabase } = await import('../supabaseClient.js');
  const { data } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();
  
  return data;
};

// Cross-Year Update (Delete old, create new)
export const crossYearUpdateAgent = async ({ input }, context) => {
  const { wheelId, oldItemId, name, startDate, endDate, ringId, activityGroupId, labelId } = JSON.parse(context.at(-1));
  
  // Delete old item
  const { default: supabase } = await import('../supabaseClient.js');
  await supabase.from('items').delete().eq('id', oldItemId);
  
  // Create new items (use pageResolverAgent + itemCreatorAgent flow)
  const pages = await pageResolverAgent({ input }, [JSON.stringify({ wheelId, startDate, endDate })]);
  
  const results = [];
  for (const page of pages) {
    const item = await itemCreatorAgent({ input }, [JSON.stringify({
      wheelId,
      pageId: page.pageId,
      name,
      startDate: page.startDate,
      endDate: page.endDate,
      ringId,
      activityGroupId,
      labelId
    })]);
    results.push(item);
  }
  
  return results;
};

// Item Deleter
export const itemDeleterAgent = async ({ input }, context) => {
  const { id } = JSON.parse(context.at(-1));
  
  const { default: supabase } = await import('../supabaseClient.js');
  await supabase.from('items').delete().eq('id', id);
  
  return { deleted: id };
};

// Ring Creator
export const ringCreatorAgent = async ({ input }, context) => {
  const { wheelId, name, type, color, orientation } = JSON.parse(context.at(-1));
  
  const { aiCreateRing } = await import('./aiWheelService.js');
  return await aiCreateRing(wheelId, { name, type, color, orientation });
};

// Group Creator
export const groupCreatorAgent = async ({ input }, context) => {
  const { wheelId, name, color } = JSON.parse(context.at(-1));
  
  const { aiCreateActivityGroup } = await import('./aiWheelService.js');
  return await aiCreateActivityGroup(wheelId, { name, color });
};

// Fetcher Agents (read-only)
export const itemFetcherAgent = async ({ input }, context) => {
  const { wheelId, filters } = JSON.parse(context.at(-1));
  
  const { fetchPageData, fetchPages } = await import('./wheelService.js');
  
  if (filters.currentPageOnly) {
    return await fetchPageData(filters.pageId);
  } else {
    // Fetch across all pages
    const pages = await fetchPages(wheelId);
    const allItems = [];
    for (const page of pages) {
      const items = await fetchPageData(page.id);
      allItems.push(...items);
    }
    
    // Apply filters
    let filtered = allItems;
    if (filters.ringId) filtered = filtered.filter(i => i.ringId === filters.ringId);
    if (filters.activityGroupId) filtered = filtered.filter(i => i.activityId === filters.activityGroupId);
    if (filters.dateRange) {
      filtered = filtered.filter(i => 
        new Date(i.startDate) >= new Date(filters.dateRange.start) &&
        new Date(i.endDate) <= new Date(filters.dateRange.end)
      );
    }
    
    return filtered;
  }
};

export const ringFetcherAgent = async ({ input }, context) => {
  const { wheelId } = JSON.parse(context.at(-1));
  
  const { fetchWheel } = await import('./wheelService.js');
  const wheelData = await fetchWheel(wheelId);
  
  return wheelData.organizationData.rings;
};

export const groupFetcherAgent = async ({ input }, context) => {
  const { wheelId } = JSON.parse(context.at(-1));
  
  const { fetchWheel } = await import('./wheelService.js');
  const wheelData = await fetchWheel(wheelId);
  
  return wheelData.organizationData.activityGroups;
};
```

### Formatter Agents (LLM-based)

```javascript
// Confirmation Formatter
export const confirmationFormatterAgent = agent({
  model: openai('gpt-4o'),
  system: `Format operation results into user-friendly Swedish confirmation.

Be concise, friendly, and specific about what was done.

EXEMPEL:
Input: { success: true, items: [{ name: "julkampanj", pageId: "page-2025" }] }
Output: "Klart! Aktivitet 'julkampanj' skapad på 2025."

Input: { success: true, items: [{ name: "event", pageId: "page-2025" }, { name: "event", pageId: "page-2026" }] }
Output: "Klart! Aktivitet 'event' skapad över 2 år (2025-2026)."`
});

// List Formatter
export const listFormatterAgent = agent({
  model: openai('gpt-4o'),
  system: `Format list of items into readable Swedish text.

Include: name, date range, ring, group.
Group by month or ring if many items.

EXEMPEL:
Input: [{ name: "event1", startDate: "2025-03-01", ring: "Marketing" }]
Output: "**Mars 2025:**\n- event1 (Marketing)"`
});

// Analysis Report Formatter
export const analysisReportFormatterAgent = agent({
  model: openai('gpt-4o'),
  system: `Format wheel analysis into structured Swedish report.

Include:
- Översikt (total aktiviteter, ringar, grupper)
- Utnyttjande per ring
- Tidsmässig fördelning
- Luckor och möjligheter
- Rekommendationer`
});
```

---

## New AIAssistant.jsx Implementation

```javascript
// src/components/AIAssistant.jsx

import { execute } from 'flows-ai';
import { openai } from '@ai-sdk/openai';
import { useState } from 'react';

// Import ALL agents
import {
  intentParserAgent,
  updateIntentParserAgent,
  deleteIntentParserAgent,
  listIntentParserAgent,
  ringIntentParserAgent,
  groupIntentParserAgent,
  pageIntentParserAgent,
  pageResolverAgent,
  itemCreatorAgent,
  itemFinderAgent,
  sameYearUpdateAgent,
  crossYearUpdateAgent,
  itemDeleterAgent,
  ringCreatorAgent,
  groupCreatorAgent,
  itemFetcherAgent,
  ringFetcherAgent,
  groupFetcherAgent,
  confirmationFormatterAgent,
  listFormatterAgent,
  analysisReportFormatterAgent
} from '../services/aiAgents';

// Import ALL flows
import { masterRoutingFlow } from '../services/aiFlows';

export default function AIAssistant({ wheelId, currentPageId, onWheelUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsProcessing(true);

    try {
      // Execute master routing flow (determines which flow to use)
      const result = await execute(masterRoutingFlow, {
        agents: {
          // Intent Parsers
          intentParserAgent,
          updateIntentParserAgent,
          deleteIntentParserAgent,
          listIntentParserAgent,
          ringIntentParserAgent,
          groupIntentParserAgent,
          pageIntentParserAgent,
          
          // Action Agents
          pageResolverAgent,
          itemCreatorAgent,
          itemFinderAgent,
          sameYearUpdateAgent,
          crossYearUpdateAgent,
          itemDeleterAgent,
          ringCreatorAgent,
          groupCreatorAgent,
          
          // Fetcher Agents
          itemFetcherAgent,
          ringFetcherAgent,
          groupFetcherAgent,
          
          // Formatter Agents
          confirmationFormatterAgent,
          listFormatterAgent,
          analysisReportFormatterAgent
        },
        input: JSON.stringify({ 
          userMessage, 
          wheelId, 
          currentPageId 
        }),
        model: openai('gpt-4o'),
        onFlowStart: (flow, context) => {
          console.log('[Flows AI] Starting:', flow.name || flow.agent.name);
          console.log('[Flows AI] Context:', context);
        },
        onFlowFinish: (flow, result) => {
          console.log('[Flows AI] Finished:', flow.name || flow.agent.name);
          console.log('[Flows AI] Result:', result);
        }
      });

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }]);

      // Trigger wheel reload
      onWheelUpdate && onWheelUpdate();

    } catch (error) {
      console.error('[Flows AI] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Ett fel uppstod: ${error.message}`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="ai-assistant">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Vad vill du göra? (skapa, uppdatera, lista, radera...)"
          disabled={isProcessing}
        />
        <button type="submit" disabled={isProcessing}>
          {isProcessing ? 'Bearbetar...' : 'Skicka'}
        </button>
      </form>
    </div>
  );
}
```

---

## Implementation Timeline

### Phase 1: Core Infrastructure (3-4 hours)
- [ ] Create complete aiAgents.js with all agents
- [ ] Create complete aiFlows.js with all 13 flows + master routing
- [ ] Replace AIAssistant.jsx entirely
- [ ] Run database migration

### Phase 2: Testing All Flows (2-3 hours)
- [ ] Test create activity (single-year, cross-year)
- [ ] Test update activity (same-year, cross-year)
- [ ] Test delete activities (single, multiple, by criteria)
- [ ] Test list/query operations
- [ ] Test ring operations (create, update, list)
- [ ] Test group operations (create, update, list)
- [ ] Test page creation
- [ ] Test general queries

### Phase 3: Refinement (1-2 hours)
- [ ] Refine prompts based on test results
- [ ] Add error handling improvements
- [ ] Add progress indicators in UI
- [ ] Document usage patterns

**Total Estimated Time: 6-9 hours**

---

## Benefits of This Approach

### 1. Reliability
- ✅ Every operation follows guaranteed workflow
- ✅ No more "AI stopped mid-flow" issues
- ✅ Deterministic behavior across all models

### 2. Maintainability
- ✅ Each flow is self-contained and testable
- ✅ Easy to add new operations (just add new flow)
- ✅ Clear separation of concerns

### 3. Debuggability
- ✅ Event listeners trace every step
- ✅ Console logs show exact execution path
- ✅ Easy to identify where failures occur

### 4. Composability
- ✅ Flows can be nested and reused
- ✅ Common agents shared across flows
- ✅ Easy to build complex operations from simple ones

### 5. Future-Proof
- ✅ Easy to add: batch operations, validation flows, optimization flows
- ✅ Can swap out LLM models without changing flow structure
- ✅ Built on solid foundation (Vercel AI SDK)

---

## Migration Strategy

### Option 1: Complete Replacement (Recommended)
1. Create all agents and flows
2. Replace AIAssistant.jsx entirely
3. Test thoroughly
4. Deploy

### Option 2: Gradual Migration
1. Keep existing streamText as fallback
2. Add feature flag: `USE_FLOWS_AI = true`
3. Route to Flows AI if flag is true, otherwise streamText
4. Test in production with subset of users
5. Once stable, remove streamText entirely

---

## Success Criteria

### Must-Have
- ✅ All current operations work via Flows AI
- ✅ No AI stopping mid-workflow
- ✅ Deterministic execution (verified via logs)
- ✅ Cross-year activities work perfectly
- ✅ Deleted items stay deleted
- ✅ All CRUD operations functional

### Nice-to-Have
- ✅ Response times < 3 seconds
- ✅ Natural language understanding improved
- ✅ Error messages user-friendly
- ✅ Progress indicators in UI

---

## Next Steps

1. **Review this strategy** - Confirm comprehensive approach
2. **Run database migration** - ADD_PAGE_ID_TO_ITEMS.sql
3. **Create aiAgents.js** - All 20+ agents
4. **Create aiFlows.js** - All 13 flows + master routing
5. **Replace AIAssistant.jsx** - Complete rewrite
6. **Test thoroughly** - All operations
7. **Deploy** - Ship deterministic AI assistant

---

**This is a complete replacement of the AI assistant architecture. Are you ready to proceed?**
