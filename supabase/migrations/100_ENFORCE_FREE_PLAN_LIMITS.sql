-- Enforce the free plan limits: 1 wheel and 1 team with up to 3 members.

CREATE OR REPLACE FUNCTION public.can_create_wheel(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_premium_user(user_uuid) THEN
    RETURN TRUE;
  END IF;

  RETURN public.get_user_wheel_count(user_uuid) < 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_create_team(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_premium_user(user_uuid) THEN
    RETURN TRUE;
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM public.teams
    WHERE owner_id = user_uuid
  ) < 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_create_wheel(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_team(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND public.can_create_team(auth.uid())
  );