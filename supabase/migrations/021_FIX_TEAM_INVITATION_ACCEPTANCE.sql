-- =============================================
-- FIX: Allow users to accept team invitations
-- Adds RLS policy for users to add themselves to teams
-- when they have a valid pending invitation
-- =============================================

-- Drop the existing restrictive insert policy
drop policy if exists "Team owners and admins can add members" on public.team_members;

-- Create new policies:
-- 1. Team owners/admins can add members (original functionality)
-- 2. Users can add themselves when they have a valid invitation (NEW)

create policy "Team owners and admins can add members"
  on public.team_members for insert
  with check (
    -- Team owners/admins can add members
    public.can_manage_team(team_id, auth.uid())
  );

create policy "Users can accept their own invitations"
  on public.team_members for insert
  with check (
    -- User is adding themselves
    user_id = auth.uid()
    -- And they have a valid pending invitation for this team
    and exists (
      select 1 from public.team_invitations
      where team_id = team_members.team_id
        and email = auth.email()
        and status = 'pending'
        and expires_at > now()
    )
  );

-- =============================================
-- COMPLETED! ✅
-- =============================================
-- Users can now:
-- 1. Accept team invitations manually through the UI
-- 2. Auto-accept on signup (existing functionality)
-- Team admins can still add members directly
