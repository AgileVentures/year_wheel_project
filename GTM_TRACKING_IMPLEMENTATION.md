# Google Tag Manager Tracking Implementation
**Date:** 27 October 2025 (Updated: Hybrid Tracking Added)  
**Project:** YearWheel SaaS  
**GTM Container ID:** GTM-MX5D5LSB  
**GA4 Property ID:** 508956250  
**GA4 Measurement ID:** G-89PHB9R4XE

## Overview
This document describes the complete implementation of Google Analytics 4 (GA4) recommended events for YearWheel's signup and purchase flows, including both client-side and server-side tracking mechanisms.

## Implementation Architecture

### 1. Client-Side Tracking (Browser) - Primary
- **Location:** Frontend React application
- **Trigger Points:**
  - `sign_up`: After successful Supabase authentication (email OR OAuth)
  - `purchase`: After successful Stripe checkout session (when user returns to dashboard)
- **Pros:** Full user context, cross-domain tracking, session data
- **Cons:** Fails if user closes window, blocked by ad blockers

### 2. Server-Side Tracking (GA4 Measurement Protocol) - Backup (NEW)
- **Location:** Supabase Edge Function (stripe-webhook)
- **Trigger Points:**
  - `purchase`: Stripe webhook `checkout.session.completed` event
- **Pros:** Always fires, bypasses ad blockers, no dependency on user returning
- **Cons:** Limited context (only metadata stored during checkout)
- **Configuration:** See `GA4_API_SECRET_SETUP.md` for setup instructions

### 3. Data Flow

**Client-Side:**
```
User Action → Frontend Logic → dataLayer.push() → GTM → GA4
```

**Server-Side:**
```
Stripe Payment → Webhook → Metadata Extraction → GA4 Measurement Protocol → GA4
```

**Key Implementation Files:**
- `src/utils/gtm.js` - GTM utility functions
- `src/contexts/AuthContext.jsx` - Sign-up tracking
- `src/components/dashboard/Dashboard.jsx` - Purchase tracking (client-side)
- `src/components/subscription/SubscriptionModal.jsx` - GA client_id extraction
- `supabase/functions/create-checkout-session/index.ts` - Metadata storage
- `supabase/functions/stripe-webhook/index.ts` - Server-side purchase tracking
- `index.html` - GTM initialization

---

## Event Implementations

### Event 1: sign_up

**Trigger:** When user successfully creates account (after backend confirmation)

**Implementation Locations:**
1. **Email signup:** `src/contexts/AuthContext.jsx:77-86`
2. **Google OAuth:** `src/contexts/AuthContext.jsx:36-42` (tracked on SIGNED_IN event for new users)

**Payload Structure:**
```javascript
{
  event: 'sign_up',
  method: 'email' | 'google' | 'github',
  user_id: 'abc123...', // Supabase user UUID
  plan: 'free',
  page_location: 'https://yearwheel.se/...',
  timestamp: '2025-10-27T12:34:56.789Z'
}
```

**Example Payloads:**

**Email Signup:**
```javascript
window.dataLayer.push({
  event: 'sign_up',
  method: 'email',
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  plan: 'free',
  page_location: 'https://yearwheel.se/',
  timestamp: '2025-10-27T14:23:15.123Z'
});
```

**Google OAuth Signup:**
```javascript
window.dataLayer.push({
  event: 'sign_up',
  method: 'google',
  user_id: '660f9511-f39c-52e5-b827-557766551111',
  plan: 'free',
  page_location: 'https://yearwheel.se/',
  timestamp: '2025-10-27T14:25:42.456Z'
});
```

**Timing:**
- Email: Immediately after `supabase.auth.signUp()` succeeds
- Google OAuth: On first `SIGNED_IN` event (within 5 seconds of account creation)
- **Deduplication:** OAuth signup uses `hasTrackedSignup` state flag to prevent double-tracking

**Notes:**
- `user_id` is always the Supabase-generated UUID (anonymous, not email)
- `plan` is always 'free' on signup (upgrades tracked as `purchase`)
- Event only fires ONCE per successful registration

---

### Event 2: purchase

**Trigger:** When user successfully completes Stripe checkout and returns to dashboard

**Implementation Location:** `src/components/dashboard/Dashboard.jsx:208-287`

