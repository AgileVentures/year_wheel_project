# CRITICAL FRONTEND BUG: UUID Mismatch

## Problem
AI-created items show "Ring: N/A" and "Aktivitet: N/A" in sidebar even though they're correctly stored in database with valid UUIDs.

## Root Cause
The app uses **two different ID systems**:
1. **Client-generated IDs** in `organizationData`: `"ring-1"`, `"group-1"`, etc.
2. **Database UUIDs** in `items` table: `"e2755a54-dcb0-422b-822f-f29c5797347a"`

When AI creates items, it uses database UUIDs. But the frontend loads `organization_data` from `wheel_pages` JSONB which contains client IDs.

## The Fix

### File: `src/App.jsx` - Line ~180-200

**Current code** (loads client IDs from JSONB):
```javascript
if (pageToLoad.organization_data) {
  const orgData = pageToLoad.organization_data;
  orgData.items = pageItems; // Items have database UUIDs
  // rings and activityGroups still have client IDs!
}
```

**Fixed code** (fetch rings/groups from database):
```javascript
if (pageToLoad.organization_data) {
  const orgData = pageToLoad.organization_data;
  orgData.items = pageItems;
  
  // FETCH RINGS FROM DATABASE (with real UUIDs)
  const { data: dbRings } = await supabase
    .from('wheel_rings')
    .select('id, name, type, visible, ring_order, color, orientation')
    .eq('wheel_id', wheelId)
    .order('ring_order');
  
  if (dbRings && dbRings.length > 0) {
    orgData.rings = dbRings.map(r => ({
      id: r.id, // Database UUID!
      name: r.name,
      type: r.type,
      visible: r.visible,
      color: r.color,
      orientation: r.orientation,
      data: r.type === 'inner' ? Array(12).fill([]) : undefined
    }));
  }
  
  // FETCH ACTIVITY GROUPS FROM DATABASE (with real UUIDs)
  const { data: dbGroups } = await supabase
    .from('activity_groups')
    .select('id, name, color, visible')
    .eq('wheel_id', wheelId);
  
  if (dbGroups && dbGroups.length > 0) {
    orgData.activityGroups = dbGroups;
  }
  
  // FETCH LABELS FROM DATABASE (with real UUIDs)
  const { data: dbLabels } = await supabase
    .from('labels')
    .select('id, name, color, visible')
    .eq('wheel_id', wheelId);
  
  if (dbLabels && dbLabels.length > 0) {
    orgData.labels = dbLabels;
  }
}
```

## Alternative: Update Items to Use organizationData IDs

If you want to keep using client IDs everywhere, then after AI creates items, convert their UUIDs back to client IDs. **NOT RECOMMENDED** - this loses referential integrity.

## Testing After Fix

1. Create new wheel
2. AI creates activity: `skapa sommarevent 2025-06-01 till 2025-08-31`
3. Sidebar should show: `Ring: Ring 1` and `Aktivitet: Allmän` (not N/A)
4. Edit activity - dropdowns should show Ring 1 and Allmän as selected

## Impact

**This fix ensures**:
- ✅ AI-created items display correctly
- ✅ Manual items continue working
- ✅ Database UUIDs used throughout (referential integrity preserved)
- ✅ Items can be edited without losing ring/group association

**Side effects**:
- `organizationData.rings[].id` changes from `"ring-1"` to UUID
- `organizationData.activityGroups[].id` changes from `"group-1"` to UUID
- Any code that hardcodes client IDs will break (grep for `"ring-1"`, `"group-1"`, etc.)
- Save/load logic may need adjustment if it expects client IDs

## Status
⚠️ **NOT YET IMPLEMENTED** - Requires frontend refactor

## Workaround for Now
After AI creates an item, manually:
1. Click the "+" button to add a new manual activity
2. Select the same ring and activity group from dropdowns
3. This will show you what the UUIDs map to
4. The AI-created item is still there in database, just not displaying properly in sidebar
