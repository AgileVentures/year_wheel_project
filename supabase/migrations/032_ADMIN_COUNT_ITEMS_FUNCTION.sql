-- Migration: Create admin function to count items by wheel
-- This uses proper SQL aggregation for efficient counting

CREATE OR REPLACE FUNCTION public.admin_count_items_by_wheel(wheel_ids UUID[])
RETURNS TABLE(wheel_id UUID, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    items.wheel_id,
    COUNT(*)::BIGINT as count
  FROM items
  WHERE items.wheel_id = ANY(wheel_ids)
  GROUP BY items.wheel_id;
$$;

-- Grant execute to service role (for edge functions)
GRANT EXECUTE ON FUNCTION public.admin_count_items_by_wheel(UUID[]) TO service_role;

COMMENT ON FUNCTION public.admin_count_items_by_wheel IS 'Efficiently count items per wheel using SQL aggregation. Used by admin panel.';
