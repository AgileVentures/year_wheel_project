# Stripe Subscription System - Complete Implementation

## 📋 Overview

I've created a complete Stripe subscription system for Year Wheel POC with:
- Custom payment modals (your own UI)
- Stripe for payment processing
- Usage restrictions for free vs premium users
- Supabase Edge Functions for webhooks

---

## 💰 Pricing Structure

### Free Plan
- ✅ Up to 2 year wheels
- ✅ 1 team with up to 3 members  
- ✅ Export as PNG and SVG only
- ✅ Basic features

### Premium Plan
- ✅ **Monthly**: 79 SEK/month
- ✅ **Yearly**: 768 SEK/year (64 SEK/month - 19% discount)
- ✅ Unlimited year wheels
- ✅ Unlimited teams and members
- ✅ All export formats (PNG, SVG, PDF, JPG)
- ✅ Priority support
- ✅ Version history
- ✅ Sharing and collaboration

---

## 📁 Files Created

### Database Schema
✅ **`STRIPE_SUBSCRIPTION_SETUP.sql`** - Complete database migration
- `subscriptions` table
- `subscription_events` table (audit log)
- Helper functions for checking limits
- RLS policies
- Triggers for auto-creation

### Supabase Edge Functions
✅ **`supabase/functions/stripe-webhook/index.ts`** - Webhook handler
- Processes subscription events from Stripe
- Updates database when subscription changes
- Handles payment success/failure

✅ **`supabase/functions/create-checkout-session/index.ts`** - Checkout
- Creates Stripe checkout session
- Manages customer creation
- Handles redirects

✅ **`supabase/functions/create-portal-session/index.ts`** - Billing portal
- Creates customer portal session
- Allows users to manage subscriptions

### React Services & Hooks
✅ **`src/services/subscriptionService.js`** - API layer
- `getUserSubscription()` - Get user's subscription
- `isPremiumUser()` - Check if user has premium
- `canCreateWheel()` - Check wheel creation permission
- `canAddTeamMember()` - Check team member permission
- `createCheckoutSession()` - Start payment flow
- `createPortalSession()` - Open billing portal
- `getUsageLimits()` - Get plan limits

✅ **`src/hooks/useSubscription.jsx`** - React hook
- `useSubscription()` - Main subscription state
- `useUsageLimits()` - Check usage limits

### UI Components
✅ **`src/components/subscription/SubscriptionModal.jsx`** - Payment modal
- Beautiful custom UI with your branding
- Shows all 3 plans (Free, Monthly, Yearly)
- Highlights yearly savings
- Triggers Stripe Checkout

✅ **`src/components/subscription/UpgradePrompt.jsx`** - Limit warnings
- Shows when user hits limits
- Displays current usage
- Premium benefits
- Call-to-action

✅ **`src/components/subscription/SubscriptionSettings.jsx`** - Manage subscription
- View current plan
- Manage billing
- Cancel subscription
- Usage stats

### Documentation
✅ **`STRIPE_IMPLEMENTATION_GUIDE.md`** - Complete implementation guide
✅ **`STRIPE_QUICKSTART.md`** - Quick integration examples

---

## 🚀 Next Steps to Complete Integration

### 1. Install Dependencies
```bash
cd /Users/thomasochman/Projects/year_wheel_poc
npm install @stripe/stripe-js
```

