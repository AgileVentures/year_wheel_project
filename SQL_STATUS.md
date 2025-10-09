# SQL Migrations Status - Quick Reference

## The Good News 🎉

**The error you saw is GOOD!** It means realtime is **already enabled**.

```
ERROR: relation "year_wheels" is already member of publication "supabase_realtime"
```
↑ This means the table is already broadcasting realtime updates!

## What You Need to Do

### 1. ✅ Verify Realtime (Already Working)

**Run this query** in Supabase SQL Editor:
```sql
-- Copy and run from VERIFY_REALTIME.sql
SELECT tablename 
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
ORDER BY tablename;
```

**Expected result**: You should see these 5 tables:
- ✅ `activity_groups`
- ✅ `items`
- ✅ `labels`
- ✅ `wheel_rings`
- ✅ `year_wheels`

If you see all 5 → **Realtime is working!** Skip to step 2.

### 2. ❗ Apply RLS Policies (CRITICAL)

You still need to run **`FIX_TEAM_WHEEL_UPDATE.sql`** for team members to save changes.

**Why**: Team members can view shared wheels but get errors when saving.

**How**: 
1. Open Supabase SQL Editor
2. Copy entire contents of `FIX_TEAM_WHEEL_UPDATE.sql`
3. Run it
4. Verify with test query at bottom

**This adds**:
- UPDATE policy (team members can save)
- SELECT policy (team members can view)
- INSERT policy (team members can create items)
- DELETE policy (owners can delete wheels)

## Summary

| Migration | Status | Action |
|-----------|--------|--------|
| **ENABLE_REALTIME.sql** | ✅ Already applied | Run VERIFY_REALTIME.sql to confirm |
| **FIX_TEAM_WHEEL_UPDATE.sql** | ❓ Unknown | **Run this now** (fixes save errors) |

## Quick Test After Running FIX_TEAM_WHEEL_UPDATE.sql

```sql
-- Check policies exist
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'year_wheels';
```

You should see 4 policies:
- ✅ SELECT: "Users can view their wheels and team wheels"
- ✅ UPDATE: "Users can update their wheels and team wheels"
- ✅ INSERT: "Users can create wheels"
- ✅ DELETE: "Owners can delete their wheels"

## Next Steps

1. **Run VERIFY_REALTIME.sql** → Confirm all 5 tables
2. **Run FIX_TEAM_WHEEL_UPDATE.sql** → Fix team member saves
3. **Test with team member** → Have them edit and save a shared wheel
4. **Test with 2 browsers** → Verify realtime sync + no save loop

## Files Created

- ✅ `VERIFY_REALTIME.sql` - New file to check realtime status
- ✅ `ENABLE_REALTIME.sql` - Updated with better error handling
- ✅ `FIX_TEAM_WHEEL_UPDATE.sql` - Already exists, needs to be run
- ✅ `SAVE_LOOP_FIX.md` - Documents the concurrent user fix
- ✅ `SAVE_LOOP_FIX_SUMMARY.md` - Quick reference

## The Bottom Line

**Realtime**: ✅ Already working (that's why you got the error)  
**Save permissions**: ❗ Need to run FIX_TEAM_WHEEL_UPDATE.sql  
**Save loop**: ✅ Fixed in React code (no SQL needed)

**Action required**: Just run `FIX_TEAM_WHEEL_UPDATE.sql` and you're done! 🚀