**Flow:**
1. User clicks "Uppgradera" → redirected to Stripe Checkout
2. User completes payment
3. Stripe redirects to: `https://yearwheel.se/dashboard?session_id={CHECKOUT_SESSION_ID}`
4. Dashboard detects `session_id` parameter
5. Polls subscription status (webhook processing)
6. Once subscription confirmed → `dataLayer.push()`

**Payload Structure (GA4 Ecommerce):**
```javascript
{
  event: 'purchase',
  ecommerce: {
    transaction_id: 'sub_abc123...', // Stripe subscription ID
    value: 79 | 768, // Price in SEK
    currency: 'SEK',
    items: [
      {
        item_id: 'yearwheel_monthly' | 'yearwheel_yearly',
        item_name: 'YearWheel Månadsvis' | 'YearWheel Årlig',
        item_category: 'subscription',
        price: 79 | 768,
        quantity: 1
      }
    ],
    coupon: 'SUMMER2025' // Optional, only if used
  },
  user_id: 'abc123...', // Supabase user UUID
  plan: 'monthly' | 'yearly',
  page_location: 'https://yearwheel.se/dashboard',
  timestamp: '2025-10-27T12:34:56.789Z'
}
```

**Example Payloads:**

**Monthly Subscription:**
```javascript
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'sub_1OabCd2eZvKYlo2C3vWxYz4K',
    value: 79,
    currency: 'SEK',
    items: [
      {
        item_id: 'yearwheel_monthly',
        item_name: 'YearWheel Månadsvis',
        item_category: 'subscription',
        price: 79,
        quantity: 1
      }
    ]
  },
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  plan: 'monthly',
  page_location: 'https://yearwheel.se/dashboard',
  timestamp: '2025-10-27T14:30:22.789Z'
});
```

**Yearly Subscription (with coupon):**
```javascript
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'sub_1OabCd2eZvKYlo2C3vWxYz4K',
    value: 768,
    currency: 'SEK',
    items: [
      {
        item_id: 'yearwheel_yearly',
        item_name: 'YearWheel Årlig',
        item_category: 'subscription',
        price: 768,
        quantity: 1
      }
    ],
    coupon: 'LAUNCH2025'
  },
  user_id: '660f9511-f39c-52e5-b827-557766551111',
  plan: 'yearly',
  page_location: 'https://yearwheel.se/dashboard',
  timestamp: '2025-10-27T14:31:05.123Z'
});
```

**Timing:**
- Triggered during polling loop (2-second intervals, max 10 attempts = 20 seconds)
- Only fires ONCE per checkout session (`hasTrackedPurchase` flag)
- Requires both `session_id` URL param AND confirmed subscription data from backend

