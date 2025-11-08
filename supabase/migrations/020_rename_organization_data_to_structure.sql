-- Migration: Rename wheel_pages.organization_data to structure and normalize content
-- Generated: 2025-11-08
--
-- This migration performs three steps:
-- 1. Rename the JSONB column to `structure`
-- 2. Remove embedded `items` arrays from the new column (items now live in the items table)
-- 3. Update helper functions/procedures that referenced `organization_data`
--
-- NOTE: Run this migration during a maintenance window as it rewrites the full
--       wheel_pages table. The rewrite is required to remove nested item data.
-- ---------------------------------------------------------------------------

BEGIN;

-- 1) Rename column
ALTER TABLE wheel_pages
  RENAME COLUMN organization_data TO structure;

-- 2) Normalize existing data: drop embedded `items` arrays
UPDATE wheel_pages
SET structure = jsonb_strip_nulls(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        structure,
        '{rings}',
        COALESCE(structure->'rings', '[]'::jsonb)
      ),
      '{activityGroups}',
      COALESCE(structure->'activityGroups', '[]'::jsonb)
    ),
    '{labels}',
    COALESCE(structure->'labels', '[]'::jsonb)
  ) - 'items'
)
WHERE structure IS NOT NULL;

-- 3) Update helper function duplicate_wheel_page to reflect new column name
CREATE OR REPLACE FUNCTION duplicate_wheel_page(p_page_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_page wheel_pages%ROWTYPE;
  v_new_page wheel_pages%ROWTYPE;
BEGIN
  SELECT * INTO v_source_page
  FROM wheel_pages
  WHERE id = p_page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page with id % not found', p_page_id;
  END IF;

  INSERT INTO wheel_pages (
    wheel_id,
    page_order,
    year,
    title,
    structure,
    override_colors,
    override_show_week_ring,
    override_show_month_ring,
    override_show_ring_names
  )
  VALUES (
    v_source_page.wheel_id,
    v_source_page.page_order + 1,
    (v_source_page.year + 1),
    COALESCE(v_source_page.title, 'Ny sida') || ' (kopia)',
    v_source_page.structure,
    v_source_page.override_colors,
    v_source_page.override_show_week_ring,
    v_source_page.override_show_month_ring,
    v_source_page.override_show_ring_names
  )
  RETURNING * INTO v_new_page;

  RETURN v_new_page.id;
END;
$$;

COMMIT;
