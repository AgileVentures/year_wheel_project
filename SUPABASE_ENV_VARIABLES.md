# Supabase Edge Functions - Environment Variables Guide

## Automatic Environment Variables

Supabase **automatically provides** these environment variables to all Edge Functions:

### ✅ Auto-Provided (DO NOT SET MANUALLY)
- `SUPABASE_URL` - Your project's API URL
- `SUPABASE_ANON_KEY` - Your public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (admin access)

These are available in your Edge Functions without any configuration needed!

## Custom Secrets You Need to Set

For the Stripe integration, you only need to set these **custom** secrets:

```bash
# Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Why the Error?

If you try to set secrets starting with `SUPABASE_`, you'll get:
```
Env name cannot start with SUPABASE_, skipping: SUPABASE_URL
```

This is because:
1. These are **reserved** by Supabase
2. They're automatically injected into your functions
3. You can't override them (security feature)

## Accessing Variables in Edge Functions

```typescript
// These are automatically available:
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// These you set manually:
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
```

## Complete Setup Commands

```bash
# 1. Link your project (one time)
supabase link --project-ref mmysvuymzabstnobdfvo

# 2. Set ONLY custom secrets (Stripe keys)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Deploy functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session

# That's it! No need to set SUPABASE_* variables
```

## Verifying Your Setup

To check which secrets are set:
```bash
supabase secrets list
```

You should see:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

You will NOT see `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` because they're auto-provided.

## Local Development

For local testing with `supabase functions serve`, create a `.env.local` file:

```bash
# .env.local (for local testing only)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# These are automatically provided by Supabase CLI:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_SERVICE_ROLE_KEY=<from local instance>
```

## Production Deployment

When switching to live mode:
```bash
# Update only Stripe keys to live values
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase variables remain the same (auto-provided)
```

## Summary

✅ **DO SET**: Custom app secrets (Stripe keys)
❌ **DON'T SET**: SUPABASE_* variables (auto-provided)
🎯 **RESULT**: Cleaner, more secure configuration
