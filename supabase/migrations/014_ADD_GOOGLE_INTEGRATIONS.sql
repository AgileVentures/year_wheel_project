-- =============================================
-- GOOGLE INTEGRATIONS - DATABASE SCHEMA
-- Version: 1.0
-- Date: October 11, 2025
-- =============================================
-- Adds support for connecting user accounts to Google Calendar and Google Sheets
-- Allows rings to sync data from external sources

-- =============================================
-- TABLE: user_integrations
-- Stores OAuth tokens and connection info per user
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'google_sheets', 'google')),
  access_token TEXT NOT NULL, -- Should be encrypted in production
  refresh_token TEXT, -- Should be encrypted in production
  token_expires_at TIMESTAMPTZ,
  scope TEXT[], -- OAuth scopes granted
  provider_user_id TEXT, -- Google user ID
  provider_user_email TEXT, -- Google user email
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

-- Index for faster lookups
CREATE INDEX idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON public.user_integrations(provider);

-- =============================================
-- TABLE: ring_integrations
-- Maps rings to external data sources
-- =============================================
CREATE TABLE IF NOT EXISTS public.ring_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ring_id UUID REFERENCES public.wheel_rings(id) ON DELETE CASCADE NOT NULL,
  user_integration_id UUID REFERENCES public.user_integrations(id) ON DELETE CASCADE NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('calendar', 'sheet')),
  config JSONB NOT NULL DEFAULT '{}', -- Store calendar_id, spreadsheet_id, sheet_name, etc.
  mapping_config JSONB DEFAULT '{}', -- How to map external data to items (field mappings)
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_frequency TEXT DEFAULT 'manual' CHECK (sync_frequency IN ('manual', 'hourly', 'daily')),
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'pending')),
  last_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT unique_ring_integration_type UNIQUE(ring_id, integration_type)
);

-- Indexes for faster lookups
CREATE INDEX idx_ring_integrations_ring_id ON public.ring_integrations(ring_id);
CREATE INDEX idx_ring_integrations_user_integration_id ON public.ring_integrations(user_integration_id);
CREATE INDEX idx_ring_integrations_sync_enabled ON public.ring_integrations(sync_enabled) WHERE sync_enabled = true;

-- =============================================
-- Add source tracking to items table
-- =============================================
-- Check if columns exist before adding them
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'items' 
                 AND column_name = 'source') THEN
    ALTER TABLE public.items ADD COLUMN source TEXT DEFAULT 'manual' 
      CHECK (source IN ('manual', 'google_calendar', 'google_sheets'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'items' 
                 AND column_name = 'external_id') THEN
    ALTER TABLE public.items ADD COLUMN external_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'items' 
                 AND column_name = 'sync_metadata') THEN
    ALTER TABLE public.items ADD COLUMN sync_metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Index for finding items by external source
CREATE INDEX IF NOT EXISTS idx_items_source ON public.items(source);
CREATE INDEX IF NOT EXISTS idx_items_external_id ON public.items(external_id) WHERE external_id IS NOT NULL;

-- =============================================
-- RLS POLICIES: user_integrations
-- Users can only see/manage their own integrations
-- =============================================
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own integrations
CREATE POLICY "Users can view own integrations"
  ON public.user_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own integrations
CREATE POLICY "Users can create own integrations"
  ON public.user_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own integrations
CREATE POLICY "Users can update own integrations"
  ON public.user_integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON public.user_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES: ring_integrations
-- Users can manage integrations for their own rings
-- =============================================
ALTER TABLE public.ring_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view integrations for their own rings
CREATE POLICY "Users can view ring integrations for own wheels"
  ON public.ring_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON wr.wheel_id = yw.id
      WHERE wr.id = ring_integrations.ring_id
      AND yw.user_id = auth.uid()
    )
  );

-- Policy: Users can create ring integrations for their own rings
CREATE POLICY "Users can create ring integrations for own wheels"
  ON public.ring_integrations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON wr.wheel_id = yw.id
      WHERE wr.id = ring_integrations.ring_id
      AND yw.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_integrations ui
      WHERE ui.id = ring_integrations.user_integration_id
      AND ui.user_id = auth.uid()
    )
  );

-- Policy: Users can update ring integrations for their own rings
CREATE POLICY "Users can update ring integrations for own wheels"
  ON public.ring_integrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON wr.wheel_id = yw.id
      WHERE wr.id = ring_integrations.ring_id
      AND yw.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON wr.wheel_id = yw.id
      WHERE wr.id = ring_integrations.ring_id
      AND yw.user_id = auth.uid()
    )
  );

-- Policy: Users can delete ring integrations for their own rings
CREATE POLICY "Users can delete ring integrations for own wheels"
  ON public.ring_integrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.wheel_rings wr
      JOIN public.year_wheels yw ON wr.wheel_id = yw.id
      WHERE wr.id = ring_integrations.ring_id
      AND yw.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTION: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS: Auto-update updated_at
-- =============================================
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ring_integrations_updated_at
  BEFORE UPDATE ON public.ring_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE public.user_integrations IS 'Stores OAuth credentials for external service integrations per user';
COMMENT ON TABLE public.ring_integrations IS 'Maps wheel rings to external data sources (Google Calendar, Google Sheets)';
COMMENT ON COLUMN public.items.source IS 'Indicates if item was created manually or synced from external source';
COMMENT ON COLUMN public.items.external_id IS 'External identifier for synced items (e.g., Google Calendar event ID)';
COMMENT ON COLUMN public.items.sync_metadata IS 'Additional metadata about the sync source and mapping';
