# 🚀 DEPLOYMENT GUIDE - Team Collaboration System

## Quick Start

You have **2 SQL files** that need to be run in Supabase SQL Editor:

### 1. TEAM_MEMBERS_EMAIL_LOOKUP.sql ⚠️ **CRITICAL - RUN FIRST**
**Why**: Without this, the app will crash when viewing team members  
**What**: Creates `get_team_members_with_emails()` RPC function  
**Impact**: Enables email display in member list

```sql
-- Copy entire content of TEAM_MEMBERS_EMAIL_LOOKUP.sql
-- Paste in Supabase SQL Editor → Run
```

### 2. TEAM_INVITATION_AUTO_ACCEPT.sql (Optional but Recommended)
**Why**: Improves UX for new user signups  
**What**: Auto-adds users to teams when they sign up  
**Impact**: New users don't need to click invite link after signup

```sql
-- Copy entire content of TEAM_INVITATION_AUTO_ACCEPT.sql
-- Paste in Supabase SQL Editor → Run
```

---

## Step-by-Step Deployment

### Step 1: Deploy Database Functions

1. Open **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy contents of `TEAM_MEMBERS_EMAIL_LOOKUP.sql`
5. Click **Run**
6. ✅ Verify: "Success. No rows returned"

7. Create another new query
8. Copy contents of `TEAM_INVITATION_AUTO_ACCEPT.sql`
9. Click **Run**
10. ✅ Verify: "Success. No rows returned"

### Step 2: Test the Application

#### Test 1: Member Email Display
1. Go to Dashboard → Teams tab
2. Click on a team
3. ✅ **Verify**: Member emails shown (e.g., `thomas@agileventures.org`)
4. ❌ **Should NOT see**: UUIDs like `822e88be-ee52...`

#### Test 2: New User Invitation
1. Create a team
2. Click "Bjud in" (Invite)
3. Enter a **new email** (not in system): `newuser@example.com`
4. Copy the invite link
5. Open **incognito window**
6. Paste invite link
7. ✅ **Verify**: **Signup form** is shown (not login)
8. Sign up with that email
9. ✅ **Verify**: Redirected to team page, user is a member
10. ✅ **Verify**: Email shown in member list

#### Test 3: Existing User Invitation
1. Create another team (or use same one)
2. Invite an **existing user** (one who already has an account)
3. Copy invite link
4. Open **incognito window**
5. Paste invite link
6. ✅ **Verify**: **Login form** is shown (not signup)
7. Log in with existing credentials
8. ✅ **Verify**: Added to team successfully
9. ✅ **Verify**: Email shown in member list

#### Test 4: Team Wheel Sharing
1. Create a wheel and assign to team
2. Log in as different team member
3. ✅ **Verify**: Wheel appears in their dashboard
4. ✅ **Verify**: Team badge shown on wheel card
5. ✅ **Verify**: Can edit wheel

---

## What's Deployed

### ✅ Completed Features

1. **Team CRUD**
   - Create, read, update, delete teams
   - Owner/Admin/Member roles
   - Permission-based actions

2. **Shareable Invite Links**
   - Generate unique invite tokens
   - Copy-to-clipboard functionality
   - 7-day expiration
   - Status tracking (pending/accepted/declined)

3. **Smart Authentication Routing**
   - New users → Signup form
   - Existing users → Login form
   - Automatic detection via email check

4. **Invitation Acceptance**
   - Email validation
   - Expiration checking
   - Duplicate member prevention
   - Graceful error handling

5. **Team Member Management**
   - List members with emails (not IDs)
   - Change member roles
   - Remove members
   - Owner transfer (ready for implementation)

6. **Team Wheels**
   - Assign wheel to team on creation
   - Move wheel to team
   - Remove wheel from team
   - Shared editing by team members
   - Team badges on wheel cards

7. **React Router Integration**
   - `/auth` - Login/signup
   - `/dashboard` - Main dashboard with tabs
   - `/wheel/:id` - Wheel editor
   - `/invite/:token` - Invitation acceptance
   - Protected routes with authentication

8. **Database Functions**
   - `get_team_members_with_emails()` - Fetch members with emails
   - `handle_new_user_team_invitations()` - Auto-accept on signup
   - `is_team_member()` - Check membership (security definer)
   - `can_manage_team()` - Check management permissions

