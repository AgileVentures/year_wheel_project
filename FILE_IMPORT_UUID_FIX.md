# File Import UUID Error Fix

## Problem
When importing `.yrw` files, the system was failing with errors like:
```
invalid input syntax for type uuid: "inner-ring-1"
invalid input syntax for type uuid: "outer-ring-1"
```

## Root Cause
The `wheelService.js` sync functions were only checking for temporary IDs starting with:
- `'ring-'`
- `'group-'`
- `'label-'`

But files exported from the system contained IDs like:
- `'inner-ring-1'`
- `'outer-ring-1'`
- Other non-UUID strings

The code mistakenly treated these as **existing database UUIDs** and tried to UPDATE them instead of INSERT, causing PostgreSQL UUID validation errors.

## Solution
Updated three sync functions in `src/services/wheelService.js`:

### 1. syncRings()
**Before:**
```javascript
const isNew = !ring.id || ring.id.startsWith('ring-');
```

**After:**
```javascript
const isNew = !ring.id || 
              ring.id.startsWith('ring-') || 
              ring.id.startsWith('inner-ring-') || 
              ring.id.startsWith('outer-ring-') ||
              !existingIds.has(ring.id);
```

Also fixed the `currentIds` calculation to exclude temporary IDs from the "keep" list.

### 2. syncActivityGroups()
**Before:**
```javascript
const isNew = !group.id || group.id.startsWith('group-');
```

**After:**
```javascript
const isNew = !group.id || group.id.startsWith('group-') || !existingIds.has(group.id);
```

### 3. syncLabels()
**Before:**
```javascript
const isNew = !label.id || label.id.startsWith('label-');
```

**After:**
```javascript
const isNew = !label.id || label.id.startsWith('label-') || !existingIds.has(label.id);
```

## Key Logic Change
The new detection checks:
1. ✅ No ID → NEW
2. ✅ Starts with known prefix → NEW
3. ✅ **Not in existingIds (from database) → NEW** ← This is the critical addition

This ensures that any ID that doesn't exist in the database is treated as a new record, regardless of what the ID looks like.

## Testing
After this fix:
1. File imports should work without UUID errors
2. Rings with temporary IDs like `'inner-ring-1'` will be inserted as new records
3. The system will generate proper database UUIDs
4. Subsequent saves will work correctly

## Files Changed
- `src/services/wheelService.js` (3 functions updated)

## Related Issues
This fix is separate from the RLS policy issues. Both need to be addressed:
1. ✅ **UUID validation** (this fix)
2. ⏳ **RLS policies** (APPLY_TEAM_COLLABORATION_FIX.sql)
3. ⏳ **Team membership** (CHECK_TEAM_MEMBERSHIP.sql)
