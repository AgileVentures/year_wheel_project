# AI Multi-Step Workflow Fix - Understanding Vercel AI SDK

## The Fundamental Misunderstanding

We were fighting **against** the Vercel AI SDK's architecture instead of working **with** it.

### What We Were Trying To Do (WRONG):
```javascript
// System Prompt (incorrect approach):
"UTFÖR ALLA STEG I ETT ENDA SVAR - STANNA INTE MELLAN STEGEN!"
"Kalla ALLA dessa verktyg i ETT ende svar"
```

**This was forcing the AI to call multiple tools in ONE response**, which is:
1. ❌ Not how the AI SDK is designed to work
2. ❌ Fighting against the streaming architecture
3. ❌ Causing the AI to stop and explain instead of act

### How The AI SDK Actually Works (CORRECT):

The Vercel AI SDK is **designed** for multi-step workflows:

```javascript
const result = await streamText({
  model: openaiInstance.chat('gpt-4o'),
  maxSteps: 12,  // ← This is the magic!
  messages: chatMessages,
  tools: { ... }
});
```

**`maxSteps`** allows the AI to:
1. ✅ Call a tool → get results
2. ✅ **Automatically continue** to next step
3. ✅ Call another tool → get results
4. ✅ Keep going until workflow completes
5. ✅ Finally respond with text

## The Documentation We Needed

From https://ai-sdk.dev/cookbook/node/call-tools-multiple-steps

### Simple Example (generateText):
```javascript
const { text, steps } = await generateText({
  model: openai('gpt-4.1'),
  stopWhen: stepCountIs(5),  // Stop after 5 steps
  tools: {
    weather: tool({ ... }),
  },
  prompt: 'What is the weather in San Francisco?',
});
```

### Advanced Example (streamText with multiple workflows):
```javascript
const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    // Step 1: Force tool call
    const result1 = streamText({
      model: openai('gpt-4o-mini'),
      messages,
      toolChoice: 'required',
      tools: { extractGoal: tool({ ... }) },
    });
    
    writer.merge(result1.toUIMessageStream({ sendFinish: false }));
    
    // Step 2: Continue with previous messages
    const result2 = streamText({
      model: openai('gpt-4o'),
      messages: [
        ...convertToModelMessages(messages),
        ...(await result1.response).messages,  // ← Key: chain messages
      ],
    });
    
    writer.merge(result2.toUIMessageStream({ sendStart: false }));
  },
});
```

## Our Implementation

### Configuration (Already Correct):
```javascript
// AIAssistant.jsx line 625
const result = await streamText({
  model: openaiInstance.chat('gpt-4o'),
  maxSteps: 12,  // ✅ Already set! Allows 12 automatic steps
  messages: chatMessages,
  tools: { ... }
});
```

### Old System Prompt (Fighting The SDK):
```
"UTFÖR ALLA STEG I ETT ENDA SVAR"
"Kalla ALLA dessa verktyg i ETT ende svar"
"STANNA INTE MELLAN STEGEN!"
```

**Problem**: This told the AI to do something the SDK wasn't designed for.

### New System Prompt (Working With The SDK):
```
ARBETSFLÖDE (varje steg körs automatiskt i följd):
1. Skapa första delen → createItem(...)
2. Kontrollera årssidor → getAvailablePages()
3. Skapa nästa års sida (om saknas) → createPage(...)  
4. Byt till nästa års sida → navigateToPage(...)
5. Skapa andra delen → createItem(...)

Systemet tillåter flera steg automatiskt (maxSteps: 12). 
Efter att HELA sekvensen körts klart, bekräfta: "Klart! ..."
```

**Solution**: This describes a **sequence** the AI should follow, letting the SDK handle the multi-step execution.

## How It Works In Practice

### User Request:
```
"skapa vinterkampanj 3025-12-01 till 3026-02-26"
```

### Old Behavior (Broken):
```
AI: "Jag behöver dela upp aktiviteten..."
    [Calls getAvailablePages]
    [Gets results]
    [STOPS and reports to user] ❌
```

### New Behavior (Fixed):
```
AI: 
  Step 1: [Calls createItem("Vinterkampanj (del 1)", "3025-12-01", "3025-12-31")]
          → Result: Created ✅
          
  Step 2: [Calls getAvailablePages()]
          → Result: {2025: exists, 2026: exists} ✅
          
  Step 3: [Skips createPage - 3026 already exists] ✅
          
  Step 4: [Calls navigateToPage(3026-page-id)]
          → Result: Navigated ✅
          
  Step 5: [Calls createItem("Vinterkampanj (del 2)", "3026-01-01", "3026-02-26")]
          → Result: Created ✅
          
  Step 6: [Text Response] "Klart! Jag har delat upp vinterkampanjen på två år..."
```

**All steps execute automatically because of `maxSteps: 12`!**

## Key Insights

### 1. The SDK Is Already Multi-Step Capable
We already had `maxSteps: 12` configured. The problem wasn't the code, it was the **instructions**.

### 2. Don't Fight The Architecture
Trying to force "all tools in one response" was fighting the SDK's design. The SDK **wants** to execute tools in sequence.

### 3. Trust The Streaming Model
```javascript
streamText({
  maxSteps: 12,  // SDK handles continuation automatically
  tools: { ... }
})
```

The SDK will:
- Call tool → Wait for result
- **Automatically** decide to continue
- Call next tool → Wait for result
- Repeat until done or maxSteps reached
- Finally output text response

### 4. System Prompts Should Describe Workflows, Not Force Behavior
**Bad**: "KALLA ALLA VERKTYG I ETT SVAR"  
**Good**: "ARBETSFLÖDE: Steg 1 → Steg 2 → Steg 3"

The first fights the SDK. The second describes what to do and lets the SDK execute it properly.

## Testing The Fix

Try cross-year activities:

```
"Skapa vinterkampanj 3025-12-01 till 3026-02-26"
"Lägg till julkampanj från 2025-12-15 till 2026-01-15"
"Skapa Q4-Q1 projekt 2025-10-01 till 2026-03-31"
```

**Expected behavior**: All 5 steps execute automatically in sequence, then confirmation message.

## Benefits

1. ✅ **Works with SDK architecture** - No longer fighting the framework
2. ✅ **Automatic multi-step** - maxSteps handles continuation
3. ✅ **Clearer instructions** - Workflow description vs. forced behavior
4. ✅ **More reliable** - SDK designed for this pattern
5. ✅ **Better debugging** - Can see each step in console logs

## Related Documentation

- **Vercel AI SDK Multi-Step Guide**: https://ai-sdk.dev/cookbook/node/call-tools-multiple-steps
- **streamText Multi-Step Example**: https://ai-sdk.dev/cookbook/next/stream-text-multistep
- **AI SDK Core Concepts**: https://ai-sdk.dev/docs/ai-sdk-core/overview

## Files Modified

- **src/components/AIAssistant.jsx** (lines 236-248)
  - Rewrote cross-year instructions to describe workflow sequence
  - Removed "all in one response" forcing language
  - Added explicit mention of maxSteps automatic handling
  - Changed from prescriptive commands to descriptive workflow

## Lessons Learned

1. **Read The Docs First** - The SDK documentation had the answer all along
2. **Understand The Architecture** - Know how your framework is designed to work
3. **Don't Over-Specify** - Let the SDK do what it's designed to do
4. **Describe, Don't Command** - AI prompts should guide, not force unnatural behavior
5. **Trust The System** - `maxSteps` works, we just need to let it
