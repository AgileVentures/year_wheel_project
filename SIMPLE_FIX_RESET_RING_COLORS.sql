-- =============================================
-- SIMPLE FIX: Reset All Ring Colors to Use Palette
-- =============================================
-- This sets all ring/activity/label colors to NULL
-- so they will be derived from the wheel's palette

-- Your wheel ID (update if different)
-- Run this in Supabase SQL Editor

-- STEP 1: Remove NOT NULL constraints first
ALTER TABLE wheel_rings ALTER COLUMN color DROP NOT NULL;
ALTER TABLE activity_groups ALTER COLUMN color DROP NOT NULL;
ALTER TABLE labels ALTER COLUMN color DROP NOT NULL;

-- STEP 2: Set all wheel_rings colors to NULL
UPDATE wheel_rings
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- STEP 3: Set all activity_groups colors to NULL
UPDATE activity_groups
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- STEP 4: Set all labels colors to NULL
UPDATE labels
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- STEP 5: Verify the fix
SELECT 
  'wheel_rings' AS table_name,
  name,
  type,
  color
FROM wheel_rings
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe'

UNION ALL

SELECT 
  'activity_groups' AS table_name,
  name,
  'activity' as type,
  color
FROM activity_groups
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe'

ORDER BY table_name, type, name;
