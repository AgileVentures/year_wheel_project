-- =============================================
-- TEAM COLLABORATION ROLLBACK
-- Remove team functionality from Year Wheel
-- =============================================

-- Drop triggers first
drop trigger if exists on_team_updated on public.teams;
drop trigger if exists on_team_created on public.teams;

-- Drop functions
drop function if exists public.update_team_updated_at();
drop function if exists public.add_owner_to_team();

-- Drop RLS policies on year_wheels
drop policy if exists "Users can update their wheels and team wheels" on public.year_wheels;
drop policy if exists "Users can view their wheels and team wheels" on public.year_wheels;

-- Recreate original year_wheels policies
create policy "Users can view their own wheels"
  on public.year_wheels for select
  using (auth.uid() = user_id);

create policy "Users can update their own wheels"
  on public.year_wheels for update
  using (auth.uid() = user_id);

-- Drop team_id column from year_wheels
alter table public.year_wheels drop column if exists team_id;

-- Drop tables (cascade will drop all policies)
drop table if exists public.team_invitations cascade;
drop table if exists public.team_members cascade;
drop table if exists public.teams cascade;
