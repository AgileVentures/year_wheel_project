# AI Assistant V2 - Context + Streaming Refactor

## Problem
Context is lost between agent handoffs. When orchestrator suggests campaigns and user says "create these", Activity Agent doesn't have access to the earlier suggestions.

## Solution from OpenAI Agents SDK Docs

### 1. RunContext<T> for Persistent Data
```typescript
interface WheelContext {
  supabase: any
  wheelId: string
  userId: string
  currentYear: number
  // NEW: Store conversation state
  lastSuggestions?: Array<{name: string, startDate: string, endDate: string, ring: string, group: string}>
}
```

Every tool receives `RunContext<WheelContext>` and can READ/WRITE to `ctx.context`.

### 2. Streaming for Better UX
```typescript
const stream = await run(agent, input, { 
  stream: true,
  context: wheelContext 
})

// Return SSE stream to frontend
return new Response(
  stream.toTextStream({ compatibleWithNodeStreams: true }),
  { headers: { 'Content-Type': 'text/event-stream' } }
)
```

##  Implementation Steps

### Step 1: Update all function signatures
**Before:**
```typescript
async function createActivity(supabase: any, wheelId: string, args: CreateActivityInput)
```

**After:**
```typescript
async function createActivity(ctx: RunContext<WheelContext>, args: CreateActivityInput)
const { supabase, wheelId } = ctx.context
```

**Functions to update:**
- createActivity
- createRing
- createGroup
- createLabel
- updateActivity
- updateRing
- updateGroup
- updateLabel
- deleteActivity
- deleteRing
- deleteGroup
- deleteLabel
- getCurrentRingsAndGroups
- getCurrentDate

### Step 2: Update all tool execute functions
**Before:**
```typescript
execute: async (input, { supabase, wheelId }) => {
  return await createActivity(supabase, wheelId, input)
}
```

**After:**
```typescript
execute: async (input, ctx: RunContext<WheelContext>) => {
  return await createActivity(ctx, input)
}
```

### Step 3: Add suggestion storage
Add to Activity Agent tools:
```typescript
const saveSuggestionsTool = tool<WheelContext>({
  name: 'save_campaign_suggestions',
  description: 'Save suggested campaigns for later creation',
  parameters: z.object({
    suggestions: z.array(z.object({
      name: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      ring: z.string(),
      group: z.string(),
    }))
  }),
  execute: async (input, ctx) => {
    ctx.context.lastSuggestions = input.suggestions
    return 'Suggestions saved. User can now say "create these" to execute.'
  }
})

const createFromSuggestionsTool = tool<WheelContext>({
  name: 'create_campaigns_from_saved_suggestions',
  description: 'Create all previously suggested campaigns',
  parameters: z.object({}),
  execute: async (input, ctx) => {
    if (!ctx.context.lastSuggestions) {
      return 'No suggestions found'
    }
    
    const results = []
    for (const suggestion of ctx.context.lastSuggestions) {
      // Map ring/group names to IDs
      const { supabase, wheelId } = ctx.context
      const ring = await findRingByName(ctx, suggestion.ring)
      const group = await findGroupByName(ctx, suggestion.group)
      
      const result = await createActivity(ctx, {
        name: suggestion.name,
        startDate: suggestion.startDate,
        endDate: suggestion.endDate,
        ringId: ring.id,
        activityGroupId: group.id,
        labelId: null,
      })
      results.push(result)
    }
    
    ctx.context.lastSuggestions = [] // Clear after use
    return `Created ${results.length} campaigns`
  }
})
```

### Step 4: Add helper functions
```typescript
async function findRingByName(ctx: RunContext<WheelContext>, name: string) {
  const { supabase, wheelId } = ctx.context
  const { data } = await supabase
    .from('wheel_rings')
    .select('*')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${name}%`)
    .single()
  return data
}

async function findGroupByName(ctx: RunContext<WheelContext>, name: string) {
  const { supabase, wheelId } = ctx.context
  const { data } = await supabase
    .from('activity_groups')
    .select('*')
    .eq('wheel_id', wheelId)
    .ilike('name', `%${name}%`)
    .single()
  return data
}
```

### Step 5: Enable streaming
```typescript
serve(async (req) => {
  // ... auth ...
  
  const wheelContext: WheelContext = {
    supabase,
    wheelId: body.wheelId,
    userId: user.id,
    currentYear: new Date().getFullYear(),
    lastSuggestions: undefined, // Will be populated during run
  }
  
  const stream = await run(orchestratorAgent, body.messages, {
    stream: true,
    context: wheelContext,
    maxTurns: 20,
  })
  
  // Return text stream as SSE
  return new Response(
    stream.toTextStream({ compatibleWithNodeStreams: true }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  )
})
```

### Step 6: Update frontend
```typescript
// AIAssistant.jsx - handle streaming response
const response = await fetch(`${url}/functions/v1/ai-assistant-v2`, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ ... }),
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

let assistantMessage = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const chunk = decoder.decode(value)
  assistantMessage += chunk
  
  // Update UI in real-time
  setMessages(prev => {
    const newMessages = [...prev]
    const lastMessage = newMessages[newMessages.length - 1]
    if (lastMessage.role === 'assistant') {
      lastMessage.content = assistantMessage
    } else {
      newMessages.push({ role: 'assistant', content: assistantMessage })
    }
    return newMessages
  })
}
```

## Testing Plan

1. **Test suggestion flow:**
   - "Kan du föreslå kampanjer för lansering..."
   - AI: suggests 3 campaigns
   - User: "skapa dessa tack"
   - AI: should create all 3 campaigns

2. **Test streaming:**
   - Watch response appear character-by-character
   - Verify tool calls complete before final response

3. **Test context preservation:**
   - Create activity in one message
   - Update it in next message (refer by name only)
   - Delete it in third message

## File Changes Required

### /supabase/functions/ai-assistant-v2/index.ts
- Add WheelContext interface with lastSuggestions
- Update all 14 helper function signatures
- Update all 16 tool execute functions
- Add saveSuggestionsTool and createFromSuggestionsTool
- Add findRingByName and findGroupByName helpers
- Update main serve handler for streaming
- Type all agents: `new Agent<WheelContext>(...)`

### /src/components/AIAssistant.jsx
- Update fetch to handle streaming response
- Add reader loop for streaming text
- Update UI to show incremental updates

## Benefits

1. ✅ Context preserved across handoffs
2. ✅ Can suggest then create from suggestions
3. ✅ Real-time streaming response
4. ✅ Better UX with incremental updates
5. ✅ Proper TypeScript types throughout
6. ✅ Cleaner function signatures (no passing supabase/wheelId everywhere)
