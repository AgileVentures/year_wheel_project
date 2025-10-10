# Stripe Subscription Implementation Guide

## Overview
This guide will help you implement a Stripe subscription system with custom payment modals for Year Wheel POC.

## Pricing Structure
- **Free Plan**: 2 wheels, 1 team (3 members), PNG/SVG export
- **Monthly Plan**: 79 SEK/month - Unlimited everything
- **Yearly Plan**: 768 SEK/year (64 SEK/month, 19% discount)

---

## Step 1: Stripe Dashboard Setup

### 1.1 Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Enable test mode for development
3. Note your API keys (Dashboard → Developers → API keys)

### 1.2 Create Products and Prices
1. Go to Products in Stripe Dashboard
2. Create product: "Year Wheel Premium"
3. Add two prices:
   - **Monthly**: 79 SEK recurring monthly
   - **Yearly**: 768 SEK recurring yearly
4. Copy the price IDs (starts with `price_...`)

### 1.3 Set Up Webhook Endpoint
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret

---

## Step 2: Environment Variables

Add to your `.env` file:

```bash
# Stripe Keys (get from Stripe Dashboard)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
VITE_STRIPE_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_YEARLY_PRICE_ID=price_...

# Your app URL
VITE_APP_URL=http://localhost:5173
```

Set secrets via Supabase CLI (SUPABASE_* vars are auto-provided):
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# NOTE: Don't set SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
# These are automatically provided by Supabase!
```

---

## Step 3: Database Setup

Run the SQL script in Supabase SQL Editor:

```bash
# File: STRIPE_SUBSCRIPTION_SETUP.sql
# This creates:
# - subscriptions table
# - subscription_events table
# - Helper functions for checking limits
# - RLS policies
```

---

## Step 4: Install Dependencies

```bash
npm install @stripe/stripe-js
npm install stripe  # For Edge Functions (if using Supabase Functions)
```

---

## Step 5: Supabase Edge Function (Webhook Handler)

Create a new Edge Function in Supabase:

```bash
# In Supabase Dashboard:
# Functions → Create a new function → Name: "stripe-webhook"
```

The webhook handler will:
1. Verify Stripe signature
2. Handle subscription events
3. Update subscription status in database

---

## Step 6: Frontend Implementation

### 6.1 Subscription Hook
Create `src/hooks/useSubscription.jsx` to:
- Fetch user subscription status
- Check usage limits
- Trigger checkout

### 6.2 Payment Modal
Create `src/components/subscription/SubscriptionModal.jsx`:
- Custom design with your branding
- Shows pricing tiers
- Triggers Stripe Checkout
- Handles success/failure

### 6.3 Upgrade Prompts
Add upgrade prompts when users hit limits:
- When creating 3rd wheel
- When adding 4th team member
- When trying to export premium formats

---

## Step 7: Usage Restrictions

### 7.1 Dashboard - Wheel Creation
Check `can_create_wheel()` before allowing new wheel creation

### 7.2 Team Management
Check `can_add_team_member()` before sending invites

### 7.3 Export Restrictions
Only allow PNG/SVG for free users

---

## Step 8: Testing

### Test Cards (Stripe Test Mode)
- **Success**: 4242 4242 4242 4242
- **Declined**: 4000 0000 0000 0002
- **Requires Auth**: 4000 0025 0000 3155

### Test Scenarios
1. Create account → Check free limits
2. Start subscription → Verify upgrade
3. Cancel subscription → Verify downgrade
4. Webhook failures → Check error handling

---

## Step 9: Production Deployment

1. Switch Stripe to live mode
2. Update environment variables with live keys
3. Create live products and prices
4. Update webhook endpoint to production URL
5. Test end-to-end with real (small) payment

---

## Architecture Diagram

```
┌─────────────────┐
│   React App     │
│  (Vite + React) │
└────────┬────────┘
         │
         ├──→ Stripe.js (Client-side)
         │    └──→ Stripe Checkout
         │
         ├──→ Supabase Client
         │    ├──→ subscriptions table
         │    └──→ Helper functions
         │
         └──→ useSubscription hook
              ├──→ Check limits
              ├──→ Create checkout session
              └──→ Handle callbacks
              
┌──────────────────┐
│ Stripe Dashboard │
└────────┬─────────┘
         │
         │ Webhooks
         ↓
┌──────────────────────┐
│ Supabase Edge        │
│ Function             │
│ (stripe-webhook)     │
└──────────┬───────────┘
           │
           ├──→ Verify signature
           ├──→ Update subscriptions
           └──→ Log events
```

---

## Key Files to Create

1. `STRIPE_SUBSCRIPTION_SETUP.sql` - Database schema ✅
2. `supabase/functions/stripe-webhook/index.ts` - Webhook handler
3. `src/hooks/useSubscription.jsx` - Subscription hook
4. `src/services/subscriptionService.js` - API calls
5. `src/components/subscription/SubscriptionModal.jsx` - Payment UI
6. `src/components/subscription/UpgradePrompt.jsx` - Limit warnings
7. `src/components/subscription/SubscriptionSettings.jsx` - Manage subscription

---

## Next Steps

Would you like me to:
1. ✅ Create the database schema (DONE)
2. Create the Supabase Edge Function for webhooks?
3. Create the React hooks and components?
4. Add usage restriction checks to Dashboard and Team Management?

Let me know and I'll generate the code for you!
