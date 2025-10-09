-- =============================================
-- COMPLETE FIX: Team Collaboration Permissions
-- =============================================
-- Run this entire file in Supabase SQL Editor to fix all team collaboration issues
-- This combines:
-- 1. FIX_TEAM_WHEEL_UPDATE.sql (year_wheels table permissions)
-- 2. FIX_TEAM_WHEEL_DATA_ACCESS.sql (related tables permissions)

-- =============================================
-- PART 1: YEAR_WHEELS TABLE PERMISSIONS
-- =============================================

-- Drop existing policies
drop policy if exists "Users can update their wheels and team wheels" on public.year_wheels;
drop policy if exists "Team members can update their team wheels" on public.year_wheels;
drop policy if exists "Users can update their own wheels" on public.year_wheels;
drop policy if exists "Users can view their wheels and team wheels" on public.year_wheels;
drop policy if exists "Users can view their own wheels" on public.year_wheels;
drop policy if exists "Users can create wheels" on public.year_wheels;
drop policy if exists "Users can delete their wheels" on public.year_wheels;
drop policy if exists "Owners can delete their wheels" on public.year_wheels;

-- SELECT: View own wheels and team wheels
create policy "Users can view their wheels and team wheels"
  on public.year_wheels for select
  using (
    user_id = auth.uid()
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )
  );

-- UPDATE: Edit own wheels and team wheels
create policy "Users can update their wheels and team wheels"
  on public.year_wheels for update
  using (
    user_id = auth.uid()
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )
  );

-- INSERT: Create wheels for self or teams
create policy "Users can create wheels"
  on public.year_wheels for insert
  with check (
    user_id = auth.uid()
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )
  );

-- DELETE: Only owners can delete (not team members)
create policy "Owners can delete their wheels"
  on public.year_wheels for delete
  using (user_id = auth.uid());

-- =============================================
-- PART 2: RELATED TABLES PERMISSIONS
-- =============================================

-- Enable RLS on all wheel-related tables (if not already enabled)
alter table public.wheel_rings enable row level security;
alter table public.ring_data enable row level security;
alter table public.activity_groups enable row level security;
alter table public.labels enable row level security;
alter table public.items enable row level security;

-- =============================================
-- WHEEL_RINGS POLICIES
-- =============================================

drop policy if exists "Users can view rings for their wheels and team wheels" on public.wheel_rings;
drop policy if exists "Users can insert rings for their wheels and team wheels" on public.wheel_rings;
drop policy if exists "Users can update rings for their wheels and team wheels" on public.wheel_rings;
drop policy if exists "Users can delete rings for their wheels and team wheels" on public.wheel_rings;

