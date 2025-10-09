# Fix: Team Members Cannot Save Shared Wheels

## Problem
Team members report: "I can see the shared wheel but when I click 'Spara', nothing happens" or errors appear in console.

## Root Cause
The `year_wheels` table is missing or has incomplete RLS (Row Level Security) policies. Specifically:
- ✅ SELECT policy exists (team members can VIEW wheels)
- ❌ UPDATE policy missing/broken (team members CANNOT SAVE changes)

## Solution
Run `FIX_TEAM_WHEEL_UPDATE.sql` in Supabase SQL Editor.

## What This Fix Does

### Creates 4 RLS Policies on `year_wheels` table:

1. **SELECT** - View wheels
   - Owners can view their wheels
   - Team members can view team wheels

2. **UPDATE** - Save changes ⭐ **THIS IS THE MAIN FIX**
   - Owners can update their wheels
   - Team members can update team wheels

3. **INSERT** - Create new wheels
   - Users can create personal wheels
   - Team members can create team wheels

4. **DELETE** - Remove wheels
   - Only owners can delete wheels (NOT team members)

## How to Apply

### Step 1: Open Supabase Dashboard
```
https://app.supabase.com/project/YOUR_PROJECT/sql
```

### Step 2: Run the Migration
1. Go to **SQL Editor**
2. Click **New Query**
3. Copy/paste contents of `FIX_TEAM_WHEEL_UPDATE.sql`
4. Click **Run**

### Step 3: Verify Success
You should see output like:
```
Success: No rows returned
```

Run verification query:
```sql
select 
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where tablename = 'year_wheels'
order by cmd;
```

Expected output (4 policies):
- `Owners can delete their wheels` (DELETE)
- `Users can create wheels` (INSERT)
- `Users can view their wheels and team wheels` (SELECT)
- `Users can update their wheels and team wheels` (UPDATE)

## Testing

### Before Fix:
```javascript
// Team member tries to save
await updateWheel(wheelId, { title: 'New Title' });
// ❌ Error: "new row violates row-level security policy"
```

### After Fix:
```javascript
// Team member tries to save
await updateWheel(wheelId, { title: 'New Title' });
// ✅ Success! Wheel updated
```

### Manual Test:
1. **User A** (owner): Create a team wheel
2. **User B** (team member): Open the wheel
3. **User B**: Make a change (e.g., add an activity)
4. **User B**: Click "Spara"
5. **Expected**: Success toast "Data har sparats!"
6. **User A**: Refresh page - should see User B's changes

## Why This Happened

The original migrations (`TEAM_COLLABORATION_FINAL.sql`) **should** have created these policies, but:
1. Migration might not have been run completely
2. Helper function `is_team_member()` might have issues
3. Policies might have been accidentally dropped

This fix uses **direct SQL queries** in policies (no helper functions) to avoid any potential issues.

## Related Files

- ✅ `FIX_TEAM_WHEEL_DATA_ACCESS.sql` - Policies for child tables (rings, items, etc.) - **Already applied**
- ⭐ `FIX_TEAM_WHEEL_UPDATE.sql` - Policies for parent table (year_wheels) - **Apply this now**
- 📖 `TEAM_COLLABORATION_FINAL.sql` - Original migration (if not applied)

## Troubleshooting

### "Policy already exists"
No problem! The script uses `drop policy if exists` so it's safe to re-run.

### Still can't save after applying fix
1. Check browser console for actual error message
2. Verify user is actually a team member:
   ```sql
   select * from team_members 
   where user_id = 'USER_ID' 
   and team_id = (
     select team_id from year_wheels where id = 'WHEEL_ID'
   );
   ```
3. Verify wheel has a team_id:
   ```sql
   select id, title, user_id, team_id 
   from year_wheels 
   where id = 'WHEEL_ID';
   ```

### "Column team_id does not exist"
You need to apply `TEAM_COLLABORATION_FINAL.sql` first, which adds the `team_id` column.

## Security Notes

### What Team Members CAN Do:
- ✅ View team wheels
- ✅ Edit all wheel data (rings, activities, items)
- ✅ Save changes (update metadata)
- ✅ Create new team wheels

### What Team Members CANNOT Do:
- ❌ Delete team wheels (only owner can)
- ❌ Change wheel ownership (`user_id`)
- ❌ Transfer wheel to different team
- ❌ View wheels from teams they're not in

This is by design for **true collaboration** - all team members have equal edit rights.

## Future Enhancement: Role-Based Permissions

If you want different permission levels (editor vs viewer):

1. Add `role` to `team_members` table (already exists):
   ```sql
   -- Already done in TEAM_COLLABORATION_FINAL.sql
   alter table team_members add column role text check (role in ('owner', 'admin', 'editor', 'viewer'));
   ```

2. Update policies to check role:
   ```sql
   create policy "Editors can update wheels"
     on year_wheels for update
     using (
       team_id is not null
       and exists (
         select 1 from team_members
         where team_id = year_wheels.team_id
         and user_id = auth.uid()
         and role in ('owner', 'admin', 'editor')  -- viewers excluded
       )
     );
   ```

But for now, all team members have full edit access.

---

**Priority**: 🔴 **CRITICAL** - Blocking team collaboration  
**Estimated Time**: 2 minutes to apply  
**Risk Level**: 🟢 Low (only adds permissions, doesn't restrict existing)
