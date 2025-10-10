# 🔧 Subscription Error Fix

## Problems Identified

### 1. Database Column Mismatch ❌
**Error**: `column "owner_id" does not exist`

**Root Cause**: 
- Your `year_wheels` table uses `user_id` as the column name
- The subscription SQL functions were looking for `owner_id`

**Affected Functions**:
- `get_user_wheel_count()`
- `can_add_team_member()`

---

### 2. Auth Object Error ❌
**Error**: `Cannot read properties of undefined (reading 'user')`

**Root Cause**:
- `supabase.auth.getUser()` is async but wasn't being awaited
- Tried to access `.user` before the promise resolved

**Affected File**:
- `src/hooks/useSubscription.jsx` (realtime subscription setup)

---

## Fixes Applied ✅

### 1. Updated SQL Files
Changed all references from `owner_id` → `user_id`:

**Files Updated**:
- ✅ `STRIPE_SUBSCRIPTION_SETUP.sql` (lines 90 and 138)

**Changes**:
```sql
-- BEFORE (wrong):
WHERE owner_id = user_uuid

-- AFTER (correct):
WHERE user_id = user_uuid
```

---

### 2. Fixed Auth Hook
Made auth call properly async:

**File Updated**:
- ✅ `src/hooks/useSubscription.jsx`

**Changes**:
```javascript
// BEFORE (wrong):
const { data: { user } } = supabase.auth.getUser();  // ❌ Not awaited

// AFTER (correct):
const { data: { user } } = await supabase.auth.getUser();  // ✅ Properly awaited
```

---

## 🚀 Action Required

### Option 1: Quick Fix (Recommended)
Run the patch SQL file in Supabase SQL Editor:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `STRIPE_COLUMN_FIX.sql`
4. Run it
5. Restart your dev server

### Option 2: Full Re-run
If you haven't made other changes to the subscription schema:

1. Copy contents of `STRIPE_SUBSCRIPTION_SETUP.sql` (now fixed)
2. Paste into Supabase SQL Editor
3. Run it (will use `CREATE OR REPLACE` so safe to re-run)
4. Restart your dev server

---

## Verification Steps

After running the fix:

1. **Check the terminal** - errors should be gone
2. **Open browser console** - no more TypeErrors
3. **Test wheel creation**:
   - Create 1st wheel ✓
   - Create 2nd wheel ✓
   - Try 3rd wheel → Should show upgrade prompt ✓

---

## What Was Wrong

### Database Schema Mismatch
Your database was created with this schema:
```sql
CREATE TABLE year_wheels (
  id UUID,
  user_id UUID,  -- ← Your actual column name
  ...
);
```

But the subscription functions were looking for:
```sql
WHERE owner_id = user_uuid  -- ❌ Column doesn't exist!
```

### Async/Await Issue
JavaScript promises need to be awaited before accessing their properties:
```javascript
// ❌ WRONG - user is undefined
const { data: { user } } = supabase.auth.getUser();
console.log(user.id);  // TypeError!

// ✅ CORRECT - wait for promise first
const { data: { user } } = await supabase.auth.getUser();
console.log(user.id);  // Works!
```

---

## Files Modified

1. ✅ `STRIPE_SUBSCRIPTION_SETUP.sql` - Fixed column references
2. ✅ `src/hooks/useSubscription.jsx` - Fixed async auth call
3. ✅ `STRIPE_COLUMN_FIX.sql` - Quick patch for database (NEW)

---

## Next Steps

1. ✅ Run `STRIPE_COLUMN_FIX.sql` in Supabase
2. ✅ Restart dev server (`yarn dev`)
3. ✅ Test the subscription UI
4. ✅ Commit and push the fixes

---

## Prevention

To avoid this in future:
- Always check actual database schema before writing functions
- Always `await` Supabase auth methods
- Test with database connection before pushing to production
