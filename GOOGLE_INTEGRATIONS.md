# Google Integrations Setup Guide

This guide explains how to set up Google Calendar and Google Sheets integrations for Year Wheel.

## Overview

Year Wheel users can connect their Google accounts to:
- **Google Calendar**: Sync calendar events to wheel rings automatically
- **Google Sheets**: Import activity data from spreadsheets

## Architecture

### Components
1. **Database**: `user_integrations` and `ring_integrations` tables store OAuth tokens and mappings
2. **Frontend**: ProfilePage for OAuth, OrganizationPanel for ring configuration
3. **Edge Functions**: Handle OAuth flow and data syncing
4. **Google APIs**: Calendar API v3 and Sheets API v4

### Data Flow
```
User → ProfilePage → google-oauth-init → Google OAuth → google-oauth-callback → Database
Ring Settings → sync-ring-data → Google API → Items created in wheel
```

## Google Cloud Console Setup

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable APIs:
   - Google Calendar API
   - Google Sheets API
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Application type: **Web application**
7. Add authorized redirect URIs:
   ```
   https://[your-project-id].supabase.co/functions/v1/google-oauth-callback
   http://localhost:54321/functions/v1/google-oauth-callback  (for local dev)
   ```
8. Save **Client ID** and **Client Secret**

### 2. Configure OAuth Consent Screen

1. Go to **OAuth consent screen**
2. User Type: **External** (for public access) or **Internal** (for workspace only)
3. Fill in app information:
   - App name: "Year Wheel"
   - User support email
   - Developer contact email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/spreadsheets.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (if using External + Testing mode)
6. Publish app (optional - required for > 100 users)

## Supabase Configuration

### 1. Set Environment Variables

Add to Supabase project settings or `.env` file:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://[your-project-id].supabase.co/functions/v1/google-oauth-callback
```

### 2. Deploy Edge Functions

```bash
# Deploy all Google integration functions
supabase functions deploy google-oauth-init
supabase functions deploy google-oauth-callback
supabase functions deploy google-calendar-list
supabase functions deploy google-sheets-validate
supabase functions deploy sync-ring-data
```

### 3. Set Function Secrets

```bash
# Set secrets for all functions
supabase secrets set GOOGLE_CLIENT_ID=your-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret
supabase secrets set GOOGLE_REDIRECT_URI=https://your-project.supabase.co/functions/v1/google-oauth-callback
```

### 4. Run Database Migration

```bash
supabase migration up
# Or apply specific migration
supabase db push
```

## Usage

### For Users

#### 1. Connect Google Account

1. Go to **Profile** → **Google Integrationer**
2. Click **Anslut Calendar** or **Anslut Sheets**
3. Authorize in Google popup
4. Connection status shows ✓ when successful

#### 2. Configure Ring Data Source

1. Edit a wheel
2. In ring settings (OrganizationPanel), find the ring to sync
3. Click **Koppla datakälla** (Connect data source)
4. Choose **Google Calendar** or **Google Sheets**

**For Google Calendar:**
- Select which calendar to sync
- Events from selected year are imported as items

**For Google Sheets:**
- Enter Spreadsheet ID (from URL)
- Choose sheet name
- Expected format:
  ```
  | Name | Start Date | End Date | Notes |
  | Summer vacation | 2025-06-15 | 2025-08-15 | Family trip |
  ```

5. Click **Synkronisera nu** to import data

### For Developers

#### Testing Locally

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Set local secrets:
   ```bash
   supabase secrets set --env-file .env.local
   ```

3. Test OAuth flow:
   - Use `http://localhost:54321/functions/v1/google-oauth-callback` as redirect URI
   - Add to Google Cloud Console authorized URIs

#### Data Models

**user_integrations table:**
```sql
{
  id: UUID,
  user_id: UUID,
  provider: 'google_calendar' | 'google_sheets' | 'google',
  access_token: string (encrypted),
  refresh_token: string (encrypted),
  token_expires_at: timestamp,
  scope: string[],
  provider_user_id: string,
  provider_user_email: string
}
```

