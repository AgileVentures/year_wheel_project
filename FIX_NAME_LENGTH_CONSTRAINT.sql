-- =============================================
-- CHECK: What's the name_length constraint?
-- =============================================

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'activity_groups'::regclass
AND conname = 'name_length';

-- This will show us the exact rule (probably something like: length(name) > 0)

-- =============================================
-- FIX OPTION 1: Remove the constraint (quick fix)
-- =============================================
-- If the constraint is too strict, we can drop it:
/*
ALTER TABLE activity_groups DROP CONSTRAINT IF EXISTS name_length;
*/

-- =============================================
-- FIX OPTION 2: Add a default name (better fix)
-- =============================================
-- Or we can modify the constraint to allow empty names with a default:
/*
ALTER TABLE activity_groups DROP CONSTRAINT IF EXISTS name_length;
ALTER TABLE activity_groups ADD CONSTRAINT name_length CHECK (name IS NOT NULL);
*/
