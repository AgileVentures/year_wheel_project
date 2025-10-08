# Team Collaboration Migration - Fix Guide

## Problem
The original migration had an infinite recursion error in the `team_members` RLS policy on line 141:
```sql
where team_members.team_id = team_members.team_id  -- ❌ Self-reference!
```

## Solution
Fixed to use a table alias:
```sql
where tm.team_id = team_id  -- ✅ Correct reference
```

## How to Apply the Fix

### Option 1: Fresh Install (Recommended if possible)
If you haven't created any teams yet:

1. **Rollback**: Run `TEAM_COLLABORATION_ROLLBACK.sql` in Supabase SQL Editor
2. **Apply Fixed Migration**: Run `TEAM_COLLABORATION_FIXED.sql`

### Option 2: Fix Existing Installation
If you already have teams and data:

1. Go to Supabase SQL Editor
2. Run this SQL to fix just the broken policy:

```sql
-- Drop the broken policy
drop policy if exists "Team owners and admins can add members" on public.team_members;

-- Recreate with correct alias
create policy "Team owners and admins can add members"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = team_id
      and teams.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.team_members as tm
      where tm.team_id = team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    )
  );
```

## Verify the Fix

After applying, test that you can:
1. ✅ Create a team
2. ✅ View team members
3. ✅ Invite new members (this was failing before)
4. ✅ Accept invitations

The error "infinite recursion detected in policy for relation team_members" should be gone!

## Files in this Project

- `TEAM_COLLABORATION_MIGRATION.md` - Updated with fix
- `TEAM_COLLABORATION_FIXED.sql` - Complete clean migration (idempotent)
- `TEAM_COLLABORATION_ROLLBACK.sql` - Remove all team features
- `MIGRATION_FIX_GUIDE.md` - This file
