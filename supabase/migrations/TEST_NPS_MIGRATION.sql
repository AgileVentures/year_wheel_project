-- Test script for NPS functionality
-- This can be run in the Supabase SQL editor

-- 1. Verify the nps_responses table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'nps_responses'
ORDER BY ordinal_position;

-- 2. Verify profiles table has NPS tracking columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('last_nps_shown_at', 'last_nps_submitted_at');

-- 3. Test the should_show_nps function with a test user
-- Replace 'USER_ID_HERE' with an actual user ID
-- SELECT should_show_nps('USER_ID_HERE');

-- 4. Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'nps_responses';

-- 5. Test inserting a sample NPS response (as authenticated user)
-- This should only work when run as an authenticated user via the app
-- INSERT INTO nps_responses (user_id, score, comment)
-- VALUES (auth.uid(), 9, 'Great product!');

-- 6. Count existing NPS responses
SELECT COUNT(*) as total_responses FROM nps_responses;

-- 7. Get NPS statistics
SELECT 
    COUNT(*) as total,
    AVG(score) as avg_score,
    COUNT(CASE WHEN score >= 9 THEN 1 END) as promoters,
    COUNT(CASE WHEN score >= 7 AND score <= 8 THEN 1 END) as passives,
    COUNT(CASE WHEN score <= 6 THEN 1 END) as detractors
FROM nps_responses;

-- 8. Verify indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'nps_responses'
ORDER BY indexname;

-- SUCCESS: If all queries above return results without errors, the migration was successful!