create policy "Users can view rings for their wheels and team wheels"
  on public.wheel_rings for select
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = wheel_rings.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can insert rings for their wheels and team wheels"
  on public.wheel_rings for insert
  with check (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = wheel_rings.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can update rings for their wheels and team wheels"
  on public.wheel_rings for update
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = wheel_rings.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can delete rings for their wheels and team wheels"
  on public.wheel_rings for delete
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = wheel_rings.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- RING_DATA POLICIES (FIXES YOUR 403 ERROR)
-- =============================================

drop policy if exists "Users can view ring data for their wheels and team wheels" on public.ring_data;
drop policy if exists "Users can insert ring data for their wheels and team wheels" on public.ring_data;
drop policy if exists "Users can update ring data for their wheels and team wheels" on public.ring_data;
drop policy if exists "Users can delete ring data for their wheels and team wheels" on public.ring_data;

create policy "Users can view ring data for their wheels and team wheels"
  on public.ring_data for select
  using (
    exists (
      select 1 from public.wheel_rings
      join public.year_wheels on year_wheels.id = wheel_rings.wheel_id
      where wheel_rings.id = ring_data.ring_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can insert ring data for their wheels and team wheels"
  on public.ring_data for insert
  with check (
    exists (
      select 1 from public.wheel_rings
      join public.year_wheels on year_wheels.id = wheel_rings.wheel_id
      where wheel_rings.id = ring_data.ring_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can update ring data for their wheels and team wheels"
  on public.ring_data for update
  using (
    exists (
      select 1 from public.wheel_rings
      join public.year_wheels on year_wheels.id = wheel_rings.wheel_id
      where wheel_rings.id = ring_data.ring_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can delete ring data for their wheels and team wheels"
  on public.ring_data for delete
  using (
    exists (
      select 1 from public.wheel_rings
      join public.year_wheels on year_wheels.id = wheel_rings.wheel_id
      where wheel_rings.id = ring_data.ring_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- ACTIVITY_GROUPS POLICIES
-- =============================================

drop policy if exists "Users can view activity groups for their wheels and team wheels" on public.activity_groups;
drop policy if exists "Users can insert activity groups for their wheels and team wheels" on public.activity_groups;
drop policy if exists "Users can update activity groups for their wheels and team wheels" on public.activity_groups;
drop policy if exists "Users can delete activity groups for their wheels and team wheels" on public.activity_groups;

create policy "Users can view activity groups for their wheels and team wheels"
  on public.activity_groups for select
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = activity_groups.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can insert activity groups for their wheels and team wheels"
  on public.activity_groups for insert
  with check (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = activity_groups.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can update activity groups for their wheels and team wheels"
  on public.activity_groups for update
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = activity_groups.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can delete activity groups for their wheels and team wheels"
  on public.activity_groups for delete
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = activity_groups.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- LABELS POLICIES
-- =============================================

drop policy if exists "Users can view labels for their wheels and team wheels" on public.labels;
drop policy if exists "Users can insert labels for their wheels and team wheels" on public.labels;
drop policy if exists "Users can update labels for their wheels and team wheels" on public.labels;
drop policy if exists "Users can delete labels for their wheels and team wheels" on public.labels;

create policy "Users can view labels for their wheels and team wheels"
  on public.labels for select
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = labels.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can insert labels for their wheels and team wheels"
  on public.labels for insert
  with check (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = labels.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can update labels for their wheels and team wheels"
  on public.labels for update
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = labels.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can delete labels for their wheels and team wheels"
  on public.labels for delete
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = labels.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- ITEMS POLICIES
-- =============================================

drop policy if exists "Users can view items for their wheels and team wheels" on public.items;
drop policy if exists "Users can insert items for their wheels and team wheels" on public.items;
drop policy if exists "Users can update items for their wheels and team wheels" on public.items;
drop policy if exists "Users can delete items for their wheels and team wheels" on public.items;

create policy "Users can view items for their wheels and team wheels"
  on public.items for select
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = items.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can insert items for their wheels and team wheels"
  on public.items for insert
  with check (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = items.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can update items for their wheels and team wheels"
  on public.items for update
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = items.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can delete items for their wheels and team wheels"
  on public.items for delete
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = items.wheel_id
      and (
        year_wheels.user_id = auth.uid()
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- =============================================
-- VERIFICATION
-- =============================================

-- Check that all policies were created successfully
select 
  tablename,
  policyname,
  cmd as operation
from pg_policies
where schemaname = 'public'
and tablename in ('year_wheels', 'wheel_rings', 'ring_data', 'activity_groups', 'labels', 'items')
order by tablename, cmd, policyname;

-- =============================================
-- SUCCESS!
-- =============================================
-- After running this script:
-- ✅ Team members can view shared wheels
-- ✅ Team members can edit wheel settings
-- ✅ Team members can add/edit/delete rings
-- ✅ Team members can add/edit/delete ring data (month content)
-- ✅ Team members can add/edit/delete activity groups
-- ✅ Team members can add/edit/delete labels
-- ✅ Team members can add/edit/delete items
-- ✅ File imports will work on shared wheels
-- ✅ Real-time collaboration will work
-- ✅ Only owners can delete wheels
