-- Migration 025: Fix affiliate conversions delete policy
-- Allow admins to delete conversions (needed for reset functionality)

-- Add DELETE policy for affiliate_conversions
CREATE POLICY "Admins can delete conversions" ON affiliate_conversions
  FOR DELETE USING (is_admin(auth.uid()));

-- Also add UPDATE policy for admins (for consistency)
CREATE POLICY "Admins can update conversions" ON affiliate_conversions
  FOR UPDATE USING (is_admin(auth.uid()));
