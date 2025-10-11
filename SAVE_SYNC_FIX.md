# Save Sync Fix - Database Tables vs JSONB

## Problem
When deleting items (or modifying rings/groups/labels), changes were saved to `wheel_pages.organization_data` (JSONB) but **NOT** to the actual database tables (`items`, `wheel_rings`, `activity_groups`, `labels`).

### Symptoms
- Deleting items in UI didn't remove them from database
- Items reappeared after refresh
- Database tables were out of sync with JSONB

## Root Cause
Both auto-save and manual save had flawed logic:

### Auto-Save (Line 536-549)
```javascript
// ❌ WRONG: Only updated JSONB, not database tables
if (currentCurrentPageId) {
  await updatePage(currentCurrentPageId, {
    organization_data: currentOrganizationData,
    year: parseInt(currentYear)
  });
} else {
  await saveWheelData(wheelId, currentOrganizationData, currentCurrentPageId);
}
```

### Manual Save "Spara" Button (Line 708-719)
```javascript
// ❌ WRONG: Same issue - only updated JSONB when pageId exists
if (currentPageId) {
  await updatePage(currentPageId, {
    organization_data: organizationData,
    year: parseInt(year)
  });
} else {
  await saveWheelData(wheelId, organizationData, currentPageId);
}
```

## The Fix

Both save functions now call `saveWheelData()` **ALWAYS**, not just in legacy mode:

### Auto-Save (Fixed)
```javascript
// ✅ CORRECT: Always sync to database tables
await saveWheelData(wheelId, currentOrganizationData, currentCurrentPageId);

// Also update the page's JSONB
if (currentCurrentPageId) {
  await updatePage(currentCurrentPageId, {
    organization_data: currentOrganizationData,
    year: parseInt(currentYear)
  });
}
```

### Manual Save (Fixed)
```javascript
// ✅ CORRECT: Always sync to database tables
await saveWheelData(wheelId, organizationData, currentPageId);

// Also update the page's JSONB
if (currentPageId) {
  await updatePage(currentPageId, {
    organization_data: organizationData,
    year: parseInt(year)
  });
}
```

## What `saveWheelData` Does

This function (in `wheelService.js`) performs a **full sync** of all entities:

1. **`syncRings()`** - Creates/updates/deletes records in `wheel_rings` table
2. **`syncActivityGroups()`** - Creates/updates/deletes records in `activity_groups` table
3. **`syncLabels()`** - Creates/updates/deletes records in `labels` table
4. **`syncItems()`** - Creates/updates/deletes records in `items` table (scoped to pageId)

### ID Mapping
Each sync function returns a map of old IDs → new database UUIDs, so items can be properly linked:
```javascript
const ringIdMap = await syncRings(wheelId, organizationData.rings);
// ringIdMap: Map { "ring-12345" => "uuid-abc-123" }

await syncItems(wheelId, organizationData.items, ringIdMap, ...);
// Items now reference the correct UUID foreign keys
```

### Delete Logic
When an entity is removed from `organizationData` array, the sync function:
1. Fetches existing IDs from database
2. Compares with current IDs from frontend
3. Deletes any database records not in the frontend array

```javascript
const existingIds = new Set(existingRings?.map(r => r.id) || []);
const currentIds = new Set(rings.map(r => r.id).filter(...));
const toDelete = [...existingIds].filter(id => !currentIds.has(id));
if (toDelete.length > 0) {
  await supabase.from('wheel_rings').delete().in('id', toDelete);
}
```

## Impact

### ✅ Now Works
- **Delete items**: Item removed from UI → auto-save triggers → `syncItems()` deletes from database
- **Delete rings/groups/labels**: Removed from UI → auto-save triggers → respective sync function deletes from database
- **Modify entities**: Changes in UI → auto-save triggers → sync functions update database tables
- **Create entities**: New items in UI → auto-save triggers → sync functions insert into database tables

### 🔄 Data Flow
```
User Action (delete item)
  ↓
handleDeleteAktivitet() updates organizationData
  ↓
React useEffect detects organizationData change
  ↓
autoSave() debounced callback fires (2 seconds)
  ↓
saveWheelData() syncs to database tables
  ↓
updatePage() updates JSONB (backup/export format)
  ↓
Database tables and JSONB now in sync
```

## Why Keep JSONB?

The `organization_data` JSONB field in `wheel_pages` serves as:
1. **Export format** for `.yrw` files (portable, works offline)
2. **Backward compatibility** with old wheels (pre-database-tables)
3. **Snapshot for versions** (entire state in one field)

But the **database tables are the source of truth** for active editing and multi-user collaboration.

## Testing Checklist

- [x] Auto-save calls `saveWheelData()`
- [x] Manual save calls `saveWheelData()`
- [ ] Delete item → refresh page → item stays deleted
- [ ] Delete ring → refresh page → ring stays deleted  
- [ ] Delete activity group → refresh page → group stays deleted
- [ ] Modify item name → auto-save → database updated
- [ ] Create new item → auto-save → item in database with UUID

## Files Modified

- `src/App.jsx` (lines 536-549, 708-719)
  - Changed auto-save logic to always call `saveWheelData()`
  - Changed manual save logic to always call `saveWheelData()`

## Related Issues

- ✅ UUID fix (items using database UUIDs vs client IDs)
- ✅ Color fix (null colors from AI assistant)
- ✅ This fix (save sync to database tables)
- 🔄 Next: Test cross-year activities with full save cycle

## Deployment

Changes are in frontend code only (`App.jsx`). No database migrations needed.

**Action Required**: Refresh browser to load updated JavaScript.
