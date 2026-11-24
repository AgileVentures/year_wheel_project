-- create_notification trusts p_user_id, so any signed-in user who could call it directly
-- (via the Data API) could add a notification to another user's feed.
-- The app only calls it from its own SECURITY DEFINER mention triggers
-- (notify_mentioned_users in 030, notify_mentioned_users_wheel_comments in 031), which run
-- as the function owner and keep EXECUTE after this revoke.
-- Functions get EXECUTE for PUBLIC by default, so PUBLIC is revoked along with the API roles.

REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
