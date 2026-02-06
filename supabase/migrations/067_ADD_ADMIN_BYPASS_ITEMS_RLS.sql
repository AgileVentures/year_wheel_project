-- Migration: Add Admin Bypass to Items RLS Policies
-- Description: Allow admins to update/delete any items regardless of ownership
-- Author: AI Assistant
-- Date: 2026-02-06

-- ============================================================================
-- Drop existing policies and recreate with admin bypass
-- ============================================================================

-- Drop all existing items policies
DROP POLICY IF EXISTS "Users can manage items of own wheels" ON public.items;
DROP POLICY IF EXISTS "Users can view items of accessible wheels" ON public.items;
DROP POLICY IF EXISTS "Users can view items for accessible wheels" ON public.items;
DROP POLICY IF EXISTS "Users can create items for accessible wheels" ON public.items;
DROP POLICY IF EXISTS "Users can update items for accessible wheels" ON public.items;
DROP POLICY IF EXISTS "Users can delete items for accessible wheels" ON public.items;
DROP POLICY IF EXISTS "Users can insert items for their wheels and team wheels" ON public.items;
DROP POLICY IF EXISTS "Users can update items for their wheels and team wheels" ON public.items;
DROP POLICY IF EXISTS "Users can delete items for their wheels and team wheels" ON public.items;

-- SELECT: Users can view items they have access to
CREATE POLICY "items_select_policy"
  ON public.items FOR SELECT
  USING (
    -- Admin can see all items
    is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR year_wheels.is_public = TRUE
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- INSERT: Users can create items for their wheels or team wheels
CREATE POLICY "items_insert_policy"
  ON public.items FOR INSERT
  WITH CHECK (
    -- Admin can create items in any wheel
    is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- UPDATE: Users can update items for their wheels or team wheels
CREATE POLICY "items_update_policy"
  ON public.items FOR UPDATE
  USING (
    -- Admin can update any item
    is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    -- Admin can update any item
    is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- DELETE: Users can delete items for their wheels or team wheels
CREATE POLICY "items_delete_policy"
  ON public.items FOR DELETE
  USING (
    -- Admin can delete any item
    is_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.year_wheels
      WHERE year_wheels.id = items.wheel_id
      AND (
        year_wheels.user_id = auth.uid()
        OR (
          year_wheels.team_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = year_wheels.team_id
            AND team_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'items' 
AND schemaname = 'public'
ORDER BY cmd;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- After running this migration:
-- ✅ Admins can view/create/update/delete any items
-- ✅ Wheel owners can manage their own items
-- ✅ Team members can manage items in team wheels
-- ✅ Public wheel items are viewable by anyone
