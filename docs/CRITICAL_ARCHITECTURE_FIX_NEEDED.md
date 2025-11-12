# CRITICAL: AI Assistant Architecture Mismatch

## Problem Summary

The AI Assistant (`ai-assistant-v2`) is using **OUTDATED** data model assumptions that conflict with the current database schema.

## Current Database Architecture (Migration 015 + 020)

### ✅ CORRECT (Database Reality)
1. **`wheel_rings`**, **`activity_groups`**, **`labels`** → `wheel_id` FK (SHARED across all pages)
2. **`items`** → `page_id` FK (DISTRIBUTED to specific year pages)
3. **`wheel_pages.structure`** → JSONB column (renamed from `organization_data` in migration 020)
4. **Purpose of `structure` JSONB**: Frontend cache for fast rendering (contains rings, activityGroups, labels)

### ❌ WRONG (AI Assistant Code)
1. Queries `organization_data` (column was renamed to `structure`)
2. Updates `organization_data` after every ring/group creation
3. Tries to sync `items` into `organization_data.items` (but items are in separate table)

## Critical Issues Found

### Issue 1: Wrong Column Name
**Location**: Multiple places in `ai-assistant-v2/index.ts`
```typescript
// ❌ WRONG
.select('organization_data, updated_at')

// ✅ CORRECT
.select('structure, updated_at')
```

**Lines with this bug:**
- Line 2446, 2475, 2539, 3150, 3217
- Function `updatePageOrganizationData` (line 2529)
- Function `updateOrgDataAcrossPages` (line 2436)

### Issue 2: Unnecessary JSONB Updates
**Problem**: AI assistant updates `structure` JSONB after every ring/group creation, but:
- Rings/groups are already in separate tables (source of truth)
- Frontend should query tables directly, not rely on stale JSONB cache
- This causes O(n) database writes in `applySuggestions`

**Current flow (INEFFICIENT):**
```
1. Create ring in wheel_rings table → Success
2. Query all pages for this wheel
3. For each page:
   - Read page.structure JSONB
   - Parse JSON, add ring to rings array
   - Write updated JSONB back to page
4. Repeat for EVERY ring/group
```

**Result**: Creating 10 rings + 10 groups = 20+ JSONB updates (slow, race conditions)

### Issue 3: Items in JSONB (Wrong Pattern)
**Code location**: Line 2344 in `deleteActivity`
```typescript
await updatePageOrganizationData(supabase, pageId, (orgData) => {
  orgData.items = orgData.items.filter((item: any) => !ids.includes(item.id))
  return orgData.items.length !== before
})
```

**Problem**: Items are in `items` table, not in JSONB. This sync is:
- Redundant (items table is source of truth)
- Error-prone (can get out of sync)
- Slow (updates JSONB on every item deletion)

## Correct Architecture Pattern

### What the AI Assistant SHOULD do:

#### For Rings/Groups/Labels:
```typescript
// 1. Create in database (source of truth)
const { data: ring } = await supabase
  .from('wheel_rings')
  .insert({ wheel_id, name, type, color })
  .select()
  .single()

// 2. NO JSONB update needed! Frontend queries wheel_rings table directly.
// 3. Just invalidate context cache
invalidateContextCache(ctx)
```

#### For Items:
```typescript
// 1. Create in items table (source of truth)
const { data: item } = await supabase
  .from('items')
  .insert({ wheel_id, page_id, ring_id, activity_id, name, start_date, end_date })
  .select()
  .single()

// 2. NO JSONB update! Frontend queries items table with joins.
```

### When to Update `structure` JSONB:
**Answer**: Rarely or never! The JSONB is a **frontend cache** that should be:
- Updated by frontend when it fetches data
- NOT kept in sync by backend (creates race conditions)
- Potentially deprecated if frontend can efficiently query tables

## Questions for You

1. **Is `wheel_pages.structure` JSONB still used by the frontend?**
   - If YES: Where does it get updated? (Should be frontend-side only)
   - If NO: We can remove all JSONB update logic from AI assistant

2. **Should AI assistant sync data into `structure` JSONB?**
   - Current code tries to keep it in sync (causes bugs)
   - Better pattern: AI assistant ONLY writes to tables, frontend reads and caches

3. **Migration 020 renamed `organization_data` → `structure`**
   - AI assistant still uses old name (queries fail!)
   - Copilot instructions also outdated (.github/copilot-instructions.md)

## Recommended Fix Plan

### Phase 1: Critical Bugs (Deploy ASAP)
1. ✅ Replace all `organization_data` with `structure` in AI assistant
2. ✅ Remove `items` syncing logic (items are in table, not JSONB)
3. ✅ Test ring/group creation works after fixes

### Phase 2: Architecture Cleanup
1. Remove all `updatePageOrganizationData` calls for rings/groups
2. Keep ONLY table inserts/updates (source of truth)
3. Let frontend handle `structure` JSONB caching

### Phase 3: Documentation
1. Update `.github/copilot-instructions.md` with correct schema
2. Remove references to "page-scoped rings" (they're wheel-scoped now)
3. Document that `structure` is a frontend cache, not source of truth

## Impact Assessment

### If We Don't Fix This:
- ❌ AI assistant queries will FAIL (wrong column name)
- ❌ Race conditions in `structure` JSONB updates
- ❌ Slow `applySuggestions` (20+ unnecessary writes)
- ❌ Data inconsistency between tables and JSONB
- ❌ Developers confused by outdated documentation

### After Fix:
- ✅ AI assistant queries correct column (`structure`)
- ✅ Fast ring/group creation (no JSONB overhead)
- ✅ Single source of truth (database tables)
- ✅ No race conditions
- ✅ Clear documentation

---

**Status**: Awaiting your decision on whether to:
A) Keep `structure` JSONB and fix column name + reduce updates
B) Deprecate `structure` JSONB and query tables directly
C) Hybrid: Keep JSONB but let frontend manage it exclusively
