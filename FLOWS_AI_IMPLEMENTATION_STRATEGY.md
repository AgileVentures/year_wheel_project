# Flows AI Implementation Strategy

## Overview
This document provides a complete implementation strategy for integrating Flows AI into the Year Wheel POC to solve the AI continuation issue. The goal is to achieve deterministic multi-step execution for cross-year activity creation.

## Problem Statement

**Current Issue:**
- Vercel AI SDK's `maxSteps` is a limit, not a guarantee
- GPT-4 models stop after `getAvailablePages()` instead of continuing to `createItem()`
- No amount of prompt engineering forces continuation
- User requests like "skapa julkampanj 2025-12-15 till 2026-01-30" fail

**Root Cause:**
- Model decides when to stop (trained to be cautious)
- `streamText` with tools is reactive, not deterministic

**Solution:**
- Use Flows AI for workflow orchestration
- Deterministic execution guarantees all steps run
- Model behavior becomes irrelevant - flow structure controls execution

---

## Architecture Design

### Hybrid Approach

**Simple Queries → Keep `streamText`**
- Single-step operations (e.g., "vilka ringar finns?", "lista aktiviteter")
- No need for orchestration
- Faster response time
- Current implementation works fine

**Complex Workflows → Use Flows AI**
- Cross-year activities
- Multi-item creation
- Conditional logic (date range analysis)
- Guaranteed execution of all steps

### Flow Structure

```
User Request
    ↓
Request Analysis
    ↓
Is it cross-year?
    ↓ NO → Simple creation (existing streamText)
    ↓ YES
    ↓
Cross-Year Flow (Flows AI)
    ├─ Step 1: getAvailablePages
    ├─ Step 2: Parse date ranges for each year
    ├─ Step 3: forEach year → createItem
    └─ Step 4: Return confirmation
```

### Agent Definitions

**1. Intent Parser Agent**
```javascript
// Analyzes user request, extracts structured data
// Input: User message
// Output: { type, name, startDate, endDate, ringId, activityGroupId }
```

**2. Page Resolver Agent**
```javascript
// Gets available pages and maps dates to page IDs
// Input: { startDate, endDate }
// Output: [{ pageId, startDate, endDate }] // Split by year
```

**3. Item Creator Agent**
```javascript
// Creates items directly via database
// Input: { pageId, name, dates, ringId, activityGroupId }
// Output: { success, itemId }
```

**4. Coordinator Agent (Simple Function)**
```javascript
// No LLM needed - pure logic
// Orchestrates the flow execution
```

---

## Implementation Plan

### Phase 1: Setup & Core Agents (2-3 hours)

#### Task 1.1: Create Agent Definitions File
**File:** `src/services/aiAgents.js`

**Content:**
```javascript
import { agent } from 'flows-ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Intent Parser - extracts structured data from user message
export const intentParserAgent = agent({
  model: openai('gpt-4o'),
  system: `Du analyserar användarens förfrågan och extraherar strukturerad data.
  
  KRITISKT: Om datum spänner över årsskifte, rapportera EXAKT datumintervall.
  
  Exempel:
  - "julkampanj 2025-12-15 till 2026-01-30"
    → { name: "julkampanj", startDate: "2025-12-15", endDate: "2026-01-30", crossYear: true }
  
  Svara alltid med strukturerad JSON.`,
});

// Page Resolver - maps dates to page IDs
export const pageResolverAgent = async ({ input }, context) => {
  const { wheelId, startDate, endDate } = input;
  
  // Call aiGetAvailablePages
  const { default: { aiGetAvailablePages } } = await import('./aiWheelService.js');
  const pages = await aiGetAvailablePages(wheelId);
  
  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  // Map to pages
  if (startYear === endYear) {
    const page = pages.find(p => p.year === startYear);
    if (!page) throw new Error(`No page for year ${startYear}`);
    return [{ pageId: page.id, startDate, endDate }];
  } else {
    // Split across years
    const results = [];
    for (let year = startYear; year <= endYear; year++) {
      const page = pages.find(p => p.year === year);
      if (!page) throw new Error(`No page for year ${year}`);
      
      const yearStart = year === startYear ? startDate : `${year}-01-01`;
      const yearEnd = year === endYear ? endDate : `${year}-12-31`;
      
      results.push({
        pageId: page.id,
        startDate: yearStart,
        endDate: yearEnd
      });
    }
    return results;
  }
};

// Item Creator - creates items via direct database insert
export const itemCreatorAgent = async ({ input }, context) => {
  const { wheelId, pageId, name, startDate, endDate, ringId, activityGroupId, labelId, time } = input;
  
  const { default: { aiCreateItem } } = await import('./aiWheelService.js');
  
  return await aiCreateItem(wheelId, pageId, {
    name,
    startDate,
    endDate,
    ringId,
    activityGroupId,
    labelId,
    time
  });
};
```

