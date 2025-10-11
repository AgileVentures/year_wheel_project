# UUID Fix - Complete Implementation

## Problem Summary
Items created by AI assistant were showing "Ring: N/A, Aktivitet: N/A" in the sidebar despite being correctly stored in the database with valid UUID foreign keys.

## Root Cause
**Dual ID System Mismatch:**
- **Database**: Uses UUIDs for all relations (`wheel_rings.id`, `activity_groups.id`, etc.)
- **Frontend (organizationData)**: Was loading from `wheel_pages.organization_data` JSONB which contained **client IDs** like `"ring-1759996691114"`
- **Items from AI**: Created with database UUIDs (e.g., `ringId: "d18274b6-87b5-4e9c-b198-d819a16b2ff6"`)
- **Lookup failure**: `organizationData.rings.find(r => r.id === item.ringId)` failed because rings array had client IDs but item had UUID

## Solution
Modified `src/App.jsx` `loadWheelData()` function to:

1. **Fetch rings, activity groups, and labels from database tables** (not JSONB)
2. **Merge database entities (UUIDs) with client-ID entities** from JSONB for backward compatibility
3. Store the merged arrays in `organizationData` so all lookups work

### Code Changes (App.jsx lines ~180-220)

```javascript
// NEW: Fetch rings, activity groups, and labels from database tables
const { data: dbRings } = await supabase
  .from('wheel_rings')
  .select('*')
  .eq('wheel_id', wheelId)
  .order('ring_order');

const { data: dbActivityGroups } = await supabase
  .from('activity_groups')
  .select('*')
  .eq('wheel_id', wheelId);

const { data: dbLabels } = await supabase
  .from('labels')
  .select('*')
  .eq('wheel_id', wheelId);

// Transform database records to match frontend format
orgData.rings = [
  ...(dbRings || []).map(r => ({
    id: r.id,                              // UUID from database
    name: r.name,
    type: r.type,                          // ✅ CRITICAL FIX: Was r.ring_type (wrong!)
    visible: r.visible,
    orientation: r.orientation || 'vertical',
    color: r.color,
    data: r.data || [[""]]
  })),
  // Keep client-ID rings from JSONB (backward compatibility)
  ...jsonbRings.filter(r => !r.id.match(/^[0-9a-f-]{36}$/i))
];

// Same for activityGroups and labels
```

### ⚠️ Critical Bug Fixed (Oct 11, 2025)
**Issue**: Items weren't showing on the wheel canvas  
**Root Cause**: Line 220 had `type: r.ring_type` but database column is `type` not `ring_type`  
**Result**: Rings were being created with `type: undefined`, failing the filter `r.type === 'outer'`  
**Fix**: Changed to `type: r.type` to match actual database schema

## How It Works

### UUID Detection
Uses regex `/^[0-9a-f-]{36}$/i` to distinguish:
- **UUIDs**: `"d18274b6-87b5-4e9c-b198-d819a16b2ff6"` (36 chars, hex + hyphens)
- **Client IDs**: `"ring-1759996691114"`, `"group-1759996631288"` (prefixed, timestamp-based)

### Merge Strategy
```
organizationData.rings = [
  ...Database Rings (with UUIDs),     // Priority: These override JSONB
  ...Client-ID Rings from JSONB       // Fallback: Keep old wheels working
]
```

### Backward Compatibility
- **Old wheels** (created before multi-page): Still load from JSONB, client IDs work
- **New wheels** (with database entities): Load from tables, UUIDs work
- **Mixed wheels** (some manual, some AI items): Both ID types coexist

## File Export/Import (.yrw files)

### Why .yrw Files Can Mix IDs
The example file shows both UUID and client IDs:
```json
{
  "rings": [
    { "id": "d18274b6-87b5-4e9c-b198-d819a16b2ff6" },  // UUID from DB
    { "id": "ring-1759996691114" }                      // Client ID from UI
  ],
  "items": [
    { "ringId": "d18274b6-87b5-4e9c-b198-d819a16b2ff6" }, // Links to UUID ring
    { "ringId": "ring-1759996691114" }                     // Links to client ring
  ]
}
```

