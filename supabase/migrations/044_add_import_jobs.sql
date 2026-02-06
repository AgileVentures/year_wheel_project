-- Create import_jobs table for background CSV import processing
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID NOT NULL REFERENCES year_wheels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job metadata
  file_name TEXT NOT NULL,
  import_mode TEXT NOT NULL CHECK (import_mode IN ('replace', 'append')),
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Progress details
  current_step TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  
  -- Results
  created_rings INTEGER DEFAULT 0,
  created_groups INTEGER DEFAULT 0,
  created_labels INTEGER DEFAULT 0,
  created_pages INTEGER DEFAULT 0,
  created_items INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Payload (stored for retry capability)
  payload JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own import jobs
CREATE POLICY "Users can read own import jobs"
  ON import_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create import jobs for their wheels
CREATE POLICY "Users can create import jobs for own wheels"
  ON import_jobs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM year_wheels
      WHERE year_wheels.id = wheel_id
      AND year_wheels.user_id = auth.uid()
    )
  );

-- Edge Functions can update any import job (service role)
CREATE POLICY "Service role can update import jobs"
  ON import_jobs FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_wheel_id ON import_jobs(wheel_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Enable realtime for import_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE import_jobs;

-- Add comment
COMMENT ON TABLE import_jobs IS 'Background job queue for CSV imports with progress tracking';
