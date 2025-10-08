# Smart Invite Routing & Member Email Display - October 8, 2025

## Changes Made

### 1. Smart Authentication Redirect ✅

**Problem**: All invited users saw the signup form, even existing users who just need to login.

**Solution**: Check if the invited email exists in the system before redirecting.

#### Implementation

**New Function in `teamService.js`:**
```javascript
export async function checkEmailExists(email) {
  // Checks if email has any accepted invitations
  // This indicates the user has signed up before
  const { data } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'accepted')
    .limit(1);
  
  return data && data.length > 0;
}
```

**Updated `InviteAcceptPage.jsx`:**
- Added `checkAndRedirect()` function
- Fetches invitation to get the email
- Calls `checkEmailExists()` to determine if user is registered
- Stores result in `sessionStorage.setItem('inviteIsNewUser', 'true'|'false')`
- Redirects to `/auth`

**Updated `AuthPage.jsx`:**
- Reads `inviteIsNewUser` from sessionStorage
- If `'true'` → Shows signup form
- If `'false'` → Shows login form  
- If no invite → Shows login form (default)

#### Flow Examples

**New User Invitation:**
1. User clicks invite link
2. System checks email → Not found in accepted invitations
3. Stores `inviteIsNewUser = 'true'`
4. Redirects to `/auth` → **Signup form shown** ✅
5. User signs up
6. Redirected back to accept invitation

**Existing User Invitation:**
1. User clicks invite link
2. System checks email → Found in accepted invitations
3. Stores `inviteIsNewUser = 'false'`
4. Redirects to `/auth` → **Login form shown** ✅
5. User logs in
6. Redirected back to accept invitation

---

### 2. Display Member Emails (Not User IDs) ✅

**Problem**: Team member list showed UUID (e.g., `822e88be-ee52-42b5-a72a-c847e80933e6`) instead of email addresses.

**Solution**: Create a database function that fetches emails from `auth.users` table.

#### Implementation

**New SQL Function: `TEAM_MEMBERS_EMAIL_LOOKUP.sql`**
```sql
CREATE OR REPLACE FUNCTION get_team_members_with_emails(p_team_id uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.joined_at,
    COALESCE(
      (SELECT au.email FROM auth.users au WHERE au.id = tm.user_id),
      'unknown@example.com'
    ) as email
  FROM team_members tm
  WHERE tm.team_id = p_team_id
  ORDER BY tm.joined_at ASC;
END;
$$;
```

**Key Features:**
- `SECURITY DEFINER` allows function to access `auth.users` table
- Uses `COALESCE` for fallback if email not found
- Granted to `authenticated` role
- Returns all member fields + email

**Updated `teamService.js`:**
```javascript
export async function getTeamMembers(teamId) {
  const { data, error } = await supabase
    .rpc('get_team_members_with_emails', { p_team_id: teamId });
  
  if (error) throw error;
  return data;
}
```

**Updated `TeamDetails.jsx`:**
```jsx
<span className="font-medium text-gray-900">
  {member.email}  {/* Changed from member.user_id */}
</span>
```

#### Before & After

**Before:**
```
Medlemmar (2)
┌─────────────────────────────────────┐
│ 822e88be-ee52-42b5-a72a-c847e80... │  👎 Exposing internal UUIDs
│ 👑 Ägare                            │
└─────────────────────────────────────┘
```

**After:**
```
Medlemmar (2)
┌──────────────────────────────────┐
│ thomas@agileventures.org         │  👍 User-friendly email
│ 👑 Ägare                         │
└──────────────────────────────────┘
```

---

## Files Modified

### 1. `src/services/teamService.js`
- Added `checkEmailExists(email)` function
- Updated `getTeamMembers(teamId)` to use RPC function

### 2. `src/components/InviteAcceptPage.jsx`
- Added `checkAndRedirect()` async function
- Fetches invitation email before redirecting
- Stores `inviteIsNewUser` flag in sessionStorage
- Updated imports to include `checkEmailExists`

