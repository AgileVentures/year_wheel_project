# CRITICAL: Data Model Architecture Issues

## Current Status: BROKEN

Multiple critical issues causing data loss, duplication, and sync problems.

## The Data Model (As Designed)

```
year_wheels (wheel_id)
  └─ wheel_pages (page_id, year)
       ├─ wheel_rings (page_id FK, wheel_id for convenience)
       ├─ activity_groups (page_id FK, wheel_id for convenience)
       ├─ labels (page_id FK, wheel_id for convenience)
       └─ items (page_id FK, ring_id FK, activity_id FK)
```

**Key Point**: Rings, groups, and labels are **PER PAGE**, not per wheel!

## Critical Problems

### 1. Realtime Subscription Filtering Wrong
**File**: `src/hooks/useRealtimeWheel.js`

```javascript
// WRONG: Filters by wheel_id, gets rings from ALL pages
filter: `wheel_id=eq.${wheelId}`
```

**Problem**:
- When you delete a ring on page 2025, it gets deleted from DB
- Realtime subscription fires (filtered by wheel_id)
- Reloads ALL rings from ALL pages of the wheel
- Ring from page 2026 appears on page 2025!

**Fix Needed**:
- Change realtime filter to use `page_id` not `wheel_id`
- Need to pass `currentPageId` to `useRealtimeWheel`

### 2. OrganizationPanel Ring Deletion
**File**: `src/components/OrganizationPanel.jsx`

**Current**: Only removes ring from local state, then auto-save syncs
**Problem**: Items not removed immediately, causing orphaned items

**Recent Fix**: Added item filtering, but still has race conditions with realtime

### 3. Item Sync Race Conditions
**File**: `src/services/wheelService.js` - `syncItems()`

Items are validated during sync:
```javascript
if (!isValidUUID(ringId)) {
  console.warn(`Skipping item - could not resolve ring_id`);
  continue;
}
```

**Problem**: If ring deleted but items not yet filtered from state, items get skipped during sync, then reappear from database on next load.

### 4. Excessive API Requests
**Root Cause**: Realtime firing on EVERY change across ALL pages

**Current Flow**:
1. User adds ring on page 2025
2. Database INSERT fires
3. Realtime detects (filtered by wheel_id)
4. Triggers reload
5. Loads ALL rings/groups/labels/items for current page
6. If wheel has 3 pages, this happens 3x (once per page with that wheel_id)

## Data Model Confusion

### Migration 013 Comments Say:
```sql
-- CRITICAL FIX: Properly scope rings, activity_groups, and labels to pages
-- Currently they reference wheel_id (shared across all pages)
-- They should reference page_id (isolated per page/year)
```

### But Then:
```sql
-- Step 10: Make wheel_id nullable (page_id is now the primary FK)
ALTER TABLE public.wheel_rings
ALTER COLUMN wheel_id DROP NOT NULL;
```

**wheel_id is kept "for convenience queries"** but this is causing all the problems!

## Correct Architecture

### Option A: Rings ARE Per-Page (Current Intent)
- Remove `wheel_id` entirely from rings/groups/labels tables
- Change realtime filters to use `page_id`
- Pass `currentPageId` to realtime hook
- Each page has its own isolated rings/groups/labels

**Pros**: True multi-page support, each year is independent
**Cons**: User must recreate rings on each page

### Option B: Rings ARE Shared Across Wheel (Simpler)
- Keep `wheel_id` as primary FK
- Remove `page_id` from rings/groups/labels
- Items still have `page_id` (that's what determines which page they show on)
- Rings are shared, but items on them are distributed by year

**Pros**: User creates rings once, activities go to correct pages automatically
**Cons**: Can't have year-specific ring configurations

## User's Question
> "Can you confirm that we have wheel (wheelId) that has many rings and many pages. Rings have activities on them, and the activities are displayed on pages. That must be the logic. or am I missing something?"

**Answer**: The CURRENT database design (migration 013) says rings ARE per-page, but the code doesn't fully implement this. Your mental model (rings shared, activities distributed to pages) makes MORE SENSE for usability!

## Recommended Fix Strategy

### Immediate (Stop the Bleeding)
1. **Disable realtime temporarily** - causing more harm than good
2. **Fix realtime filters** to use `page_id` not `wheel_id`
3. **Add proper item cleanup** when deleting rings

### Short-term (Make it Work)
1. **Decide**: Are rings per-page or per-wheel?
2. **If per-page**: Remove wheel_id, fix all queries
3. **If per-wheel**: Revert migration 013, add page_id only to items

### Long-term (Make it Right)
1. **Clear data model documentation**
2. **Consistent naming** (no "convenience" columns)
3. **Integration tests** for create/delete/sync flows
4. **Reduced realtime chattiness** - batch updates

## Current State Analysis

### What's Actually Happening Now:
1. Rings have BOTH `wheel_id` and `page_id`
2. Realtime filters by `wheel_id` (gets rings from all pages)
3. Load queries filter by `page_id` (gets rings for current page)
4. This mismatch causes rings to "jump" between pages

### Why Items Disappear:
1. User creates item → local state has temp ID
2. Auto-save runs → items sync, temp IDs converted to UUIDs
3. Local state updated with UUIDs
4. Realtime fires (from another table change)
5. Full reload happens → fetches from DB
6. Some items not yet in DB (race condition)
7. Items vanish

### Why Rings Come Back:
1. User deletes ring → removed from local state
2. Auto-save deletes from DB (WHERE page_id = current page)
3. Realtime fires (filter by wheel_id)
4. Reloads ALL rings (gets rings from OTHER pages too)
5. Ring from page 2026 appears on page 2025!

## The Fix We Need

**Realtime Hook Change:**
```javascript
// OLD (BROKEN):
filter: `wheel_id=eq.${wheelId}`

// NEW (CORRECT):
filter: `page_id=eq.${pageId}`
```

**Usage:**
```javascript
// In App.jsx:
useRealtimeWheel(wheelId, currentPageId, handleRealtimeChange);
```

This makes realtime page-scoped, matching the load/save logic.
