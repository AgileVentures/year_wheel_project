-- Check all current policies on year_wheels
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'year_wheels'
ORDER BY cmd, policyname;
