-- =====================================================
-- TEAM MEMBER LIMIT ENFORCEMENT (2025-11-15)
-- Align can_add_team_member/get_team_member_count with team-based collaboration model
-- =====================================================

-- Drop existing functions to allow parameter name changes
DROP FUNCTION IF EXISTS public.get_team_member_count(UUID);
DROP FUNCTION IF EXISTS public.can_add_team_member(UUID, UUID);

-- Count members for a team (including owner/admin/member roles)
CREATE OR REPLACE FUNCTION public.get_team_member_count(team_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF team_uuid IS NULL THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM public.team_members
    WHERE team_id = team_uuid
  );
END;
$$;

-- Enforce plan limits when adding members to a team
CREATE OR REPLACE FUNCTION public.can_add_team_member(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium BOOLEAN;
  member_count INTEGER;
BEGIN
  -- Must reference a team and be managed by the acting user
  IF team_uuid IS NULL OR user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT public.can_manage_team(team_uuid, user_uuid) THEN
    RETURN FALSE;
  END IF;

  -- Premium (or admin) users have unlimited seats
  is_premium := public.is_premium_user(user_uuid);
  IF is_premium THEN
    RETURN TRUE;
  END IF;

  -- Free plan: up to 3 members per team (including owner)
  member_count := public.get_team_member_count(team_uuid);
  RETURN member_count < 3;
END;
$$;

-- Helper verification queries (optional)
-- SELECT public.get_team_member_count('TEAM_UUID_HERE');
-- SELECT public.can_add_team_member('TEAM_UUID_HERE', 'USER_UUID_HERE');
