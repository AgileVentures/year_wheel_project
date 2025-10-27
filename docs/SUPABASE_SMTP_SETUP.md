# Setting Up SMTP with Gmail on Supabase

## Overview
This guide provides step-by-step instructions for configuring Gmail's SMTP service with your Supabase project to enable email notifications for mentions, direct messages, and system announcements.

---

## Prerequisites

Before starting, ensure you have the following:

- A Supabase account with an existing project
- A Gmail account that will be used as the SMTP server
- 2-Step Verification enabled on your Gmail account
- An App Password generated specifically for use with Supabase

---

## Step 1: Enable 2-Step Verification and Generate an App Password

Gmail requires 2-Step Verification to be enabled for generating an App Password, which is used for SMTP authentication.

### 1.1 Enable 2-Step Verification

1. Sign in to your Google account at [myaccount.google.com](https://myaccount.google.com)
2. Navigate to the **Security** section on the left-hand side
3. Under **Signing in to Google**, select **2-Step Verification**
4. Follow the prompts to enable 2-Step Verification if you haven't already done so

### 1.2 Generate an App Password

1. After enabling 2-Step Verification, return to the **Security** section
2. Under **Signing in to Google**, select **App passwords**
3. In the **Select app** dropdown, choose **Mail**
4. In the **Select device** dropdown, select **Other (Custom name)** and enter "Supabase SMTP"
5. Click **Generate**
6. A 16-character password will be displayed. **Copy this password** as you will need it for the SMTP configuration in Supabase
   
   ⚠️ **Note**: This is not your usual Gmail password.

---

## Step 2: Configure SMTP Settings in Supabase

With your App Password ready, you can now configure the SMTP settings in your Supabase project.

### 2.1 Access the Supabase Project Settings

1. Log in to your Supabase account at [app.supabase.io](https://app.supabase.io)
2. Navigate to the project where you want to set up the SMTP service
3. In the left-hand menu, go to **Project Settings** → **Authentication** → **SMTP Settings**

### 2.2 Enter the SMTP Configuration Details

Configure the following settings:

| Setting | Value |
|---------|-------|
| **SMTP Host** | `smtp.gmail.com` |
| **SMTP Port** | `587` (for TLS) or `465` (for SSL) |
| **SMTP User** | Your full Gmail email address (e.g., `youremail@gmail.com`) |
| **SMTP Password** | The App Password generated earlier |

Click **Save** to apply the settings.

---

## Step 3: Verify and Test the SMTP Configuration

After saving the SMTP settings, it's important to test the configuration to ensure that emails are sent correctly.

### 3.1 Send a Test Email

1. Navigate to the **Authentication** section within your Supabase project
2. Trigger a test email, such as a password reset or email verification, to confirm the SMTP settings are working
3. Check your Gmail "Sent" folder to see if the email was successfully sent

### 3.2 Monitor Google Security Alerts

Google may occasionally block sign-ins from less secure apps. If you encounter any issues:
- Check your Gmail account for security alerts
- Follow the instructions provided to resolve any blocks

---

## Step 4: Troubleshooting Common Issues

If you experience issues with your SMTP configuration, consider the following troubleshooting steps:

### 4.1 Verify SMTP Port and Security Settings

Ensure that the correct port is used for the security type selected:

- **Port 587** with TLS (recommended)
- **Port 465** with SSL

### 4.2 Confirm the App Password

- Ensure that you are using the correct App Password generated from your Google account
- This password is different from your regular Gmail password
- The App Password is 16 characters without spaces

### 4.3 Check Supabase Logs

Supabase provides logs for email activity, which can be useful for diagnosing issues:
1. Access these logs in the Supabase dashboard under the **Logs** section
2. Filter for email-related events
3. Look for error messages that indicate what went wrong

### 4.4 Common Error Messages

| Error | Solution |
|-------|----------|
| "Invalid credentials" | Verify App Password is correct and 2FA is enabled |
| "Connection timeout" | Check firewall settings and SMTP port configuration |
| "Authentication failed" | Regenerate App Password and update Supabase settings |

---

## Step 5: Additional Considerations

### 5.1 Gmail Sending Limits

Gmail has daily sending limits for SMTP:
- **Free Gmail accounts**: 500 emails per day
- **Google Workspace**: 2,000 emails per day

If your project requires a high volume of emails, consider using a dedicated SMTP service provider:
- [Mailgun](https://www.mailgun.com/)
- [SendGrid](https://sendgrid.com/)
- [Amazon SES](https://aws.amazon.com/ses/)
- [Postmark](https://postmarkapp.com/)

### 5.2 Security and Privacy

- Ensure that the Gmail account used for SMTP is secured with strong authentication methods
- Do not share the App Password with unauthorized parties
- Store the App Password securely (consider using environment variables)
- Regularly rotate App Passwords for enhanced security

### 5.3 Email Templates

For the YearWheel application, you'll want to configure email templates for:
- **Mention notifications**: "@User mentioned you in [Wheel Name]"
- **Direct messages**: "New message from [User]"
- **System announcements**: Broadcast messages from admins
- **Comment replies**: "Someone replied to your comment"
- **Wheel invitations**: Team member invitations

Example template structure:
```html
Subject: {{notification_type}} - YearWheel

Hi {{user_name}},

{{notification_message}}

[View in YearWheel] {{action_url}}

---
Manage your notification preferences: {{settings_url}}
```

---

## YearWheel-Specific Implementation Notes

### Email Notification Triggers

Based on the current implementation (migrations 023 & 024), emails should be triggered for:

1. **@Mentions in Comments** (item_comments & wheel_comments)
   - Trigger: User mentioned in comment content
   - Recipients: All mentioned users (excluding commenter)
   - Template: Include comment excerpt and link to wheel/item

2. **Direct Messages** (future implementation)
   - Trigger: New direct message sent
   - Recipients: Message recipient
   - Template: Include message subject and sender info

3. **System Broadcasts** (future implementation - admin only)
   - Trigger: Admin sends announcement
   - Recipients: All users or specific teams
   - Template: Full announcement with admin signature

### Supabase Edge Function for Email Sending

You'll need to create a Supabase Edge Function to send emails:

```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { to, subject, html, text } = await req.json()
  
  // Email sending logic using SMTP configuration
  // This will use the SMTP settings configured in Step 2
  
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } },
  )
})
```

### Email Preferences Table

Consider adding a user preferences table for email notifications:

```sql
CREATE TABLE user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email_on_mention BOOLEAN DEFAULT TRUE,
  email_on_direct_message BOOLEAN DEFAULT TRUE,
  email_on_broadcast BOOLEAN DEFAULT TRUE,
  email_on_comment_reply BOOLEAN DEFAULT TRUE,
  digest_frequency TEXT DEFAULT 'immediate'
    CHECK (digest_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Conclusion

By following these steps, you have successfully configured SMTP on Supabase using Gmail (`smtp.gmail.com`). Your Supabase project is now equipped to send emails using Gmail's reliable and secure SMTP service. 

**Recommended Next Steps:**
1. ✅ Complete SMTP setup (this guide)
2. ⏳ Create email templates in Supabase
3. ⏳ Implement Supabase Edge Function for email sending
4. ⏳ Add email preferences UI in ProfilePage component
5. ⏳ Test email delivery for all notification types
6. ⏳ Monitor sending limits and consider upgrading to dedicated SMTP provider for production

This setup is ideal for small to medium-sized projects, but for larger-scale email operations, consider transitioning to a dedicated SMTP provider for enhanced performance and scalability.

---

## Related Documentation

- [ADVANCED_FEATURES_VERSION_HISTORY.md](./ADVANCED_FEATURES_VERSION_HISTORY.md) - Version control implementation
- [ADVANCED_FEATURES_GOOGLE_INTEGRATIONS.md](./ADVANCED_FEATURES_GOOGLE_INTEGRATIONS.md) - Google Calendar/Sheets sync
- [FEATURE_IDEAS_COLLABORATION_LINKING.md](./FEATURE_IDEAS_COLLABORATION_LINKING.md) - Future messaging system architecture
- [README.md](./README.md) - Main project documentation
