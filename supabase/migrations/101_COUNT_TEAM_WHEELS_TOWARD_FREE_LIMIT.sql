-- A free user's single wheel allowance includes wheels owned by teams they belong to.
-- Leaving a team removes that team's wheel from the user's limit calculation.

CREATE OR REPLACE FUNCTION public.get_user_wheel_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM (
    SELECT id
    FROM public.year_wheels
    WHERE user_id = user_uuid

    UNION

    SELECT wheel.id
    FROM public.year_wheels AS wheel
    INNER JOIN public.team_members AS member
      ON member.team_id = wheel.team_id
    WHERE member.user_id = user_uuid
      AND wheel.team_id IS NOT NULL
  ) AS accessible_wheels;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_wheel_count(UUID) TO authenticated;