**Acceptance Criteria:**
- ✅ File created with 3 agent definitions
- ✅ intentParserAgent uses LLM for extraction
- ✅ pageResolverAgent is pure function (no LLM)
- ✅ itemCreatorAgent wraps aiCreateItem
- ✅ All imports are correct

---

#### Task 1.2: Create Flow Definitions File
**File:** `src/services/aiFlows.js`

**Content:**
```javascript
import { sequence, forEach } from 'flows-ai/flows';
import { z } from 'zod';

/**
 * Cross-year activity creation flow
 * 
 * Flow:
 * 1. Parse intent from user message
 * 2. Resolve dates to page IDs (split by year if needed)
 * 3. For each page, create item
 * 4. Return confirmation
 */
export const crossYearActivityFlow = sequence([
  {
    name: 'parseIntent',
    agent: 'intentParserAgent',
    input: 'Extract activity details from user request'
  },
  {
    name: 'resolvePages',
    agent: 'pageResolverAgent',
    input: '' // Will receive output from parseIntent
  },
  forEach({
    item: z.object({
      pageId: z.string(),
      startDate: z.string(),
      endDate: z.string()
    }),
    input: {
      name: 'createItem',
      agent: 'itemCreatorAgent',
      input: '' // Will receive each item from forEach
    }
  })
]);

/**
 * Simple single-year activity flow (optional - can still use streamText)
 */
export const singleYearActivityFlow = sequence([
  {
    name: 'parseIntent',
    agent: 'intentParserAgent',
    input: 'Extract activity details'
  },
  {
    name: 'createItem',
    agent: 'itemCreatorAgent',
    input: ''
  }
]);
```

**Acceptance Criteria:**
- ✅ crossYearActivityFlow uses sequence + forEach
- ✅ Flow structure matches architecture diagram
- ✅ Zod schema defined for forEach items
- ✅ Named steps for debugging

---

#### Task 1.3: Update AIAssistant Component - Add Flow Detection
**File:** `src/components/AIAssistant.jsx`

**Changes:**
```javascript
import { execute } from 'flows-ai';
import { openai } from '@ai-sdk/openai';
import { 
  intentParserAgent, 
  pageResolverAgent, 
  itemCreatorAgent 
} from '../services/aiAgents';
import { crossYearActivityFlow } from '../services/aiFlows';

// Add helper function to detect cross-year requests
const detectCrossYearRequest = (message) => {
  // Simple heuristic: check for date patterns spanning different years
  const datePattern = /(\d{4})-(\d{2})-(\d{2})/g;
  const dates = [...message.matchAll(datePattern)];
  
  if (dates.length >= 2) {
    const year1 = parseInt(dates[0][1]);
    const year2 = parseInt(dates[1][1]);
    return year1 !== year2;
  }
  
  // Check for keywords indicating ranges
  const rangeKeywords = ['till', 'fram till', 'mellan', 'över årsskifte'];
  return rangeKeywords.some(keyword => message.toLowerCase().includes(keyword));
};

// Inside handleSubmit, before streamText:
const userMessage = input.trim();

// Check if this is a cross-year request
if (detectCrossYearRequest(userMessage)) {
  // Use Flows AI
  try {
    const result = await execute(crossYearActivityFlow, {
      agents: {
        intentParserAgent,
        pageResolverAgent,
        itemCreatorAgent
      },
      input: userMessage,
      onFlowStart: (flow, context) => {
        console.log('[Flows AI] Starting:', flow.name || flow.agent.name);
      },
      onFlowFinish: (flow, result) => {
        console.log('[Flows AI] Finished:', flow.name || flow.agent.name, result);
      }
    });
    
    // Add result to chat
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `Aktivitet skapad över flera år: ${JSON.stringify(result)}`
    }]);
    
    // Reload wheel data
    await loadWheelContext();
    onWheelUpdate && onWheelUpdate();
    
    return; // Exit early, don't use streamText
  } catch (error) {
    console.error('[Flows AI] Error:', error);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Fel vid skapande av aktivitet: ${error.message}`
    }]);
    return;
  }
}

