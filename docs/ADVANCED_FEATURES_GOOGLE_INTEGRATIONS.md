# YearWheel Google Integrations - Advanced User Guide

**Purpose**: Guide to syncing Google Calendar and Google Sheets with YearWheel  
**Audience**: Premium users, IT admins, support team  
**Status**: Premium feature

---

## Overview

YearWheel's Google Integrations allow seamless synchronization between your annual planning wheel and external Google services. This enables:

- 📅 **Google Calendar sync**: Import events as activities automatically
- 📊 **Google Sheets sync**: Pull data from spreadsheets into rings
- 🔄 **Bi-directional sync** (coming): Changes in YearWheel reflect in Google tools
- 🕐 **Scheduled updates**: Hourly, daily, or manual sync frequency

**Key benefits:**
- No duplicate data entry
- Single source of truth for dates
- Team calendars automatically populate wheels
- Marketing calendars feed directly into planning

---

## Prerequisites

### Required:
✅ YearWheel Premium account  
✅ Google account with appropriate permissions  
✅ Access to the calendar or spreadsheet you want to sync

### Permissions needed:
- **Google Calendar**: Read access (view events)
- **Google Sheets**: Read access (view sheet data)
- **OAuth consent**: One-time authorization through Google's secure flow

**📸 Screenshot: Google OAuth consent screen**

---

## Part 1: Google Calendar Integration

### Use Cases

**Perfect for:**
- Importing team event calendars (company holidays, meetings)
- Pulling in marketing campaign dates from shared calendars
- Syncing personal calendar to see work-life balance
- Displaying public calendars (industry events, conference dates)

**Not ideal for:**
- Calendars with hundreds of daily entries (too cluttered)
- Highly sensitive/private calendars (consider security)

---

## Setting Up Google Calendar Sync

### Step 1: Connect Your Google Account

**📸 Screenshot: User profile or settings page with "Connect Google" button**

1. **Navigate to**: Profile settings or Integrations page
2. **Click**: **"Connect Google Calendar"** button
3. **OAuth flow opens** in new window/tab
4. **Google login**: Sign in if not already logged in
5. **Permission request**: Google asks to allow YearWheel to "View your calendars"
6. **Click**: **"Allow"** button
7. **Redirect back**: Returns to YearWheel with success message

**📸 Screenshot: Google permission request showing required scopes**

### Success indicators:
✅ Green "Connected" badge appears  
✅ Your Google email displayed  
✅ "Connected on [date]" timestamp shown  
✅ Available calendars list appears

---

### Step 2: Choose a Calendar to Sync

**📸 Screenshot: Calendar selection dropdown showing multiple calendars**

After connecting:

1. **Navigate to**: Wheel editor
2. **Select a ring**: Choose the ring where calendar events should appear
3. **Click**: Ring settings icon (gear ⚙️) or right-click ring
4. **Select**: **"Connect Integration"** or **"Sync with Google Calendar"**
5. **Modal opens**: Google Calendar Integration settings

**📸 Screenshot: Ring Integration modal with calendar dropdown**

6. **Choose calendar**: Dropdown lists all your Google calendars:
   - Primary calendar
   - Shared team calendars
   - Subscribed calendars
   - Other calendars you have access to

7. **Select**: The calendar you want (e.g., "Marketing Events")

---

### Step 3: Configure Sync Settings

**📸 Screenshot: Sync configuration panel with all options visible**

**Mapping Options:**

**1. Date Mapping (Required)**
- **Event Start Date** → Activity Start Date
- **Event End Date** → Activity End Date
- For all-day events: Spans full day(s)
- For timed events: Date only (time shown in description)

