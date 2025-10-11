# AI Cross-Year Activity Creation - Validation & Multi-Step Fix

**Date:** 2025-10-11  
**Issue:** AI assistant stops after `getAvailablePages()` instead of completing cross-year activity workflow  
**Root Cause:** Two issues - (1) AI explaining instead of executing, (2) No validation in `createItem` tool

## Problem Description

When user requests: `"skapa en vinterkampanj mellan 2025-12-01 och 2026-02-26"`

**Expected behavior:**
1. Create "Vinterkampanj (del 1)" on 2025 page (2025-12-01 to 2025-12-31)
2. Check available pages with `getAvailablePages()`
3. Navigate to 2026 page with `navigateToPage()`
4. Create "Vinterkampanj (del 2)" on 2026 page (2026-01-01 to 2026-02-26)
5. Confirm completion

**Actual behavior:**
1. AI responds: "Eftersom vinterkampanjen sträcker sig över årsskiftet..."
2. Calls `getAvailablePages()`
3. **STOPS** - Never creates any activities

## The Two Problems

### Problem 1: AI Explaining Instead of Executing

The AI was treating the workflow as something to explain rather than execute:
- ❌ "Låt mig kolla vilka år som finns och hantera skapningen" (explaining)
- ✅ Should just execute: `getAvailablePages()` → `createItem()` → etc.

### Problem 2: No Date Validation in createItem()

The `createItem` tool didn't validate that dates matched the current page's year, so:
- AI could try to create 2026 dates while on 2025 page
- Tool would succeed but save invalid data
- No error feedback to guide AI behavior

## Solution Implemented

### Part 1: Add Date Validation to createItem Tool

**File:** `src/services/aiWheelService.js`

Added validation at the start of `aiCreateItem()`:

```javascript
// CRITICAL: Validate that dates match the current page's year
const { data: pageData, error: pageYearError } = await supabase
  .from('wheel_pages')
  .select('year')
  .eq('id', pageId)
  .single();

if (pageYearError || !pageData) {
  return {
    success: false,
    error: 'Kunde inte hämta sidans år'
  };
}

const pageYear = pageData.year;
const startYear = parseInt(startDate.split('-')[0]);
const endYear = parseInt(endDate.split('-')[0]);

// Check if dates are outside the current page's year
if (startYear !== pageYear || endYear !== pageYear) {
  return {
    success: false,
    error: `Datumen måste vara inom år ${pageYear}. Start: ${startYear}, Slut: ${endYear}. Du måste först navigera till rätt sida med navigateToPage().`,
    pageYear: pageYear,
    startYear: startYear,
    endYear: endYear
  };
}
```

**Benefits:**
- ✅ Prevents invalid data from being saved
- ✅ Gives AI clear error message about what's wrong
- ✅ Error message explicitly tells AI to use `navigateToPage()`

### Part 2: Rewrite System Prompt for Immediate Execution

**File:** `src/components/AIAssistant.jsx` (lines ~236-260)

**OLD prompt (explained workflow):**
```
ARBETSFLÖDE för aktiviteter över årsgränser:
1. Skapa första delen på nuvarande år
2. Kontrollera vilka årssidor som finns
3. Om nästa år saknas, skapa sidan
4. Byt till nästa års sida
5. Skapa andra delen på det nya året

Systemet tillåter flera steg automatiskt (maxSteps: 12).
```

**NEW prompt (commands immediate action):**
```
**GÖR DETTA (kör verktygen direkt, förklara INTE först):**

1. createItem("[Namn] (del 1)", startDatum, "YYYY-12-31", ringId, activityGroupId)
   → Skapa första delen på nuvarande års sida

2. getAvailablePages()
   → Kontrollera om nästa års sida finns

3. OM nästa år saknas: createPage(year: nästa år, copyStructure: true)
   → Skapa sidan om den inte finns

4. navigateToPage(pageId för nästa år)
   → **KRITISKT!** Byt till nästa års sida INNAN du skapar del 2

5. createItem("[Namn] (del 2)", "YYYY-01-01", slutDatum, samma ringId, samma activityGroupId)
   → Skapa andra delen på det nya årets sida

6. Bekräfta när ALLT är klart

**VIKTIGT:** Du behöver INTE fråga om lov eller förklara - KÖR BARA stegen!

EXEMPEL: "skapa vinterkampanj 2025-12-01 till 2026-02-26"
→ Kör steg 1 → 2 → 3 (om behövs) → 4 → 5 → 6 (bekräftelse)
→ FÖRKLARA INTE, GÖR DET!
```

**Key changes:**
- ❌ Removed: "Låt mig kolla..." explaining language
- ✅ Added: "GÖR DETTA (kör verktygen direkt, förklara INTE först)"
- ✅ Added: "→ FÖRKLARA INTE, GÖR DET!" at the end
- ✅ Made each step more action-oriented with → arrows
- ✅ Emphasized: "Du behöver INTE fråga om lov"

## How It Works Now

### 1. User Request
```
"skapa en vinterkampanj mellan 2025-12-01 och 2026-02-26"
```

### 2. AI Workflow Execution (Automatic)

