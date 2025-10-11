# Flows AI Analysis - Solution to Multi-Step Problem

## The Problem We're Facing

**Current Issue:** Vercel AI SDK's `maxSteps` parameter doesn't guarantee the AI will continue after calling `getAvailablePages()`. The **model decides** when to stop, and GPT-4 models are trained to be cautious.

**Evidence:**
```
User: "skapa julkampanj 2025-12-15 till 2026-01-30"
→ AI calls: getAvailablePages() ✅
→ AI stops and responds to user ❌ (should call createItem twice)
```

**Why This Happens:**
- `maxSteps: 12` only sets a limit, not a requirement
- Model interprets getAvailablePages() result as "task complete"
- Model responds to user instead of continuing workflow
- No way to force continuation with Vercel AI SDK alone

---

## What is Flows AI?

**Flows AI** is a lightweight workflow orchestrator built **on top of** Vercel AI SDK that provides:

1. **Explicit control** over multi-step sequences
2. **Composable flows** (sequence, parallel, conditional)
3. **Deterministic execution** (not relying on model behavior)
4. **Type-safe** workflow definitions

### Key Insight
> "A lightweight, type-safe AI workflow orchestrator inspired by Anthropic's agent patterns. Built on top of Vercel AI SDK."

It solves exactly our problem: **guaranteed multi-step execution**.

---

## Architecture Comparison

### Current Approach (Vercel AI SDK Alone)
```javascript
// Relies on model to continue
const result = await streamText({
  model: openai('gpt-4o'),
  maxSteps: 12, // Only sets limit, not guarantee
  tools: {
    getAvailablePages: ...,
    createItem: ...
  }
});

// Problem: Model decides when to stop
// Result: Unpredictable behavior
```

### Flows AI Approach
```javascript
import { sequence, agent, execute } from 'flows-ai'
import { openai } from '@ai-sdk/openai'

// Define agents
const getPagesAgent = agent({
  model: openai('gpt-4o'),
  system: 'Get available pages',
  tools: { getAvailablePages }
});

const createItemsAgent = agent({
  model: openai('gpt-4o'),
  system: 'Create items based on pages',
  tools: { createItem }
});

// Define EXPLICIT flow
const crossYearFlow = sequence([
  {
    agent: 'getPagesAgent',
    input: 'Get available pages'
  },
  {
    agent: 'createItemsAgent',
    input: 'Create items on pages' // Gets output from previous step
  }
]);

// Execute with GUARANTEED sequence
await execute(crossYearFlow, {
  agents: { getPagesAgent, createItemsAgent },
  input: userMessage
});
```

**Result:** Deterministic, guaranteed multi-step execution!

---

## Core Concepts

### 1. Agent
Simple function that gets called during flow execution:

```javascript
const translationAgent = async ({ input, context }) => {
  // Can call LLM, execute code, call APIs, etc.
  const response = await generateText({
    model: openai('gpt-4o'),
    system: 'You are a translation agent',
    prompt: input
  });
  return response.text;
};
```

**Or use the helper:**
```javascript
const translationAgent = agent({
  model: openai('gpt-4o'),
  system: 'You are a translation agent'
});
```

### 2. Flow
Composable structure defining what to execute:

```javascript
const flow = {
  agent: 'translationAgent',
  input: 'Translate this text',
  name: 'translation-step' // optional
};
```

### 3. Sequence
Chains multiple steps where output of one becomes input of next:

```javascript
const translateFlow = sequence([
  { agent: 'translationAgent', input: 'Translate to English' },
  { agent: 'grammarAgent', input: 'Check grammar' },
  { agent: 'summaryAgent', input: 'Summarize' }
]);
```

### 4. Other Flow Types
- **`parallel`**: Execute multiple agents simultaneously
- **`oneOf`**: Execute one of multiple agents based on condition
- **`forEach`**: Execute agent for each item in array
- **`evaluator`**: Choose best result from multiple executions

---

## How It Solves Our Problem