**ring_integrations table:**
```sql
{
  id: UUID,
  ring_id: UUID,
  user_integration_id: UUID,
  integration_type: 'calendar' | 'sheet',
  config: {
    calendar_id?: string,
    spreadsheet_id?: string,
    sheet_name?: string,
    range?: string
  },
  sync_enabled: boolean,
  last_synced_at: timestamp,
  last_sync_status: 'success' | 'error' | 'pending'
}
```

**items with source tracking:**
```sql
{
  ...existing fields,
  source: 'manual' | 'google_calendar' | 'google_sheets',
  external_id: string,
  sync_metadata: {
    calendar_id?: string,
    event_link?: string,
    spreadsheet_id?: string,
    sheet_name?: string,
    row_index?: number
  }
}
```

## Security Considerations

### Token Storage
- Access tokens are stored in `user_integrations` table
- **TODO**: Implement encryption using Supabase Vault
- Tokens have RLS policies - users can only access their own

### Token Refresh
- **TODO**: Implement automatic token refresh when expired
- Currently prompts user to reconnect when token expires

### Scopes
- Uses minimal required scopes (readonly only)
- Users must explicitly grant permissions via OAuth

### RLS Policies
- All integration tables have Row Level Security enabled
- Users can only access their own integrations
- Ring integrations require wheel ownership

## Troubleshooting

### "Google OAuth not configured"
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Supabase secrets

### "Access token expired"
- User needs to disconnect and reconnect in Profile page
- TODO: Implement automatic refresh

### "Popup blockerades"
- User's browser is blocking popups
- Add site to allowed popups in browser settings

### "Spreadsheet not found"
- Check spreadsheet ID is correct (from URL)
- Ensure spreadsheet is shared with user's Google account
- Verify Google Sheets API is enabled in Cloud Console

### Calendar events not syncing
- Check calendar is not empty for selected year
- Verify events have start/end dates
- Check activity groups exist in wheel (required for items)

## Future Enhancements

- [ ] Automatic token refresh implementation
- [ ] Token encryption using Supabase Vault
- [ ] Scheduled automatic syncing (cron jobs)
- [ ] Bidirectional sync (write back to Google)
- [ ] Custom field mapping configuration
- [ ] Multiple calendar selection per ring
- [ ] Conflict resolution for manual edits vs synced items
- [ ] Sync status indicators in UI
- [ ] Activity group auto-creation from calendar colors
- [ ] Support for recurring events

## API Reference

### Edge Functions

#### `google-oauth-init`
Generates OAuth URL for user authentication.
- **Method**: POST
- **Auth**: Required
- **Body**: `{ provider: 'google_calendar' | 'google_sheets', scopes?: string[] }`
- **Response**: `{ authUrl: string, state: string }`

#### `google-oauth-callback`
Handles OAuth callback and stores tokens.
- **Method**: GET
- **Query**: `code`, `state`
- **Response**: HTML page with postMessage to parent window

#### `google-calendar-list`
Lists user's Google Calendars.
- **Method**: GET
- **Auth**: Required
- **Response**: `{ calendars: Array<{ id, summary, primary, ... }> }`

#### `google-sheets-validate`
Validates spreadsheet access and returns metadata.
- **Method**: POST
- **Auth**: Required
- **Body**: `{ spreadsheetId: string }`
- **Response**: `{ valid: boolean, spreadsheet: { id, title, sheets: [...] } }`

#### `sync-ring-data`
Syncs data from Google to ring items.
- **Method**: POST
- **Auth**: Required
- **Body**: `{ ringIntegrationId: UUID }`
- **Response**: `{ success: boolean, itemCount: number, items: [...] }`

## Support

For issues or questions:
1. Check this documentation
2. Review Edge Function logs in Supabase Dashboard
3. Check browser console for frontend errors
4. Verify Google Cloud Console API quotas

## License

Part of Year Wheel POC project.
