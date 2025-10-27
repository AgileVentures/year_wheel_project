# GA4 API Secret Setup Guide

## Overview
This guide explains how to obtain the GA4 Measurement Protocol API Secret and configure it in Supabase for server-side purchase tracking.

## Why We Need This
The GA4 Measurement Protocol allows our Stripe webhook to send purchase events directly to Google Analytics from the server side. This provides a backup tracking mechanism when users don't return to our site after completing payment.

## Step 1: Get GA4 API Secret from Google Analytics

1. **Open Google Analytics 4**
   - Go to https://analytics.google.com
   - Select your property (GA4 Property ID: 508956250)

2. **Navigate to Admin Settings**
   - Click the gear icon (⚙️) in the bottom left
   - Under "Property" column, find "Data Streams"

3. **Select Your Data Stream**
   - Click on your web data stream (should show your website URL)
   - You should see Measurement ID: `G-89PHB9R4XE`

4. **Create Measurement Protocol API Secret**
   - Scroll down to "Measurement Protocol API secrets"
   - Click "Create" button
   - Give it a name like "YearWheel Server-Side Tracking"
   - Click "Create"
   - **COPY THE SECRET VALUE** - you won't be able to see it again!

## Step 2: Add Secret to Supabase

### Option A: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/settings/functions
2. Navigate to "Edge Functions" → "Secrets"
3. Click "Add new secret"
4. Name: `GA4_API_SECRET`
5. Value: Paste the API secret from Step 1
6. Click "Save"
7. Repeat for `GA4_MEASUREMENT_ID` with value: `G-89PHB9R4XE`

### Option B: Via Supabase CLI

```bash
# Set GA4 Measurement ID
npx supabase secrets set GA4_MEASUREMENT_ID=G-89PHB9R4XE

# Set GA4 API Secret (replace YOUR_SECRET_HERE with actual value)
npx supabase secrets set GA4_API_SECRET=YOUR_SECRET_HERE
```

## Step 3: Verify Configuration

After adding the secrets, the edge functions will automatically have access to them via `Deno.env.get()`.

To test:
1. Make a test purchase in Stripe test mode
2. Check Supabase Edge Functions logs: https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/logs/edge-functions
3. Look for log message: "GA4 purchase event sent successfully"
4. Verify in GA4 Realtime reports: https://analytics.google.com/analytics/web/#/p508956250/realtime/overview

## Architecture Overview

### Hybrid Tracking System
We now use a dual-tracking approach for maximum reliability:

1. **Client-Side Tracking (Primary)**
   - User completes payment → returns to site → Dashboard polls subscription status → triggers GTM event
   - Pros: Includes full user context, session data, and cross-domain tracking
   - Cons: Fails if user closes window or doesn't return to site

2. **Server-Side Tracking (Backup)**
   - Stripe webhook receives `checkout.session.completed` → extracts GA client_id from session metadata → sends event via Measurement Protocol
   - Pros: Always fires, no dependency on user returning to site
   - Cons: Limited context (only what we stored in session metadata)

### Data Flow

```
User clicks "Upgrade" 
  ↓
SubscriptionModal extracts GA client_id (via gtag API or _ga cookie)
  ↓
createCheckoutSession() passes gaClientId and planType to edge function
  ↓
create-checkout-session stores metadata in Stripe session:
  - ga_client_id
  - ga_user_id (Supabase user ID)
  - plan_type ('monthly' or 'yearly')
  - plan_name ('YearWheel Månadsvis' or 'YearWheel Årlig')
  ↓
User completes payment on Stripe
  ↓
Stripe webhook fires checkout.session.completed
  ↓
stripe-webhook edge function:
  1. Retrieves session metadata
  2. Constructs GA4 Measurement Protocol payload
  3. Sends POST to https://www.google-analytics.com/mp/collect
  ↓
GA4 records purchase event with transaction_id, value, currency, items
```

### Measurement Protocol Payload Structure

```json
{
  "client_id": "123456789.1234567890",
  "user_id": "uuid-from-supabase",
  "events": [{
    "name": "purchase",
    "params": {
      "transaction_id": "cs_test_...",
      "value": 199.00,
      "currency": "SEK",
      "coupon": "SUMMER2024",
      "items": [{
        "item_id": "monthly_plan",
        "item_name": "YearWheel Månadsvis",
        "price": 199.00,
        "quantity": 1
      }]
    }
  }]
}
```

## Troubleshooting

### "No GA client_id found in session metadata"
- Check that SubscriptionModal is correctly extracting client_id before checkout
- Verify that subscriptionService is passing gaClientId parameter
- Check create-checkout-session logs to confirm metadata storage

### "GA4 purchase event failed"
- Verify GA4_API_SECRET is correctly set in Supabase secrets
- Check that GA4_MEASUREMENT_ID matches your property (G-89PHB9R4XE)
- Review stripe-webhook logs for detailed error messages

### Events Not Appearing in GA4
- Check GA4 Realtime reports (events can take a few minutes)
- Verify Measurement Protocol API secret is active in GA4 admin panel
- Use GA4 DebugView mode: https://analytics.google.com/analytics/web/#/a508956250p508956250/debugview/overview

## Security Notes

- **Never commit GA4_API_SECRET to git** - it's already in .env.example as a placeholder only
- API secrets should be rotated periodically (every 6-12 months)
- Each secret can send up to 2,000 events per second (more than sufficient for our use case)
- Measurement Protocol events bypass ad blockers (server-to-server communication)

## References

- GA4 Measurement Protocol Documentation: https://developers.google.com/analytics/devguides/collection/protocol/ga4
- Supabase Edge Functions Secrets: https://supabase.com/docs/guides/functions/secrets
- Stripe Session Metadata: https://stripe.com/docs/api/checkout/sessions/object#checkout_session_object-metadata
