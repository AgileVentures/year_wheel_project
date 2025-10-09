-- =============================================
-- FIX: Allow team members to access wheel data
-- =============================================
-- Problem: Team members can see shared wheels but not their rings, activities, labels, and items
-- Solution: Add RLS policies for related tables to check team membership through wheel

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
create policy "Users can view rings for their wheels and team wheels"
  on public.wheel_rings for select
  using (
    exists (
      select 1 from public.year_wheels
      where year_wheels.id = wheel_rings.wheel_id
      and (
        year_wheels.user_id = auth.uid()  -- Own wheels
        or (
          year_wheels.team_id is not null
          and exists (
            select 1 from public.team_members
            where team_members.team_id = year_wheels.team_id
            and team_members.user_id = auth.uid()
          )
        )  -- Team wheels
      )
    )
  );

drop policy if exists "Users can insert rings for their wheels and team wheels" on public.wheel_rings;
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

drop policy if exists "Users can update rings for their wheels and team wheels" on public.wheel_rings;
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

drop policy if exists "Users can delete rings for their wheels and team wheels" on public.wheel_rings;
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
-- RING_DATA POLICIES
-- =============================================

drop policy if exists "Users can view ring data for their wheels and team wheels" on public.ring_data;
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

drop policy if exists "Users can insert ring data for their wheels and team wheels" on public.ring_data;
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

drop policy if exists "Users can update ring data for their wheels and team wheels" on public.ring_data;
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

drop policy if exists "Users can delete ring data for their wheels and team wheels" on public.ring_data;
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

drop policy if exists "Users can insert activity groups for their wheels and team wheels" on public.activity_groups;
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

drop policy if exists "Users can update activity groups for their wheels and team wheels" on public.activity_groups;
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

drop policy if exists "Users can delete activity groups for their wheels and team wheels" on public.activity_groups;
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

drop policy if exists "Users can insert labels for their wheels and team wheels" on public.labels;
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

drop policy if exists "Users can update labels for their wheels and team wheels" on public.labels;
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

drop policy if exists "Users can delete labels for their wheels and team wheels" on public.labels;
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

drop policy if exists "Users can insert items for their wheels and team wheels" on public.items;
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

drop policy if exists "Users can update items for their wheels and team wheels" on public.items;
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

drop policy if exists "Users can delete items for their wheels and team wheels" on public.items;
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
-- COMPLETED
-- =============================================
-- Team members can now:
-- 1. View all data for team wheels (rings, activity groups, labels, items)
-- 2. Edit all data for team wheels
-- 3. Full read/write access just like the wheel owner

