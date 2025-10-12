# FIX APPLIED: Rings Are Now Per-Wheel (Shared)

## Problem Solved
Cross-year activities were impossible because rings were scoped to pages. An activity spanning 2025-2026 would reference a ring from page 2025, but page 2026 wouldn't have that ring.

## Solution
Reverted migration 013. Rings, activity groups, and labels are now **shared across all pages** in a wheel. Only items are per-page (distributed by year).

## Files Changed

### 1. Database Migration
**File**: `supabase/migrations/015_REVERT_RINGS_TO_WHEEL_SCOPE.sql`
- Removed `page_id` from `wheel_rings`, `activity_groups`, `labels`
- Made `wheel_id` NOT NULL (primary FK)
- Updated RLS policies to filter by `wheel_id`

### 2. Frontend Load Logic
**File**: `src/App.jsx`
```javascript
// BEFORE (per-page):
.eq('page_id', pageToLoad.id)

// AFTER (per-wheel):
.eq('wheel_id', wheelId)
```

### 3. Realtime Subscriptions
**File**: `src/hooks/useRealtimeWheel.js`
```javascript
// Rings/Groups/Labels: Filter by wheel_id (shared)
filter: `wheel_id=eq.${wheelId}`

// Items: Filter by page_id (distributed)
filter: `page_id=eq.${pageId}`
```

### 4. Save/Sync Logic
**File**: `src/services/wheelService.js`
- `syncRings()`: Queries by `wheel_id`, saves without `page_id`
- `syncActivityGroups()`: Queries by `wheel_id`, saves without `page_id`
- `syncLabels()`: Queries by `wheel_id`, saves without `page_id`
- `syncItems()`: Still uses `page_id` (correct!)

## New Architecture

```
year_wheels (wheel_id)
  ├─ wheel_rings (wheel_id FK) ← SHARED
  ├─ activity_groups (wheel_id FK) ← SHARED
  ├─ labels (wheel_id FK) ← SHARED
  └─ wheel_pages (page_id, year)
       └─ items (page_id FK, ring_id FK) ← DISTRIBUTED by year
```

## How Cross-Year Activities Work Now

### Example: Google Sheet Integration
```
Sheet Data:
Name        | Start      | End        | Ring
"Jul REA"   | 2025-12-20 | 2026-01-10 | Kampanjer
```

**What Happens**:
1. Ring "Kampanjer" exists once in database (wheel-scoped)
2. Integration creates 2 item segments:
   - Segment 1: 2025-12-20 to 2025-12-31, `page_id=2025_page`, `ring_id=kampanjer_uuid`
   - Segment 2: 2026-01-01 to 2026-01-10, `page_id=2026_page`, `ring_id=kampanjer_uuid`
3. Page 2025 displays items where `page_id=2025_page`
4. Page 2026 displays items where `page_id=2026_page`
5. **Both pages can display the same ring** ✅

### Example: AI Assistant
User: "Skapa aktivitet 'Årsskifte' från 2025-12-15 till 2026-01-15 på ringen Kampanjer"

**What Happens**:
1. AI finds ring "Kampanjer" (one ring, shared across wheel)
2. Creates items on both pages with same `ring_id`
3. Activity appears on both 2025 and 2026 pages ✅

## User Experience Changes

### Before (Broken)
- User creates ring "Kampanjer" on page 2025
- Switches to page 2026 → Ring not there
- Has to create "Kampanjer" again on page 2026
- Integration can't span years

### After (Fixed)
- User creates ring "Kampanjer" once
- Ring appears on ALL pages (2025, 2026, 2027, etc.)
- Activities automatically distributed to correct pages by year
- Integration and AI work perfectly for cross-year activities

## Testing Checklist

### Basic Ring Operations
- [ ] Create ring → Appears on all pages
- [ ] Delete ring → Disappears from all pages
- [ ] Rename ring → Name changes on all pages
- [ ] Toggle ring visibility → Affects all pages

### Cross-Year Activities  
- [ ] Create item 2025-12-20 to 2026-01-10 → Appears on both pages
- [ ] Delete cross-year item → Disappears from both pages
- [ ] Google Sheet with 2025/2026 dates → Syncs to both pages
- [ ] AI creates cross-year activity → Works correctly

### Realtime Sync
- [ ] Add ring → All pages update (shared)
- [ ] Add item → Only relevant page updates (distributed)
- [ ] Delete ring → All pages update
- [ ] No excessive API calls

## Migration Instructions

1. **Run migration**: `supabase db push`
2. **Test in browser**: Refresh, verify rings appear on all pages
3. **Test integrations**: Sync Google Sheet with cross-year data
4. **Test AI**: Ask AI to create cross-year activity
5. **Monitor logs**: Check realtime subscriptions are correct

## Rollback Plan

If something breaks, revert by:
1. Comment out changes in `App.jsx`, `useRealtimeWheel.js`, `wheelService.js`
2. Restore filtering by `page_id` instead of `wheel_id`
3. But NOTE: Cross-year activities will still be broken

## Next Steps

After confirming this works:
1. Update documentation to reflect per-wheel architecture
2. Remove outdated comments about "per-page" rings
3. Consider adding UI indicator showing rings are shared
4. Add ability to hide rings per-page (if needed)

## Key Insight

**Rings define STRUCTURE (what categories exist)**
**Items define CONTENT (what activities are on those rings, when they occur)**

Structure should be shared. Content should be distributed by time.
