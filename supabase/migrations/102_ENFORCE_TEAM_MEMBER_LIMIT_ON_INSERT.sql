-- Enforce the three-member free-plan limit for every team_members insert path,
-- including invitation acceptance.

CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_owner UUID;
BEGIN
  SELECT owner_id INTO team_owner
  FROM public.teams
  WHERE id = NEW.team_id;

  IF team_owner IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  IF NOT public.can_add_team_member(NEW.team_id, team_owner) THEN
    RAISE EXCEPTION 'TEAM_MEMBER_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_team_member_limit_on_insert ON public.team_members;

CREATE TRIGGER enforce_team_member_limit_on_insert
  BEFORE INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_team_member_limit();