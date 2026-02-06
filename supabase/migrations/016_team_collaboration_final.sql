-- =============================================
-- TEAM COLLABORATION SCHEMA - FINAL FIX
-- Using security definer functions to avoid RLS recursion
-- =============================================

-- =============================================
-- STEP 1: Create tables (if not exists)
-- =============================================

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint name_length check (char_length(name) > 0 and char_length(name) <= 100)
);

create index if not exists teams_owner_id_idx on public.teams(owner_id);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint role_valid check (role in ('owner', 'admin', 'member')),
  constraint unique_team_member unique(team_id, user_id)
);

create index if not exists team_members_team_id_idx on public.team_members(team_id);
create index if not exists team_members_user_id_idx on public.team_members(user_id);

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  email text not null,
  invited_by uuid references auth.users(id) on delete cascade not null,
  token text unique not null default gen_random_uuid()::text,
  status text not null default 'pending',
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '7 days') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint status_valid check (status in ('pending', 'accepted', 'declined', 'expired')),
  constraint email_format check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

create index if not exists team_invitations_team_id_idx on public.team_invitations(team_id);
create index if not exists team_invitations_token_idx on public.team_invitations(token);
create index if not exists team_invitations_email_idx on public.team_invitations(email);

-- Add team_id to year_wheels
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'year_wheels' and column_name = 'team_id'
  ) then
    alter table public.year_wheels
      add column team_id uuid references public.teams(id) on delete set null;
  end if;
end $$;

create index if not exists year_wheels_team_id_idx on public.year_wheels(team_id);

-- =============================================
-- STEP 2: Helper functions (security definer)
-- These bypass RLS and prevent infinite recursion
-- =============================================

-- Check if user is a member of a team
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id
      and m.user_id = p_user_id
  );
$$;

-- Check if user can manage a team (owner or admin)
create or replace function public.can_manage_team(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.teams t
      where t.id = p_team_id
        and t.owner_id = p_user_id
    )
    or exists (
      select 1 from public.team_members m
      where m.team_id = p_team_id
        and m.user_id = p_user_id
        and m.role in ('owner','admin')
    );
$$;

-- Ensure functions are owned by postgres (bypass RLS)
alter function public.is_team_member(uuid, uuid) owner to postgres;
alter function public.can_manage_team(uuid, uuid) owner to postgres;

-- Grant execute to authenticated users
grant execute on function public.is_team_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_team(uuid, uuid) to authenticated;

-- =============================================
-- STEP 3: RLS Policies for teams
-- =============================================
alter table public.teams enable row level security;

drop policy if exists "Users can view their teams" on public.teams;
drop policy if exists "Users can create teams" on public.teams;
drop policy if exists "Team owners can update teams" on public.teams;
drop policy if exists "Team owners can delete teams" on public.teams;

create policy "Users can view their teams"
  on public.teams for select
  using (
    auth.uid() = owner_id
    or public.is_team_member(id, auth.uid())
  );

create policy "Users can create teams"
  on public.teams for insert
  with check (auth.uid() = owner_id);

create policy "Team owners can update teams"
  on public.teams for update
  using (auth.uid() = owner_id);

create policy "Team owners can delete teams"
  on public.teams for delete
  using (auth.uid() = owner_id);

-- =============================================
-- STEP 4: RLS Policies for team_members
-- Using helper functions - NO RECURSION!
-- =============================================
alter table public.team_members enable row level security;

drop policy if exists "Team members can view members" on public.team_members;
drop policy if exists "Team owners and admins can add members" on public.team_members;
drop policy if exists "Team owners and admins can update members" on public.team_members;
drop policy if exists "Team owners and admins can remove members" on public.team_members;

-- View members of teams you're in
create policy "Team members can view members"
  on public.team_members for select
  using (public.is_team_member(team_id, auth.uid()));

-- Add members (owner/admin only)
create policy "Team owners and admins can add members"
  on public.team_members for insert
  with check (public.can_manage_team(team_id, auth.uid()));

-- Update member roles (owner/admin only)
create policy "Team owners and admins can update members"
  on public.team_members for update
  using (public.can_manage_team(team_id, auth.uid()));

-- Remove members (owner/admin or self-remove)
create policy "Team owners and admins can remove members"
  on public.team_members for delete
  using (
    public.can_manage_team(team_id, auth.uid())
    or user_id = auth.uid()
  );

-- =============================================
-- STEP 5: RLS Policies for team_invitations
-- =============================================
alter table public.team_invitations enable row level security;

drop policy if exists "Team members can view invitations" on public.team_invitations;
drop policy if exists "Team owners and admins can create invitations" on public.team_invitations;
drop policy if exists "Users can update their invitations" on public.team_invitations;
drop policy if exists "Team owners can delete invitations" on public.team_invitations;

create policy "Team members can view invitations"
  on public.team_invitations for select
  using (
    public.is_team_member(team_id, auth.uid())
    or email = auth.email()
  );

create policy "Team owners and admins can create invitations"
  on public.team_invitations for insert
  with check (public.can_manage_team(team_id, auth.uid()));

create policy "Users can update their invitations"
  on public.team_invitations for update
  using (email = auth.email());

create policy "Team owners can delete invitations"
  on public.team_invitations for delete
  using (public.can_manage_team(team_id, auth.uid()));

-- =============================================
-- STEP 6: RLS Policies for year_wheels
-- =============================================
drop policy if exists "Users can view their own wheels" on public.year_wheels;
drop policy if exists "Users can view their wheels and team wheels" on public.year_wheels;
drop policy if exists "Users can update their own wheels" on public.year_wheels;
drop policy if exists "Users can update their wheels and team wheels" on public.year_wheels;

create policy "Users can view their wheels and team wheels"
  on public.year_wheels for select
  using (
    auth.uid() = user_id
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );

create policy "Users can update their wheels and team wheels"
  on public.year_wheels for update
  using (
    auth.uid() = user_id
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );

-- =============================================
-- STEP 7: Triggers and utility functions
-- =============================================

-- Automatically add team owner as member
create or replace function public.add_owner_to_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function public.add_owner_to_team();

-- Update team timestamp
create or replace function public.update_team_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists on_team_updated on public.teams;
create trigger on_team_updated
  before update on public.teams
  for each row execute function public.update_team_updated_at();

-- =============================================
-- COMPLETED! ✅
-- =============================================
-- No more infinite recursion!
-- You can now:
-- 1. Create teams
-- 2. View team members
-- 3. Invite users to teams
-- 4. Assign wheels to teams
-- 5. All team members can view and edit team wheels
