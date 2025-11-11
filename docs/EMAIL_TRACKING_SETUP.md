# Email Tracking Setup Guide

## Overview
Email tracking is now implemented using Resend webhooks. The system tracks:
- 📤 **Delivered** - Successfully delivered to recipient's mail server
- 👁️ **Opened** - Recipient opened the email
- 🔗 **Clicked** - Recipient clicked a link
- ❌ **Failed** - Bounces and spam complaints

## Setup Steps

### 1. Apply Database Migration

Open Supabase SQL Editor:
https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/sql/new

Run the migration from:
`supabase/migrations/20251111_newsletter_tracking.sql`

This creates:
- ✅ `newsletter_events` table for detailed event tracking
- ✅ Tracking columns on `newsletter_sends` (delivered_count, opened_count, etc.)
- ✅ RPC functions for atomic counter updates
- ✅ Indexes for fast queries

### 2. Configure Resend Webhook

1. Go to Resend Webhooks page:
   https://resend.com/webhooks

2. Click **"Add Endpoint"**

3. **Endpoint URL:**
   ```
   https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/resend-webhook
   ```

4. **Events to subscribe:**
   - [x] `email.sent`
   - [x] `email.delivered`
   - [x] `email.delivery_delayed`
   - [x] `email.bounced`
   - [x] `email.complained`
   - [x] `email.opened`
   - [x] `email.clicked`

5. Click **"Create Endpoint"**

### 3. Test the Integration

1. Go to Newsletter Manager in your admin panel
2. Send a test newsletter to yourself (use "Admins" recipient type)
3. Wait a few seconds for delivery
4. Open the email
5. Click a link in the email
6. Refresh the Newsletter Manager page
7. You should see updated stats:
   - Delivered count increases
   - Opened count increases when you open
   - Clicked count increases when you click

## Webhook Function Details

**Function:** `resend-webhook`
**Deployed:** ✅ Version 1
**URL:** `https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/resend-webhook`

### What it does:
1. Receives webhook events from Resend
2. Extracts email ID, subject, recipient
3. Finds matching newsletter send in database
4. Records event in `newsletter_events` table
5. Updates aggregate counts on `newsletter_sends`
6. Prevents duplicate events

### Event Flow:
```
Resend API → Webhook → Edge Function → Database Update → UI Refresh
```

## Viewing Stats

The Newsletter Manager now shows detailed stats for each sent newsletter:

- **Skickade** (Sent) - Total recipients
- **Levererade** (Delivered) - Successfully delivered (green)
- **Öppnade** (Opened) - Email opens with percentage (blue)
- **Klick** (Clicked) - Link clicks (purple)
- **Misslyckade** (Failed) - Bounces/complaints (red, only shows if > 0)

Stats update in real-time as Resend sends webhooks!

## Monitoring

### Check Webhook Logs
```bash
supabase functions logs resend-webhook
```

Or in dashboard:
https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/functions/resend-webhook/logs

### Check Newsletter Events
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT newsletter_send_id) as newsletters
FROM newsletter_events
GROUP BY event_type
ORDER BY count DESC;
```

### Check Recent Events
```sql
SELECT 
  ns.subject,
  ne.event_type,
  ne.recipient,
  ne.created_at
FROM newsletter_events ne
JOIN newsletter_sends ns ON ne.newsletter_send_id = ns.id
ORDER BY ne.created_at DESC
LIMIT 20;
```

## Troubleshooting

### Stats Not Updating
1. Check webhook is configured in Resend dashboard
2. Check webhook logs for errors: `supabase functions logs resend-webhook`
3. Verify events are being inserted: `SELECT * FROM newsletter_events ORDER BY created_at DESC LIMIT 10`

### Duplicate Events
The function automatically prevents duplicates by checking if an event with the same `email_id` and `event_type` already exists.

### Missing Events
- **Opens**: Require images to be enabled in recipient's email client
- **Clicks**: Only tracked if recipient clicks links in the email
- **Delivered**: Takes a few seconds after sending

## Advanced: Query Stats

### Newsletter Performance Report
```sql
SELECT 
  subject,
  sent_at,
  recipient_count,
  delivered_count,
  opened_count,
  clicked_count,
  failed_count,
  ROUND((opened_count::FLOAT / NULLIF(delivered_count, 0)) * 100, 1) as open_rate,
  ROUND((clicked_count::FLOAT / NULLIF(opened_count, 0)) * 100, 1) as click_rate
FROM newsletter_sends
WHERE NOT is_draft
ORDER BY sent_at DESC
LIMIT 10;
```

### Event Timeline for Newsletter
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM newsletter_events
WHERE newsletter_send_id = 'YOUR_NEWSLETTER_ID'
GROUP BY event_type
ORDER BY first_event;
```

## Next Steps

1. ✅ Apply database migration
2. ✅ Configure Resend webhook
3. ✅ Send test newsletter
4. ✅ Verify stats update
5. 📊 Monitor open rates over time
6. 🎯 Optimize content based on click rates

The tracking system is now live and ready to use!