// Otherwise, use existing streamText implementation
const result = await streamText({
  // ... existing code
});
```

**Acceptance Criteria:**
- ✅ detectCrossYearRequest function added
- ✅ Flow execution happens before streamText
- ✅ Event listeners log to console
- ✅ Success triggers wheel reload
- ✅ Error handling in place
- ✅ Falls back to streamText for simple queries

---

### Phase 2: Testing & Refinement (1-2 hours)

#### Task 2.1: Run Database Migration
**File:** `ADD_PAGE_ID_TO_ITEMS.sql`

**Steps:**
1. Open Supabase dashboard
2. Navigate to SQL Editor
3. Paste migration content
4. Execute
5. Verify:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'items' AND column_name = 'page_id';
   ```

**Acceptance Criteria:**
- ✅ page_id column exists with UUID type
- ✅ Foreign key constraint created
- ✅ Index created on page_id
- ✅ Existing items backfilled with page_id
- ✅ NOT NULL constraint applied

---

#### Task 2.2: Test Cross-Year Activity Creation
**Test Cases:**

**Test 1: Simple Cross-Year**
```
User: "skapa julkampanj 2025-12-15 till 2026-01-30"
Expected:
- getAvailablePages called
- 2 items created:
  - Item 1: page-2025, 2025-12-15 to 2025-12-31
  - Item 2: page-2026, 2026-01-01 to 2026-01-30
- Both visible on respective pages
```

**Test 2: Three-Year Span**
```
User: "skapa långtidsprojekt 2024-10-01 till 2026-03-31"
Expected:
- 3 items created (2024, 2025, 2026)
- Date ranges split correctly
```

**Test 3: Single-Year (Fallback)**
```
User: "skapa sommarevent 2025-06-01 till 2025-08-31"
Expected:
- Uses streamText (existing flow)
- 1 item created on 2025 page
```

**Acceptance Criteria:**
- ✅ All test cases pass
- ✅ Console logs show flow execution
- ✅ Items appear in correct pages
- ✅ No deleted items reappear

---

#### Task 2.3: Refine Intent Parser Prompt
**Issue:** Intent parser might not extract all required fields

**Solution:** Add examples to system prompt:
```javascript
system: `Du analyserar användarens förfrågan och extraherar strukturerad data.

EXEMPEL 1:
User: "skapa julkampanj 2025-12-15 till 2026-01-30 på ring Marketing"
Output: {
  name: "julkampanj",
  startDate: "2025-12-15",
  endDate: "2026-01-30",
  ringName: "Marketing",
  crossYear: true
}

EXEMPEL 2:
User: "lägg till vårkampanj från mars till maj i gruppen Reklam"
Output: {
  name: "vårkampanj",
  startDate: "2025-03-01", // Assume current context year
  endDate: "2025-05-31",
  activityGroupName: "Reklam",
  crossYear: false
}

REGLER:
- Om år saknas, använd kontext-år från wheelContext
- Om exakt datum saknas, anta första/sista dagen i månaden
- Rapportera alltid crossYear: true/false
- Extrahera ring/grupp från nyckelord

Svara med JSON.`
```

**Acceptance Criteria:**
- ✅ Parser handles partial dates
- ✅ Parser extracts ring/group names
- ✅ Parser infers year from context
- ✅ Test with various natural language inputs

---

### Phase 3: Advanced Features (Optional, 2-3 hours)

#### Task 3.1: Add Batch Creation Support
**Use Case:** "skapa 5 events från januari till december, en per månad"

**Implementation:**
```javascript
export const batchActivityFlow = sequence([
  {
    name: 'parseBatchIntent',
    agent: 'batchIntentParserAgent',
    input: 'Extract batch creation pattern'
  },
  forEach({
    item: z.object({
      name: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      ringId: z.string()
    }),
    input: {
      name: 'createItemFromBatch',
      agent: 'itemCreatorAgent',
      input: ''
    }
  })
]);
```

---

#### Task 3.2: Add Conditional Routing (oneOf)
**Use Case:** Route to different flows based on request type

**Implementation:**
```javascript
import { oneOf } from 'flows-ai/flows';

export const masterFlow = oneOf([
  {
    when: 'User wants to create activity spanning multiple years',
    input: crossYearActivityFlow
  },
  {
    when: 'User wants to create multiple activities in one go',
    input: batchActivityFlow
  },
  {
    when: 'User wants to update existing activity',
    input: updateActivityFlow
  },
  {
    when: 'User wants to delete activities',
    input: deleteActivitiesFlow
  }
]);
```

---

#### Task 3.3: Add Evaluation Flow
**Use Case:** Validate item creation succeeded

**Implementation:**
```javascript
import { evaluator } from 'flows-ai/flows';

export const validatedCreationFlow = evaluator({
  input: crossYearActivityFlow,
  criteria: 'All items created successfully with correct date ranges',
  max_iterations: 2
});
```

