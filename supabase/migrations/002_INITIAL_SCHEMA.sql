-- =============================================
-- YEAR WHEEL DATABASE - INITIAL SCHEMA
-- Version: 1.0
-- Date: October 8, 2025
-- =============================================
-- This is the foundational schema based on SUPABASE_SETUP.md
-- Later migrations build on top of this base structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: year_wheels
-- Main wheel configurations
-- =============================================
CREATE TABLE IF NOT EXISTS public.year_wheels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Organisation',
  year INTEGER NOT NULL,
  colors JSONB NOT NULL DEFAULT '["#334155", "#475569", "#64748B", "#94A3B8"]',
  show_week_ring BOOLEAN NOT NULL DEFAULT TRUE,
  show_month_ring BOOLEAN NOT NULL DEFAULT TRUE,
  show_ring_names BOOLEAN NOT NULL DEFAULT TRUE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT year_valid CHECK (year >= 1900 AND year <= 2100),
  CONSTRAINT title_length CHECK (char_length(title) > 0 AND char_length(title) <= 200)
);

-- =============================================
-- TABLE: wheel_rings
-- Ring configurations (inner/outer)
-- =============================================
CREATE TABLE IF NOT EXISTS public.wheel_rings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.year_wheels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Ring',
  type TEXT NOT NULL CHECK (type IN ('inner', 'outer')),
  color TEXT,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  ring_order INTEGER NOT NULL,
  orientation TEXT CHECK (orientation IN ('vertical', 'horizontal')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  CONSTRAINT valid_color CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- TABLE: ring_data
-- Month-specific data for inner rings
-- =============================================
CREATE TABLE IF NOT EXISTS public.ring_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ring_id UUID REFERENCES public.wheel_rings(id) ON DELETE CASCADE NOT NULL,
  month_index INTEGER NOT NULL,
  content TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT month_index_valid CHECK (month_index >= 0 AND month_index < 12),
  CONSTRAINT unique_ring_month UNIQUE(ring_id, month_index)
);

-- =============================================
-- TABLE: activity_groups
-- Activity categories with colors
-- =============================================
CREATE TABLE IF NOT EXISTS public.activity_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.year_wheels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- TABLE: labels
-- Optional labels for activities
-- =============================================
CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.year_wheels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- TABLE: items
-- Activities/events on the wheel
-- =============================================
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.year_wheels(id) ON DELETE CASCADE NOT NULL,
  ring_id UUID REFERENCES public.wheel_rings(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.activity_groups(id) ON DELETE CASCADE NOT NULL,
  label_id UUID REFERENCES public.labels(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  time TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT name_length CHECK (char_length(name) > 0 AND char_length(name) <= 200),
  CONSTRAINT date_order CHECK (end_date >= start_date)
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_year_wheels_user_id ON public.year_wheels(user_id);
CREATE INDEX IF NOT EXISTS idx_year_wheels_share_token ON public.year_wheels(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_year_wheels_is_public ON public.year_wheels(is_public) WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_wheel_rings_wheel_id ON public.wheel_rings(wheel_id);
CREATE INDEX IF NOT EXISTS idx_ring_data_ring_id ON public.ring_data(ring_id);
CREATE INDEX IF NOT EXISTS idx_activity_groups_wheel_id ON public.activity_groups(wheel_id);
CREATE INDEX IF NOT EXISTS idx_labels_wheel_id ON public.labels(wheel_id);
CREATE INDEX IF NOT EXISTS idx_items_wheel_id ON public.items(wheel_id);
CREATE INDEX IF NOT EXISTS idx_items_ring_id ON public.items(ring_id);
CREATE INDEX IF NOT EXISTS idx_items_activity_id ON public.items(activity_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.year_wheels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_rings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ring_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: year_wheels
-- =============================================
DROP POLICY IF EXISTS "Users can view own or public wheels" ON public.year_wheels;
CREATE POLICY "Users can view own or public wheels"
  ON public.year_wheels FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "Users can create own wheels" ON public.year_wheels;
CREATE POLICY "Users can create own wheels"
  ON public.year_wheels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wheels" ON public.year_wheels;
CREATE POLICY "Users can update own wheels"
  ON public.year_wheels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wheels" ON public.year_wheels;
CREATE POLICY "Users can delete own wheels"
  ON public.year_wheels FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES: wheel_rings
-- =============================================
DROP POLICY IF EXISTS "Users can view rings of accessible wheels" ON public.wheel_rings;
CREATE POLICY "Users can view rings of accessible wheels"
  ON public.wheel_rings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = wheel_rings.wheel_id 
      AND (user_id = auth.uid() OR is_public = TRUE)
    )
  );

DROP POLICY IF EXISTS "Users can manage rings of own wheels" ON public.wheel_rings;
CREATE POLICY "Users can manage rings of own wheels"
  ON public.wheel_rings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = wheel_rings.wheel_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = wheel_rings.wheel_id 
      AND user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: ring_data
-- =============================================
DROP POLICY IF EXISTS "Users can view ring_data of accessible wheels" ON public.ring_data;
CREATE POLICY "Users can view ring_data of accessible wheels"
  ON public.ring_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON yw.id = wr.wheel_id
      WHERE wr.id = ring_data.ring_id 
      AND (yw.user_id = auth.uid() OR yw.is_public = TRUE)
    )
  );

