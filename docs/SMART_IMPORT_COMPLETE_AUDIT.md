# Smart Import - Complete Flow Audit & Problem Analysis

## Executive Summary

**Current Status**: Broken async implementation causing 401 Unauthorized errors
**Root Cause**: Mismatch between async architecture design and Edge Function execution model
**Impact**: Large CSV imports (1900+ items) fail completely, no imports working
**Recommended Solution**: Revert to optimized synchronous import OR fix auth + implement proper job queue

---

## Complete User Flow (As Designed)

### 1. Upload Stage
**User Action**: Click "Välj CSV-fil" → Select file
**What Happens**:
- `handleFileUpload()` reads file with XLSX library
- Parses to JSON array (headers + rows)
- Validates minimum 2 rows (header + data)
- **Stage transition**: `upload` → `confirm-delete`

**Current Issues**: ✅ Works correctly

---

### 2. Confirmation Stage  
**User Action**: Choose import mode (Replace/Append) → Click "Fortsätt till AI-analys"
**What Happens**:
- User sees warning about data deletion (if replace mode)
- Stores import mode preference
- **Stage transition**: `confirm-delete` → `analyzing`
- Calls `analyzeWithAI()`

**Current Issues**: ✅ Works correctly

---

### 3. AI Analysis Stage
**User Action**: Wait for AI processing
**What Happens**:
1. Frontend calls `smart-csv-import` Edge Function with:
   - CSV structure (headers, sample rows)
   - ALL rows for server-side processing
   - Wheel context (wheelId, currentPageId)

2. Edge Function uses GPT-4 to:
   - Detect column purposes (activity name, dates, categories)
   - Propose ring structure (inner/outer organization)
   - Propose activity groups (color-coded categories)
   - Detect people/emails for team invitations
   - Generate mapping rules for ALL rows
   - Check data suitability (detects problematic patterns like all items spanning full year)

3. Returns AI suggestions:
   ```javascript
   {
     rings: [{ name, type, orientation }],
     activityGroups: [{ name, color }],
     labels: [{ name, color }],
     mapping: { columns, explanation },
     activities: [...mapped items...],
     detectedPeople: [{ name, email }],
     suitabilityWarning: { severity, message, suggestions }
   }
   ```

4. **Stage transition**: `analyzing` → `review`

**Current Issues**: ✅ Works correctly (smart-csv-import uses correct auth pattern)

---

### 4. Review Stage
**User Action**: Review AI suggestions, optionally edit mappings → Click "Importera"
**What Happens**:
1. User sees:
   - Proposed rings (editable)
   - Proposed activity groups (editable)  
   - Column mappings (can override via "Avancerade mappningar")
   - Preview of first few activities
   - Detected team members to invite

2. User can customize:
   - Ring names and types (inner/outer)
   - Activity group names
   - Column mappings (manual override)
   - Which team members to invite

3. Clicks "Importera" → calls `handleImport()`

**Current Issues**: ✅ UI works correctly, but import fails

---

### 5. Import Stage (BROKEN)
**User Action**: Wait for import completion
**What Should Happen** (Async Design):
1. Frontend calls `batch-import-activities` Edge Function
2. Edge Function creates `import_jobs` record immediately
3. Returns job ID within ~1-2 seconds
4. Background processor runs:
   - Delete old data (if replace mode)
   - Insert rings (upsert by name)
   - Insert activity groups (upsert by name)
   - Insert labels (upsert by name)
   - Create pages by year
   - Insert items in batches (100 at a time)
   - Update progress every step
5. Frontend subscribes to realtime updates via `useImportProgress` hook
6. Progress bar shows 0% → 100% with live status messages
7. **Stage transition**: `importing` → `complete`

**What's Actually Happening** (BROKEN):
1. Frontend calls `batch-import-activities` with correct Authorization header
2. Edge Function receives request
3. **AUTH FAILS**: Returns 401 Unauthorized
4. No job created, no import happens
5. Frontend shows error

**Root Causes**:
- ❌ **Auth pattern mismatch**: Despite copying from working `smart-csv-import`, auth still fails
- ❌ **Deployment cache**: New code deployed but may not be live yet (CDN propagation)
- ❌ **Async execution model**: Deno Edge Functions may not support `setTimeout()` detachment properly
- ❌ **Missing service role key**: `SUPABASE_SERVICE_ROLE_KEY` may not be set in Edge Function secrets

---

## Technical Architecture Analysis

### Frontend Components

#### SmartImportModal.jsx (1655 lines)
**Purpose**: Main UI orchestration
**Key Functions**:
- `handleFileUpload()` - Parse CSV
- `analyzeWithAI()` - Call AI analysis
- `handleImport()` - Trigger import
- `useEffect()` - Monitor job completion

