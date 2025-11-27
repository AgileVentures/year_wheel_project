-- Check what pages were created for your wheel
-- Replace 'Projektplan Anders Karlsson 2025' with your wheel title

SELECT 
  wp.id,
  wp.year,
  wp.page_order,
  wp.title,
  COUNT(i.id) as item_count,
  w.title as wheel_title
FROM wheel_pages wp
JOIN year_wheels w ON wp.wheel_id = w.id
LEFT JOIN items i ON i.page_id = wp.id
WHERE w.title ILIKE '%Projektplan Anders%'
GROUP BY wp.id, wp.year, wp.page_order, wp.title, w.title
ORDER BY wp.page_order;