**2. Activity Group Mapping (Required)**
Choose how calendar events get colored:
- **Option A**: All events → Single activity group (e.g., all blue)
- **Option B**: Map by calendar color (Google Calendar's color → YearWheel group)
- **Option C**: Map by keyword (event title contains "meeting" → gray group)

**Example configuration:**
```
Calendar: "Marketing Team Calendar"
Ring: "Marketing Activities"
Activity Group: "Calendar Events" (blue #3B82F6)
Sync Frequency: Daily at 6:00 AM
```

**3. Sync Frequency**
- **Manual**: Only when you click "Sync Now"
- **Hourly**: Auto-sync every hour (high frequency, use for rapidly changing calendars)
- **Daily**: Auto-sync once per day at specified time (recommended)

**4. Filters (Optional)**
- **Date range**: Only sync events within 2026 (ignore past/far future)
- **Keyword filters**: Only sync events containing "campaign" or "launch"
- **Exclude patterns**: Skip events with "[internal]" in title

**📸 Screenshot: Filter configuration with examples**

---

### Step 4: Perform Initial Sync

1. **Review settings**: Double-check calendar, ring, and group selections
2. **Click**: **"Save & Sync Now"** button
3. **Wait**: Progress indicator shows sync status
   - "Fetching events from Google Calendar..."
   - "Creating activities... (15/32)"
   - "Sync complete! 32 events imported."

**📸 Screenshot: Sync progress dialog**

4. **Observe wheel**: Calendar events now appear as activities
5. **Check sidebar**: Activities marked with Google Calendar icon (📅)

### Success indicators:
✅ Activities appear in correct ring  
✅ Dates match Google Calendar exactly  
✅ Activity names = event titles  
✅ Descriptions include event details  
✅ Source indicator shows "Google Calendar"

---

## Managing Synced Activities

### Identifying synced activities:

**📸 Screenshot: Activity card with Google Calendar badge**

Synced activities have:
- 📅 Small Google Calendar icon/badge
- "Source: Google Calendar" in details
- External ID (hidden, used for updates)
- Slightly grayed out or special border (visual differentiation)

### Editing synced activities:

**⚠️ Important rules:**
- **Cannot edit** date, time, or title (controlled by Google Calendar)
- **Can edit**: Activity group (change color), description (add notes), labels
- **Can hide**: Uncheck ring visibility to hide all calendar activities
- **Can delete**: Removes from YearWheel only, not Google Calendar

**📸 Screenshot: Edit modal for synced activity showing disabled fields**

### Sync updates:

When calendar event changes in Google:
- **Name change**: Activity name updates automatically
- **Date change**: Activity moves to new date
- **Event deleted**: Activity removed from wheel (on next sync)
- **New events**: New activities appear (matching filters)

**Manual re-sync:**
- Click ring settings → "Sync Now" button
- Or wait for scheduled sync (hourly/daily)

---

## Part 2: Google Sheets Integration

### Use Cases

**Perfect for:**
- Importing marketing campaign schedules from planning spreadsheets
- Pulling in project timelines maintained in Sheets
- Team rosters with start/end dates
- Budget line items with timing data

**Not ideal for:**
- Sheets with messy/inconsistent data
- Real-time collaborative sheets (sync lag)
- Sheets with complex formulas that compute dates

---

## Setting Up Google Sheets Sync

### Step 1: Connect Google Account

(Same as Google Calendar - Step 1 above)

If already connected for Calendar, skip to Step 2.

---

### Step 2: Select Spreadsheet and Sheet

**📸 Screenshot: Spreadsheet selection interface**

1. **Navigate to**: Ring settings in wheel editor
2. **Click**: **"Connect Integration"** → **"Google Sheets"**
3. **Modal opens**: Google Sheets integration wizard

**📸 Screenshot: Wizard showing spreadsheet picker**

4. **Select spreadsheet**: 
   - Dropdown lists all sheets you have access to
   - Or paste Google Sheets URL
   - Search by name if many sheets

5. **Select specific sheet** (tab within spreadsheet):
   - "2026 Campaign Calendar"
   - "Q1 Projects"
   - Etc.

---

### Step 3: Map Columns to Fields

**📸 Screenshot: Column mapping interface showing spreadsheet preview**

**The magic happens here:** YearWheel needs to know which spreadsheet columns map to activity fields.

**Example spreadsheet:**
| Campaign Name | Start Date | End Date | Team | Status |
|---|---|---|---|---|
| Spring Launch | 2026-01-15 | 2026-03-31 | Marketing | Planned |
| Summer Sale | 2026-06-01 | 2026-08-31 | Sales | Confirmed |

**Mapping configuration:**

1. **Activity Name Field**:
   - Select column: "Campaign Name"
   - This becomes the activity title on the wheel

2. **Start Date Field**:
   - Select column: "Start Date"
   - Date format: Auto-detected (YYYY-MM-DD, MM/DD/YYYY, etc.)
   - If wrong format detected, manually specify

3. **End Date Field**:
   - Select column: "End Date"
   - Can be same as start date for single-day events

4. **Activity Group Field** (Optional):
   - Select column: "Team" or "Status"
   - YearWheel creates/maps groups based on unique values:
     - "Marketing" → Marketing group (auto-color)
     - "Sales" → Sales group (auto-color)

5. **Description Field** (Optional):
   - Select column: "Status" or any text column
   - Populates activity description

**📸 Screenshot: Completed column mapping with preview**

---

### Step 4: Configure Sync Options

**📸 Screenshot: Sync options panel**

**Options:**

1. **Row filters**:
   - Only sync rows where Status = "Confirmed"
   - Skip rows with empty dates
   - Only rows 2-50 (ignore header row 1)

2. **Sync frequency**:
   - Manual only
   - Daily at specific time
   - Hourly (not recommended for Sheets, too frequent)

3. **Conflict handling**:
   - **Replace all**: Delete existing activities, import fresh from Sheets
   - **Update existing**: Keep manual activities, update synced ones only
   - **Add new only**: Never delete, only add new rows

4. **Data validation**:
   - Require both start and end dates (skip incomplete rows)
   - Require activity name (skip blank names)
   - Date range validation (only 2026, ignore others)

---

### Step 5: Perform Initial Sync

1. **Click**: **"Preview Import"** to see what will be created
   - Shows table of pending activities
   - Highlights any errors (invalid dates, missing required fields)

**📸 Screenshot: Import preview table**

2. **Review**: Check that mapping is correct
3. **Click**: **"Import to Wheel"** button
4. **Wait**: Progress bar
5. **Success**: "Imported 15 activities from Google Sheets"

**📸 Screenshot: Wheel showing imported Sheets activities**

### Success indicators:
✅ Activities from spreadsheet appear on wheel  
✅ Dates, names, colors match spreadsheet data  
✅ Source indicator shows "Google Sheets"  
✅ No error activities (red flags)

---

## Managing Synced Sheets Data

### When spreadsheet updates:

**User updates Sheets:**
1. Changes row: "Spring Launch" → "Spring Mega Launch"
2. Changes date: Start date 01/15 → 01/20
3. Saves spreadsheet

**YearWheel sync (next scheduled or manual):**
1. Detects changed row via external ID
2. Updates activity name and date automatically
3. Shows "Last synced: 2 minutes ago" indicator

**📸 Screenshot: Sync status indicator showing recent update**

### Disconnecting Sheets sync:

1. **Ring settings** → **"Manage Integration"**
2. **Click**: **"Disconnect Google Sheets"**
3. **Choose**: 
   - Keep existing activities (orphan them, become manual)
   - Delete all synced activities (clean slate)

---

## Advanced: Combining Calendar + Sheets

**Powerful workflow:**

**Scenario: Marketing team**
- **Google Calendar**: Team meetings, campaign milestones (Ring: "Key Events")
- **Google Sheets**: Detailed campaign activities (Ring: "Campaigns")
- **Manual activities**: Ad-hoc tasks, internal notes (Ring: "Internal Work")

**Result**: Complete picture with minimal manual entry!

**📸 Screenshot: Wheel with three rings - Calendar sync, Sheets sync, Manual**

---

## Troubleshooting

### Issue: "Failed to connect Google account"

**Causes:**
- Pop-up blocker preventing OAuth window
- Cookie/privacy settings blocking Google auth
- Temporary Google API issue

**Solutions:**
1. Allow pop-ups for yearwheel.com
2. Try incognito/private window
3. Check Google account status (not suspended)
4. Wait 5 minutes and retry

---

### Issue: "No calendars found"

**Causes:**
- Google account has no calendars
- Insufficient permissions
- API quota exceeded (rare)

**Solutions:**
1. Verify you have at least one calendar in Google Calendar
2. Re-authorize with full permissions
3. Contact support if problem persists

---

### Issue: "Events not appearing on wheel"

**Causes:**
- Events outside date range (not in 2026 if wheel is 2026)
- Filter excludes events (keyword filter)
- Event is cancelled in Google Calendar
- Sync hasn't run yet

**Solutions:**
1. Check event dates in Google Calendar
2. Review sync filters in ring settings
3. Manually trigger sync: "Sync Now" button
4. Check sync logs for errors

**📸 Screenshot: Sync logs showing filtered events**

---

### Issue: "Duplicate activities after sync"

**Causes:**
- Synced twice manually without using update mode
- External ID lost (rare database issue)
- User created activity with same name manually

**Solutions:**
1. Delete duplicates manually
2. Disconnect and reconnect sync (orphan existing activities first)
3. Use "Replace all" mode to clean slate

---

### Issue: "Spreadsheet columns not mapping correctly"

**Causes:**
- Column headers changed in Sheets
- Wrong date format in Sheets
- Formula cells (not raw data)

**Solutions:**
1. Ensure column headers haven't changed
2. Standardize date format in Sheets (YYYY-MM-DD recommended)
3. Convert formula cells to values in Sheets
4. Re-do column mapping in YearWheel

---

## Security & Privacy

### What YearWheel can access:

**Google Calendar:**
- ✅ Event titles, dates, times
- ✅ Event descriptions
- ✅ Attendee count (not names)
- ❌ Cannot modify or delete calendar events
- ❌ Cannot see private event details (appears as "Busy")

**Google Sheets:**
- ✅ Read cell values
- ✅ Read sheet names
- ❌ Cannot modify spreadsheet
- ❌ Cannot delete or share spreadsheet

### Token storage:
- OAuth tokens stored encrypted in Supabase
- Refresh tokens used to maintain access
- Revocable anytime from Google account settings

### Revoking access:
1. Google Account → Security → Third-party apps with account access
2. Find "YearWheel"
3. Click "Remove Access"
4. YearWheel will lose sync capability until re-authorized

**📸 Screenshot: Google's third-party app management page**

---

## Best Practices

### Do's:

✅ **Use dedicated calendars**: Create "YearWheel Sync" calendar in Google, share with team  
✅ **Standardize naming**: Consistent event names make filtering easier  
✅ **Test with small dataset**: Sync 5-10 events first, verify before syncing hundreds  
✅ **Document mapping**: Note which columns map to which fields (for team reference)  
✅ **Set appropriate sync frequency**: Daily for most cases, hourly only if critical

### Don'ts:

❌ **Don't sync personal calendar with sensitive events**: Work calendar only  
❌ **Don't sync too many calendars to one ring**: Creates clutter  
❌ **Don't rely on instant sync**: Allow 1-2 minutes for updates to propagate  
❌ **Don't edit dates in YearWheel for synced activities**: Edit in Google, sync will update

---

## Pro Tips

💡 **Color coding**: Use Google Calendar colors to auto-assign activity groups  
💡 **Naming convention**: Prefix calendar events with [CLIENT] or [PROJECT] for easy filtering  
💡 **Backup before sync**: Export wheel as .yrw before first big sync  
💡 **Separate rings**: One ring for calendar sync, one for Sheets, keeps it organized  
💡 **Recurring events**: YearWheel syncs each instance as separate activity

---

## Future Enhancements (Roadmap)

*Coming features (check latest version):*
- 🔄 **Bi-directional sync**: Changes in YearWheel push back to Google
- 📧 **Gmail integration**: Create activities from email threads
- 📁 **Google Drive**: Link files to activities
- 🔔 **Notification sync**: Google Calendar reminders → YearWheel notifications
- 📊 **Advanced Sheets formulas**: Support computed date columns

---

## FAQ

**Q: Does sync work offline?**  
A: No, internet required. Queued syncs will process when online again.

**Q: Can I sync multiple calendars to one ring?**  
A: Not directly. Create multiple rings or combine calendars in Google first.

**Q: What happens if I delete synced activity in YearWheel?**  
A: Removed from wheel only. Next sync will re-import it unless you filter it out.

**Q: Can I sync from Microsoft Outlook?**  
A: Not natively. Export Outlook to Google Calendar, then sync from there.

**Q: Is there a limit to activities synced?**  
A: Premium allows unlimited. Recommend <200 activities per ring for performance.

**Q: Can team members sync their own calendars to shared wheel?**  
A: Yes, each team member connects their Google account independently.

---

**End of Google Integrations Guide**

*For support: support@yearwheel.com*  
*For API access: See Developer Documentation*
