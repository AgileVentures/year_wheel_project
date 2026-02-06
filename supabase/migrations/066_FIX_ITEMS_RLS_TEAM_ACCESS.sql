-- Migration: Fix Items RLS Policies for Team Member Access
-- Description: Update INSERT, UPDATE, DELETE policies for items to include team member access
-- Author: AI Assistant
-- Date: 2026-02-06

-- ============================================================================
-- Fix RLS policies for items table to allow team members full access
-- ============================================================================

-- Drop the old "manage" policy that only allowed wheel owners
DROP POLICY IF EXISTS "Users can manage items of own wheels" ON public.items;

-- Create separate policies for INSERT, UPDATE, DELETE that include team member access

-- INSERT: Allow wheel owners and team members to create items
CREATE POLICY "Users can create items for accessible wheels"
  ON public.items FOR INSERT
  WITH CHECK (
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

-- UPDATE: Allow wheel owners and team members to update items
CREATE POLICY "Users can update items for accessible wheels"
  ON public.items FOR UPDATE
  USING (
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

-- DELETE: Allow wheel owners and team members to delete items
CREATE POLICY "Users can delete items for accessible wheels"
  ON public.items FOR DELETE
  USING (
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

-- Check that all policies exist for items table
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'items'
AND schemaname = 'public'
ORDER BY cmd, policyname;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- After running this migration:
-- ✅ Team members can now create items in team wheels
-- ✅ Team members can now update items (including status) in team wheels
-- ✅ Team members can now delete items in team wheels
-- ✅ RLS policies properly enforce team membership for all operations
