-- =============================================
-- DEBUG: Find out WHY save is failing
-- =============================================

-- Check 1: Verify you're now in the team
SELECT 
  tm.*,
  '✅ You are in the team!' as status
FROM team_members tm
WHERE team_id = 'ecb866bd-443f-4df7-85f0-1653dc41816b'
AND user_id = '822e88be-ee52-42b5-a72a-c847e80933e6';

-- Check 2: See what policies exist on ALL wheel tables
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('year_wheels', 'wheel_rings', 'ring_data', 'activity_groups', 'labels', 'items')
GROUP BY tablename
ORDER BY tablename;

-- Check 3: Check RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('year_wheels', 'wheel_rings', 'ring_data', 'activity_groups', 'labels', 'items')
ORDER BY tablename;

-- Check 4: Test if you can INSERT into ring_data
-- Get a ring_id from your wheel first
SELECT 
  id as ring_id,
  name as ring_name
FROM wheel_rings
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe'
LIMIT 1;

-- Use the ring_id from above to test insert
-- Replace RING_ID_FROM_ABOVE
/*
INSERT INTO ring_data (ring_id, month_index, content)
VALUES ('RING_ID_FROM_CHECK_4', 0, ARRAY['Test content'])
RETURNING *;
*/

-- Check 5: Look for any constraint violations on ring_data
SELECT 
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
AND rel.relname = 'ring_data';
