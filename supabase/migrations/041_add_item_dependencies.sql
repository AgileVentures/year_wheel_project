-- Add dependency tracking columns to items table
ALTER TABLE items
ADD COLUMN depends_on_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
ADD COLUMN dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish')),
ADD COLUMN dependency_lag_days INTEGER DEFAULT 0;

-- Create index for faster dependency lookups
CREATE INDEX idx_items_depends_on ON items(depends_on_item_id) WHERE depends_on_item_id IS NOT NULL;

-- Function to detect circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency(item_id UUID, predecessor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  visited_ids UUID[] := ARRAY[item_id];
  current_id UUID := predecessor_id;
  next_id UUID;
BEGIN
  -- Follow the dependency chain
  WHILE current_id IS NOT NULL LOOP
    -- Check if we've looped back to the starting item
    IF current_id = item_id THEN
      RETURN TRUE; -- Circular dependency detected
    END IF;
    
    -- Check if we've already visited this node (loop in chain)
    IF current_id = ANY(visited_ids) THEN
      RETURN FALSE; -- Loop exists but doesn't include original item
    END IF;
    
    visited_ids := array_append(visited_ids, current_id);
    
    -- Get the next item in the chain
    SELECT depends_on_item_id INTO next_id
    FROM items
    WHERE id = current_id;
    
    current_id := next_id;
  END LOOP;
  
  RETURN FALSE; -- No circular dependency
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependencies()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.depends_on_item_id IS NOT NULL THEN
    -- Check if this creates a circular dependency
    IF check_circular_dependency(NEW.id, NEW.depends_on_item_id) THEN
      RAISE EXCEPTION 'Circular dependency detected: item % cannot depend on item % as it would create a cycle',
        NEW.id, NEW.depends_on_item_id;
    END IF;
    
    -- Prevent self-dependency
    IF NEW.id = NEW.depends_on_item_id THEN
      RAISE EXCEPTION 'Item cannot depend on itself';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_item_dependencies
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependencies();

-- Function to get all dependent items (recursive)
CREATE OR REPLACE FUNCTION get_dependent_items(root_item_id UUID)
RETURNS TABLE(item_id UUID, depth INTEGER) AS $$
WITH RECURSIVE dependents AS (
  -- Base case: direct dependents
  SELECT id, 1 as depth
  FROM items
  WHERE depends_on_item_id = root_item_id
  
  UNION
  
  -- Recursive case: dependents of dependents
  SELECT i.id, d.depth + 1
  FROM items i
  INNER JOIN dependents d ON i.depends_on_item_id = d.id
  WHERE d.depth < 10 -- Prevent infinite loops (max chain depth)
)
SELECT id as item_id, depth FROM dependents;
$$ LANGUAGE sql;

-- Comment the columns
COMMENT ON COLUMN items.depends_on_item_id IS 'ID of the predecessor item this item depends on';
COMMENT ON COLUMN items.dependency_type IS 'Type of dependency: finish_to_start (B starts when A ends), start_to_start (B starts when A starts), finish_to_finish (B finishes when A finishes)';
COMMENT ON COLUMN items.dependency_lag_days IS 'Number of days lag (buffer) between predecessor and dependent item';
