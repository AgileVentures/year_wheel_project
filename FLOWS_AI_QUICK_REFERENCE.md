# Flows AI Quick Reference

**Purpose:** Fast lookup for implementing deterministic AI workflows.

---

## Core Patterns

### 1. Sequence (Run Steps in Order)
```javascript
import { sequence } from 'flows-ai/flows';

const flow = sequence([
  {
    name: 'step1',
    agent: 'agent1',
    input: 'First instruction'
  },
  {
    name: 'step2',
    agent: 'agent2',
    input: 'Second instruction'
  }
]);
```
**Output of step1 becomes context for step2**

---

### 2. forEach (Iterate Collection)
```javascript
import { forEach } from 'flows-ai/flows';
import { z } from 'zod';

const flow = sequence([
  {
    agent: 'getPagesAgent',
    input: 'Get all pages'
  },
  forEach({
    item: z.object({
      pageId: z.string(),
      year: z.number()
    }),
    input: {
      agent: 'processPageAgent',
      input: 'Process this page'
    }
  })
]);
```
**Automatically iterates over array returned by previous step**

---

### 3. oneOf (Conditional Routing)
```javascript
import { oneOf } from 'flows-ai/flows';

const flow = oneOf([
  {
    when: 'User wants to create activity',
    input: createActivityFlow
  },
  {
    when: 'User wants to update activity',
    input: updateActivityFlow
  }
]);
```
**LLM evaluates conditions and routes to matching flow**

---

### 4. parallel (Run Concurrently)
```javascript
import { parallel } from 'flows-ai/flows';

const flow = parallel([
  {
    agent: 'agent1',
    input: 'Task 1'
  },
  {
    agent: 'agent2',
    input: 'Task 2'
  }
]);
```
**Both run at same time, returns array of results**

---

### 5. evaluator (Iterative Improvement)
```javascript
import { evaluator } from 'flows-ai/flows';

const flow = evaluator({
  input: {
    agent: 'writerAgent',
    input: 'Write article'
  },
  criteria: 'Article must be 500+ words and engaging',
  max_iterations: 3
});
```
**Re-runs until criteria met or max iterations reached**

---

## Agent Definitions

### LLM Agent (Uses AI)
```javascript
import { agent } from 'flows-ai';
import { openai } from '@ai-sdk/openai';

const myAgent = agent({
  model: openai('gpt-4o'),
  system: 'You are a helpful assistant...',
  tools: { ... } // Optional
});
```

### Custom Agent (Pure Function)
```javascript
const myAgent = async ({ input }, context) => {
  // Custom logic - no LLM needed
  return processInput(input);
};
```
**Use for deterministic operations**

### Agent with Tools (Vercel AI SDK)
```javascript
import { generateText } from 'ai';

const myAgent = async ({ input }, context) => {
  const response = await generateText({
    model: openai('gpt-4o'),
    system: 'System prompt',
    prompt: input,
    tools: {
      getTool: tool({ ... })
    }
  });
  return response.text;
};
```

---

## Execution

### Basic Execute
```javascript
import { execute } from 'flows-ai';

const result = await execute(flow, {
  agents: {
    agent1: myAgent1,
    agent2: myAgent2
  },
  input: 'Initial input' // Optional
});
```

### With Event Listeners (Debugging)
```javascript
const result = await execute(flow, {
  agents: { ... },
  input: 'Initial input',
  onFlowStart: (flow, context) => {
    console.log('Starting:', flow.name || flow.agent.name);
    console.log('Context:', context);
  },
  onFlowFinish: (flow, result) => {
    console.log('Finished:', flow.name || flow.agent.name);
    console.log('Result:', result);
  }
});
```

### With Custom Model
```javascript
const result = await execute(flow, {
  agents: { ... },
  model: openai('gpt-4o') // Sets default for built-in agents
});
```

---

## Context Passing

**Context is an array of strings from previous steps:**

```javascript
const agent = async ({ input }, context) => {
  // context = ['result from step 1', 'result from step 2']
  console.log('Previous results:', context);
  return 'my result';
};
```

**In nested flows, context includes parent flow results**

---

## Common Zod Schemas

```javascript
import { z } from 'zod';

// Object
z.object({
  name: z.string(),
  age: z.number()
})

// Array
z.array(z.string())

// Optional field
z.object({
  name: z.string(),
  email: z.string().optional()
})

// With descriptions (helps LLM)
z.object({
  pageId: z.string().describe('UUID of the page'),
  year: z.number().describe('Year number (2024, 2025, etc)')
})

// Enum
z.enum(['create', 'update', 'delete'])

// Union
z.union([z.string(), z.number()])
```

---

## Error Handling

```javascript
try {
  const result = await execute(flow, {
    agents: { ... },
    onFlowFinish: (flow, result) => {
      if (!result.success) {
        throw new Error(`Flow ${flow.name} failed`);
      }
    }
  });
} catch (error) {
  console.error('Flow execution failed:', error);
  // Handle error
}
```

---

## Built-in Agents

**Flows AI provides these automatically:**

- `sequenceAgent` - Handles sequence()
- `parallelAgent` - Handles parallel()
- `oneOfAgent` - Handles oneOf()
- `forEachAgent` - Handles forEach()
- `optimizeAgent` - Handles evaluator()
- `bestOfAllAgent` - Handles bestOfAll()

