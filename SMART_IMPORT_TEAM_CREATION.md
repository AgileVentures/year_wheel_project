# Smart Import Team Creation - Implementation Summary

## Overview
Enhanced the Smart Import feature to automatically detect people in CSV data and create teams with pending invitations. This allows users to set up collaboration teams even when email addresses are not immediately available.

## Database Schema Changes

### Migration 1002: Pending Team Invitations
**File**: `supabase/migrations/1002_pending_team_invitations.sql`

**Changes**:
- Made `team_invitations.email` nullable
- Added `pending_name` TEXT column for names without email
- Added `is_pending` BOOLEAN column (default: false)
- Added CHECK constraint: either `email` OR `pending_name` must be present
- Added index on `(team_id, is_pending)` for pending invitations

**Apply with**: `apply_pending_invitations_migration.sql`

## AI Enhancement

### Updated Edge Function Prompt
**File**: `supabase/functions/smart-csv-import/index.ts`

Added comprehensive person detection guidance in AI prompt:

**Criteria for inclusion**:
- Person appears in "responsible", "owner", "assigned to", "contact" columns
- Person name repeats across multiple rows (likely collaborator)
- Associated email address exists in CSV
- Indicates internal collaborator (not external client)

**Email extraction**:
- Searches columns: "email", "e-post", "kontakt", "contact"
- Returns `null` if email not found (added later in UI)

**Context field**:
- Explains WHERE person was found
- Shows frequency (e.g., "Appears 15 times in 'Ansvarig' column")

## Service Layer

### New Functions in `teamService.js`

#### `createPendingInvitation(teamId, name)`
Creates invitation with name only, no email yet:
```javascript
{
  team_id: teamId,
  pending_name: name,
  is_pending: true,
  status: 'pending'
}
```

#### `completePendingInvitation(invitationId, email)`
Adds email to pending invitation and sends invite:
1. Fetches invitation where `is_pending = true`
2. Updates with email and sets `is_pending = false`
3. Calls Edge Function to send email
4. Updates `email_sent_at` and `resend_email_id`

## Smart Import UI

### File: `src/components/SmartImportModal.jsx`

**New State**:
- `createTeam` - Boolean to enable/disable team creation
- `teamName` - Team name input
- `selectedPeople` - Set of indices (not emails, to support people without emails)

**Changes**:
1. **Auto-enable team creation**: When AI detects people, automatically checks "Create team" checkbox
2. **Team name suggestion**: Uses `suggestedWheelTitle` or CSV filename as default
3. **Person selection UI**:
   - Shows name as primary identifier
   - Badge indicating "Email finns" (green) or "Email saknas" (yellow)
   - Email shown below name if available
   - Context from AI analysis
4. **Selected people summary**: Lists who will receive immediate email vs who needs email later

**Team creation flow** (on import completion):
```javascript
handleTeamCreation():
1. Create team with name and description
2. Assign wheel to team (team_id)
3. For each selected person:
   - If email exists: sendTeamInvitation(teamId, email)
   - If no email: createPendingInvitation(teamId, name)
4. Show toast with stats (X emails sent, Y awaiting email)
```

## Team Details UI

### File: `src/components/teams/TeamDetails.jsx`

**New State**:
- `incompleteInvites` - Array of invitations without email (is_pending = true)
- `addEmailModal` - { inviteId, name } for email input modal
- `emailInput` - Email address being added

**Changes**:
1. **Load invitations**: Separates complete vs incomplete in `loadTeamDetails()`
   - Complete: `!is_pending && email` exists
   - Incomplete: `is_pending && pending_name` exists

2. **Incomplete Invitations Section**:
   - Orange theme (warning color)
   - Shows `pending_name` as primary identifier
   - "Email saknas - klar att skicka när den läggs till" status
   - "Lägg till email" button opens modal
   - Delete button to remove invitation

3. **Add Email Modal**:
   - Input for email address
   - Submits via `handleAddEmail()`
   - Calls `completePendingInvitation()` → sends email automatically
   - Refreshes list (moves from incomplete to pending section)

**Icons**:
- Pending invitations: `<Clock>` (amber)
- Incomplete invitations: `<AlertCircle>` (orange)
- Person without email: `<User>` icon instead of `<Mail>`

## Translations

### Added to `teams.json` (Swedish & English)

**smartImport namespace**:
- `detectedPeople` - "Hittade personer ({{count}})"
- `createTeamCheckbox` - "Skapa team för detta hjul"
- `teamNameLabel` - "Teamnamn"
- `emailAvailable/Missing` - Badge labels
- `peopleSelected` - Selection summary
- `teamCreated` - Success message with stats

