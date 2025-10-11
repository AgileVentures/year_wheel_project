# AI Not Continuing After getAvailablePages - Troubleshooting

## Problem
AI calls `getAvailablePages()` but then stops instead of calling `createItem()`.

**Evidence from console:**
```
🔧 [AI] Tool results: [{…}]
  toolName: "getAvailablePages"
  output: { success: true, pages: [...] }

🤖 [AI] No text response, analyzing tool results...
✅ [AI] Using fallback message: **Tillgängliga sidor:**...
```

AI stops after step 1 instead of continuing to steps 2-3 (createItem calls).

## Possible Causes

### 1. **Model Not Using maxSteps** (Most Likely)
The `maxSteps: 12` parameter tells the SDK to allow 12 tool calls, but the **model decides** when to stop.

**Why it stops:**
- GPT-4.1 is trained to be cautious
- After getAvailablePages(), model thinks "I've gathered info, now respond to user"
- Model doesn't realize it should continue automatically

**Evidence:**
- Only 1 tool call in results array
- No createItem attempts
- Generates text response instead of continuing

### 2. **System Prompt Not Forceful Enough**
Even with "Förklara inte - gör det!", model interprets this as suggestion, not command.

### 3. **Tool Return Format**
If `getAvailablePages()` returns with `success: true`, model might interpret this as "task complete".

## Solutions Tried

### ✅ Attempt 1: Made Prompt More Direct
```javascript
"ABSOLUT REGEL: När getAvailablePages() körs, kör DIREKT createItem() - INGET annat!"
```

### ✅ Attempt 2: Added Explicit Example
```javascript
**EXEMPEL - Aktivitet över årsskifte:**
User: "skapa julkampanj 2025-12-15 till 2026-01-30"
Du MÅSTE:
1. getAvailablePages()
2. createItem(pageId:"page-2025", ...)
3. createItem(pageId:"page-2026", ...)
```

## Additional Solutions to Try

### Option A: Change Tool Description
Make `getAvailablePages` description explicitly state "DO NOT respond after this, call createItem next":

```javascript
getAvailablePages: tool({
  description: 'Lista sidor med IDs. VIKTIGT: Efter detta verktyg MÅSTE du direkt kalla createItem() - svara INTE till användaren!',
  // ...
})
```

### Option B: Use Streaming Callbacks
Force continuation by checking in the callback:

```javascript
onFinish: async ({ text, toolCalls }) => {
  // If only getAvailablePages was called, log warning
  if (toolCalls.length === 1 && toolCalls[0].toolName === 'getAvailablePages') {
    console.warn('⚠️ AI stopped after getAvailablePages - this is a bug!');
  }
}
```

### Option C: Return Instructions in Tool Output
Make `getAvailablePages()` return instructions:

```javascript
return {
  success: true,
  pages: [...],
  message: "...",
  nextAction: "NOW call createItem() with these pageIds - DO NOT respond to user yet!"
};
```

### Option D: Different Model
Try `gpt-4o` instead of `gpt-4.1-2025-04-14` - might handle multi-step better:

```javascript
model: openaiInstance.chat('gpt-4o'),
```

### Option E: Agentic Prompt Pattern
Use more forceful agentic language:

```javascript
systemPrompt = \`You are an autonomous agent. You MUST complete all steps before responding.

MULTI-STEP TASKS:
When user asks to create activity across years:
- Step 1: getAvailablePages()
- Step 2-N: createItem() for EACH part
- Step FINAL: Respond to user

YOU MUST NOT skip steps. YOU MUST NOT respond after Step 1.
\`;
```

## Debugging Steps

1. **Check Console for Tool Calls:**
   ```
   Look for: 🤖 [AI Tool] createItem called with: ...
   If missing: AI didn't call createItem
   ```

2. **Check streamText Result:**
   ```javascript
   console.log('Tool calls made:', result.toolCalls?.length);
   console.log('Tool names:', result.toolCalls?.map(t => t.toolName));
   ```

3. **Check maxSteps Usage:**
   ```javascript
   console.log('Steps used:', result.steps);
   console.log('Max steps:', result.maxSteps);
   ```

## Workaround: Manual Multi-Step

If AI won't do it automatically, add a "multi-step orchestrator":

```javascript
// After getAvailablePages, check if we should auto-continue
onFinish: async ({ toolResults }) => {
  const lastTool = toolResults[toolResults.length - 1];
  
  if (lastTool.toolName === 'getAvailablePages' && userMessageContains('över år')) {
    // Extract info from user message
    const { name, startDate, endDate } = parseUserMessage(userMessage);
    const pages = lastTool.result.pages;
    
    // Auto-call createItem for each part
    await createCrossYearActivity(pages, name, startDate, endDate);
  }
}
```

## Expected vs Actual Behavior

### Expected (Working Multi-Step):
```
User: "skapa julkampanj 2025-12-15 till 2026-01-30"
→ AI: getAvailablePages()
→ AI: createItem(pageId: 2025, ...)
→ AI: createItem(pageId: 2026, ...)
→ AI: "Klart!"
```

### Actual (AI Stopping Early):
```
User: "skapa julkampanj 2025-12-15 till 2026-01-30"
→ AI: getAvailablePages()
→ AI: "Tillgängliga sidor: 2025, 2026" ❌ STOPS HERE
```

## Next Action

Try **Option D first** (switch to gpt-4o) as it's quickest to test:

```javascript
model: openaiInstance.chat('gpt-4o'),
```

If that doesn't work, try **Option A** (change tool description to be more forceful).
