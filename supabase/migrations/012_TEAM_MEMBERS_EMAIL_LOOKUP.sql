-- =============================================
-- ADD USER EMAIL LOOKUP FOR TEAM MEMBERS
-- Creates a function to get team members with emails
-- =============================================

-- Create a function that returns team members with their emails
-- This uses auth.email() which is available in RLS context
CREATE OR REPLACE FUNCTION get_team_members_with_emails(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.joined_at,
    COALESCE(
      (SELECT au.email::text FROM auth.users au WHERE au.id = tm.user_id),
      'unknown@example.com'::text
    ) as email
  FROM team_members tm
  WHERE tm.team_id = p_team_id
  ORDER BY tm.joined_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_team_members_with_emails(uuid) TO authenticated;

-- =============================================
-- USAGE
-- =============================================
-- In your application, call this function instead of querying team_members directly:
-- const { data, error } = await supabase.rpc('get_team_members_with_emails', { p_team_id: teamId });
