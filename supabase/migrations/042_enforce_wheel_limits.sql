-- Enforce wheel creation limits at the database level
DROP POLICY IF EXISTS "Users can create own wheels" ON public.year_wheels;

CREATE POLICY "Users can create own wheels"
  ON public.year_wheels FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_create_wheel(auth.uid())
  );