DROP POLICY IF EXISTS "Users can manage ring_data of own wheels" ON public.ring_data;
CREATE POLICY "Users can manage ring_data of own wheels"
  ON public.ring_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON yw.id = wr.wheel_id
      WHERE wr.id = ring_data.ring_id 
      AND yw.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON yw.id = wr.wheel_id
      WHERE wr.id = ring_data.ring_id 
      AND yw.user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: activity_groups
-- =============================================
DROP POLICY IF EXISTS "Users can view activity_groups of accessible wheels" ON public.activity_groups;
CREATE POLICY "Users can view activity_groups of accessible wheels"
  ON public.activity_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = activity_groups.wheel_id 
      AND (user_id = auth.uid() OR is_public = TRUE)
    )
  );

DROP POLICY IF EXISTS "Users can manage activity_groups of own wheels" ON public.activity_groups;
CREATE POLICY "Users can manage activity_groups of own wheels"
  ON public.activity_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = activity_groups.wheel_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = activity_groups.wheel_id 
      AND user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: labels
-- =============================================
DROP POLICY IF EXISTS "Users can view labels of accessible wheels" ON public.labels;
CREATE POLICY "Users can view labels of accessible wheels"
  ON public.labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = labels.wheel_id 
      AND (user_id = auth.uid() OR is_public = TRUE)
    )
  );

DROP POLICY IF EXISTS "Users can manage labels of own wheels" ON public.labels;
CREATE POLICY "Users can manage labels of own wheels"
  ON public.labels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = labels.wheel_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = labels.wheel_id 
      AND user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: items
-- =============================================
DROP POLICY IF EXISTS "Users can view items of accessible wheels" ON public.items;
CREATE POLICY "Users can view items of accessible wheels"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = items.wheel_id 
      AND (user_id = auth.uid() OR is_public = TRUE)
    )
  );

DROP POLICY IF EXISTS "Users can manage items of own wheels" ON public.items;
CREATE POLICY "Users can manage items of own wheels"
  ON public.items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = items.wheel_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.year_wheels 
      WHERE id = items.wheel_id 
      AND user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS: Auto-update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.year_wheels;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.year_wheels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.items;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- FUNCTION: Generate share token
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.year_wheels IS 'Main year wheel configurations';
COMMENT ON TABLE public.wheel_rings IS 'Ring configurations (inner/outer bands)';
COMMENT ON TABLE public.ring_data IS 'Month-specific content for inner rings';
COMMENT ON TABLE public.activity_groups IS 'Activity categories with colors';
COMMENT ON TABLE public.labels IS 'Optional labels for activities';
COMMENT ON TABLE public.items IS 'Activities/events placed on the wheel';
