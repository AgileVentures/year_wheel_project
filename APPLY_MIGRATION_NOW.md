# 🚨 URGENT: Apply Database Migration

## The Problem
The newsletter manager is trying to query the `is_draft` column which doesn't exist yet in your production database.

## The Solution
Run this SQL in your Supabase SQL Editor NOW:

### Step 1: Open Supabase SQL Editor
https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/sql/new

### Step 2: Copy and paste this entire SQL script:

```sql
-- Add new columns for template reuse (if they don't exist)
DO $$ 
BEGIN
  -- Add template_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_sends' 
    AND column_name = 'template_type'
  ) THEN
    ALTER TABLE newsletter_sends 
    ADD COLUMN template_type TEXT CHECK (template_type IN ('newsletter', 'feature', 'tips', 'announcement'));
  END IF;

  -- Add template_data column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_sends' 
    AND column_name = 'template_data'
  ) THEN
    ALTER TABLE newsletter_sends 
    ADD COLUMN template_data JSONB;
  END IF;

  -- Add is_draft column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_sends' 
    AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE newsletter_sends 
    ADD COLUMN is_draft BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN newsletter_sends.template_data IS 'JSONB storage of template form data for reuse';
COMMENT ON COLUMN newsletter_sends.is_draft IS 'True if saved as draft, false if actually sent';
```

### Step 3: Click "Run" (or press Cmd/Ctrl + Enter)

### Step 4: Refresh your newsletter manager page

That's it! The errors will disappear and the draft functionality will work.
