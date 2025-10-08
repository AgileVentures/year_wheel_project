-- =============================================
-- TEAM COLLABORATION SCHEMA - FIXED VERSION
-- Add team functionality to Year Wheel
-- =============================================

-- =============================================
-- TABLE: teams
-- Teams that can collaborate on wheels
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

-- Index for faster lookups
create index if not exists teams_owner_id_idx on public.teams(owner_id);

-- =============================================
-- TABLE: team_members
-- Users who are members of teams
-- =============================================
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member', -- 'owner', 'admin', 'member'
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint role_valid check (role in ('owner', 'admin', 'member')),
  constraint unique_team_member unique(team_id, user_id)
);

-- Indexes for faster lookups
create index if not exists team_members_team_id_idx on public.team_members(team_id);
create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- =============================================
-- TABLE: team_invitations
-- Pending invitations to join teams
-- =============================================
create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  email text not null,
  invited_by uuid references auth.users(id) on delete cascade not null,
  token text unique not null default gen_random_uuid()::text,
  status text not null default 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '7 days') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint status_valid check (status in ('pending', 'accepted', 'declined', 'expired')),
  constraint email_format check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
create index if not exists team_invitations_team_id_idx on public.team_invitations(team_id);
create index if not exists team_invitations_token_idx on public.team_invitations(token);
create index if not exists team_invitations_email_idx on public.team_invitations(email);

-- =============================================
-- UPDATE: year_wheels table
-- Add team_id column to wheels
-- =============================================
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
-- RLS POLICIES: teams
-- =============================================
alter table public.teams enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their teams" on public.teams;
drop policy if exists "Users can create teams" on public.teams;
drop policy if exists "Team owners can update teams" on public.teams;
drop policy if exists "Team owners can delete teams" on public.teams;

-- Users can view teams they are members of
create policy "Users can view their teams"
  on public.teams for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

-- Users can create teams
create policy "Users can create teams"
  on public.teams for insert
  with check (auth.uid() = owner_id);

-- Team owners can update their teams
create policy "Team owners can update teams"
  on public.teams for update
  using (auth.uid() = owner_id);

-- Team owners can delete their teams
create policy "Team owners can delete teams"
  on public.teams for delete
  using (auth.uid() = owner_id);

-- =============================================
-- RLS POLICIES: team_members
-- =============================================
alter table public.team_members enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Team members can view members" on public.team_members;
drop policy if exists "Team owners and admins can add members" on public.team_members;
drop policy if exists "Team owners and admins can remove members" on public.team_members;
drop policy if exists "Team owners and admins can update members" on public.team_members;

-- Team members can view other team members
create policy "Team members can view members"
  on public.team_members for select
  using (
    exists (
      select 1 from public.team_members as tm
      where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
    )
  );

-- Team owners and admins can add members (FIXED: no self-reference)
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

-- Team owners and admins can update member roles
create policy "Team owners and admins can update members"
  on public.team_members for update
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_id
      and teams.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.team_members as tm
      where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    )
  );

-- Team owners and admins can remove members
create policy "Team owners and admins can remove members"
  on public.team_members for delete
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_id
      and teams.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.team_members as tm
      where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    )
    or user_id = auth.uid() -- Users can remove themselves
  );

-- =============================================
-- RLS POLICIES: team_invitations
-- =============================================
alter table public.team_invitations enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Team members can view invitations" on public.team_invitations;
drop policy if exists "Team owners and admins can create invitations" on public.team_invitations;
drop policy if exists "Users can update their invitations" on public.team_invitations;
drop policy if exists "Team owners can delete invitations" on public.team_invitations;

-- Team members can view invitations for their teams
create policy "Team members can view invitations"
  on public.team_invitations for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = team_invitations.team_id
      and team_members.user_id = auth.uid()
    )
    or email = (select email from auth.users where id = auth.uid()) -- Users can view their own invitations
  );

-- Team owners and admins can create invitations
create policy "Team owners and admins can create invitations"
  on public.team_invitations for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = team_id
      and teams.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.team_members
      where team_members.team_id = team_invitations.team_id
      and team_members.user_id = auth.uid()
      and team_members.role in ('owner', 'admin')
    )
  );

-- Users can update invitations they received (accept/decline)
create policy "Users can update their invitations"
  on public.team_invitations for update
  using (
    email = (select email from auth.users where id = auth.uid())
  );

-- Team owners can delete invitations
create policy "Team owners can delete invitations"
  on public.team_invitations for delete
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_id
      and teams.owner_id = auth.uid()
    )
  );

-- =============================================
-- UPDATE RLS POLICIES: year_wheels
-- Allow team members to access team wheels
-- =============================================

-- Drop existing select policy and recreate with team access
drop policy if exists "Users can view their own wheels" on public.year_wheels;
drop policy if exists "Users can view their wheels and team wheels" on public.year_wheels;

create policy "Users can view their wheels and team wheels"
  on public.year_wheels for select
  using (
    auth.uid() = user_id  -- Own wheels
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )  -- Team wheels
  );

-- Team members can update team wheels
drop policy if exists "Users can update their own wheels" on public.year_wheels;
drop policy if exists "Users can update their wheels and team wheels" on public.year_wheels;

create policy "Users can update their wheels and team wheels"
  on public.year_wheels for update
  using (
    auth.uid() = user_id  -- Own wheels
    or (
      team_id is not null
      and exists (
        select 1 from public.team_members
        where team_members.team_id = year_wheels.team_id
        and team_members.user_id = auth.uid()
      )
    )  -- Team wheels
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to automatically add team owner as member
create or replace function public.add_owner_to_team()
returns trigger as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function public.add_owner_to_team();

-- Function to update team updated_at timestamp
create or replace function public.update_team_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Drop trigger if exists and recreate
drop trigger if exists on_team_updated on public.teams;
create trigger on_team_updated
  before update on public.teams
  for each row execute function public.update_team_updated_at();

-- =============================================
-- COMPLETED
-- =============================================
-- You can now:
-- 1. Create teams
-- 2. Invite users to teams
-- 3. Assign wheels to teams
-- 4. All team members can view and edit team wheels
