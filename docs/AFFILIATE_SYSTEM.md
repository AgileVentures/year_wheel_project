# Affiliate System Implementation Guide

## Overview

The YearWheel affiliate system allows organizations to generate trackable referral links and earn commissions from user signups and premium upgrades.

## Database Structure

### Tables Created (Migration 020)

1. **`organizations`** - Organization profiles with affiliate status
2. **`organization_members`** - User membership in organizations  
3. **`affiliate_links`** - Unique trackable referral links
4. **`affiliate_conversions`** - User journey tracking (click → signup → upgrade)
5. **`affiliate_commissions`** - Commission calculations and payment tracking

### Commission Structure

- **Free Signup**: €2 flat commission
- **Premium Upgrade**: 50% of first payment (monthly or yearly)

### Cookie Tracking Timeline

1. **Initial Click**: 30-day cookie set with conversion_id, org_id, link_id
2. **Free Signup**: Cookie extended to 90 days (60 more days from signup)
3. **Premium Upgrade**: Conversion attributed if within 90-day window

## Implementation Steps

### 1. Run Database Migration

```bash
# Apply the migration
supabase migration up

# Or if using Supabase CLI
supabase db push
```

### 2. Add AffiliateTracker to App.jsx

```jsx
import AffiliateTracker from './components/AffiliateTracker';

function App() {
  return (
    <Router>
      <AffiliateTracker /> {/* Add this at the top level */}
      {/* Rest of your app */}
    </Router>
  );
}
```

### 3. Track Signup in AuthPage.jsx

```jsx
import { trackAffiliateSignup } from '../utils/affiliateTracking';

// After successful signup
const handleSignup = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (data?.user) {
    // Track affiliate signup
    await trackAffiliateSignup(data.user.id, supabase);
  }
};
```

### 4. Track Upgrade in Stripe Webhook Handler

In your Stripe webhook handler (probably in `supabase/functions/stripe-webhook/index.ts`):

```typescript
import { createClient } from '@supabase/supabase-js';

// When handling successful payment
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const userId = session.metadata.user_id;
  const plan = session.metadata.plan; // 'monthly' or 'yearly'
  const amount = session.amount_total / 100; // Convert cents to euros
  
  // Create Supabase admin client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );
  
  // Track affiliate upgrade
  await supabase.rpc('record_affiliate_upgrade', {
    p_user_id: userId,
    p_conversion_id: /* Get from cookie via client or store in metadata */,
    p_subscription_plan: plan,
    p_subscription_amount: amount
  });
}
```

## Creating Affiliate Organizations & Links

### Admin Panel - Create Affiliate Organization

```jsx
// Example admin function
async function createAffiliateOrganization(name, ownerEmail, contactEmail) {
  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: name,
      is_affiliate: true,
      affiliate_active: true,
      contact_email: contactEmail,
      payment_email: contactEmail
    })
    .select()
    .single();

  // 2. Find owner user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ownerEmail)
    .single();

  // 3. Add owner as member
  await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: profiles.id,
      role: 'owner'
    });

  return org;
}
```

### Generate Affiliate Link

```jsx
async function generateAffiliateLink(organizationId, code, name, targetUrl = '/') {
  const { data, error } = await supabase
    .from('affiliate_links')
    .insert({
      organization_id: organizationId,
      code: code, // e.g., 'partner-acme'
      name: name, // e.g., 'Q1 2025 Campaign'
      target_url: targetUrl,
      is_active: true
    })
    .select()
    .single();

  if (data) {
    const affiliateUrl = `${window.location.origin}${targetUrl}?ref=${code}`;
    return { ...data, url: affiliateUrl };
  }

  return null;
}
```

## URL Patterns

Affiliate links can use any of these query parameters:
- `?ref=CODE` (recommended, short)
- `?affiliate=CODE`
- `?aff=CODE`

Examples:
```
https://yearwheel.app/?ref=partner-acme
https://yearwheel.app/pricing?ref=summer2025
https://yearwheel.app/?ref=partner-acme&utm_source=newsletter&utm_campaign=q1
```

## Viewing Affiliate Dashboard

### Example Queries for Affiliate Dashboard

```jsx
// Get organization's performance
const { data: stats } = await supabase
  .from('affiliate_conversions')
  .select('*')
  .eq('organization_id', orgId);

// Calculate totals
const totalClicks = stats.filter(c => c.clicked_at).length;
const totalSignups = stats.filter(c => c.signed_up_at).length;
const totalUpgrades = stats.filter(c => c.upgraded_at).length;

// Get pending commissions
const { data: commissions } = await supabase
  .from('affiliate_commissions')
  .select('*')
  .eq('organization_id', orgId)
  .eq('status', 'pending');

const totalPending = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);
```

## Admin Commission Management

```jsx
// Approve commission
async function approveCommission(commissionId) {
  await supabase
    .from('affiliate_commissions')
    .update({ status: 'approved' })
    .eq('id', commissionId);
}

// Mark as paid
async function markCommissionAsPaid(commissionId, paymentMethod, reference) {
  await supabase
    .from('affiliate_commissions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      payment_reference: reference
    })
    .eq('id', commissionId);
}
```

## Testing the Flow

1. **Create test affiliate link**:
   ```sql
   INSERT INTO organizations (name, is_affiliate, owner_id)
   VALUES ('Test Partner', true, '<your-user-id>');
   
   INSERT INTO affiliate_links (organization_id, code, name)
   VALUES ('<org-id>', 'test123', 'Test Campaign');
   ```

2. **Click the link**: Visit `http://localhost:5173/?ref=test123`
   - Check browser cookies for `yrw_aff` (30-day expiry)
   - Check `affiliate_conversions` table for new row

3. **Sign up**: Create a new account
   - Cookie should extend to 90 days
   - `signed_up_at` timestamp added
   - Commission of €2 created in `affiliate_commissions`

4. **Upgrade**: Subscribe to premium (within 90 days)
   - `upgraded_at` timestamp added
   - Premium commission created (50% of payment)
   - Cookie deleted

## Security Considerations

- Affiliate link codes are unique and URL-safe
- RLS policies restrict access to organization members
- Commission approval requires admin role
- Cookie includes expiry timestamp for client-side validation
- All tracking functions use `SECURITY DEFINER` for controlled access

## Analytics Integration

The system emits Google Analytics events:
- `affiliate_click` - When user clicks affiliate link
- `affiliate_signup` - When user creates free account
- `affiliate_conversion` - When user upgrades to premium

## Next Steps

1. Build affiliate dashboard UI component
2. Create admin commission management panel
3. Add email notifications for conversions
4. Integrate with accounting system for payouts
5. Add fraud detection (duplicate IPs, unusual patterns)

## Migration Notes

- Migration 020 is standalone - no dependencies on existing tables
- Compatible with existing `subscriptions` and `profiles` tables
- Can coexist with current team system (organizations is separate concept)