**You can override them:**
```javascript
execute(flow, {
  agents: {
    sequenceAgent: myCustomSequenceAgent,
    ...
  }
});
```

---

## Real-World Example (Year Wheel)

```javascript
// agents.js
export const intentParserAgent = agent({
  model: openai('gpt-4o'),
  system: 'Extract activity details from user message'
});

export const pageResolverAgent = async ({ input }) => {
  // Pure function - no LLM
  const pages = await getPages();
  return mapDatesToPages(input, pages);
};

export const itemCreatorAgent = async ({ input }) => {
  return await createItem(input);
};

// flows.js
export const crossYearFlow = sequence([
  {
    name: 'parseIntent',
    agent: 'intentParserAgent',
    input: 'Extract activity details'
  },
  {
    name: 'resolvePages',
    agent: 'pageResolverAgent',
    input: ''
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
      input: ''
    }
  })
]);

// component.jsx
const result = await execute(crossYearFlow, {
  agents: {
    intentParserAgent,
    pageResolverAgent,
    itemCreatorAgent
  },
  input: userMessage,
  onFlowStart: (flow) => console.log('[Start]', flow.name),
  onFlowFinish: (flow, result) => console.log('[Finish]', flow.name, result)
});
```

---

## Tips & Tricks

### 1. Name Your Flows
```javascript
const flow = {
  name: 'createCrossYearActivity', // Unique name for debugging
  agent: 'sequenceAgent',
  input: [...]
};
```

### 2. Use Pure Functions When Possible
```javascript
// ❌ Don't use LLM for deterministic tasks
const getPagesAgent = agent({
  model: openai('gpt-4o'),
  system: 'Get available pages'
});

// ✅ Use pure function
const getPagesAgent = async ({ input }) => {
  return await fetchPages(input.wheelId);
};
```

### 3. Schema Descriptions Help LLM
```javascript
// ❌ Minimal schema
z.object({ id: z.string(), name: z.string() })

// ✅ Descriptive schema
z.object({
  id: z.string().describe('UUID of the item'),
  name: z.string().describe('Display name for the activity')
})
```

### 4. Log Everything During Development
```javascript
const agent = async ({ input }, context) => {
  console.log('[Agent] Input:', input);
  console.log('[Agent] Context:', context);
  const result = await processInput(input);
  console.log('[Agent] Result:', result);
  return result;
};
```

### 5. Test Flows in Isolation
```javascript
// Don't integrate immediately - test flow structure first
const testResult = await execute(myFlow, {
  agents: {
    agent1: async () => 'mock result 1',
    agent2: async () => 'mock result 2'
  },
  input: 'test input'
});
console.log('Flow test result:', testResult);
```

---

## Debugging Checklist

If flow doesn't work:

1. ✅ Check agent names match between definition and execute()
2. ✅ Verify agents return expected data types
3. ✅ Check context is being passed correctly
4. ✅ Use onFlowStart/onFlowFinish to trace execution
5. ✅ Validate Zod schemas match actual data
6. ✅ Test each agent in isolation first
7. ✅ Check for thrown errors in agents
8. ✅ Verify input format matches what agent expects

---

## Common Pitfalls

### ❌ Agent name mismatch
```javascript
// Definition
const flow = { agent: 'myAgent', input: '...' };

// Execute
execute(flow, {
  agents: { myAgentTypo: ... } // ← WRONG
});
```

### ❌ Not returning value from agent
```javascript
const agent = async ({ input }) => {
  processInput(input);
  // ← Missing return!
};
```

### ❌ Schema doesn't match data
```javascript
forEach({
  item: z.object({ id: z.number() }), // ← Expects number
  input: { ... }
});

// But previous step returns: { id: "uuid-string" } ← String!
```

### ❌ Async not awaited
```javascript
const agent = async ({ input }) => {
  const result = fetchData(input); // ← Missing await!
  return result; // Returns Promise, not data
};
```

---

## Resources

- **Docs:** https://flows-ai.callstack.com/
- **GitHub:** https://github.com/callstackincubator/flows-ai
- **Examples:** https://github.com/callstackincubator/flows-ai/tree/main/example

---

## Year Wheel Specific

**File Structure:**
```
src/
├── services/
│   ├── aiAgents.js      ← Agent definitions
│   ├── aiFlows.js       ← Flow definitions
│   └── aiWheelService.js ← Tool implementations
└── components/
    └── AIAssistant.jsx   ← Integration point
```

**Detection Pattern:**
```javascript
const detectCrossYearRequest = (message) => {
  const datePattern = /(\d{4})-(\d{2})-(\d{2})/g;
  const dates = [...message.matchAll(datePattern)];
  
  if (dates.length >= 2) {
    return dates[0][1] !== dates[1][1]; // Different years
  }
  
  const keywords = ['till', 'mellan', 'över årsskifte'];
  return keywords.some(kw => message.toLowerCase().includes(kw));
};
```

**Integration:**
```javascript
if (detectCrossYearRequest(userMessage)) {
  // Use Flows AI
  const result = await execute(crossYearActivityFlow, { ... });
} else {
  // Use streamText
  const result = await streamText({ ... });
}
```
