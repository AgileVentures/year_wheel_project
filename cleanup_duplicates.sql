-- ============================================================================
-- CLEANUP SCRIPT: Remove duplicate items from most recent wheel
-- ============================================================================
-- Run this in Supabase SQL Editor (paste entire query and click RUN)
-- This will remove 3058 duplicate items, keeping only the oldest of each
-- ============================================================================

WITH duplicates AS (
  -- Find all duplicate items (same name, dates, ring, page)
  SELECT 
    name,
    start_date,
    end_date,
    ring_id,
    page_id,
    wheel_id,
    ARRAY_AGG(id ORDER BY created_at) as all_ids
  FROM items
  WHERE wheel_id = (SELECT id FROM year_wheels ORDER BY updated_at DESC LIMIT 1)
  GROUP BY name, start_date, end_date, ring_id, page_id, wheel_id
  HAVING COUNT(*) > 1
),
ids_to_delete AS (
  -- Get all IDs except the first (oldest) one
  SELECT UNNEST(all_ids[2:]) as id_to_delete
  FROM duplicates
)
DELETE FROM items
WHERE id IN (SELECT id_to_delete FROM ids_to_delete);

-- ============================================================================
-- After running, check the results with these verification queries:
-- ============================================================================

-- Show summary of remaining items
SELECT 
  COUNT(*) as total_items,
  COUNT(DISTINCT name) as unique_names
FROM items
WHERE wheel_id = (SELECT id FROM year_wheels ORDER BY updated_at DESC LIMIT 1);

-- Show items by page/year
SELECT 
  wp.year,
  COUNT(i.id) as item_count,
  STRING_AGG(DISTINCT i.name, ', ' ORDER BY i.name) as activities
FROM items i
JOIN wheel_pages wp ON i.page_id = wp.id
WHERE i.wheel_id = (SELECT id FROM year_wheels ORDER BY updated_at DESC LIMIT 1)
GROUP BY wp.year, wp.id
ORDER BY wp.year;
