-- Migration 022: Add Inter-Wheel Linking (Reference Links)
-- Description: Allows items to reference other wheels for informational purposes
-- Date: 2025-10-26
-- Author: System

-- Add linked_wheel_id and link_type columns to items table
ALTER TABLE items
ADD COLUMN linked_wheel_id UUID REFERENCES year_wheels(id) ON DELETE SET NULL,
ADD COLUMN link_type TEXT CHECK (link_type IN ('reference', 'dependency'));

-- Create index for efficient lookups of linked wheels
CREATE INDEX idx_items_linked_wheel_id ON items(linked_wheel_id);

-- Add comment for documentation
COMMENT ON COLUMN items.linked_wheel_id IS 'Reference to another wheel for drill-down navigation and context';
COMMENT ON COLUMN items.link_type IS 'Type of link: reference (informational) or dependency (future feature)';

-- Update RLS policies to ensure users can only link to wheels they have access to
-- This is already covered by existing wheel access policies, but we add a note

-- Helper function to validate wheel link access (optional, for future use)
CREATE OR REPLACE FUNCTION can_link_to_wheel(target_wheel_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- Check if user has access to the target wheel
  -- Either owns it, is team member, or it's public
  SELECT EXISTS (
    SELECT 1 FROM year_wheels w
    LEFT JOIN team_members tm ON w.team_id = tm.team_id
    WHERE w.id = target_wheel_id
    AND (
      w.user_id = user_id
      OR tm.user_id = user_id
      OR w.is_public = true
    )
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_link_to_wheel(UUID, UUID) TO authenticated;

-- Add note about circular reference prevention
-- Circular references should be prevented at application level
-- Example: Wheel A -> Wheel B -> Wheel A (infinite loop)
-- Application should check depth before allowing link creation
