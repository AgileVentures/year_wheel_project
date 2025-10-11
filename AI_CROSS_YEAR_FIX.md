# AI Assistant - Cross-Year Activity Fix

## Problem

The AI assistant was failing when users requested activities that span across year boundaries (e.g., "Vinterkampanj 2025-12-01 till 2026-02-28").

**Error symptoms:**
```
The specified value "2026-03-3" does not conform to the required format, "yyyy-MM-dd"
```

**Root cause:**
- YearWheel architecture: Each page represents ONE year (2025, 2026, etc.)
- Activities cannot span multiple years on a single page
- AI was trying to create a single activity from Dec 2025 to Feb 2026
- This caused date validation errors and confused the system

## Solution

Updated AI system instructions to handle cross-year activities properly by:

### 1. **New Instructions Added**
```
KRITISKT - Aktiviteter som sträcker sig över årsgränser:
- Varje YearWheel-sida representerar ETT år - aktiviteter kan INTE sträcka sig mellan år
- Om en aktivitet sträcker sig från december till januari, MÅSTE du dela upp den:
  1. Skapa FÖRSTA aktiviteten: från startdatum till 31 december (samma år som startdatum)
  2. Kontrollera att nästa årssida finns (använd getAvailablePages)
  3. Skapa den om den saknas (med createPage)
  4. Byt till nästa årssida (använd navigateToPage)
  5. Skapa ANDRA aktiviteten: från 1 januari till slutdatum (nästa år)
```

### 2. **Example Workflow**
**User request:** "Lägg till vinterkampanj 2025-12-01 till 2026-02-28"

**AI should now:**
1. Detect cross-year span (starts 2025, ends 2026)
2. Create first part: "Vinterkampanj (del 1)" from 2025-12-01 to 2025-12-31 on 2025 page
3. Check if 2026 page exists using `getAvailablePages`
4. Create 2026 page if missing using `createPage`
5. Navigate to 2026 page using `navigateToPage`
6. Create second part: "Vinterkampanj (del 2)" from 2026-01-01 to 2026-02-28 on 2026 page
7. Explain to user that activity was split into two parts

### 3. **Key Principles**
- **Same metadata**: Both parts use same ring and activity group
- **Clear naming**: Append "(del 1)" and "(del 2)" for clarity
- **User communication**: Always explain the split to the user
- **Automatic page creation**: Create missing year pages automatically
- **Proper navigation**: Switch to the target page before creating activities

## Testing

To test the fix:

1. Ask AI: "Lägg till vinterkampanj från 2025-12-01 till 2026-02-28"
2. Verify:
   - First activity created on 2025 page (Dec 1-31)
   - 2026 page created if it didn't exist
   - Second activity created on 2026 page (Jan 1 - Feb 28)
   - Both activities visible in their respective pages
   - AI explains the split to the user

## Benefits

✅ No more date validation errors
✅ Seamless cross-year activity creation
✅ Automatic page management
✅ Clear user communication
✅ Maintains data integrity (one year per page)

## Files Modified

- `src/components/AIAssistant.jsx` - Updated system prompt with cross-year handling instructions
