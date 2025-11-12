# AI Assistant Fix - November 2025

## Problem
Efter refaktoreringen av wheel-strukturen (pages-baserad arkitektur) fungerade inte AI-assistenten. Den försökte skriva till databas-kolumner som inte längre fanns.

## Root Cause
Migration 015 återgick till **wheel-scoped** struktur för `rings`, `activity_groups` och `labels` (ingen `page_id` kolumn). Men AI-assistenten (`ai-assistant-v2`) antog fortfarande att dessa tabeller hade `page_id`-kolumner.

## Changes Made

### 1. Database Schema (Migration 015 - redan gjord)
```sql
-- Rings, activity groups, and labels are now WHEEL-SCOPED
ALTER TABLE wheel_rings DROP COLUMN page_id;
ALTER TABLE activity_groups DROP COLUMN page_id;
ALTER TABLE labels DROP COLUMN page_id;

-- Only items table has page_id (for year-specific activities)
-- Items table: page_id FK constraint remains
```

### 2. AI Assistant Edge Function Fixes

#### `createRing()` - Fixed
**Before:** Försökte skriva till `page_id` kolumn som inte finns
**After:** 
- Skriver bara till `wheel_id` (wheel-scoped)
- Uppdaterar **alla** pages' `organization_data` JSONB via `updateOrgDataAcrossPages()`
- Loggar tydligt när rings skapas eller återanvänds
- Returnerar `alreadyExists: true` när ring finns sedan tidigare

```typescript
// FIXED: No more page_id parameter
await supabase.from('wheel_rings').insert({
  wheel_id: wheelId,  // ✅ Wheel-scoped
  name: args.name,
  type: args.type,
  // ... no page_id
})
```

#### `createGroup()` - Fixed  
**Before:** Försökte skriva till `page_id` kolumn
**After:**
- Wheel-scoped insertion (bara `wheel_id`)
- Uppdaterar alla pages' `organization_data` automatiskt
- Loggar för bättre debugging
- Correct reuse detection

#### `createLabel()` - Fixed
**Before:** Samma problem
**After:**  
- Wheel-scoped (bara `wheel_id`)
- Uppdaterar alla pages' `organization_data`
- Konsekvent med rings/groups

#### `createActivity()` - Already Correct ✅
`createActivity()` var redan korrekt! Den:
- Hanterar multi-year activities (automatisk splitting)
- Skapar missing pages automatiskt med rätt struktur
- Skriver korrekt till `items` table med både `wheel_id` och `page_id`
- Uppdaterar `organization_data` efter insert

### 3. Data Flow After Fix

```
User: "Skapa ring Marknadsföring"
   ↓
AI Assistant: createRing(wheelId, {name: "Marknadsföring", type: "outer"})
   ↓
Edge Function:
  1. Check if ring exists (wheel_rings WHERE wheel_id = ?)
  2. If not: INSERT INTO wheel_rings (wheel_id, name, type, color, visible, ring_order)
  3. Update ALL pages' organization_data JSONB:
     - Fetch all pages for this wheel
     - Add ring to each page's orgData.rings array
     - Set visibility, color, orientation
  4. Return success with ringId
   ↓
Frontend: 
  - Receives refresh event from AI
  - Refetches wheel structure
  - Canvas re-renders with new ring
```

## Key Architectural Points

### Wheel-Scoped vs Page-Scoped
**Wheel-Scoped (shared across all pages/years):**
- `wheel_rings` - Ring definitions
- `activity_groups` - Activity categories  
- `labels` - Optional labels

**Page-Scoped (specific to one year):**
- `items` - Individual activities/events
  - Each item has `page_id` to link it to a specific year
  - Multi-year activities get split into segments across pages

### organization_data JSONB Structure
Each `wheel_pages` row har en `organization_data` JSONB kolumn:
```jsonb
{
  "rings": [
    {"id": "uuid", "name": "Marketing", "type": "outer", "color": "#3B82F6", "visible": true}
  ],
  "activityGroups": [
    {"id": "uuid", "name": "Campaign", "color": "#10B981", "visible": true}
  ],
  "labels": [
    {"id": "uuid", "name": "Priority", "color": "#EF4444", "visible": true}
  ],
  "items": [
    {"id": "uuid", "name": "Q1 Campaign", "startDate": "2025-01-01", "endDate": "2025-03-31", ...}
  ]
}
```

**CRITICAL:** 
- Rings, groups, labels synkas automatiskt från database-tabellerna
- `updateOrgDataAcrossPages()` används för att sprida ändringar
- Frontend läser från `organization_data` för rendering
- Items läses BÅDE från `organization_data` OCH `items` table (items table är source of truth)

## Testing Checklist

### Manual Testing (Required)
- [ ] Öppna ett hjul i applikationen
- [ ] Be AI:n skapa en ny ring: "Skapa ring Marknadsföring"
- [ ] Verifiera att ringen syns i UI
- [ ] Be AI:n skapa en aktivitetsgrupp: "Skapa grupp Kampanj med färg blå"
- [ ] Verifiera att gruppen syns
- [ ] Be AI:n skapa aktivitet: "Skapa kampanj i januari"
- [ ] Verifiera att aktiviteten syns på rätt ring och har rätt färg
- [ ] Be AI:n skapa multi-year aktivitet: "Skapa projekt från november 2025 till mars 2026"
- [ ] Verifiera att aktiviteten är synlig på båda årssidor (2025 och 2026)

### Database Verification
```sql
-- Check rings (should be wheel-scoped, no page_id)
SELECT id, wheel_id, name, type FROM wheel_rings WHERE wheel_id = ?;

-- Check groups (should be wheel-scoped, no page_id)  
SELECT id, wheel_id, name, color FROM activity_groups WHERE wheel_id = ?;

-- Check items (should have BOTH wheel_id AND page_id)
SELECT id, wheel_id, page_id, name, start_date, end_date FROM items WHERE wheel_id = ?;
```

## Deployment
```bash
# Deploy fixed Edge Function
supabase functions deploy ai-assistant-v2
```

**Status:** ✅ Deployed successfully (Nov 2025)

## Related Files
- `/supabase/functions/ai-assistant-v2/index.ts` - Main Edge Function
- `/src/services/wheelService.js` - Frontend wheel operations (reference for correct patterns)
- `/supabase/migrations/015_*.sql` - Migration that changed scope

## Future Considerations
1. **Eventual Consistency:** organization_data kan bli out-of-sync om flera användare redigerar samtidigt. Överväg optimistic locking eller real-time sync.
2. **Performance:** `updateOrgDataAcrossPages()` uppdaterar ALLA sidor - kan bli långsamt för hjul med många år (10+ pages). Överväg lazy sync eller incremental updates.
3. **Data Duplication:** organization_data duplicerar data från database-tabeller. Detta är BY DESIGN för snabbare frontend-rendering, men kräver noggrann sync-logik.

## Author
Thomas Öchman (thomas@comunitaslabs.io)
Date: November 2025
