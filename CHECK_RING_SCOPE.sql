-- =====================================================
-- CHECK RING SCOPE
-- Verify that rings are wheel-scoped (not page-scoped)
-- =====================================================

-- 1. Check wheel_rings table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'wheel_rings'
ORDER BY ordinal_position;

-- 2. Check if rings have wheel_id (not page_id)
-- This should show rings with wheel_id only
SELECT 
  id,
  wheel_id,
  name,
  type,
  visible,
  ring_order
FROM public.wheel_rings
WHERE wheel_id IN (
  SELECT id FROM public.year_wheels WHERE user_id = auth.uid()
)
ORDER BY wheel_id, ring_order;

-- 3. Check how many rings exist per wheel
SELECT 
  yw.title as wheel_title,
  yw.id as wheel_id,
  COUNT(wr.id) as ring_count,
  json_agg(json_build_object(
    'id', wr.id,
    'name', wr.name,
    'type', wr.type,
    'ring_order', wr.ring_order
  ) ORDER BY wr.ring_order) as rings
FROM public.year_wheels yw
LEFT JOIN public.wheel_rings wr ON wr.wheel_id = yw.id
WHERE yw.user_id = auth.uid()
GROUP BY yw.id, yw.title;

-- 4. Check ring integrations (should reference wheel_id, not page_id)
SELECT 
  ri.id,
  ri.user_id,
  ri.ring_id,
  wr.name as ring_name,
  wr.wheel_id,
  ri.integration_type,
  ri.is_active
FROM public.ring_integrations ri
JOIN public.wheel_rings wr ON ri.ring_id = wr.id
WHERE ri.user_id = auth.uid();

-- 5. Check items - should have page_id for scoping
SELECT 
  i.id,
  i.name,
  i.start_date,
  i.end_date,
  i.page_id,
  wp.year as page_year,
  i.wheel_id,
  yw.title as wheel_title,
  i.ring_id,
  wr.name as ring_name
FROM public.items i
JOIN public.year_wheels yw ON i.wheel_id = yw.id
JOIN public.wheel_rings wr ON i.ring_id = wr.id
LEFT JOIN public.wheel_pages wp ON i.page_id = wp.id
WHERE yw.user_id = auth.uid()
ORDER BY i.start_date;

-- =====================================================
-- EXPECTED RESULTS:
-- Query 1: Should show wheel_id column (not page_id)
-- Query 2: Should show rings with wheel_id FK
-- Query 3: Should show same rings shared across all pages in a wheel
-- Query 4: Should show integrations referencing rings via wheel_id
-- Query 5: Should show items with page_id for year scoping
-- =====================================================
