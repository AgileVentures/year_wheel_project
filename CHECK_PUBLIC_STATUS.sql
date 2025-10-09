-- Check if the wheel exists and its public status
SELECT 
  id,
  title,
  is_public,
  user_id,
  team_id,
  created_at
FROM public.year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- If the above returns nothing, check if the column exists at all
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'year_wheels'
AND column_name = 'is_public';

-- Manually set the wheel to public (if it exists)
UPDATE public.year_wheels
SET is_public = TRUE
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Verify it was updated
SELECT 
  id,
  title,
  is_public
FROM public.year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';
