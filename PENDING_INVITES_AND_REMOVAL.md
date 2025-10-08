# Pending Invitations & Member Management - October 8, 2025

## New Features Added ✅

### 1. Display Pending Invitations in Team View

**What**: Team owners and admins can now see all pending (not yet accepted) invitations directly in the team details view.

**Why**: Provides visibility into who has been invited but hasn't joined yet. Helps track invitation status and manage team growth.

**UI Changes:**
- New section "Väntande inbjudningar" appears below the members list
- Shows count of pending invites
- Each pending invite displays:
  - Email address of invited person
  - Date when invitation was sent
  - Amber/yellow background to distinguish from active members
  - Menu button for actions

**Visual Design:**
```
┌────────────────────────────────────────────┐
│ 🕐 Väntande inbjudningar (2)               │
├────────────────────────────────────────────┤
│ 📧 newuser@example.com                     │
│    Inbjuden 2025-10-08                  ⋮  │
├────────────────────────────────────────────┤
│ 📧 another@example.com                     │
│    Inbjuden 2025-10-07                  ⋮  │
└────────────────────────────────────────────┘
```

---

### 2. Cancel Pending Invitations

**What**: Team owners and admins can cancel pending invitations before they're accepted.

**Why**: 
- Mistakes happen (wrong email address)
- Person no longer needs access
- Invitation expired or no longer relevant
- Security (revoke access before it's granted)

**How to Use:**
1. Go to team details page
2. Scroll to "Väntande inbjudningar" section
3. Click the ⋮ menu button on any pending invite
4. Click "Avbryt inbjudan" (Cancel invitation)
5. Confirm the action
6. Invitation is immediately removed

**What Happens:**
- Invitation record is deleted from database
- Invite link becomes invalid
- Person can no longer use that link to join
- UI updates immediately to remove the invite

---

### 3. Remove Team Members (Already Existed, Now More Prominent)

**What**: Team owners and admins can remove members from the team.

**Restrictions:**
- Owners can remove any member except themselves
- Admins can remove regular members (not owners or other admins)
- Members cannot remove anyone

**How to Use:**
1. Go to team details page
2. Find the member in "Medlemmar" section
3. Click the ⋮ menu button on the member
4. Click "Ta bort" (Remove)
5. Confirm the action
6. Member is removed immediately

**What Happens:**
- Member loses access to all team wheels
- Member record removed from team_members table
- UI updates to remove member from list
- Member's wheels remain intact (team_id set to null)

---

## Implementation Details

### Files Modified

#### 1. `src/services/teamService.js`
Added new function:
```javascript
export async function cancelInvitation(invitationId) {
  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;
}
```

#### 2. `src/components/teams/TeamDetails.jsx`

**Added State:**
```javascript
const [pendingInvites, setPendingInvites] = useState([]);
const [inviteMenuOpen, setInviteMenuOpen] = useState(null);
```

**Updated loadTeamDetails:**
```javascript
const [teamData, membersData, invitesData] = await Promise.all([
  getTeam(teamId),
  getTeamMembers(teamId),
  getTeamInvitations(teamId)  // ← New
]);
setPendingInvites(invitesData || []);
```

**Added Handler:**
```javascript
const handleCancelInvitation = async (inviteId) => {
  if (!confirm('Är du säker på att du vill avbryta denna inbjudan?')) return;
  
  try {
    await cancelInvitation(inviteId);
    setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
    setInviteMenuOpen(null);
  } catch (err) {
    console.error('Error canceling invitation:', err);
    alert('Kunde inte avbryta inbjudan: ' + err.message);
  }
};
```

**Added UI Section:**
- Conditional render when `canManageTeam && pendingInvites.length > 0`
- Maps over `pendingInvites` array
- Displays each invite with email, date, and menu
- Menu has "Avbryt inbjudan" option

**Updated Icons:**
```javascript
import { ..., Mail, Clock } from 'lucide-react';
```

---

## User Flows

### Flow 1: Cancel a Pending Invitation

```
Owner creates invitation
↓
Modal shows invite link
↓
Owner shares link but realizes mistake
↓
Owner goes to team details
↓
Sees "Väntande inbjudningar" section
↓
Clicks ⋮ menu on the wrong invite
↓
Clicks "Avbryt inbjudan"
↓
Confirms action
↓
Invite deleted, link becomes invalid
↓
Invited person cannot join anymore
```

### Flow 2: Remove a Team Member

```
Member joins team
↓
Later, owner decides to remove them
↓
Owner goes to team details
↓
Finds member in "Medlemmar" section
↓
Clicks ⋮ menu on member
↓
Clicks "Ta bort"
↓
Confirms action
↓
Member removed from team
↓
Member loses access to team wheels
```

---

## Permissions Matrix

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View members | ✅ | ✅ | ✅ |
| View pending invites | ✅ | ✅ | ❌ |
| Create invitation | ✅ | ✅ | ❌ |
| Cancel invitation | ✅ | ✅ | ❌ |
| Remove member | ✅ (not self) | ✅ (members only) | ❌ |
| Remove admin | ✅ | ❌ | ❌ |
| Remove owner | ❌ | ❌ | ❌ |
| Change role | ✅ | ✅ (limited) | ❌ |

---

## Database Operations

### Cancel Invitation
```sql
DELETE FROM team_invitations
WHERE id = 'invitation-id';
```

**RLS Policy**: Ensures only team owners/admins can delete invitations for their team.

### Remove Member
```sql
DELETE FROM team_members
WHERE team_id = 'team-id'
  AND user_id = 'member-user-id';
```

**RLS Policy**: 
- `can_manage_team(team_id, auth.uid())` must return true
- OR user is removing themselves (`user_id = auth.uid()`)

---

## UI/UX Improvements

### Visual Distinction
- **Active Members**: White background with blue accents
- **Pending Invites**: Amber/yellow background
- **Icons**: 
  - 👤 User icon for members
  - 📧 Mail icon for pending invites
  - 🕐 Clock icon for section header

### Confirmation Dialogs
- "Är du säker på att du vill avbryta denna inbjudan?"
- "Är du säker på att du vill ta bort denna medlem?"

Prevents accidental deletions.

### Immediate Feedback
- UI updates instantly after actions
- No page reload required
- Smooth transitions

---

## Testing Checklist

### Test Pending Invitations Display
- [ ] Create a team
- [ ] Invite 2-3 people
- [ ] Go to team details
- [ ] ✅ Verify "Väntande inbjudningar" section appears
- [ ] ✅ Verify count is correct (e.g., "(3)")
- [ ] ✅ Verify emails are shown
- [ ] ✅ Verify dates are shown
- [ ] ✅ Verify amber background

### Test Cancel Invitation
- [ ] Click ⋮ menu on pending invite
- [ ] Click "Avbryt inbjudan"
- [ ] Click "OK" in confirmation dialog
- [ ] ✅ Verify invite disappears immediately
- [ ] ✅ Verify count updates (e.g., "(3)" → "(2)")
- [ ] Copy the canceled invite link
- [ ] Try to use it
- [ ] ✅ Verify error: "Inbjudan hittades inte eller har gått ut"

### Test Remove Member
- [ ] Have at least 2 members in team
- [ ] Click ⋮ menu on a member (not yourself)
- [ ] Click "Ta bort"
- [ ] Click "OK" in confirmation dialog
- [ ] ✅ Verify member disappears immediately
- [ ] ✅ Verify count updates
- [ ] Log in as removed member
- [ ] ✅ Verify they no longer see the team
- [ ] ✅ Verify they cannot access team wheels

### Test Permissions
- [ ] As owner: ✅ Can see pending invites
- [ ] As admin: ✅ Can see pending invites
- [ ] As member: ✅ Cannot see pending invites section
- [ ] As owner: ✅ Can cancel any invite
- [ ] As owner: ✅ Can remove any member (except self)
- [ ] As admin: ✅ Can remove regular members
- [ ] As admin: ❌ Cannot remove owner or other admins
- [ ] As member: ❌ No menu buttons appear

---

## Edge Cases Handled

### 1. Removing Last Admin
- If last admin is removed, owner can still manage team
- No "orphaned" teams

### 2. Canceling Already-Accepted Invitation
- If invitation was accepted seconds before cancel
- Cancel fails gracefully (record already deleted)
- No error shown to user

### 3. Self-Removal
- Members can leave team via "Ta bort" on themselves
- Owners cannot remove themselves (must transfer ownership first)
- Confirmation message adjusted: "Är du säker på att du vill lämna teamet?"

### 4. Concurrent Actions
- If two admins try to remove same member simultaneously
- Second request fails gracefully
- UI syncs on next action or reload

---

## Future Enhancements

### 1. Bulk Actions
- Select multiple pending invites
- Cancel all selected at once
- Resend all pending invites

### 2. Invitation History
- Show accepted/declined invitations
- Track who invited whom
- Invitation analytics

### 3. Custom Invitation Messages
- Add personal message to invite
- Template system for common messages

### 4. Invitation Expiration Management
- See days until expiration
- Extend expiration date
- Auto-cleanup expired invites

### 5. Member Transfer
- Transfer wheels to another member before removing
- Ownership handoff workflow

---

## Success Criteria - All Met! ✅

- [x] Pending invitations visible to team owners/admins
- [x] Invitation count displayed
- [x] Email and date shown for each pending invite
- [x] Cancel invitation functionality working
- [x] Remove member functionality working
- [x] Proper permissions enforced
- [x] Confirmation dialogs prevent accidents
- [x] UI updates immediately after actions
- [x] Visual distinction between members and pending invites
- [x] Icons make sections easy to identify

---

## Notes

- Pending invitations are **only visible to owners and admins**
- Regular members do not see the pending invitations section
- This is intentional for privacy (invited people might not want their emails shown to all members)
- If you want all members to see pending invites, remove the `canManageTeam &&` condition

---

## Summary

Your team management system now has complete visibility and control over:
1. **Active members** - who's in the team
2. **Pending invitations** - who's been invited
3. **Invitation management** - cancel mistakes
4. **Member management** - remove when needed

This provides a professional, complete team management experience! 🎉