### 2. Set Up Stripe Account
1. Go to [stripe.com](https://stripe.com) and create account
2. Get API keys from Dashboard → Developers → API keys
3. Create 2 products:
   - **Monthly Premium**: 79 SEK/month recurring
   - **Yearly Premium**: 768 SEK/year recurring
4. Copy the price IDs

### 3. Configure Environment Variables
Add to `.env`:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_YEARLY_PRICE_ID=price_...
VITE_APP_URL=http://localhost:5173
```

### 4. Run Database Migration
In Supabase SQL Editor:
```sql
-- Copy and run STRIPE_SUBSCRIPTION_SETUP.sql
```

### 5. Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session

# Set secrets (only Stripe keys - Supabase vars are auto-provided)
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY_HERE
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# NOTE: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically 
# provided by Supabase - you don't need to set them manually!
```

### 6. Configure Stripe Webhook
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy signing secret to Supabase secrets

### 7. Integrate UI Components

#### A. Add to Dashboard Header
```jsx
import { Crown } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionModal from './subscription/SubscriptionModal';

// Add subscription button
const { isPremium } = useSubscription();
<button onClick={() => setShowSubscriptionModal(true)}>
  <Crown /> {isPremium ? 'Premium' : 'Uppgradera'}
</button>
```

#### B. Add Wheel Creation Limit Check
```jsx
import { useUsageLimits } from '../hooks/useSubscription';
import UpgradePrompt from './subscription/UpgradePrompt';

const { hasReachedWheelLimit, wheelCount, maxWheels } = useUsageLimits();

const handleCreateWheel = () => {
  if (hasReachedWheelLimit) {
    setShowUpgradePrompt(true);
    return;
  }
  // Create wheel...
};
```

#### C. Add Team Member Limit Check
```jsx
const { checkCanAddTeamMember } = useSubscription();

const handleInvite = async () => {
  const canAdd = await checkCanAddTeamMember(wheelId);
  if (!canAdd) {
    setShowUpgradePrompt(true);
    return;
  }
  // Send invitation...
};
```

### 8. Test the Flow
1. Create account → Get free plan automatically
2. Create 2 wheels → Success
3. Try 3rd wheel → See upgrade prompt
4. Click upgrade → See subscription modal
5. Select yearly → Redirect to Stripe
6. Use test card: `4242 4242 4242 4242`
7. Complete payment → Redirect back
8. Create 3rd wheel → Success!

---

## 🔧 Integration Points

### Where to Add Usage Checks

1. **Dashboard - Create Wheel Button** (`src/components/dashboard/Dashboard.jsx`)
   - Check `hasReachedWheelLimit` before opening create modal
   - Show `UpgradePrompt` if limit reached

2. **Team Management - Invite Member** (team invite component)
   - Check `checkCanAddTeamMember()` before sending invitation
   - Show `UpgradePrompt` if limit reached

3. **Export Menu** (`src/components/Header.jsx`)
   - Check `limits.allowedExports` before enabling export format
   - Disable premium formats for free users
   - Add Crown icon next to premium formats

4. **User Profile/Settings**
   - Add subscription management button
   - Show `SubscriptionSettings` modal

---

## 🎨 UI/UX Flow

### For Free Users
1. User creates 2 wheels ✅
2. Tries to create 3rd wheel
3. Sees beautiful upgrade prompt with:
   - "You've reached your limit (2/2 wheels)"
   - Premium benefits list
   - Pricing info
   - "See Plans" button
4. Clicks "See Plans"
5. Sees SubscriptionModal with 3 options:
   - Free (current, grayed out)
   - Monthly (79 SEK)
   - Yearly (highlighted, 768 SEK, "Save 19%!")
6. Selects yearly
7. Redirects to Stripe Checkout (secure payment)
8. Completes payment
9. Redirects back to dashboard
10. Can now create unlimited wheels! 🎉

### For Premium Users
1. See "Premium" badge in header
2. Click badge → See SubscriptionSettings
3. Can view:
   - Current plan and price
   - Next billing date
   - Usage stats
   - "Manage Billing" button (Stripe portal)
   - "Cancel" button

---

## 🧪 Testing

### Test Cards (Stripe Test Mode)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Test Scenarios
- ✅ Create account → Free plan auto-created
- ✅ Create 2 wheels → Success
- ✅ Try 3rd wheel → Blocked, see prompt
- ✅ Upgrade to monthly → Success
- ✅ Create 5 wheels → Success (unlimited)
- ✅ Cancel subscription → Downgrade at period end
- ✅ Subscription expires → Back to 2 wheel limit

---

## 📊 Database Functions Reference

```sql
-- Check if user is premium
SELECT public.is_premium_user(auth.uid());

-- Get wheel count
SELECT public.get_user_wheel_count(auth.uid());

-- Check if can create wheel
SELECT public.can_create_wheel(auth.uid());

-- Get team member count
SELECT public.get_team_member_count('wheel-uuid');

-- Check if can add team member
SELECT public.can_add_team_member('wheel-uuid', auth.uid());
```

---

## 🎯 Key Features

✅ **Custom Payment Modal** - Your brand, your design
✅ **Secure Payments** - Stripe handles all PCI compliance
✅ **Automatic Limits** - Database enforces restrictions
✅ **Realtime Updates** - Subscription changes reflect immediately
✅ **Beautiful UI** - Polished upgrade prompts and modals
✅ **Flexible Pricing** - Monthly or yearly with discount
✅ **Self-Service** - Users can manage their own subscriptions
✅ **Audit Trail** - All events logged in subscription_events table

---

## 🛠 Maintenance

### Monitoring
- Check Stripe Dashboard → Payments for transactions
- Check Supabase → Edge Functions → Logs for errors
- Check subscriptions table for user statuses

### Common Tasks
- **Change pricing**: Update prices in Stripe Dashboard
- **Add features**: Update `getUsageLimits()` function
- **Refund**: Use Stripe Dashboard → Payments → Refund
- **Cancel subscription**: User can do it themselves via portal

---

## 🚨 Important Notes

1. **Test Mode First**: Always test thoroughly in Stripe test mode
2. **Webhook Critical**: Make sure webhook is working (check logs)
3. **CORS Configured**: Edge functions have CORS headers
4. **RLS Policies**: Users can only see their own subscriptions
5. **Service Role**: Webhooks use service role to bypass RLS
6. **Price IDs**: Copy from Stripe Dashboard, not hardcoded

---

## 🎁 Bonus Features Included

- **Auto-create subscription** on user signup
- **Yearly discount** (19% off)
- **Cancel at period end** (not immediate)
- **Past due handling** for failed payments
- **Event logging** for audit trail
- **Customer portal** for self-service management

---

## ✅ Checklist

- [ ] Run `npm install @stripe/stripe-js`
- [ ] Create Stripe account and products
- [ ] Add environment variables
- [ ] Run database migration SQL
- [ ] Deploy Supabase Edge Functions
- [ ] Configure Stripe webhook
- [ ] Integrate UI components
- [ ] Test with test cards
- [ ] Go live with real keys

---

## 📞 Support

If you need help:
1. Check `STRIPE_QUICKSTART.md` for integration examples
2. Check `STRIPE_IMPLEMENTATION_GUIDE.md` for detailed steps
3. Review Stripe Dashboard logs
4. Review Supabase Function logs
5. Check browser console for client-side errors

---

**Ready to implement?** Start with Step 1 above! 🚀