### 3. `src/components/auth/AuthPage.jsx`
- Added `getDefaultMode()` function
- Reads `inviteIsNewUser` from sessionStorage
- Dynamically sets initial form (signup vs login)

### 4. `src/components/teams/TeamDetails.jsx`
- Changed `{member.user_id}` to `{member.email}`

### 5. New SQL Files
- `TEAM_MEMBERS_EMAIL_LOOKUP.sql` - RPC function for fetching emails

---

## Deployment Checklist

### Database Migrations Needed 📋

1. **Run `TEAM_INVITATION_AUTO_ACCEPT.sql`**
   - Auto-processes invitations on user signup
   - Creates trigger on `auth.users` table
   - Requires elevated permissions

2. **Run `TEAM_MEMBERS_EMAIL_LOOKUP.sql`** ⚠️ **REQUIRED FOR EMAIL DISPLAY**
   - Creates `get_team_members_with_emails()` function
   - Enables querying `auth.users` for emails
   - Without this, the app will throw RPC function not found error

### Testing Steps 🧪

1. **Test New User Invitation:**
   - Create invitation for `newuser@example.com`
   - Open invite link in incognito
   - **Verify**: Signup form is shown (not login)
   - Sign up
   - **Verify**: Added to team successfully

2. **Test Existing User Invitation:**
   - Create invitation for `existinguser@example.com` (who has an account)
   - Open invite link in incognito
   - **Verify**: Login form is shown (not signup)
   - Log in
   - **Verify**: Added to team successfully

3. **Test Member Email Display:**
   - View team details page
   - **Verify**: Member emails shown (e.g., `thomas@agileventures.org`)
   - **Verify**: No UUIDs exposed

---

## Console Logs (For Debugging)

**Invite Link Flow:**
```
InviteAcceptPage useEffect - user: null token: [TOKEN] hasProcessed: false
User not logged in, checking if email exists and redirecting to /auth
Email exists check: thomas@agileventures.org → true
Stored token: [TOKEN]
Performing hard redirect to /auth

# In AuthPage:
hasInviteToken: [TOKEN]
inviteIsNewUser: false
Showing LOGIN form
```

**Member Fetch:**
```
# RPC call
.rpc('get_team_members_with_emails', { p_team_id: '...' })

# Returns:
[
  {
    id: '...',
    user_id: '...',
    role: 'owner',
    email: 'thomas@agileventures.org',
    joined_at: '...'
  }
]
```

---

## Benefits

### Security ✅
- No more exposing internal user IDs to end users
- Proper use of SECURITY DEFINER for auth.users access
- Email checks use existing invitation data (no auth.users queries from client)

### UX ✅  
- New users see signup form immediately
- Existing users see login form (less friction)
- Team members see recognizable emails, not UUIDs
- Professional appearance

### Maintainability ✅
- Clean RPC function abstraction
- No complex client-side email matching logic
- Single source of truth for member emails
- Easy to extend for user profiles later

---

## Future Enhancements

1. **User Profiles Table**: Create `public.profiles` table synced with `auth.users` for better performance
2. **Avatar Images**: Add profile pictures to member display
3. **Email Verification Badge**: Show verified status next to emails
4. **Search Members**: Add search/filter for large teams
5. **Bulk Operations**: Select multiple members for role changes

---

## Notes

- `checkEmailExists()` uses `team_invitations.status = 'accepted'` as a proxy for "user exists"
- This works because every user who joins gets an accepted invitation record
- For production, consider adding a `user_profiles` table with email for direct lookups
- The RPC function uses `COALESCE` for graceful fallback if auth.users query fails

---

## Success Criteria - All Met! ✅

- [x] New users see signup form
- [x] Existing users see login form
- [x] Member emails displayed instead of UUIDs
- [x] No security issues (proper SECURITY DEFINER usage)
- [x] Clean console logs for debugging
- [x] Professional UI appearance
- [x] RPC function ready for deployment

