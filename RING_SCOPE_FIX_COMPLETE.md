# RING SCOPE FIX - COMPLETE

## Problem
When switching between pages (e.g., 2025 → 2026), the rings had **different IDs** on each page. This caused Google Sheets integration to fail because:
- Ring on 2025 page: `id: "abc-123"`
- Ring on 2026 page: `id: "def-456"`
- Integration tied to ring `abc-123` → items only created on 2025 page

## Root Cause
**Page switching was loading stale ring data from page's JSONB column** instead of using the shared wheel-level rings from the database.

```javascript
// WRONG (old code):
if (newPage.organization_data) {
  setOrganizationData(newPage.organization_data);  // ❌ Overwrites rings with page-specific IDs
}

// CORRECT (new code):
setOrganizationData(prevData => ({
  ...prevData,
  items: pageItems  // ✅ Only update items, preserve shared rings
}));
```

## Architecture: Wheel-Scoped vs Page-Scoped

### Wheel-Scoped (Shared Across ALL Pages)
- **Rings** (`wheel_rings` table, FK: `wheel_id`)
- **Activity Groups** (`activity_groups` table, FK: `wheel_id`)
- **Labels** (`labels` table, FK: `wheel_id`)

These have **ONE UUID** that is the same on all pages.

### Page-Scoped (Unique Per Page)
- **Items** (`items` table, FK: `page_id`)
- **Year** (stored in `wheel_pages.year`)

Items are page-specific because they belong to a particular year.

## Fix Applied

### 1. Updated `handlePageChange` in App.jsx
```javascript
const handlePageChange = async (pageId) => {
  // Save current page
  await updatePage(currentPageId, { organization_data: organizationData });
  
  // Fetch new page's items only
  const pageItems = await fetchPageData(pageId);
  
  // CRITICAL: Keep rings/groups/labels, only update items
  setOrganizationData(prevData => ({
    ...prevData,
    items: pageItems  // Replace items, preserve shared data
  }));
  
  setYear(String(newPage.year));
};
```

### 2. Added Realtime Listener for Wheel Count
Updated `useSubscription` hook to listen to `year_wheels` table changes, so wheel count updates automatically when wheels are created/deleted.

### 3. Manual Refresh After Wheel Operations
Dashboard now calls `refreshSubscription()` after:
- Creating a wheel
- Deleting a wheel
- Duplicating a wheel

This ensures the wheel count is always accurate.

## Verification

### Check Ring IDs Match Across Pages
1. Open wheel editor
2. Open browser console
3. Switch between 2025 and 2026 pages
4. Look for log: `📊 [PageChange] Loaded N items for page YYYY`
5. Check `organizationData.rings[0].id` - should be same UUID on both pages

### Check Ring Scope in Database
Run `CHECK_RING_SCOPE.sql` in Supabase SQL Editor:
```sql
-- Should show rings with wheel_id (not page_id)
SELECT id, wheel_id, name, type FROM wheel_rings;
```

### Test Google Sheets Integration
1. Create wheel with 2025 and 2026 pages
2. Create Ring 1 (should have same UUID on both pages)
3. Integrate Google Sheet with dates spanning 2025-2026
4. Run sync
5. Check console logs - should show items created on BOTH pages
6. Verify items appear on both year pages

## Migration History
- **Migration 015**: `REVERT_RINGS_TO_WHEEL_SCOPE.sql`
  - Changed `wheel_rings.page_id` → `wheel_rings.wheel_id`
  - Rings now shared across all pages in a wheel
  - Items remain page-scoped via `items.page_id`

## Key Takeaway
**Rings are like a "template" or "structure"** that exists once per wheel and is visible on all year pages. Only the **items** (actual activities/events) are page-specific and belong to a particular year.

This is similar to:
- **Rings** = Columns in a spreadsheet (same on all sheets)
- **Items** = Rows of data (different on each sheet/year)

## Status
✅ **FIXED** - Rings now have consistent UUIDs across all pages
✅ **TESTED** - Page switching preserves ring IDs
✅ **DEPLOYED** - All changes pushed to main branch
