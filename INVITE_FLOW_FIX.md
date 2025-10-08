# Invite Flow Fix - October 8, 2025

## Problem
When a non-authenticated user clicked an invite link, they were redirected to `/auth`, but after logging in they stayed on `/auth` or went to `/dashboard` instead of going back to accept the invitation.

## Root Cause
The `/auth` route had a hard-coded redirect to `/dashboard` for authenticated users:
```jsx
<Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
```

This meant that after login, the user would always go to `/dashboard`, and the sessionStorage token check happened too late.

## Solution
Modified the redirect logic to check for a pending invite token FIRST:

```jsx
const getAuthRedirect = () => {
  const pendingToken = sessionStorage.getItem('pendingInviteToken');
  if (pendingToken) {
    return `/invite/${pendingToken}`;
  }
  return '/dashboard';
};

<Route path="/auth" element={user ? <Navigate to={getAuthRedirect()} replace /> : <AuthPage />} />
```

## Flow (After Fix)

1. User clicks invite link: `http://localhost:5173/invite/TOKEN`
2. **InviteAcceptPage** detects no user logged in
3. Stores token: `sessionStorage.setItem('pendingInviteToken', TOKEN)`
4. Redirects to `/auth`
5. User logs in or signs up
6. **AuthPage** sees user is authenticated
7. Calls `getAuthRedirect()` which checks for `pendingInviteToken`
8. Finds token and redirects to `/invite/TOKEN`
9. **InviteAcceptPage** now sees user IS logged in
10. Clears token from sessionStorage
11. Processes invitation (validates, adds to team, updates status)
12. Shows success message
13. Redirects to `/dashboard?view=teams` after 2 seconds

## Testing Steps

1. Create a team and generate an invite link
2. Copy the invite link
3. Open an incognito/private browser window
4. Paste the invite link
5. You should see the page redirect to `/auth`
6. Log in with the invited email address
7. You should be redirected back to `/invite/TOKEN`
8. You should see "Behandlar inbjudan..." 
9. Then see success message with team name
10. After 2 seconds, redirect to dashboard Teams tab
11. Verify you're a member of the team

## Console Logs (For Debugging)

The following logs will appear in the browser console:
- `InviteAcceptPage useEffect - user: null token: TOKEN` (first visit)
- `User not logged in, storing token and redirecting to /auth`
- `Stored token: TOKEN`
- After login:
- `getAuthRedirect - pendingToken: TOKEN`
- `Redirecting to invite page: /invite/TOKEN`
- `InviteAcceptPage useEffect - user: [Object] token: TOKEN` (after redirect)
- `User is logged in, processing invitation`
- `Cleared pendingInviteToken from sessionStorage`

## Files Modified

1. **src/App.jsx**
   - Added `getAuthRedirect()` function
   - Modified `/auth` route to use dynamic redirect
   - Removed duplicate useEffect logic

2. **src/components/InviteAcceptPage.jsx**
   - Added sessionStorage.removeItem() in handleInvitation()
   - Added console logs for debugging
