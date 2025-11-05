-- ============================================================================
-- NUCLEAR OPTION: Delete ALL items from the corrupted wheel
-- ============================================================================
-- This will completely wipe all activities from your most recent wheel
-- allowing you to start fresh with the AI Assistant
-- ============================================================================

-- Step 1: Preview what will be deleted
SELECT 
  yw.id as wheel_id,
  yw.title,
  yw.updated_at,
  COUNT(i.id) as total_items
FROM year_wheels yw
LEFT JOIN items i ON i.wheel_id = yw.id
WHERE yw.id = (SELECT id FROM year_wheels ORDER BY updated_at DESC LIMIT 1)
GROUP BY yw.id, yw.title, yw.updated_at;

-- Step 2: DELETE ALL ITEMS (uncomment to execute)
DELETE FROM items 
WHERE wheel_id = (SELECT id FROM year_wheels ORDER BY updated_at DESC LIMIT 1);

-- Step 3: Verify cleanup
SELECT 
  yw.id as wheel_id,
  yw.title,
  COUNT(i.id) as remaining_items
FROM year_wheels yw
LEFT JOIN items i ON i.wheel_id = yw.id
WHERE yw.id = (SELECT id FROM year_wheels ORDER BY updated_at DESC LIMIT 1)
GROUP BY yw.id, yw.title;

-- Should show: remaining_items = 0