**Notes:**
- `transaction_id` uses Stripe subscription ID (from `subscriptions.stripe_subscription_id`)
- Pricing: 79 SEK/month OR 768 SEK/year (no other tiers currently)
- Coupon tracking: Currently NOT implemented (Stripe allows promo codes, but we don't pass them yet)
- **Deduplication:** Uses local flag to prevent multiple triggers during polling
- **Reliability:** May fail if user closes browser before returning to dashboard

---

### Event 2b: purchase (Server-Side Backup) - NEW

**Trigger:** Stripe webhook receives `checkout.session.completed` event

**Implementation Location:** `supabase/functions/stripe-webhook/index.ts:87-150`

**Flow:**
1. User completes payment on Stripe
2. Stripe fires `checkout.session.completed` webhook
3. Edge function extracts GA metadata from session (stored during checkout)
4. Sends event to GA4 Measurement Protocol API
5. GA4 records purchase even if user never returns to site

**Payload Structure (GA4 Measurement Protocol):**
```javascript
{
  client_id: '123456789.1234567890', // From _ga cookie or gtag API
  user_id: 'abc123...', // Supabase user UUID (optional)
  events: [{
    name: 'purchase',
    params: {
      transaction_id: 'cs_test_abc123...', // Stripe checkout session ID
      value: 79 | 768,
      currency: 'SEK',
      coupon: 'LAUNCH2025', // If discount applied
      items: [{
        item_id: 'monthly_plan' | 'yearly_plan',
        item_name: 'YearWheel Månadsvis' | 'YearWheel Årlig',
        price: 79 | 768,
        quantity: 1
      }]
    }
  }]
}
```

**Metadata Storage:**
During checkout creation (`create-checkout-session/index.ts`), we store:
```javascript
session.metadata = {
  ga_client_id: '123456789.1234567890', // Extracted from _ga cookie or gtag
  ga_user_id: 'abc123...', // Supabase user UUID
  plan_type: 'monthly' | 'yearly',
  plan_name: 'YearWheel Månadsvis' | 'YearWheel Årlig'
}
```

**API Endpoint:**
```
POST https://www.google-analytics.com/mp/collect?measurement_id=G-89PHB9R4XE&api_secret={SECRET}
```

**Configuration Required:**
See `GA4_API_SECRET_SETUP.md` for detailed setup instructions:
1. Create Measurement Protocol API secret in GA4 admin panel
2. Add `GA4_MEASUREMENT_ID` and `GA4_API_SECRET` to Supabase edge function secrets
3. Deploy edge functions: `create-checkout-session` and `stripe-webhook`

**Advantages:**
- **Always fires** - no dependency on user returning to site
- **Bypasses ad blockers** - server-to-server communication
- **Accurate timing** - tracks exact moment payment succeeds
- **Transaction ID from Stripe** - uses checkout session ID for perfect deduplication

**Limitations:**
- **No session context** - can't track pageviews, referrers, etc.
- **Limited user data** - only what we store in metadata during checkout
- **Requires manual client_id extraction** - uses gtag API or _ga cookie parsing

**Deduplication Strategy:**
Client-side and server-side events use DIFFERENT transaction IDs:
- Client-side: `transaction_id = subscription.stripe_subscription_id` (e.g., `sub_abc123...`)
- Server-side: `transaction_id = checkout_session.id` (e.g., `cs_test_abc123...`)

This ensures GA4 treats them as separate events (won't deduplicate), providing backup coverage.

---

## GTM Setup Recommendations

### Trigger Configuration

**sign_up Trigger:**
```
Trigger Type: Custom Event
Event Name: sign_up
Conditions: 
  - event equals sign_up
  - method matches regex: email|google|github
```

**purchase Trigger:**
```
Trigger Type: Custom Event
Event Name: purchase
Conditions:
  - event equals purchase
  - ecommerce.transaction_id is not undefined
```

### Variable Configuration

**Recommended Data Layer Variables:**
- `method` (Built-in: Data Layer Variable → method)
- `user_id` (Built-in: Data Layer Variable → user_id)
- `plan` (Built-in: Data Layer Variable → plan)
- `ecommerce.transaction_id` (Built-in: Data Layer Variable → ecommerce.transaction_id)
- `ecommerce.value` (Built-in: Data Layer Variable → ecommerce.value)

### GA4 Tag Configuration

**Tag 1: sign_up Event**
```
Tag Type: GA4 Event
Event Name: sign_up
Event Parameters:
  - method: {{DLV - method}}
  - user_id: {{DLV - user_id}} (or send as User Property)
  - plan: {{DLV - plan}}
```

**Tag 2: purchase Event**
```
Tag Type: GA4 Event
Event Name: purchase
Send Ecommerce Data: ✅ Enabled
  - Use data layer (ecommerce object)
Event Parameters:
  - user_id: {{DLV - user_id}}
  - plan: {{DLV - plan}}
```

---

## Testing & Validation

### Test Scenarios

**1. Email Sign-up:**
```bash
# Expected dataLayer push
1. Visit https://yearwheel.se/
2. Fill email/password form
3. Submit → Check Console for:
   "[GTM] sign_up event pushed: { method: 'email', userId: '...', plan: 'free' }"
4. Verify in GTM Preview Mode
```

**2. Google OAuth Sign-up:**
```bash
# Expected dataLayer push
1. Visit https://yearwheel.se/
2. Click "Continue with Google"
3. Complete OAuth flow
4. After redirect → Check Console for:
   "[GTM] sign_up event pushed: { method: 'google', userId: '...', plan: 'free' }"
5. Verify in GTM Preview Mode
```

**3. Subscription Purchase (Monthly):**
```bash
# Expected dataLayer push
1. Login to https://yearwheel.se/dashboard
2. Click "Uppgradera till Premium"
3. Select "Månadsvis" (79 kr/månad)
4. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
5. After redirect to /dashboard?session_id=... → Check Console for:
   "[Dashboard] GTM purchase event tracked: { planType: 'monthly', value: 79, userId: '...' }"
6. Verify in GTM Preview Mode
```

**4. Subscription Purchase (Yearly):**
```bash
# Same as above, but select "Årlig" (768 kr/år)
# Expected value: 768
```

### Console Verification

**Enable verbose logging:**
```javascript
// Open browser console on https://yearwheel.se/
console.log('dataLayer:', window.dataLayer);

// After sign_up event:
window.dataLayer.filter(e => e.event === 'sign_up')

// After purchase event:
window.dataLayer.filter(e => e.event === 'purchase')
```

### GTM Preview Mode
1. Go to GTM container (GTM-MX5D5LSB)
2. Click "Preview"
3. Enter URL: https://yearwheel.se/
4. Complete signup/purchase flow
5. Verify events appear in Preview timeline

---

## Edge Cases & Deduplication

### Duplicate Sign-ups
**Scenario:** User refreshes page during signup flow  
**Solution:** Events only fire on SUCCESS response from backend (not on form submit)

### Duplicate Purchases
**Scenario:** User refreshes dashboard after checkout  
**Solution:** 
- `session_id` is removed from URL immediately after detection
- `hasTrackedPurchase` flag prevents multiple pushes during polling
- Event tied to subscription confirmation (not just URL param)

### OAuth Timing Issues
**Scenario:** OAuth redirect happens before dataLayer initializes  
**Solution:** 
- dataLayer initialized in `<head>` before GTM script
- OAuth tracking uses `onAuthStateChange` listener (always fires)
- 5-second window check ensures only NEW users tracked

### Webhook Delay
**Scenario:** Stripe webhook hasn't processed yet when user returns  
**Solution:** 
- Polling mechanism (2s intervals, 20s max)
- Event only fires once subscription object exists in database
- Graceful fallback: uses `session_id` as `transaction_id` if subscription not ready

---

## Current Limitations & Future Improvements

### Not Currently Tracked:
- ❌ Coupon codes (Stripe allows them, but we don't pass to dataLayer)
- ❌ Cancellation events (user downgrades to free)
- ❌ Failed payment events (retry/decline)
- ❌ Upgrade events (free → paid tracked, but not monthly → yearly)

### Recommended Future Events:
```javascript
// Subscription cancellation
{
  event: 'subscription_cancel',
  plan: 'monthly' | 'yearly',
  cancel_reason: 'user_initiated' | 'payment_failed',
  user_id: '...'
}

// Subscription upgrade (monthly → yearly)
{
  event: 'subscription_upgrade',
  from_plan: 'monthly',
  to_plan: 'yearly',
  user_id: '...'
}

// Payment failure
{
  event: 'payment_failed',
  plan: 'monthly' | 'yearly',
  user_id: '...'
}
```

---

## Production URLs

**Live Site:** https://yearwheel.se/  
**Dashboard:** https://yearwheel.se/dashboard  
**Checkout Return URL:** https://yearwheel.se/dashboard?session_id={CHECKOUT_SESSION_ID}

---

## Support & Contact

**Developer:** Thomas Ochman (thomas@freefoot.se)  
**GTM Container:** GTM-MX5D5LSB  
**Stripe Account:** YearWheel (connected to thomas@freefoot.se)

---

## Quick Reference: All Data Layer Events

### sign_up
```javascript
{
  event: 'sign_up',
  method: 'email' | 'google' | 'github',
  user_id: string, // UUID
  plan: 'free',
  page_location: string,
  timestamp: string // ISO 8601
}
```

### purchase
```javascript
{
  event: 'purchase',
  ecommerce: {
    transaction_id: string, // Stripe sub ID
    value: number, // 79 or 768
    currency: 'SEK',
    items: [{
      item_id: 'yearwheel_monthly' | 'yearwheel_yearly',
      item_name: string,
      item_category: 'subscription',
      price: number,
      quantity: 1
    }],
    coupon: string | null // Optional
  },
  user_id: string,
  plan: 'monthly' | 'yearly',
  page_location: string,
  timestamp: string
}
```

---

**Version:** 1.0  
**Last Updated:** 27 October 2025
