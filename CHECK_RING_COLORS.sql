-- Check what colors are stored in the database for your wheel's rings
SELECT 
  wr.name,
  wr.type,
  wr.color as stored_color,
  wr.visible,
  yw.colors as wheel_palette
FROM wheel_rings wr
JOIN year_wheels yw ON yw.id = wr.wheel_id
WHERE wr.wheel_id = '436bdd25-0838-44c8-9a79-b707cdc090fe'
ORDER BY wr.ring_order;