**Step 1:** `createItem("Vinterkampanj (del 1)", "2025-12-01", "2025-12-31", ringId, activityGroupId)`
- ✅ Dates are in 2025, current page is 2025 → SUCCESS
- Creates first part on 2025 page

**Step 2:** `getAvailablePages()`
- Returns: `{ pages: [{ year: 2025, id: "..." }, { year: 2026, id: "..." }] }`
- AI sees 2026 page exists

**Step 3:** Skip (2026 page already exists)

**Step 4:** `navigateToPage("f78d79d7-9aab-47bd-bd9a-518174ea8877")` (2026 page ID)
- ✅ Changes `currentPageId` to 2026 page
- Reloads context so AI knows it's on 2026 page now

**Step 5:** `createItem("Vinterkampanj (del 2)", "2026-01-01", "2026-02-26", ringId, activityGroupId)`
- ✅ Dates are in 2026, current page is now 2026 → SUCCESS
- Creates second part on 2026 page

**Step 6:** AI text response:
```
"Klart! Vinterkampanj skapad: 
- Del 1: 2025-12-01 till 2025-12-31 
- Del 2: 2026-01-01 till 2026-02-26"
```

### 3. Error Handling (If AI Forgets to Navigate)

If AI tries to create 2026 activity while still on 2025 page:

**AI calls:** `createItem("Vinterkampanj (del 2)", "2026-01-01", "2026-02-26", ...)`

**Tool response:**
```json
{
  "success": false,
  "error": "Datumen måste vara inom år 2025. Start: 2026, Slut: 2026. Du måste först navigera till rätt sida med navigateToPage().",
  "pageYear": 2025,
  "startYear": 2026,
  "endYear": 2026
}
```

**AI sees error and course-corrects:**
1. Calls `getAvailablePages()`
2. Finds 2026 page
3. Calls `navigateToPage(2026-page-id)`
4. Retries `createItem("Vinterkampanj (del 2)", "2026-01-01", "2026-02-26", ...)` → SUCCESS

## Testing Instructions

### Test Case 1: Cross-Year Activity (2025 → 2026)
```
User: "skapa en vinterkampanj mellan 2025-12-01 och 2026-02-26"

Expected:
1. AI creates "Vinterkampanj (del 1)" on 2025 page
2. AI navigates to 2026 page
3. AI creates "Vinterkampanj (del 2)" on 2026 page
4. AI confirms: "Klart! Vinterkampanj skapad: del 1 (...) och del 2 (...)"

Console should show:
- createItem (2025 dates) → success
- getAvailablePages → success
- navigateToPage → success
- createItem (2026 dates) → success
```

### Test Case 2: Missing Year (2030 → 2031)
```
User: "lägg till sommarkampanj från 2030-06-01 till 2031-08-31"

Expected:
1. AI creates "Sommarkampanj (del 1)" on 2030 page (if exists, else creates it)
2. AI checks if 2031 exists
3. AI creates 2031 page with copyStructure: true
4. AI navigates to 2031 page
5. AI creates "Sommarkampanj (del 2)" on 2031 page
6. Confirmation message

Console should show:
- Possibly createPage(2030) if missing
- createItem (2030 dates) → success
- getAvailablePages → success
- createPage(2031, copyStructure: true) → success
- navigateToPage → success
- createItem (2031 dates) → success
```

### Test Case 3: Error Recovery
```
User: "skapa julkampanj 2025-12-15 till 2026-01-15"

If AI forgets to navigate:
- createItem with 2026 dates while on 2025 page → FAIL with error
- AI sees error message
- AI calls getAvailablePages
- AI calls navigateToPage(2026)
- AI retries createItem → SUCCESS
```

## Benefits of This Approach

### 1. Architectural Integrity
- ✅ Enforces "one year per page" rule at the tool level
- ✅ Prevents invalid data from being saved
- ✅ Clear separation of concerns (validation in service layer)

### 2. AI Behavior Guidance
- ✅ Error messages teach AI the correct workflow
- ✅ AI gets immediate feedback when it makes a mistake
- ✅ Self-correcting behavior through error handling

### 3. User Experience
- ✅ Cross-year activities work seamlessly
- ✅ No manual intervention needed
- ✅ Clear confirmation of what was created

### 4. Maintainability
- ✅ Validation logic in one place (`aiWheelService.js`)
- ✅ System prompt clearly documents expected behavior
- ✅ Easy to debug with console logs

## Related Documentation

- **AI_SDK_MULTI_STEP_FIX.md** - Explains Vercel AI SDK's maxSteps mechanism
- **AI_ACTION_FIX.md** - Previous attempts to fix multi-step workflow
- **AI_CROSS_YEAR_FIX.md** - Original explanation of year-per-page architecture

## Key Takeaways

1. **Validation is Key:** Tools should validate their inputs and return helpful errors
2. **Action Over Explanation:** Prompts should command immediate execution, not explain workflows
3. **Framework Works:** Vercel AI SDK's maxSteps works perfectly when prompts are action-oriented
4. **Error Messages Guide AI:** Good error messages can teach AI the correct behavior

## Status

✅ **IMPLEMENTED** - Ready for testing  
📝 **TESTING REQUIRED** - Need to verify with real user requests  
🔄 **MONITORING** - Watch console logs to ensure all steps execute