### Current Problem Flow
```
User: "skapa julkampanj 2025-12-15 till 2026-01-30"
↓
AI Assistant (single agent with tools)
↓
Calls: getAvailablePages()
↓
Model decides: "I have info, respond to user"
↓
Stops ❌
```

### Flows AI Solution
```
User: "skapa julkampanj 2025-12-15 till 2026-01-30"
↓
Orchestrator detects: cross-year activity
↓
Executes: sequence([
  { agent: 'getPagesAgent' },
  { agent: 'analyzeYearsAgent' },
  { agent: 'createItem1Agent' },
  { agent: 'createItem2Agent' }
])
↓
ALL steps execute ✅
↓
Responds to user with results
```

---

## Implementation for Year Wheel

### Step 1: Define Agents

```javascript
import { agent } from 'flows-ai'
import { openai } from '@ai-sdk/openai'

// Agent 1: Get available pages
const getPagesAgent = agent({
  model: openai('gpt-4o'),
  system: 'Get available pages from wheel',
  tools: {
    getAvailablePages: tool({
      description: 'Fetch all pages',
      inputSchema: z.object({}),
      execute: async () => await aiGetAvailablePages(wheelId)
    })
  }
});

// Agent 2: Parse user intent
const parseIntentAgent = agent({
  model: openai('gpt-4o'),
  system: `Parse user's request and extract:
  - Activity name
  - Start date
  - End date
  - Which years it spans
  
  Return JSON: { name, startDate, endDate, years: [2025, 2026] }`
});

// Agent 3: Create items
const createItemsAgent = async ({ input, context }) => {
  const { name, startDate, endDate, years } = JSON.parse(input);
  const pages = context.pages; // From previous step
  
  const results = [];
  
  // Create item for each year
  for (const year of years) {
    const page = pages.find(p => p.year === year);
    
    if (year === years[0]) {
      // First part
      const result = await aiCreateItem(wheelId, page.id, {
        name: `${name} (del 1)`,
        startDate: startDate,
        endDate: `${year}-12-31`,
        ringId: context.ringId,
        activityGroupId: context.groupId
      });
      results.push(result);
    } else {
      // Second part
      const result = await aiCreateItem(wheelId, page.id, {
        name: `${name} (del 2)`,
        startDate: `${year}-01-01`,
        endDate: endDate,
        ringId: context.ringId,
        activityGroupId: context.groupId
      });
      results.push(result);
    }
  }
  
  return results;
};
```

### Step 2: Define Flow

```javascript
import { sequence } from 'flows-ai/flows'

const crossYearActivityFlow = sequence([
  {
    agent: 'getPagesAgent',
    input: 'Get all available pages',
    name: 'get-pages'
  },
  {
    agent: 'parseIntentAgent',
    input: '{{userMessage}}', // User's original message
    name: 'parse-intent'
  },
  {
    agent: 'createItemsAgent',
    input: '{{parseIntentAgent.output}}', // JSON from parsing
    name: 'create-items'
  }
]);
```

### Step 3: Execute

```javascript
import { execute } from 'flows-ai'

const handleCrossYearActivity = async (userMessage) => {
  const result = await execute(crossYearActivityFlow, {
    agents: {
      getPagesAgent,
      parseIntentAgent,
      createItemsAgent
    },
    input: userMessage,
    context: {
      wheelId,
      ringId: 'ring-1',
      groupId: 'group-1'
    }
  });
  
  return result;
};
```

---

## Benefits Over Current Approach

### ✅ Deterministic Execution
No more hoping the model continues - sequence **guarantees** all steps run.

### ✅ Explicit Control
You define the exact flow, not the model.

### ✅ Composable
Can mix different flow types:
```javascript
parallel([
  sequence([...]),
  sequence([...])
])
```

### ✅ Type-Safe
TypeScript support out of the box.

### ✅ Debuggable
Each step is isolated and testable.