---

## Troubleshooting

### Issue: "RPC function not found"
**Cause**: `TEAM_MEMBERS_EMAIL_LOOKUP.sql` not deployed  
**Solution**: Run the SQL file in Supabase SQL Editor

### Issue: Member list shows UUIDs
**Cause**: Same as above - RPC function missing  
**Solution**: Deploy `TEAM_MEMBERS_EMAIL_LOOKUP.sql`

### Issue: Always shows signup form (even for existing users)
**Cause**: `checkEmailExists()` logic might not find user  
**Debug**: 
1. Check console for "Email exists check: email → true/false"
2. Verify user has accepted invitations in `team_invitations` table
3. Check `inviteIsNewUser` in sessionStorage

### Issue: Invitation acceptance fails
**Cause**: Multiple possible causes  
**Debug**:
1. Check console for specific error
2. Verify invitation exists and is not expired
3. Check user email matches invitation email
4. Verify team still exists

### Issue: Auto-accept not working
**Cause**: `TEAM_INVITATION_AUTO_ACCEPT.sql` not deployed  
**Solution**: Run the SQL file, or manually accept invitations via UI

---

## Architecture Overview

```
User clicks invite link
↓
/invite/:token (InviteAcceptPage)
├─ If not authenticated
│  ├─ Fetch invitation to get email
│  ├─ Check if email exists (checkEmailExists)
│  ├─ Store inviteIsNewUser flag
│  └─ Redirect to /auth
│     ├─ If new user → Show signup form
│     └─ If existing → Show login form
│
└─ If authenticated
   ├─ Fetch invitation
   ├─ Validate (email, expiration, status)
   ├─ Check if already member
   ├─ Add to team_members
   ├─ Update invitation status
   └─ Redirect to /dashboard?view=teams

Team Members Display
↓
getTeamMembers(teamId) in teamService.js
↓
supabase.rpc('get_team_members_with_emails')
↓
Database function queries:
├─ team_members (role, joined_at)
└─ auth.users (email) via SECURITY DEFINER
↓
Returns members with emails
↓
UI displays: email, role, badge
```

---

## Database Schema

### Tables
- `teams` - Team data (name, description, owner_id)
- `team_members` - Membership (team_id, user_id, role)
- `team_invitations` - Pending/accepted invitations (token, email, status)
- `year_wheels` - Wheels with optional team_id

### Functions
- `get_team_members_with_emails(uuid)` - Fetch members with emails
- `handle_new_user_team_invitations()` - Trigger for auto-accept
- `is_team_member(uuid, uuid)` - Check membership
- `can_manage_team(uuid, uuid)` - Check management rights

### RLS Policies
- Teams: Owner can manage, members can view
- Team Members: Members can view, admins can manage
- Team Invitations: Anyone can view their own, team admins can create
- Year Wheels: Team members can view/edit team wheels

---

## Next Steps (Optional Enhancements)

1. **User Profiles Table**
   - Create `public.profiles` synced with `auth.users`
   - Add avatars, display names, bio
   - Improve performance (no RPC needed)

2. **Email Notifications**
   - Configure Supabase SMTP
   - Send email when invited
   - Send email when added to team
   - Daily/weekly digests

3. **Advanced Permissions**
   - Custom roles beyond owner/admin/member
   - Per-wheel permissions
   - View-only access

4. **Team Analytics**
   - Member activity tracking
   - Wheel usage statistics
   - Invitation acceptance rates

5. **Bulk Operations**
   - Invite multiple emails at once
   - Bulk role changes
   - CSV import/export

---

## Support

If you encounter issues:

1. **Check console logs** - All operations log to console
2. **Verify SQL migrations** - Both files must be run
3. **Check Supabase logs** - Go to Logs → Edge Functions in dashboard
4. **Review RLS policies** - Ensure permissions are correct

---

## Success! 🎉

Your team collaboration system is now fully functional with:
- ✅ Shareable invite links
- ✅ Smart signup/login detection
- ✅ Member email display (not UUIDs)
- ✅ Team wheel sharing
- ✅ Professional UI/UX
- ✅ Secure database functions
- ✅ Complete documentation

**Ready to deploy and start collaborating!**
