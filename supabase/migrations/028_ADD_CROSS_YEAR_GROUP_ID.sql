-- Migration: Add cross_year_group_id column to items table
-- Purpose: Link items that span multiple years across different pages
-- Each linked item shares the same crossYearGroupId UUID

-- Add cross_year_group_id column to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS cross_year_group_id UUID DEFAULT NULL;

-- Add index for efficient lookups of cross-year linked items
CREATE INDEX IF NOT EXISTS idx_items_cross_year_group_id 
ON items(cross_year_group_id) 
WHERE cross_year_group_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN items.cross_year_group_id IS 'UUID linking items that represent segments of the same activity spanning multiple years. All items with the same cross_year_group_id are part of the same cross-year activity.';
