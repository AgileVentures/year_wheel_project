-- =============================================
-- QUICK PATCH: Fix auth.users permission error
-- =============================================
-- Replace queries to auth.users with auth.email() function
-- which doesn't require direct table access

-- Fix team_invitations policies
drop policy if exists "Team members can view invitations" on public.team_invitations;
drop policy if exists "Users can update their invitations" on public.team_invitations;

create policy "Team members can view invitations"
  on public.team_invitations for select
  using (
    public.is_team_member(team_id, auth.uid())
    or email = auth.email()  -- ✅ Use auth.email() instead of querying auth.users
  );

create policy "Users can update their invitations"
  on public.team_invitations for update
  using (email = auth.email());  -- ✅ Use auth.email() instead of querying auth.users

-- =============================================
-- DONE! Refresh your page and the error should be gone.
-- =============================================
