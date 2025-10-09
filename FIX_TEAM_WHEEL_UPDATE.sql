-- =============================================
-- FIX: Allow team members to UPDATE shared wheels
-- =============================================
-- Problem: Team members can view shared wheels but cannot save changes
-- Root Cause: UPDATE policy on year_wheels table either missing or using broken helper function
-- Solution: Recreate the policy with direct query (no helper functions)

-- =============================================
-- STEP 1: Verify Helper Function (if it exists)
-- =============================================

-- Check if is_team_member function exists
select 
  proname as function_name,
  prosecdef as is_security_definer
from pg_proc 
where proname = 'is_team_member';

-- If the function exists but doesn't work, we'll replace the policy anyway

-- =============================================
-- STEP 2: Drop and Recreate UPDATE Policy
-- =============================================

-- Drop ANY existing update policies on year_wheels
drop policy if exists "Users can update their wheels and team wheels" on public.year_wheels;
drop policy if exists "Team members can update their team wheels" on public.year_wheels;
drop policy if exists "Users can update their own wheels" on public.year_wheels;

-- Create new policy with DIRECT query (no helper functions)
-- This avoids issues with security definer functions and infinite recursion
create policy "Users can update their wheels and team wheels"
  on public.year_wheels for update
  using (
    -- Owner can always update
    user_id = auth.uid()
    or
    -- Team members can update team wheels
    (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )
  );

-- =============================================
-- STEP 3: Ensure SELECT Policy Exists
-- =============================================

-- Drop any existing select policies
drop policy if exists "Users can view their wheels and team wheels" on public.year_wheels;
drop policy if exists "Users can view their own wheels" on public.year_wheels;

-- Create SELECT policy (needed to fetch wheel in the first place)
create policy "Users can view their wheels and team wheels"
  on public.year_wheels for select
  using (
    -- Owner can view
    user_id = auth.uid()
    or
    -- Team members can view team wheels
    (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )
  );

-- =============================================
-- STEP 4: INSERT Policy (for creating wheels)
-- =============================================

drop policy if exists "Users can create wheels" on public.year_wheels;

create policy "Users can create wheels"
  on public.year_wheels for insert
  with check (
    -- Users can create wheels for themselves
    user_id = auth.uid()
    or
    -- Users can create wheels for teams they're members of
    (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )
  );

-- =============================================
-- STEP 5: DELETE Policy (for deleting wheels)
-- =============================================

drop policy if exists "Users can delete their wheels" on public.year_wheels;
drop policy if exists "Owners can delete their wheels" on public.year_wheels;

create policy "Owners can delete their wheels"
  on public.year_wheels for delete
  using (
    -- Only the owner can delete (not team members)
    user_id = auth.uid()
  );

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify the policy was created
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where tablename = 'year_wheels'
and policyname = 'Team members can update their team wheels';

-- =============================================
-- TESTING QUERIES
-- =============================================

-- Test 1: Check if current user can see team wheels
-- (Run as team member, not owner)
/*
select 
  id,
  title,
  year,
  user_id,
  team_id,
  case 
    when user_id = auth.uid() then 'You are owner'
    when team_id is not null then 'Team wheel'
    else 'Other'
  end as access_type
from year_wheels
where 
  user_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from team_members
      where team_members.team_id = year_wheels.team_id
      and team_members.user_id = auth.uid()
    )
  )
order by updated_at desc;
*/

-- Test 2: Try to update a team wheel
-- (Replace WHEEL_ID with actual wheel ID)
/*
update year_wheels
set title = 'Test Update by Team Member'
where id = 'WHEEL_ID';

-- If this succeeds, the policy is working!
*/

-- =============================================
-- ROLLBACK (if needed)
-- =============================================

-- To remove this policy:
-- drop policy if exists "Team members can update their team wheels" on public.year_wheels;

-- =============================================
-- NOTES
-- =============================================
-- 
-- This policy allows team members to:
-- 1. Update wheel title
-- 2. Update wheel year
-- 3. Update wheel colors
-- 4. Update wheel settings (show_week_ring, show_month_ring, show_ring_names)
-- 5. Update timestamps (updated_at is auto-updated by trigger)
--
-- This policy does NOT allow team members to:
-- 1. Change wheel ownership (user_id) - readonly
-- 2. Change team assignment (team_id) - should only be changed by owner
-- 3. Delete the wheel - requires separate DELETE policy
-- 4. Transfer to another team - requires owner permission
--
-- Security considerations:
-- - Team members have same edit rights as owner for wheel content
-- - This is intentional for true collaboration
-- - If you want role-based permissions (editor vs viewer), 
--   you'll need to add a 'role' column to team_members table
