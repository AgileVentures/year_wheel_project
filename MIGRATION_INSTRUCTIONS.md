# Database Migration Required: Add page_id to items table

## Problem
The code expects `items.page_id` column but it doesn't exist in the database yet.

**Error:**
```
column items.page_id does not exist
```

## Solution
Run the migration to add the missing column.

## Steps to Fix

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project: `mmysvuymzabstnobdfvo`

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Run Migration:**
   - Open file: `ADD_PAGE_ID_TO_ITEMS.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" (or press Cmd+Enter)

4. **Verify Success:**
   Look for message: "Success. No rows returned"

5. **Check Data:**
   Run this verification query:
   ```sql
   SELECT COUNT(*) as items_without_page_id 
   FROM items 
   WHERE page_id IS NULL;
   ```
   Should return: `0`

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Create migration file
supabase migration new add_page_id_to_items

# Copy contents of ADD_PAGE_ID_TO_ITEMS.sql to the new migration file

# Run migration
supabase db push
```

### Option 3: Manual psql

If you have direct database access:

```bash
psql "postgresql://postgres:[PASSWORD]@db.mmysvuymzabstnobdfvo.supabase.co:5432/postgres" \
  -f ADD_PAGE_ID_TO_ITEMS.sql
```

---

## What the Migration Does

1. **Adds `page_id` column** to `items` table (UUID, nullable initially)
2. **Creates foreign key** to `wheel_pages(id)` with CASCADE delete
3. **Creates index** on `page_id` for query performance
4. **Backfills existing data**: Assigns items to correct page based on `start_date` year
5. **Sets NOT NULL constraint** after backfill

## After Migration

Once the migration is complete:

1. **Refresh your browser** (hard reload: Cmd+Shift+R)
2. **Verify no errors** in console
3. **Test the AI assistant:**
   - Try: "skapa vinterkampanj 2025-12-01 till 2026-02-26"
   - Verify cross-year activities work

## Rollback (if needed)

If something goes wrong, you can rollback:

```sql
-- Remove the column (this will delete all page_id data)
ALTER TABLE items DROP COLUMN IF EXISTS page_id CASCADE;
```

---

## Expected Outcome

✅ `items.page_id` column exists  
✅ All existing items assigned to correct pages  
✅ Foreign key constraint enforces data integrity  
✅ Index improves query performance  
✅ App loads without errors  
✅ AI can create cross-year activities
