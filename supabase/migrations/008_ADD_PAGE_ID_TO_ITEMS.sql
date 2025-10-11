-- Add page_id column to items table
-- This migration adds the missing page_id foreign key to properly isolate items per page

-- Step 1: Add the column (nullable initially to allow existing data)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS page_id UUID;

-- Step 2: Add foreign key constraint
ALTER TABLE items 
ADD CONSTRAINT items_page_id_fkey 
FOREIGN KEY (page_id) REFERENCES wheel_pages(id) ON DELETE CASCADE;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS items_page_id_idx ON items(page_id);

-- Step 4: Backfill existing items with page_id based on wheel_id and year
-- This assigns items to the correct page based on their start_date year
UPDATE items 
SET page_id = (
  SELECT wp.id 
  FROM wheel_pages wp 
  WHERE wp.wheel_id = items.wheel_id 
    AND wp.year = EXTRACT(YEAR FROM items.start_date::date)
  LIMIT 1
)
WHERE page_id IS NULL;

-- Step 5: Make page_id NOT NULL after backfill
ALTER TABLE items 
ALTER COLUMN page_id SET NOT NULL;

-- Verification queries (run these to check):
-- SELECT COUNT(*) as items_without_page_id FROM items WHERE page_id IS NULL;
-- SELECT i.id, i.name, i.start_date, i.page_id, wp.year 
-- FROM items i 
-- JOIN wheel_pages wp ON i.page_id = wp.id 
-- LIMIT 10;

COMMENT ON COLUMN items.page_id IS 'Foreign key to wheel_pages - isolates items per year/page';