**State Management**:
```javascript
stage: 'upload' | 'confirm-delete' | 'analyzing' | 'review' | 'importing' | 'complete'
csvData: { headers, rows, fileName, rowCount }
aiSuggestions: { rings, activityGroups, labels, mapping, activities }
jobId: UUID (for async tracking)
importJobProgress: { status, progress, currentStep, stats }
```

#### useImportProgress Hook
**Purpose**: Subscribe to realtime job updates
**Implementation**:
```javascript
- Fetches initial job state
- Subscribes to `import_jobs` table changes
- Returns: { status, progress, currentStep, isComplete, isFailed, stats }
```

**Issues**:
- ✅ Subscription logic correct
- ⚠️ Never receives data because job never created (auth fails)

---

### Backend Edge Functions

#### smart-csv-import (WORKING)
**Auth Pattern**:
```typescript
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { global: { headers: { Authorization: req.headers.get('Authorization')! }}}
)
const { data: { user }, error } = await supabase.auth.getUser()
```
✅ This works perfectly

#### batch-import-activities (BROKEN)
**Current Auth Pattern** (matches smart-csv-import):
```typescript
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { global: { headers: { Authorization: req.headers.get('Authorization')! }}}
)
const { data: { user }, error } = await supabase.auth.getUser()
```
❌ Returns 401 Unauthorized despite identical pattern

**Possible Causes**:
1. Code not actually deployed (CDN cache)
2. Different Supabase client version
3. Authorization header not being passed correctly
4. Function deployed to wrong project
5. Service role key needed for job creation but not configured

---

### Database Schema

#### import_jobs Table (Created via Migration 026)
```sql
id UUID PRIMARY KEY
wheel_id UUID FK
user_id UUID FK
file_name TEXT
import_mode TEXT ('replace' | 'append')
status TEXT ('pending' | 'processing' | 'completed' | 'failed')
progress INTEGER (0-100)
current_step TEXT
total_items INTEGER
processed_items INTEGER
created_rings, created_groups, created_labels, created_pages, created_items INTEGER
error_message TEXT
error_details JSONB
payload JSONB (stores full import data for retry)
created_at, started_at, completed_at TIMESTAMPTZ
```

**RLS Policies**:
- Users can read own jobs
- Users can create jobs for own wheels
- Service role can update any job

