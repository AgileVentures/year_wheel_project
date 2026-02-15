# NPS Feedback System Implementation Guide

## Overview
This implementation adds a Net Promoter Score (NPS) feedback system to YearWheel. Active users are shown a modal to rate their likelihood of recommending the product (0-10 scale) with optional comments.

## What Was Implemented

### 1. Database Layer (Migration 068)
**File:** `supabase/migrations/068_ADD_NPS_FEEDBACK_SYSTEM.sql`

**Tables Created:**
- `nps_responses` - Stores NPS submissions with score (0-10), optional comment, and context
- Added columns to `profiles` table:
  - `last_nps_shown_at` - Tracks when modal was last displayed
  - `last_nps_submitted_at` - Tracks when user last submitted feedback

**Key Features:**
- RLS policies for data security (users see own responses, admins see all)
- Indexes for query performance
- `should_show_nps()` function that implements display logic:
  - Shows to users with at least 1 wheel created
  - Not shown to brand new users (< 1 day old)
  - Not shown if submitted within last 30 days
  - Not shown if dismissed within last 7 days

### 2. Service Layer
**File:** `src/services/npsService.js`

**Functions:**
- `shouldShowNPS()` - Checks if modal should be displayed to current user
- `submitNPSResponse(score, comment, context)` - Submits user feedback
- `recordNPSShown()` - Records modal display (for dismiss tracking)
- `getNPSResponses({ page, limit, sortBy, sortOrder })` - Admin: fetch all responses
- `getNPSStats()` - Admin: calculate NPS metrics (promoters, passives, detractors)

### 3. UI Components

**NPSModal Component** (`src/components/NPSModal.jsx`)
- Visual 0-10 score buttons with color coding:
  - Red (0-6): Detractors
  - Yellow (7-8): Passives  
  - Green (9-10): Promoters
- Optional comment field (max 1000 chars)
- Fully i18n enabled (English/Swedish)
- "Maybe Later" option (records dismiss)

**AdminNPSPage Component** (`src/components/admin/AdminNPSPage.jsx`)
- Dashboard with key metrics:
  - Overall NPS score
  - Total responses
  - Promoter/Detractor percentages
- Response table showing:
  - Date, User email, Score, Category, Comment
  - Pagination support
- Empty state with helpful messaging

### 4. Integration Points

**Dashboard Integration** (`src/components/dashboard/Dashboard.jsx`)
- Modal triggers 5 seconds after dashboard loads
- Respects user's feedback history
- Shows success toast on submission

**Admin Panel** (`src/components/admin/AdminPanel.jsx`)
- New "NPS" tab with MessageSquare icon
- Displays AdminNPSPage component
- Accessible to admin users only

### 5. Internationalization
**Files:** `src/i18n/locales/{en,sv}/nps.json`

**Translations:**
- Modal title, question, descriptions
- Score labels (detractor/passive/promoter)
- Error messages
- Success messages
- Both English and Swedish

## Display Logic (Timing Rules)

The NPS modal will be shown to a user when ALL conditions are met:

1. ✅ User has created at least 1 wheel (active user)
2. ✅ User account is older than 1 day (not brand new)
3. ✅ 30 days have passed since last submission (OR never submitted)
4. ✅ 7 days have passed since last dismiss (OR never dismissed)
5. ✅ 5 seconds have passed since dashboard loaded (non-intrusive)

This ensures:
- Only engaged users see the modal
- Users aren't spammed (max once per month if submitting)
- Respects user preference if they dismiss (7-day cooldown)

## NPS Scoring Categories

- **Promoters (9-10):** Loyal enthusiasts who will recommend
- **Passives (7-8):** Satisfied but unenthusiastic customers
- **Detractors (0-6):** Unhappy customers who can damage brand

**NPS Score Formula:**
```
NPS = (% Promoters) - (% Detractors)
```
Range: -100 (all detractors) to +100 (all promoters)

## Admin Dashboard Metrics

The admin NPS page shows:
- **NPS Score:** Overall score with quality indicator
- **Total Responses:** Count and average score
- **Promoter %:** Percentage who scored 9-10
- **Detractor %:** Percentage who scored 0-6
- **Response List:** Full table with all submissions

## Deployment Checklist

### Before Deploying:
- [ ] Review migration file for SQL errors
- [ ] Ensure admin user email is correct in migration
- [ ] Test modal display logic locally
- [ ] Verify i18n translations are correct

### Deployment Steps:

1. **Apply Database Migration**
   ```bash
   # Run in Supabase Dashboard > SQL Editor
   # Or via Supabase CLI
   supabase db push
   ```

2. **Verify Migration Success**
   - Run `TEST_NPS_MIGRATION.sql` in Supabase SQL Editor
   - Verify all tables, columns, indexes created
   - Check RLS policies are active

3. **Test User Flow**
   - Create test account
   - Create at least 1 wheel
   - Wait 5 seconds on dashboard
   - Modal should appear
   - Submit feedback (try different scores)
   - Verify response saved in database

4. **Test Admin View**
   - Login as admin user
   - Navigate to Admin Panel > NPS tab
   - Verify stats display correctly
   - Check response table shows submissions

5. **Production Testing**
   - Monitor for any console errors
   - Check NPS responses are being saved
   - Verify modal timing works correctly
   - Test "Maybe Later" functionality

## Monitoring & Maintenance

### Key Metrics to Track:
- Response rate (shown vs submitted)
- NPS score trends over time
- Common themes in comments
- Response distribution by score

### Regular Reviews:
- Weekly: Check NPS score and new responses
- Monthly: Analyze trends and comment themes
- Quarterly: Adjust timing rules if needed

## Troubleshooting

### Modal Not Appearing:
1. Check browser console for errors
2. Verify user meets all display conditions
3. Check `profiles` table for `last_nps_*` timestamps
4. Run `should_show_nps()` function manually

### Responses Not Saving:
1. Check RLS policies are enabled
2. Verify user is authenticated
3. Check browser network tab for API errors
4. Ensure `auth.uid()` is valid

### Admin Page Not Loading:
1. Verify user has `is_admin = true` in profiles
2. Check RLS policy for admin access
3. Verify `getNPSResponses()` function works

## Future Enhancements

Potential improvements:
- [ ] Email notifications to admins on new feedback
- [ ] NPS score trends chart (over time)
- [ ] Filter responses by date range
- [ ] Export responses to CSV
- [ ] Follow-up questions based on score
- [ ] Integration with support ticket system
- [ ] Automated response to low scores
- [ ] NPS benchmarking against industry standards

## Files Modified/Created

**New Files:**
- `supabase/migrations/068_ADD_NPS_FEEDBACK_SYSTEM.sql`
- `src/services/npsService.js`
- `src/components/NPSModal.jsx`
- `src/components/admin/AdminNPSPage.jsx`
- `src/i18n/locales/en/nps.json`
- `src/i18n/locales/sv/nps.json`
- `supabase/migrations/TEST_NPS_MIGRATION.sql` (testing)

**Modified Files:**
- `src/components/dashboard/Dashboard.jsx` - Added modal trigger
- `src/components/admin/AdminPanel.jsx` - Added NPS tab
- `src/i18n/index.js` - Registered NPS translations
- `src/i18n/locales/en/common.json` - Added submit/submitting
- `src/i18n/locales/sv/common.json` - Added submit/submitting

## Support

For questions or issues:
1. Check implementation guide (this document)
2. Review code comments in service/component files
3. Run test SQL script for database verification
4. Check browser console for client-side errors
5. Review Supabase logs for server-side errors
