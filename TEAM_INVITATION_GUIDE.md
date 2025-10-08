# Team Invitation System - Implementation Guide

## Overview
We use Supabase's built-in authentication combined with a custom team invitation system that automatically adds users to teams when they sign up or accept invitations.

## How It Works

### For New Users (Not on YearWheel yet)
1. **Team admin invites by email** → Creates invitation record in database
2. **User gets signup link** (via email or shared link)
3. **User signs up** → Supabase trigger automatically:
   - Checks for pending invitations for that email
   - Adds user to teams
   - Marks invitations as accepted

### For Existing Users
1. **Team admin invites by email** → Creates invitation record
2. **User sees invitation** in "Inbjudningar" tab
3. **User clicks "Acceptera"** → Added to team immediately

## Database Setup

### Step 1: Apply Auto-Accept Trigger
Run `TEAM_INVITATION_AUTO_ACCEPT.sql` in Supabase SQL Editor

This creates a trigger that runs when a new user signs up and automatically:
- Finds pending invitations for their email
- Adds them to those teams
- Marks invitations as accepted

### Step 2: Invitation Flow Options

#### Option A: Simple Link Sharing (Recommended for MVP)
No emails needed! Team admins can:
1. Create invitation in YearWheel
2. Copy the invitation link: `https://yourapp.com/invite/{token}`
3. Share via email/Slack/WhatsApp/etc
4. Recipient clicks link → taken to signup/login

#### Option B: Supabase Auth Invites (Email required)
Use Supabase's built-in email system:
1. Configure email templates in Supabase Dashboard
2. Update `sendTeamInvitation()` to call Supabase Admin API
3. Sends professional emails automatically

## Frontend Implementation

### Current Status ✅
- ✅ Create team invitation (database record)
- ✅ View pending invitations
- ✅ Accept invitation (for existing users)
- ✅ Auto-accept on signup (database trigger)

### Next Steps 📋

#### 1. Add Invitation Link Sharing
In `InviteMemberModal.jsx`, after creating invitation:
```javascript
const inviteUrl = `${window.location.origin}/invite/${data.token}`;
// Show copy button or send via Supabase email
```

#### 2. Create Invite Accept Page
New route: `/invite/:token`
```javascript
// Check if user logged in
// If yes → accept invitation
// If no → redirect to signup with return URL
```

#### 3. Optional: Enable Supabase Email
Configure in Supabase Dashboard:
- SMTP settings (or use Supabase's built-in)
- Email templates for invitations
- Custom branding

## Testing the Flow

### Test 1: New User Signup
1. Invite `newuser@example.com` to a team
2. Have them sign up with that email
3. ✅ They should automatically be in the team

### Test 2: Existing User
1. Invite existing user's email to a team
2. They log in and see invitation in "Inbjudningar" tab
3. Click "Acceptera"
4. ✅ They should be added to team

### Test 3: Link Sharing (when implemented)
1. Create invitation, copy link
2. Share link with user
3. User clicks link → signup → auto-added to team

## Security Notes

- ✅ Invitations expire after 7 days
- ✅ Email validation (lowercase, trimmed)
- ✅ RLS policies prevent unauthorized access
- ✅ Security definer functions bypass RLS safely
- ✅ Token is UUID (secure, unguessable)

## Next Features to Add

1. **Email notifications** (via Supabase)
2. **Invitation link page** (`/invite/:token`)
3. **Resend invitation** option
4. **Bulk invitations** (multiple emails at once)
5. **Invitation analytics** (sent, accepted, expired)

## Code Examples

### Send Invitation (Current)
```javascript
await sendTeamInvitation(teamId, 'user@example.com');
// Creates database record
// Returns invitation with token
```

### Accept Invitation (Current)
```javascript
await acceptInvitation(invitationId);
// Adds user to team
// Updates status to 'accepted'
```

### Future: Email Invitation
```javascript
// In sendTeamInvitation()
const { data: invitation } = await supabase
  .from('team_invitations')
  .insert([...])
  .select()
  .single();

// Send email via Supabase
const inviteUrl = `https://yourapp.com/invite/${invitation.token}`;
await supabase.auth.admin.inviteUserByEmail(email, {
  data: { inviteUrl, teamName }
});
```