**Realtime**: ✅ Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE import_jobs`

---

## Problem Summary & Root Causes

### Problem 1: 504 Timeout (Initial Issue)
**Symptom**: Edge Function times out after 160 seconds
**Cause**: Old synchronous code trying to process 1900 items before responding
**Status**: ✅ FIXED by async implementation

### Problem 2: 401 Unauthorized (Current Issue)
**Symptom**: Edge Function immediately returns `{"error":"Unauthorized"}`
**Possible Causes**:
1. **Deployment not live**: CDN cache holding old version
2. **Missing env var**: `SUPABASE_SERVICE_ROLE_KEY` not set (needed for job creation)
3. **Auth header issue**: Despite matching working pattern, something differs
4. **Wrong auth check location**: Checking auth before function secrets available

**Evidence**:
- ✅ Authorization header IS sent (visible in Supabase logs)
- ✅ Same auth pattern as working `smart-csv-import`
- ❌ Still returns 401

### Problem 3: Async Execution Model
**Issue**: `setTimeout()` may not work as expected in Deno Edge Functions
**Impact**: Background job may not run even if auth fixed
**Alternative**: Use Supabase Edge Functions' built-in background job support OR queue system

---

## UX Analysis

### Current User Experience (Broken)
1. ✅ Upload CSV - Clear, simple
2. ✅ Choose replace/append - Good explanation
3. ✅ AI analysis - Nice loading state, clear results
4. ✅ Review suggestions - Good preview, editable
5. ❌ **Import fails with technical error**
6. ❌ **No progress feedback**
7. ❌ **User has to start over**

### Desired User Experience
1. Upload CSV - ✅ Already good
2. Choose mode - ✅ Already good  
3. AI analysis (10-30s) - ✅ Already good
4. Review - ✅ Already good
5. **Import progress (2-5 min for 1900 items)**:
   - Immediate feedback: "Import startad!"
   - Live progress bar: 0% → 100%
   - Status updates: "Skapar ringar... (20%)" → "Bearbetar sida 1/3... (45%)" → etc.
   - Stats preview: "✓ 3 ringar ✓ 39 grupper ✓ 1234/1929 aktiviteter"
6. Completion:
   - Success message with stats
   - Auto-reload wheel data
   - Email notification (for large imports)

### UX Improvements Needed
1. **Better error messages** - No technical jargon like "401 Unauthorized"
2. **Retry mechanism** - Don't make users re-upload and re-analyze
3. **Progress estimation** - "Ungefär 3 minuter kvar..."
4. **Cancellation** - Let users cancel long-running imports
5. **Background mode** - "Import pågår i bakgrunden, du kan stänga detta fönster"
6. **Better suitability warnings** - More prominent, clearer guidance

---

## Recommended Solutions

### Option A: Fix Async Implementation (Complex, Better Long-term)
**Steps**:
1. Debug auth issue:
   - Check Edge Function secrets in Supabase Dashboard
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Add detailed error logging
   - Test with Postman/curl to isolate frontend vs backend

2. Fix background execution:
   - Replace `setTimeout()` with proper Supabase Edge Function pattern
   - OR use Supabase Queue (if available)
   - OR use separate worker function triggered by job creation

3. Test realtime updates:
   - Verify websocket connection
   - Check RLS policies allow reading jobs
   - Confirm realtime publication includes import_jobs

4. Polish UX:
   - Add retry button
   - Add progress estimation
   - Add cancellation support
   - Better error messages

**Timeline**: 2-3 days
**Risk**: High (complex async/realtime debugging)

---

### Option B: Revert to Optimized Synchronous (Simple, Works Now)
**Steps**:
1. Restore `index_sync_backup.ts` as main function
2. Keep Edge Function alive with periodic heartbeat:
   ```typescript
   const keepAlive = setInterval(() => {
     console.log('[Heartbeat] Still processing...')
   }, 30000) // Every 30s
   
   try {
     // Do import
   } finally {
     clearInterval(keepAlive)
   }
   ```
3. Add better frontend feedback:
   - Show estimated time: "This may take 2-3 minutes..."
   - Show spinner with encouraging messages
   - Use `fetch()` timeout extension (5+ minutes)

4. Batch inserts more aggressively (500 items at a time instead of 100)

5. For very large imports (>500 items):
   - Recommend splitting CSV by year/category
   - OR offer email notification option

**Timeline**: 2-4 hours
**Risk**: Low (known working pattern)
**Limitation**: Still times out for >2000 items

---

### Option C: Hybrid Approach (Balanced)
**For small imports (<200 items)**: Synchronous
**For large imports (>200 items)**: Async with job queue

**Implementation**:
1. Check item count in frontend
2. If < 200: Call sync endpoint, show simple spinner
3. If >= 200: Call async endpoint, show progress bar + job tracking
4. Async uses proper Supabase Queue or separate worker function

**Timeline**: 1 day
**Risk**: Medium
**Benefit**: Best UX for both cases

---

## Immediate Action Plan

### Step 1: Verify Deployment (5 min)
```bash
# Check what's actually deployed
curl -X POST https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/batch-import-activities \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test":"true"}'
```

### Step 2: Check Environment Variables (2 min)
Go to Supabase Dashboard → Edge Functions → batch-import-activities → Secrets
Verify:
- `SUPABASE_URL` is set
- `SUPABASE_ANON_KEY` is set
- `SUPABASE_SERVICE_ROLE_KEY` is set
- `RESEND_API_KEY` is set (for emails)

### Step 3: Test Auth Locally (10 min)
```bash
# Run function locally with supabase CLI
supabase functions serve batch-import-activities

# Test with curl
curl -X POST http://localhost:54321/functions/v1/batch-import-activities \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

### Step 4: Decision Point
**If auth works locally but not in production**: Deployment/env issue → re-deploy with explicit secrets
**If auth fails locally**: Code issue → fix auth logic
**If auth works but times out**: Execution model issue → implement Option B or C

---

## Success Criteria

### Must Have
- ✅ Import completes successfully for 1900+ item CSV
- ✅ User sees clear progress indication
- ✅ Wheel data loads correctly after import
- ✅ No technical error messages shown to user

### Should Have
- Progress bar with percentage
- Status messages ("Creating rings...", etc.)
- Email notification for large imports
- Data validation warnings before import

### Nice to Have
- Retry mechanism without re-upload
- Cancel import mid-process
- Background import (close modal, continue in background)
- Progress estimation ("About 2 minutes remaining...")

---

## Conclusion

The async implementation is **architecturally sound** but has **critical auth issues** preventing it from working. The fastest path to working imports is **Option B** (optimized synchronous) while continuing to debug the async version separately.

**Recommended immediate action**: Revert to synchronous for production stability, fix async in development branch, merge when fully tested.
