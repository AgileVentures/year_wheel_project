-- Update all public template wheels to 2027 and give each one a 2028 page.
-- Existing schedules are shifted by the same number of years as the wheel.
-- The copied 2028 schedules share cross_year_group_id with their 2027 items.

BEGIN;

-- Ensure the cross-year identifier is available even on databases that have not
-- yet applied migration 053.
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS cross_year_group_id UUID DEFAULT NULL;

CREATE TEMP TABLE template_wheel_shift ON COMMIT DROP AS
SELECT
  id AS wheel_id,
  year AS old_wheel_year,
  2027 - year AS year_offset
FROM public.year_wheels
WHERE is_template = TRUE;

-- Keep existing relative page offsets, with the first year becoming 2027.
CREATE TEMP TABLE template_page_shift ON COMMIT DROP AS
SELECT
  wp.id AS page_id,
  wp.wheel_id,
  wp.year AS old_page_year,
  wp.year + tws.year_offset AS new_page_year
FROM public.wheel_pages wp
JOIN template_wheel_shift tws ON tws.wheel_id = wp.wheel_id;

UPDATE public.year_wheels yw
SET
  year = 2027,
  title = replace(yw.title, tws.old_wheel_year::text, '2027'),
  updated_at = now()
FROM template_wheel_shift tws
WHERE yw.id = tws.wheel_id;

UPDATE public.wheel_pages wp
SET
  year = tps.new_page_year,
  title = replace(wp.title, tps.old_page_year::text, tps.new_page_year::text),
  updated_at = now()
FROM template_page_shift tps
WHERE wp.id = tps.page_id;

-- Move all existing template activities with their wheel. Page ownership is
-- reassigned from the shifted start-date year after the dates are updated.
UPDATE public.items i
SET
  start_date = (i.start_date + make_interval(years => tws.year_offset))::date,
  end_date = (i.end_date + make_interval(years => tws.year_offset))::date,
  updated_at = now()
FROM template_wheel_shift tws
WHERE i.wheel_id = tws.wheel_id;

-- Select the first 2027 page for each template as the source for a new 2028
-- page. Templates that already have a 2028 page are left unchanged.
CREATE TEMP TABLE template_primary_pages ON COMMIT DROP AS
SELECT DISTINCT ON (wp.wheel_id)
  wp.wheel_id,
  wp.id AS source_page_id,
  wp.page_order AS source_page_order
FROM public.wheel_pages wp
JOIN template_wheel_shift tws ON tws.wheel_id = wp.wheel_id
WHERE wp.year = 2027
ORDER BY wp.wheel_id, wp.page_order;

CREATE TEMP TABLE template_new_pages (
  wheel_id UUID PRIMARY KEY,
  source_page_id UUID NOT NULL,
  page_order INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO template_new_pages (wheel_id, source_page_id, page_order)
SELECT
  tpp.wheel_id,
  tpp.source_page_id,
  COALESCE((
    SELECT MAX(wp.page_order)
    FROM public.wheel_pages wp
    WHERE wp.wheel_id = tpp.wheel_id
  ), 0) + 1
FROM template_primary_pages tpp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.wheel_pages wp
  WHERE wp.wheel_id = tpp.wheel_id
    AND wp.year = 2028
);

INSERT INTO public.wheel_pages (
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
SELECT
  tnp.wheel_id,
  tnp.page_order,
  2028,
  CASE
    WHEN spp.title IS NULL THEN '2028'
    WHEN position('2027' IN spp.title) > 0 THEN replace(spp.title, '2027', '2028')
    ELSE spp.title || ' 2028'
  END,
  spp.structure,
  spp.override_colors,
  spp.override_show_week_ring,
  spp.override_show_month_ring,
  spp.override_show_ring_names
FROM template_new_pages tnp
JOIN public.wheel_pages spp ON spp.id = tnp.source_page_id;

-- Reassign items after pages exist so activities shifted into 2028 can use
-- either an existing page or the newly created page.
UPDATE public.items i
SET page_id = COALESCE(
  (
    SELECT wp.id
    FROM public.wheel_pages wp
    WHERE wp.wheel_id = i.wheel_id
      AND wp.year = EXTRACT(YEAR FROM i.start_date)::integer
    ORDER BY wp.page_order
    LIMIT 1
  ),
  i.page_id
)
FROM template_wheel_shift tws
WHERE i.wheel_id = tws.wheel_id;

-- Mark original items as cross-year groups before copying them to 2028.
UPDATE public.items i
SET cross_year_group_id = gen_random_uuid()
FROM template_new_pages tnp
WHERE i.page_id = tnp.source_page_id
  AND i.cross_year_group_id IS NULL;

-- Copy the 2027 template schedule to 2028. Copies are manual template items,
-- not external integration records, and are linked to their 2027 counterpart.
INSERT INTO public.items (
  wheel_id,
  page_id,
  ring_id,
  activity_id,
  label_id,
  name,
  start_date,
  end_date,
  time,
  description,
  status,
  depends_on_item_id,
  dependency_type,
  dependency_lag_days,
  source,
  external_id,
  sync_metadata,
  cross_year_group_id,
  linked_wheel_id,
  link_type
)
SELECT
  i.wheel_id,
  new_page.id,
  i.ring_id,
  i.activity_id,
  i.label_id,
  i.name,
  (i.start_date + INTERVAL '1 year')::date,
  (i.end_date + INTERVAL '1 year')::date,
  i.time,
  i.description,
  i.status,
  NULL,
  i.dependency_type,
  i.dependency_lag_days,
  'manual',
  NULL,
  COALESCE(i.sync_metadata, '{}'::jsonb)
    || jsonb_build_object('template_2028_copy_of', i.id),
  i.cross_year_group_id,
  i.linked_wheel_id,
  i.link_type
FROM template_new_pages tnp
JOIN public.wheel_pages new_page
  ON new_page.wheel_id = tnp.wheel_id
 AND new_page.page_order = tnp.page_order
 AND new_page.year = 2028
JOIN public.items i ON i.page_id = tnp.source_page_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.items existing
  WHERE existing.page_id = new_page.id
    AND existing.sync_metadata->>'template_2028_copy_of' = i.id::text
);

COMMIT;

-- Verification:
-- SELECT yw.title, yw.year, count(wp.id) AS page_count,
--        array_agg(wp.year ORDER BY wp.page_order) AS page_years
-- FROM public.year_wheels yw
-- LEFT JOIN public.wheel_pages wp ON wp.wheel_id = yw.id
-- WHERE yw.is_template = TRUE
-- GROUP BY yw.id, yw.title, yw.year
-- ORDER BY yw.title;