### ✅ Flexible
Can use different models for different agents:
```javascript
const fastAgent = agent({ model: openai('gpt-4o-mini') });
const smartAgent = agent({ model: openai('gpt-4o') });
```

---

## Migration Path

### Phase 1: Install Flows AI
```bash
npm install flows-ai
```

### Phase 2: Wrap Existing Logic
Keep current AIAssistant but add Flows AI for cross-year scenarios:

```javascript
// AIAssistant.jsx
import { sequence, agent, execute } from 'flows-ai'

const handleMessage = async (userMessage) => {
  // Detect if cross-year activity
  if (isCrossYearActivity(userMessage)) {
    // Use Flows AI for guaranteed execution
    return await handleCrossYearWithFlows(userMessage);
  } else {
    // Use existing streamText for simple cases
    return await streamText({ ... });
  }
};
```

### Phase 3: Gradually Replace
Move more complex workflows to Flows AI over time.

---

## Example: Complete Cross-Year Flow

```javascript
import { sequence, agent, execute } from 'flows-ai'
import { openai } from '@ai-sdk/openai'

// Define agents
const getPagesAgent = agent({
  model: openai('gpt-4o'),
  system: 'Call getAvailablePages tool',
  tools: { getAvailablePages }
});

const createPart1Agent = async ({ input, context }) => {
  const { name, startDate, pageId, ringId, groupId } = input;
  return await aiCreateItem(wheelId, pageId, {
    name: `${name} (del 1)`,
    startDate,
    endDate: `${startDate.split('-')[0]}-12-31`,
    ringId,
    activityGroupId: groupId
  });
};

const createPart2Agent = async ({ input, context }) => {
  const { name, endDate, pageId, ringId, groupId } = input;
  const year = endDate.split('-')[0];
  return await aiCreateItem(wheelId, pageId, {
    name: `${name} (del 2)`,
    startDate: `${year}-01-01`,
    endDate,
    ringId,
    activityGroupId: groupId
  });
};

// Define flow
const crossYearFlow = sequence([
  {
    agent: 'getPagesAgent',
    input: 'Get pages'
  },
  {
    agent: 'createPart1Agent',
    input: {
      name: 'julkampanj',
      startDate: '2025-12-15',
      pageId: '{{getPagesAgent.output.pages[0].id}}',
      ringId: 'ring-1',
      groupId: 'group-1'
    }
  },
  {
    agent: 'createPart2Agent',
    input: {
      name: 'julkampanj',
      endDate: '2026-01-30',
      pageId: '{{getPagesAgent.output.pages[1].id}}',
      ringId: 'ring-1',
      groupId: 'group-1'
    }
  }
]);

// Execute
const result = await execute(crossYearFlow, {
  agents: { getPagesAgent, createPart1Agent, createPart2Agent }
});
```

**Result:** Guaranteed execution of all 3 steps!

---

## Recommendation

### Immediate Solution
Use Flows AI for cross-year activities where guaranteed multi-step execution is critical.

### Long-term Strategy
- Keep Vercel AI SDK's `streamText` for simple Q&A
- Use Flows AI's `sequence` for multi-step workflows
- Use Flows AI's `parallel` for concurrent operations
- Use Flows AI's `oneOf` for conditional logic

### Implementation Priority
1. **High:** Cross-year activity creation (your current blocker)
2. **Medium:** Batch operations (delete multiple, update multiple)
3. **Low:** Simple queries (can stay with streamText)

---

## Next Steps

1. **Install Flows AI:** `npm install flows-ai`
2. **Create proof-of-concept** for cross-year flow
3. **Test with:** "skapa julkampanj 2025-12-15 till 2026-01-30"
4. **Verify:** All steps execute in sequence
5. **Migrate** complex workflows to Flows AI patterns

---

## Key Takeaway

> **Vercel AI SDK alone = Unpredictable multi-step**  
> **Flows AI on top = Deterministic orchestration**

Flows AI gives you the control you need for reliable multi-step AI workflows! 🎯