**incompleteInvites namespace**:
- `title` - "Behöver email ({{count}})"
- `description` - Explanation of pending invitations
- `addEmailButton` - "Lägg till email"
- `modalTitle/Description` - Email input modal
- `successMessage/errorMessage` - Toast notifications

## User Flow

### Scenario 1: CSV with Names and Emails
1. User uploads CSV with "Ansvarig" and "Email" columns
2. AI detects 3 people with emails
3. Smart Import shows team creation section (auto-enabled)
4. User confirms team name, keeps all 3 selected
5. Import completes → Team created, 3 emails sent immediately
6. Team Details shows 3 pending invitations (awaiting acceptance)

### Scenario 2: CSV with Names Only
1. User uploads CSV with "Ansvarig" column (no emails)
2. AI detects 2 people without emails
3. Smart Import shows team creation with yellow "Email saknas" badges
4. User confirms team name, keeps both selected
5. Import completes → Team created, 2 pending invitations (no emails sent yet)
6. Team Details shows "Behöver email (2)" section
7. User clicks "Lägg till email" for first person
8. Enters email → Invitation sent immediately
9. That person moves to regular "Väntande inbjudningar" section

### Scenario 3: Mixed - Some with Email, Some without
1. CSV has 5 people: 3 with emails, 2 without
2. Smart Import shows all 5 with appropriate badges
3. User selects all 5
4. Import completes → 3 emails sent, 2 pending
5. Team Details shows both sections:
   - "Väntande inbjudningar (3)" - sent
   - "Behöver email (2)" - waiting for addresses

## Technical Notes

### Key Design Decisions

1. **Index-based selection**: Used person index instead of email as key since emails can be null
   ```javascript
   setSelectedPeople(new Set(suggestions.detectedPeople.map((_, idx) => idx)))
   ```

2. **Auto-suggestion**: Team name auto-filled from wheel title or CSV filename for convenience

3. **Non-blocking failure**: Team creation errors show toast but don't fail the entire import

4. **Clear separation**: UI clearly distinguishes:
   - Active members (green)
   - Pending with email sent (amber)
   - Incomplete awaiting email (orange)

5. **Immediate send**: Adding email triggers automatic invitation - no separate "send" step

### Database Constraints

- **CHECK constraint**: Ensures data integrity - either email OR pending_name required
- **Index**: Optimizes queries for pending invitations
- **Status**: All invitations have `status = 'pending'` (accepted/declined updates this)

### Error Handling

- Invalid email in completePendingInvitation: Shows toast, doesn't update database
- Team creation failure: Shows toast, import still completes
- Edge Function failure: Caught and displayed, invitation row created anyway

## Testing Checklist

- [ ] Apply migration 1002 in Supabase SQL Editor
- [ ] Upload CSV with person column but no emails → Team created with pending invitations
- [ ] Upload CSV with person and email columns → Team created, emails sent
- [ ] Add email to pending invitation → Email sent, moves to pending section
- [ ] Delete incomplete invitation → Removes from list
- [ ] Cancel regular pending invitation → Works as before
- [ ] Resend regular pending invitation → Works as before
- [ ] Language switching (Swedish/English) → All new text translates

## Files Modified

**Database**:
- `supabase/migrations/1002_pending_team_invitations.sql`
- `apply_pending_invitations_migration.sql`

**Edge Functions**:
- `supabase/functions/smart-csv-import/index.ts` (AI prompt)

**Services**:
- `src/services/teamService.js` (2 new functions)

**Components**:
- `src/components/SmartImportModal.jsx` (team creation UI)
- `src/components/teams/TeamDetails.jsx` (incomplete invites section)

**Translations**:
- `src/i18n/locales/sv/teams.json`
- `src/i18n/locales/en/teams.json`

## Next Steps

1. **Apply migration**: Run SQL in Supabase dashboard
2. **Test end-to-end**: Upload test CSV with mixed data
3. **Monitor AI detection**: Verify person detection accuracy with various CSV formats
4. **Consider enhancements**:
   - Bulk email addition (upload CSV with emails)
   - Email validation before sending
   - Pending invitation reminders ("3 people still need emails")
   - Auto-detect email format from name (name@company.com)

## Related Documentation

- `TEAM_INVITE_SUMMARY.md` - Original email integration
- `docs/TEAM_INVITE_EMAIL_SYSTEM.md` - Email system architecture
- `.github/copilot-instructions.md` - Team scoping and data model
