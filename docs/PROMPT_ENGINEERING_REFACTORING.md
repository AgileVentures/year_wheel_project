# AI Assistant Prompt Engineering Refactoring - Nov 2025

## Summary
Streamlined all AI agent prompts by 73% (580 lines → 155 lines) by removing defensive bloat, consolidating examples, and trusting GPT-4o's capabilities. This improves response speed, reduces costs, and increases clarity.

## Problem Analysis

### 1. Excessive Prompt Repetition
- "NEVER use emojis" appeared in EVERY agent (5 times)
- "Keep responses concise" repeated everywhere
- Markdown formatting instructions duplicated across all agents
- Same warning language reused: "CRITICAL", "MANDATORY", "⚠️"

### 2. Activity Agent - Massive Hallucination Prevention Section
The "ANTI-HALLUCINATION PROTOCOL" was overly defensive and verbose (170 lines total):
```typescript
⚠️ ANTI-HALLUCINATION PROTOCOL (MANDATORY):
1. You MUST call create_activity...
2. You MUST check if the tool result...
3. You MUST ONLY say "Klart!" if success:true...
// ... 6 more rules
// ... followed by RESPONSE VALIDATION
// ... and VALID RESPONSE PATTERN examples
```

**Problem**: This created anxiety and overthinking. GPT-4o already knows to use tools when available.

### 3. Redundant Examples
The Activity Agent had excessive examples showing the same pattern repeatedly:
- 5 examples for update operations (same pattern each time)
- Batch update workflow explained 3 times with slight variations
- Date handling examples repeated in multiple sections

### 4. Orchestrator Over-Specification
The orchestrator had extremely detailed routing rules with 20+ examples. The handoff descriptions should be sufficient - the model is smart enough to route correctly.

### 5. Anxiety-Inducing Language
Heavy use of:
- ALL CAPS: "CRITICAL", "MANDATORY", "NEVER", "ALWAYS"
- Warning symbols: "⚠️", "❌", "✅"
- Threatening language: "YOU ARE MALFUNCTIONING", "YOU ARE HALLUCINATING"

This suggests trust issues with the model that could be solved with better prompt engineering rather than shouting.

## Refactoring Approach

### Core Philosophy
**Trust the model more.** GPT-4o is smart enough to understand concise instructions. The excessive repetition and warnings suggest past issues, but those are fixable with clearer structure rather than more text.

### What Was Cut

1. **ANTI-HALLUCINATION PROTOCOL** → Replaced with simple workflow steps
   - From: 30 lines of warnings and validations
   - To: 5 lines describing the workflow

2. **Repetitive Examples** → One clear example per pattern
   - From: 5 batch update examples
   - To: 1 comprehensive batch update example

3. **Defensive Warnings** → Said once at the top
   - From: "NO EMOJIS" repeated 5 times
   - To: "No emojis" mentioned once in first line

4. **Orchestrator Routing** → Simplified to essentials
   - From: 120 lines with 20+ examples
   - To: 15 lines with priority rules

5. **Anxiety Language** → Removed threatening tone
   - From: "CRITICAL", "MANDATORY", "YOU ARE MALFUNCTIONING"
   - To: Clear, professional instructions

### What Was Kept

1. **Concrete Workflow Steps** - These help the model understand sequence
2. **Technical Details** - Date formats, UUID requirements, etc.
3. **Tool Descriptions** - Clear explanations of what each tool does
4. **Domain Knowledge** - Batch operations, multi-year logic, etc.

## Line-by-Line Reduction

### Activity Agent
**Before:** 170 lines
**After:** 50 lines
**Reduction:** 70%

Key changes:
- Removed ANTI-HALLUCINATION PROTOCOL (30 lines → 0)
- Removed RESPONSE VALIDATION section (20 lines → 0)
- Consolidated examples (50 lines → 15)
- Simplified workflow (20 lines → 10)
- Kept: Date parsing, batch updates, multi-year logic

### Orchestrator Agent
**Before:** 120 lines
**After:** 15 lines
**Reduction:** 87%

Key changes:
- Removed 20+ routing examples (80 lines → 0)
- Simplified to 4 specialist descriptions + 4 priority rules
- Kept: Handoff descriptions (now rely on toolDescriptionOverride)

### Structure Agent
**Before:** 80 lines
**After:** 20 lines
**Reduction:** 75%

Key changes:
- Removed repetitive CRUD examples (30 lines → 0)
- Condensed structure suggestion workflow (20 lines → 5)
- Kept: Tool types, visibility management, year page logic

### Analysis Agent
**Before:** 60 lines
**After:** 20 lines
**Reduction:** 67%

Key changes:
- Removed defensive "DON'T FABRICATE" warnings (15 lines → 0)
- Removed detailed output format example (20 lines → 5)
- Kept: Workflow, output structure, tool calling requirement

### Planning Agent
**Before:** 150 lines
**After:** 50 lines
**Reduction:** 67%

