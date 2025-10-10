-- Set all ring colors to NULL so they derive from palette
UPDATE wheel_rings
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Set all activity group colors to NULL
UPDATE activity_groups
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Set all label colors to NULL
UPDATE labels
SET color = NULL
WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Verify the changes
SELECT 'Rings' as table_name, name, color FROM wheel_rings WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe'
UNION ALL
SELECT 'Activities', name, color FROM activity_groups WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe'
UNION ALL
SELECT 'Labels', name, color FROM labels WHERE wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe';
