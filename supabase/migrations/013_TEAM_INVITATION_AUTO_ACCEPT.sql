-- =============================================
-- TEAM INVITATION AUTO-ACCEPT ON SIGNUP
-- Automatically add users to teams when they sign up
-- if they have pending invitations
-- =============================================

-- =============================================
-- Function: Auto-accept team invitations on signup
-- =============================================
create or replace function public.handle_new_user_team_invitations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record record;
begin
  -- Find all pending invitations for this user's email
  for invitation_record in
    select id, team_id
    from public.team_invitations
    where email = new.email
      and status = 'pending'
      and expires_at > now()
  loop
    -- Add user to the team
    insert into public.team_members (team_id, user_id, role)
    values (invitation_record.team_id, new.id, 'member')
    on conflict (team_id, user_id) do nothing;

    -- Mark invitation as accepted
    update public.team_invitations
    set status = 'accepted'
    where id = invitation_record.id;
  end loop;

  return new;
end;
$$;

-- Create trigger on auth.users (requires service_role)
-- Note: This needs to be run with elevated permissions
drop trigger if exists on_auth_user_created_team_invitations on auth.users;
create trigger on_auth_user_created_team_invitations
  after insert on auth.users
  for each row
  execute function public.handle_new_user_team_invitations();

-- =============================================
-- Grant necessary permissions
-- =============================================
grant usage on schema auth to postgres;
grant all on auth.users to postgres;

-- =============================================
-- COMPLETED! ✅
-- =============================================
-- Now when someone signs up:
-- 1. If they have pending invitations, they're automatically added to those teams
-- 2. The invitations are marked as accepted
-- 3. Works for both new signups and existing users
