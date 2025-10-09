-- =============================================
-- VERIFY REALTIME IS ENABLED
-- =============================================
-- Run this to check if realtime is already working
-- Safe to run multiple times - only reads data, doesn't modify anything

-- =============================================
-- Check Realtime Publication
-- =============================================

-- List all tables in the realtime publication
SELECT 
  schemaname,
  tablename,
  '✅ Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('year_wheels', 'wheel_rings', 'activity_groups', 'labels', 'items')
ORDER BY tablename;

-- =============================================
-- Expected Results
-- =============================================
-- 
-- You should see 5 rows:
-- 
-- | schemaname | tablename        | status             |
-- |------------|------------------|--------------------|
-- | public     | activity_groups  | ✅ Realtime enabled |
-- | public     | items            | ✅ Realtime enabled |
-- | public     | labels           | ✅ Realtime enabled |
-- | public     | wheel_rings      | ✅ Realtime enabled |
-- | public     | year_wheels      | ✅ Realtime enabled |
--
-- If you see all 5 tables: 🎉 REALTIME IS WORKING!
-- If you see fewer tables: Run ENABLE_REALTIME.sql for missing tables

-- =============================================
-- Check Missing Tables (Optional)
-- =============================================

-- Find tables that should have realtime but don't
SELECT 
  t.table_name,
  '❌ Realtime NOT enabled' as status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN ('year_wheels', 'wheel_rings', 'activity_groups', 'labels', 'items')
  AND NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables pt
    WHERE pt.pubname = 'supabase_realtime'
      AND pt.schemaname = 'public'
      AND pt.tablename = t.table_name
  )
ORDER BY t.table_name;

-- If this returns 0 rows: ✅ All required tables have realtime enabled!
-- If this returns any rows: ❌ Those tables need realtime enabled

-- =============================================
-- Next Steps
-- =============================================
--
-- If all 5 tables show "✅ Realtime enabled":
--   👍 You're done! Realtime is already working.
--   ✅ The error you saw is expected - tables are already added.
--   🚀 Your React app can now use useRealtimeWheel hook.
--
-- If some tables are missing:
--   1. Note which tables are missing
--   2. Run the ALTER commands for only those tables from ENABLE_REALTIME.sql
--
-- If you want to DISABLE realtime on a table:
--   alter publication supabase_realtime drop table public.TABLE_NAME;
