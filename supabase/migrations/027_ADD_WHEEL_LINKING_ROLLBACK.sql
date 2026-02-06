-- Migration 022 Rollback: Remove Inter-Wheel Linking
-- Description: Reverts the wheel linking feature
-- Date: 2025-10-26

-- Drop the helper function
DROP FUNCTION IF EXISTS can_link_to_wheel(UUID, UUID);

-- Drop the index
DROP INDEX IF EXISTS idx_items_linked_wheel_id;

-- Remove columns from items table
ALTER TABLE items
DROP COLUMN IF EXISTS link_type,
DROP COLUMN IF EXISTS linked_wheel_id;