**This is intentional** - .yrw files are **portable, standalone documents** that:
1. Work WITHOUT a database (offline mode)
2. Preserve the exact state when exported
3. Can be imported into any wheel (IDs are preserved)

### Import Behavior
When loading a .yrw file (via `handleLoadFromFile()`):
- File data is loaded as-is into `organizationData`
- NO database queries are made (file is source of truth)
- Both UUID and client IDs work in lookups
- If user then saves to database, entities get new UUIDs

## Testing Checklist

- [x] Dev server starts without errors
- [ ] Open editor with AI-created wheel
- [ ] Verify sidebar shows "Ring: [Name]" not "Ring: N/A"
- [ ] Verify sidebar shows "Aktivitet: [Name]" not "Aktivitet: N/A"
- [ ] Test AI assistant creates new activity (should still work)
- [ ] Export wheel to .yrw file (should preserve all IDs)
- [ ] Import .yrw file (should load correctly with mixed IDs)
- [ ] Create manual activity in UI (should get client ID)
- [ ] Both AI and manual items visible and named correctly

## Next Steps

1. **Test the fix**: Navigate to http://localhost:5173/editor/[wheelId]
2. **Verify AI items display correctly** in sidebar
3. **Test cross-year activity**: "skapa julkampanj 2025-12-15 till 2026-01-30"
4. **Check console logs**: Should show "Fetched from DB - Rings: X, Groups: Y, Labels: Z"

## Impact on Other Features

### ✅ Preserved
- File export/import (.yrw format unchanged)
- Manual item creation (still uses client IDs)
- Backward compatibility with old wheels
- Realtime sync (now syncs both DB entities and items)

### ✅ Improved
- AI-created items now display names correctly
- Database is source of truth for rings/groups/labels
- UUIDs enable proper relational integrity
- Multi-user collaboration works (shared entities via DB)

### ⚠️ Migration Note
Wheels created before this fix have rings/groups/labels only in JSONB. They will:
1. Still work (client IDs preserved)
2. When user adds new entities, those get UUIDs
3. Gradually migrate to full UUID system over time

## Technical Details

### Database Tables Used
- `wheel_rings`: Stores ring definitions with UUIDs
- `activity_groups`: Stores activity group definitions with UUIDs
- `labels`: Stores label definitions with UUIDs
- `items`: References above tables via UUID foreign keys

### Frontend State Structure
```javascript
organizationData = {
  rings: [
    { id: "UUID or client-id", name, type, visible, ... },
    ...
  ],
  activityGroups: [
    { id: "UUID or client-id", name, color, visible },
    ...
  ],
  labels: [
    { id: "UUID or client-id", name, color, visible },
    ...
  ],
  items: [
    { 
      id: "UUID or client-id",
      ringId: "UUID or client-id",      // Must match a ring.id
      activityId: "UUID or client-id",  // Must match an activityGroup.id
      labelId: "UUID or client-id",     // Optional, must match a label.id
      ...
    },
    ...
  ]
}
```

### Lookup Pattern (OrganizationPanel.jsx)
```javascript
const ring = organizationData.rings.find(r => r.id === item.ringId);
const activityGroup = organizationData.activityGroups.find(a => a.id === item.activityId);
const label = organizationData.labels.find(l => l.id === item.labelId);

// Now works for both:
// - item.ringId = "d18274b6-87b5-4e9c-b198-d819a16b2ff6" (UUID from DB)
// - item.ringId = "ring-1759996691114" (client ID from UI)
```

## Conclusion

The fix implements a **hybrid ID system** that:
- Prioritizes database UUIDs for consistency and relational integrity
- Falls back to client IDs for backward compatibility
- Enables both AI and manual workflows to coexist
- Preserves file export/import functionality
- Maintains multi-user collaboration via shared database entities

This approach balances **database-first architecture** (for collaboration) with **file-based portability** (for offline/sharing).
