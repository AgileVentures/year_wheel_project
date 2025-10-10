-- =============================================
-- FIX WHEEL COLORS TO PASTELL PALETTE
-- =============================================
-- This script updates all existing wheels to use Pastell palette colors
-- and fixes the gray color issue

-- IMPORTANT: This sets colors to NULL so they will be derived from palette
-- Run this for your specific wheel ID

-- 1. Update the main wheel to use Pastell palette
UPDATE year_wheels
SET colors = '["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"]'::jsonb
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- 2. Set all wheel_rings colors to NULL so they derive from palette
UPDATE wheel_rings
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- 3. Set all activity_groups colors to NULL so they derive from palette
UPDATE activity_groups
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- 4. Set all labels colors to NULL so they derive from palette
UPDATE labels
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- 5. Update all wheel_pages for this wheel to use Pastell colors in organization_data
UPDATE wheel_pages
SET organization_data = jsonb_set(
  jsonb_set(
    organization_data,
    '{rings}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN ring->>'type' = 'outer' THEN
            jsonb_set(
              ring,
              '{color}',
              to_jsonb(
                CASE 
                  WHEN (row_number - 1) % 4 = 0 THEN '#F5E6D3'
                  WHEN (row_number - 1) % 4 = 1 THEN '#A8DCD1'
                  WHEN (row_number - 1) % 4 = 2 THEN '#F4A896'
                  WHEN (row_number - 1) % 4 = 3 THEN '#B8D4E8'
                END
              )
            )
          ELSE ring
        END
      )
      FROM (
        SELECT 
          ring,
          ROW_NUMBER() OVER (ORDER BY ordinality) AS row_number
        FROM jsonb_array_elements(organization_data->'rings') WITH ORDINALITY AS ring
        WHERE ring->>'type' = 'outer'
      ) numbered_rings
    )
  ),
  '{activityGroups}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        activity,
        '{color}',
        to_jsonb(
          CASE 
            WHEN (row_number - 1) % 4 = 0 THEN '#F5E6D3'
            WHEN (row_number - 1) % 4 = 1 THEN '#A8DCD1'
            WHEN (row_number - 1) % 4 = 2 THEN '#F4A896'
            WHEN (row_number - 1) % 4 = 3 THEN '#B8D4E8'
          END
        )
      )
    )
    FROM (
      SELECT 
        activity,
        ROW_NUMBER() OVER (ORDER BY ordinality) AS row_number
      FROM jsonb_array_elements(organization_data->'activityGroups') WITH ORDINALITY AS activity
    ) numbered_activities
  )
)
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Verify the changes
SELECT 
  'year_wheels' AS table_name,
  id,
  title,
  colors
FROM year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe'

UNION ALL

SELECT 
  'wheel_rings' AS table_name,
  id,
  name,
  color
FROM wheel_rings
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe'
  AND type = 'outer'

UNION ALL

SELECT 
  'activity_groups' AS table_name,
  id,
  name,
  color
FROM activity_groups
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';
