# AI Smart Inference Enhancement

## Problem
The AI was constantly asking users to choose rings and activity groups, even when the choice was obvious from context:

**Bad Example:**
```
User: "lägg till marskampanj hela mars"
AI: "Vilken ring ska jag använda?
• Erbjudande under kampanj (inre)
• Kampanjer (inre)
• Händelser (yttre)
• Produktfokus (inre)

Och vilken aktivitetsgrupp?
• Kampanj
• Händelse
• Erbjudande
• REA"
```

This is **annoying** - the user said "**mars-kampanj**", which clearly should go in the **"Kampanjer"** ring with **"Kampanj"** group!

## Solution

### Core Principle Added
Made the AI's primary goal: **"BE HELPFUL, NOT ANNOYING"**

```typescript
YOUR CORE PRINCIPLE: **BE HELPFUL, NOT ANNOYING**
- INFER what the user wants instead of always asking
- USE CONTEXT to make smart decisions
- ONLY ASK when truly ambiguous (rare)
- EXECUTE immediately when you can
```

### Smart Inference Rules

#### 1. Pattern Matching
The AI now looks for keywords in activity names:

| Activity Name | Inferred Ring | Inferred Group | Reasoning |
|--------------|---------------|----------------|-----------|
| "Marskampanjen" | Kampanjer | Kampanj | Contains "kampanj" |
| "Sommarrea" | Kampanjer | REA | Contains "rea" |
| "Produktlansering" | Produktfokus | Kampanj | Contains "produkt" |
| "Nyårsevent" | Händelser | Händelse | Contains "event" |
| "Specialerbjudande" | Erbjudande under kampanj | Erbjudande | Contains "erbjudande" |
| "Julkampanj" | Kampanjer | Kampanj | Contains "kampanj" |

#### 2. Fallback Strategy
```typescript
**Smart Matching Priority:**
1. Look for exact keyword matches in activity name
2. Use fuzzy/semantic matching (e.g., "kampanj" ≈ "Kampanjer")
3. If multiple matches → prefer outer rings (more visible)
4. If NO match → use most general ring (e.g., "Kampanjer")
5. ONLY ASK if truly ambiguous (very rare)
```

#### 3. User Override
If user explicitly specifies a ring, use that instead:

```
User: "lägg till julkampanj i produktfokus-ringen"
AI: Uses "Produktfokus" (not "Kampanjer" despite "kampanj" in name)
```

## Updated System Prompt

### Section 1: Smart Inference
```typescript
1. **SMART INFERENCE - BE PROACTIVE, NOT ANNOYING**: 
   - ALWAYS try to infer the best ring/group from the activity name/context
   - Only ask if truly ambiguous (multiple equally good matches)
   
   **Inference Examples:**
   - "julkampanj" → ring: "Kampanjer", group: "Kampanj" (obvious match)
   - "påskrea" → ring: "Kampanjer", group: "REA" (contains "rea")
   - "produktlansering" → ring: "Produktfokus", group: "Kampanj"
   - "nyårsevent" → ring: "Händelser", group: "Händelse"
   - "specialerbjudande" → ring: "Erbjudande under kampanj", group: "Erbjudande"
```

### Section 5: Smart Matching Before ID Mapping
```typescript
**SMART MATCHING (Do this BEFORE asking user):**
- Look at the activity name and infer the best ring/group
- "Marskampanjen" → Contains "kampanj" → Use "Kampanjer" + "Kampanj"
- Use fuzzy/semantic matching - don't need exact string match
- If user explicitly specifies ring/group, use that instead
- Only ask if NO reasonable inference possible (rare)
```

### Example Conversations

#### CORRECT - Smart Inference:
```
User: "lägg till marskampanj hela mars"

AI thinks:
- Name: "marskampanj" → contains "kampanj"
- Available: "Kampanjer" ring, "Kampanj" group
- MATCH! → Look up UUIDs → Execute

AI responds: "Klart! Jag har lagt till Marskampanj i ringen Kampanjer under gruppen Kampanj för hela mars ✅"
```

#### CORRECT - User Override:
```
User: "lägg till julkampanj i produktfokus-ringen"

AI thinks:
- User specified "produktfokus" → Use that ring
- Name contains "kampanj" → Use "Kampanj" group
- Execute immediately

AI responds: "Klart! Julkampanj är tillagd i ringen Produktfokus ✅"
```

#### WRONG - Don't Do This:
```
User: "lägg till marskampanj hela mars"

AI responds: "Vilken ring ska jag använda?" ❌ ANNOYING!
```

## Expected Behavior After Fix

### Test Case 1: Obvious Match
```
User: "lägg till marskampanj hela mars. titel: Marskampanjen"
Expected: ✅ Creates immediately in "Kampanjer" ring, "Kampanj" group
          ✅ No questions asked
          ✅ Responds: "Klart! Marskampanj tillagd ✅"
```

### Test Case 2: REA Activity
```
User: "lägg till sommarrea 1 juni till 15 juni"
Expected: ✅ Infers "REA" from name
          ✅ Uses "Kampanjer" ring, "REA" group
          ✅ Creates immediately
```

### Test Case 3: Product Focus
```
User: "lägg till produktlansering Q2"
Expected: ✅ Infers "Produktfokus" ring from name
          ✅ Uses "Kampanj" or similar group
          ✅ Creates immediately
```

### Test Case 4: Event
```
User: "lägg till nyårsfest 31 december"
Expected: ✅ Infers "Händelser" ring from "event" context
          ✅ Uses "Händelse" group
          ✅ Creates immediately
```

### Test Case 5: User Override
```
User: "lägg till julkampanj i händelser-ringen"
Expected: ✅ Uses "Händelser" ring (not "Kampanjer")
          ✅ Respects user's explicit choice
          ✅ Infers "Kampanj" or "Händelse" group
```

### Test Case 6: Truly Ambiguous (rare)
```
User: "lägg till aktivitet hela mars"
Expected: ✅ Generic name, no keywords
          ✅ AI asks: "Vad ska aktiviteten heta? Är det en kampanj, event, eller erbjudande?"
          ✅ Gets clarification, then executes
```

## Benefits

### Before (Annoying):
- ❌ Always asked for ring selection
- ❌ Always asked for group selection
- ❌ 2-3 back-and-forth messages for simple tasks
- ❌ Frustrating user experience

### After (Smart):
- ✅ Infers from context
- ✅ Executes immediately when obvious
- ✅ One-shot activity creation
- ✅ Delightful user experience
- ✅ Only asks when truly needed (rare)

## Deployment

```bash
# Deploy updated edge function
supabase functions deploy ai-assistant

# Test scenarios
# 1. "lägg till marskampanj hela mars"
# 2. "lägg till sommarrea 1-15 juni"
# 3. "lägg till produktlansering Q2"
# 4. "lägg till nyårsevent 31 dec"
```

## Files Modified

1. `supabase/functions/ai-assistant/index.ts`
   - Lines 847-852: Added core principle at top
   - Lines 858-874: Added smart inference section
   - Lines 899-921: Enhanced ID mapping with smart matching
   - Lines 972-995: Updated example conversations

## Related Documentation

- `AI_ID_MAPPING_FIX.md` - How AI maps names to UUIDs
- `AI_PAGE_SWITCH_BUG_FIX.md` - Page navigation fix
- `AI_INTELLIGENCE_IMPROVEMENTS.md` - UUID hiding improvements

## Success Metrics

After deployment, measure:
- **Questions asked per activity creation**: Should drop from 2-3 to 0-1
- **User satisfaction**: Activities created in one message vs multiple
- **Conversation length**: Shorter, more efficient interactions