Key changes:
- Removed verbose example plan (60 lines → 0)
- Condensed multi-year explanation (20 lines → 5)
- Simplified workflow (30 lines → 10)
- Kept: JSON string handling (critical), multi-year awareness, presentation format

## Total Impact

**Overall Reduction:** 73%
- Before: ~580 lines across all agents
- After: ~155 lines across all agents
- Savings: 425 lines

**Estimated Token Savings:**
- Prompt tokens per request: ~4,000 → ~1,100 (73% reduction)
- At $0.01 per 1K tokens: $0.04 → $0.011 per request (72% cost reduction)
- For 1000 requests/day: $40 → $11/day savings = $870/month

**Response Speed Improvement:**
- Fewer tokens to process = faster first token latency
- Estimated 20-30% faster initial responses

## Testing Recommendations

### 1. Tool Calling Accuracy
Test if agents still call the right tools after prompt reduction:
- Create activity: Should call get_current_context → create_activity
- Batch update: Should call query_activities → update_activity (multiple)
- Structure suggestion: Should call suggest_wheel_structure → create_ring/group

### 2. Response Quality
Verify responses are still helpful and accurate:
- Swedish language quality maintained?
- Markdown formatting still correct?
- No emojis appearing?
- Concise but complete responses?

### 3. Edge Cases
Test complex scenarios:
- Multi-year activities (Oct 2025 - Mar 2026)
- Batch operations (update 12 activities)
- Cross-year moves
- Missing structure errors

### 4. Token Usage Monitoring
Measure actual improvements:
- Log prompt token count per request
- Compare before/after average response times
- Track cost per 1000 requests

## Migration Notes

### Deployment
✅ Deployed: Nov 5, 2025
✅ Edge function: `ai-assistant-v2` updated
✅ Commit: 507de8f "AI Assistant: Streamline all agent prompts"

### Rollback Plan
If issues arise:
```bash
# Revert to previous version (with ANTI-HALLUCINATION PROTOCOL)
git revert 507de8f

# Redeploy edge function
npx supabase functions deploy ai-assistant-v2
```

### Monitoring Checklist
- [ ] Watch for tool calling failures (agent not calling tools)
- [ ] Check for hallucinations (claiming success without tool execution)
- [ ] Monitor user complaints about response quality
- [ ] Track token usage reduction (should see ~73% drop in prompt tokens)
- [ ] Measure response speed improvements (should be 20-30% faster)

## Expected Outcomes

### Positive
✅ Faster responses (less tokens to process)
✅ Lower costs (73% prompt token reduction)
✅ Clearer instructions (better signal-to-noise ratio)
✅ More trust in the model (less anxiety-inducing language)
✅ Easier to maintain (155 lines vs 580 lines)

### Potential Risks
⚠️ Tool calling accuracy might decrease slightly (though GPT-4o is reliable)
⚠️ Hallucinations might increase (though defensive language didn't prevent them)
⚠️ Edge cases might not be covered as explicitly

### Mitigation
- Monitor production closely for first week
- Keep detailed logs of tool execution
- Add back specific instructions only if patterns emerge
- Don't revert to defensive language unless absolutely necessary

## Key Insights

### 1. Trust the Model
GPT-4o is sophisticated enough to understand concise instructions. The excessive warnings were more about lack of trust than actual model limitations.

### 2. One Clear Example > Ten Repetitive Ones
A single, comprehensive example is more effective than repeating the same pattern multiple times.

### 3. Defensive Language Creates Anxiety
ALL CAPS and warning symbols make the prompt harder to read and don't actually improve compliance.

### 4. Workflows > Rules
Describing the sequence of steps is more effective than listing rules about what NOT to do.

### 5. Less is More
Shorter prompts = faster processing = lower costs = better user experience

## Future Improvements

### 1. A/B Testing
Test different prompt lengths to find optimal balance between conciseness and clarity.

### 2. Dynamic Prompts
Adjust prompt length based on task complexity (simple tasks = shorter prompts).

### 3. Tool Choice Enforcement
If hallucinations become an issue, use `tool_choice: 'required'` instead of verbose warnings.

### 4. Server-Side Validation
Add response validation layer to catch hallucinations automatically:
```typescript
if (responseText.includes('Klart!') && toolExecutionSummary.length === 0) {
  throw new Error('AI hallucinated - no tools called')
}
```

### 5. Prompt Versioning
Track prompt versions and their effectiveness metrics to iterate scientifically.

## Related Documents
- `docs/AI_HALLUCINATION_FIX.md` - Previous attempt at preventing hallucinations (now superseded)
- `docs/AI_ASSISTANT_V2_IMPROVEMENTS.md` - Previous fixes (batch updates, page awareness)
- `docs/guides/12_AI_ASSISTANT.md` - User documentation

## Contact
Created: Nov 5, 2025
Status: Deployed, awaiting testing
Priority: HIGH (significant architectural change)
Author: AI Agent (based on user feedback about defensive bloat)
