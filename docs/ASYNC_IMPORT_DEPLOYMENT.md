# Async Import System - Deployment Instructions

## ✅ Completed Implementation

### 1. Backend (Edge Function)
- **File**: `supabase/functions/batch-import-activities/index.ts`
- **Status**: ✅ Deployed to production
- **Changes**:
  - Creates `import_jobs` record immediately, returns job ID
  - Processes import in background with progress updates
  - Sends completion email when finished
  - Updates job status and progress every step

### 2. Database Migration
- **File**: `supabase/migrations/026_add_import_jobs.sql`
- **Status**: ⚠️ Needs manual deployment
- **Contents**:
  - `import_jobs` table with status, progress, error tracking
  - RLS policies (users read own, service role updates all)
  - Realtime enabled for progress updates
  - Indexes for performance

### 3. Frontend Hook
- **File**: `src/hooks/useImportProgress.js`
- **Status**: ✅ Committed
- **Features**:
  - Subscribes to realtime updates for specific job ID
  - Returns progress, status, currentStep, error
  - Auto-cleanup on unmount

### 4. UI Updates
- **File**: `src/components/SmartImportModal.jsx`
- **Status**: ✅ Committed
- **Changes**:
  - Uses `useImportProgress` hook
  - Shows progress bar with percentage
  - Displays current step message
  - Shows stats preview (rings, groups, pages created)
  - Triggers `onImportComplete` when job finishes

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration

Run this SQL in Supabase Dashboard → SQL Editor:

\`\`\`sql
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
\`\`\`

### Step 2: Deploy Frontend

\`\`\`bash
# Already committed - just deploy to production
git push origin main
# Then deploy via Netlify (automatic) or manual build
\`\`\`

## 🧪 Testing

### Test Script
1. Upload CSV with 50+ items
2. Click "Importera"
3. **Expected behavior**:
   - Modal immediately shows "Import startad"
   - Progress bar appears and updates in real-time
   - Current step message changes ("Skapar ringar...", "Bearbetar sida 1/3...")
   - Stats preview shows created counts
   - When complete, modal shows "Import klar!" and closes
   - Wheel data reloads automatically

### Verify in Supabase Dashboard
- Go to Database → import_jobs table
- Check recent records show `status = 'completed'`
- Verify `progress = 100`
- Check `created_rings`, `created_groups`, `created_items` counts

### Verify Realtime
- Open browser console during import
- Should see: `[useImportProgress] Realtime update:` messages
- Progress should update without page refresh

## 📊 Architecture Overview

\`\`\`
User uploads CSV
     ↓
Smart analysis (AI)
     ↓
User clicks "Importera"
     ↓
Frontend: POST /batch-import-activities
     ↓
Edge Function: Create job record → Return job ID (200ms)
     ↓                              ↓
Frontend receives job ID     Background processor starts
     ↓                              ↓
useImportProgress hook         Updates job every step:
subscribes to job updates      - Status: processing
     ↓                         - Progress: 10%, 20%, 30%...
Realtime updates received      - Current step message
     ↓                         - Created counts
Progress bar moves             ↓
Current step updates      Job completes (status = 'completed')
     ↓                              ↓
Job completion detected        Email sent (if large import)
     ↓
onImportComplete() called
     ↓
Wheel data reloaded
     ↓
Modal shows "Import klar!"
\`\`\`

## 🔍 Debugging

### If progress bar doesn't update:
1. Check browser console for realtime subscription status
2. Verify import_jobs table has realtime enabled: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
3. Check RLS policies allow reading own jobs

### If job stays in 'pending':
1. Check Edge Function logs: Supabase Dashboard → Functions → batch-import-activities → Logs
2. Look for `[ProcessJob]` messages
3. Verify service role key is set in Edge Function secrets

### If email doesn't send:
1. Email only works in production (RESEND_API_KEY must be set)
2. Check Edge Function secrets have RESEND_API_KEY configured
3. Verify email in logs: `[Email] Send failed:` or `[Email] RESEND_API_KEY not configured`

## 📝 Notes

- **Performance**: Job processing runs async, so UI stays responsive
- **Large imports**: Email notification sent automatically for 200+ items
- **Error handling**: Failed jobs show error in UI, details stored in database
- **Retry**: Job payload stored in database (future: add retry button)
- **Realtime**: Uses Supabase Realtime (WebSocket) for instant updates

## ⚠️ Known Limitations

1. **Single concurrent job per user**: If user starts another import, previous job subscription is replaced
2. **No retry mechanism**: Failed jobs must be re-imported manually
3. **No job queue limit**: Users can create unlimited pending jobs (could add limit in future)
4. **Email production-only**: localhost testing won't send emails (RESEND_API_KEY not configured locally)

## 🎯 Future Enhancements

- [ ] Job queue management UI (view all jobs, retry failed)
- [ ] Concurrent job limit per user (e.g., max 3 pending)
- [ ] Job expiration (auto-delete completed jobs after 7 days)
- [ ] Pause/resume capability for very large imports
- [ ] Estimated time remaining calculation
- [ ] Progress sub-steps (e.g., "Item 45/200")