---

## File Structure

```
src/
├── services/
│   ├── aiAgents.js          [NEW] Agent definitions
│   ├── aiFlows.js           [NEW] Flow definitions
│   ├── aiWheelService.js    [EXISTING] Tool implementations
│   └── wheelService.js      [EXISTING] Database operations
├── components/
│   └── AIAssistant.jsx      [MODIFIED] Add flow detection & execution
└── App.jsx                  [EXISTING] No changes needed
```

---

## Rollback Strategy

If Flows AI integration causes issues, we can easily rollback:

**Option 1: Feature Flag**
```javascript
const USE_FLOWS_AI = false; // Set to false to disable

if (USE_FLOWS_AI && detectCrossYearRequest(userMessage)) {
  // Flows AI execution
} else {
  // Existing streamText
}
```

**Option 2: Separate Component**
```javascript
// Keep AIAssistant.jsx untouched
// Create AIAssistantWithFlows.jsx
// Switch in App.jsx with prop
```

---

## Success Metrics

### Must-Have (Phase 1 Complete)
- ✅ Cross-year activities created without stopping mid-flow
- ✅ Items appear on correct pages
- ✅ Deleted items don't reappear
- ✅ Console logs show deterministic execution

### Nice-to-Have (Phase 3)
- ✅ Batch creation works
- ✅ Conditional routing implemented
- ✅ Evaluation flow validates results

---

## Dependencies

**Required:**
- ✅ flows-ai (already installed via yarn)
- ✅ @ai-sdk/openai (already in package.json)
- ✅ zod (already in package.json)

**Optional:**
- None - all dependencies already met

---

## Timeline Estimate

| Phase | Tasks | Time | Dependencies |
|-------|-------|------|--------------|
| Phase 1 | Setup & Core Agents | 2-3 hours | Database migration |
| Phase 2 | Testing & Refinement | 1-2 hours | Phase 1 complete |
| Phase 3 | Advanced Features | 2-3 hours | Phase 2 complete, OPTIONAL |
| **TOTAL** | **Core Implementation** | **3-5 hours** | - |
| **TOTAL** | **With Advanced** | **5-8 hours** | - |

---

## Critical Success Factors

1. **Database Migration First**
   - MUST run ADD_PAGE_ID_TO_ITEMS.sql before testing
   - Verify backfill completed successfully

2. **Event Listeners for Debugging**
   - Use onFlowStart/onFlowFinish to track execution
   - Log to console for transparency

3. **Hybrid Approach**
   - Don't replace streamText entirely
   - Use Flows AI only for complex workflows

4. **Gradual Rollout**
   - Test with feature flag first
   - Monitor for regressions
   - Keep fallback mechanism

---

## Open Questions

1. **Should we use Flows AI for ALL operations?**
   - Answer: No, use hybrid approach (simple → streamText, complex → Flows AI)

2. **How to handle context passing?**
   - Answer: Flows AI automatically passes context between agents in sequence
   - Use `context` parameter in agent functions

3. **Error handling strategy?**
   - Answer: Use try-catch around execute(), log errors, show user-friendly message

4. **Performance impact?**
   - Answer: Minimal - Flows AI is thin wrapper around Vercel AI SDK
   - May be slightly slower due to orchestration overhead

---

## Next Steps

**Immediate (Start Here):**
1. ✅ Run database migration (ADD_PAGE_ID_TO_ITEMS.sql)
2. ⏳ Create aiAgents.js (Task 1.1)
3. ⏳ Create aiFlows.js (Task 1.2)
4. ⏳ Update AIAssistant.jsx (Task 1.3)
5. ⏳ Test cross-year creation (Task 2.2)

**After Core Complete:**
6. ⏳ Refine prompts based on test results (Task 2.3)
7. ⏳ Document usage patterns
8. ⏳ Consider advanced features (Phase 3)

---

## Resources

**Flows AI Documentation:**
- Main: https://flows-ai.callstack.com/
- Sequence: https://flows-ai.callstack.com/flows/sequence/
- forEach: https://flows-ai.callstack.com/flows/for-each/
- Options: https://flows-ai.callstack.com/introduction/options

**Internal Documentation:**
- Option B Implementation: `OPTION_B_IMPLEMENTATION_COMPLETE.md`
- Architecture Problems: `AI_CRITICAL_ARCHITECTURE_PROBLEMS.md`
- Flows AI Research: `FLOWS_AI_SOLUTION.md`

**Database:**
- Migration SQL: `ADD_PAGE_ID_TO_ITEMS.sql`
- Supabase Guide: `SUPABASE_GUIDE.md`
