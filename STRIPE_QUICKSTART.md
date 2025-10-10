# Quick Start: Integrating Stripe Subscriptions

## Step 1: Install Dependencies

```bash
npm install @stripe/stripe-js
```

## Step 2: Set Up Environment Variables

Create/update `.env`:

```bash
# Stripe Keys (get from https://dashboard.stripe.com/test/apikeys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create products in Stripe Dashboard)
VITE_STRIPE_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_YEARLY_PRICE_ID=price_...

# App URL
VITE_APP_URL=http://localhost:5173
```

## Step 3: Run Database Migration

In Supabase SQL Editor, run:
```sql
-- File: STRIPE_SUBSCRIPTION_SETUP.sql
```

## Step 4: Deploy Supabase Edge Functions

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session

# Set secrets (only Stripe keys - Supabase vars are auto-provided)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# ⚠️ DON'T set SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
# Supabase automatically provides these to your Edge Functions!
```

## Step 5: Configure Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret and add to your Supabase secrets

## Step 6: Integration Examples

### A. Add Subscription Button to Dashboard Header

```jsx
// In Dashboard.jsx
import { useState } from 'react';
import { Crown } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionModal from '../subscription/SubscriptionModal';
import SubscriptionSettings from '../subscription/SubscriptionSettings';

function DashboardHeader() {
  const { isPremium, subscription } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="flex items-center justify-between p-4">
      <h1>Year Wheel Dashboard</h1>
      
      {/* Subscription Button */}
      <button
        onClick={() => isPremium ? setShowSettings(true) : setShowSubscriptionModal(true)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors
          ${isPremium 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700' 
            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          }
        `}
      >
        <Crown size={20} />
        {isPremium ? 'Premium' : 'Uppgradera'}
      </button>

      {showSubscriptionModal && (
        <SubscriptionModal 
          onClose={() => setShowSubscriptionModal(false)}
          currentPlan={subscription?.plan_type || 'free'}
        />
      )}

      {showSettings && (
        <SubscriptionSettings onClose={() => setShowSettings(false)} />
      )}
    </header>
  );
}
```

### B. Add Usage Limit Check Before Creating Wheel

```jsx
// In Dashboard.jsx
import { useUsageLimits } from '../../hooks/useSubscription';
import UpgradePrompt from '../subscription/UpgradePrompt';

function DashboardContent() {
  const { hasReachedWheelLimit, wheelCount, maxWheels } = useUsageLimits();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleCreateWheelClick = () => {
    if (hasReachedWheelLimit) {
      // Show upgrade prompt
      setShowUpgradePrompt(true);
      return;
    }
    
    // Proceed with wheel creation
    setShowCreateModal(true);
  };

  return (
    <div>
      <button onClick={handleCreateWheelClick}>
        Skapa nytt hjul
      </button>

      {showUpgradePrompt && (
        <UpgradePrompt
          title="Nått gränsen för hjul"
          message={`Du har ${wheelCount} av ${maxWheels} tillåtna hjul på gratisplanen. Uppgradera till Premium för obegränsade hjul!`}
          currentUsage={wheelCount}
          limit={maxWheels}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            setShowSubscriptionModal(true);
          }}
          onCancel={() => setShowUpgradePrompt(false)}
        />
      )}

      {showSubscriptionModal && (
        <SubscriptionModal 
          onClose={() => setShowSubscriptionModal(false)} 
        />
      )}
    </div>
  );
}
```

### C. Add Team Member Limit Check

```jsx
// In TeamInviteModal.jsx or similar
import { useSubscription } from '../../hooks/useSubscription';
import UpgradePrompt from '../subscription/UpgradePrompt';

function TeamInviteModal({ wheelId }) {
  const { checkCanAddTeamMember, getTeamCount } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [teamCount, setTeamCount] = useState(0);

  const handleInviteClick = async () => {
    const canAdd = await checkCanAddTeamMember(wheelId);
    const count = await getTeamCount(wheelId);
    setTeamCount(count);

    if (!canAdd) {
      setShowUpgradePrompt(true);
      return;
    }

    // Proceed with invitation
    sendInvitation();
  };

  return (
    <>
      <button onClick={handleInviteClick}>
        Bjud in medlem
      </button>

      {showUpgradePrompt && (
        <UpgradePrompt
          title="Nått gränsen för teammedlemmar"
          message={`Du har ${teamCount} av 3 tillåtna medlemmar på gratisplanen. Uppgradera till Premium för obegränsade teammedlemmar!`}
          currentUsage={teamCount}
          limit={3}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            // Show subscription modal
          }}
          onCancel={() => setShowUpgradePrompt(false)}
        />
      )}
    </>
  );
}
```

### D. Add Export Format Restrictions

```jsx
// In Header.jsx or export handler
import { useSubscription } from '../hooks/useSubscription';

function ExportMenu() {
  const { isPremium, limits } = useSubscription();

  const formats = [
    { id: 'png', name: 'PNG', premium: false },
    { id: 'svg', name: 'SVG', premium: false },
    { id: 'pdf', name: 'PDF', premium: true },
    { id: 'jpg', name: 'JPG', premium: true },
  ];

  const canExport = (format) => {
    return limits?.allowedExports.includes(format);
  };

  return (
    <div className="export-menu">
      {formats.map(format => (
        <button
          key={format.id}
          onClick={() => handleExport(format.id)}
          disabled={!canExport(format.id)}
          className={!canExport(format.id) ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {format.name}
          {format.premium && !isPremium && (
            <Crown size={14} className="ml-1 text-yellow-500" />
          )}
        </button>
      ))}
    </div>
  );
}
```

## Step 7: Testing

### Test Cards (Stripe Test Mode)
- **Success**: `4242 4242 4242 4242`
- **Requires 3D Auth**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 0002`

### Test Flow
1. Create account → Should get free plan automatically
2. Try to create 3rd wheel → Should show upgrade prompt
3. Click upgrade → Should show subscription modal
4. Select yearly plan → Should redirect to Stripe Checkout
5. Complete payment → Should redirect back with success
6. Verify premium features are now available

## Step 8: Go Live

1. Switch Stripe to live mode
2. Create live products and prices in Stripe Dashboard
3. Update environment variables with live keys
4. Update webhook endpoint to production URL
5. Deploy to production
6. Test with real (small) payment

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct
- Verify webhook signing secret matches
- Check Supabase function logs

### Customer not getting premium access
- Check webhook is processing events successfully
- Verify subscription record is created in database
- Check RLS policies allow user to read subscriptions

### Checkout session creation fails
- Verify Stripe API keys are correct
- Check customer metadata is being set properly
- Review Supabase function logs

## Support

For issues:
1. Check Stripe Dashboard → Logs
2. Check Supabase → Edge Functions → Logs
3. Check browser console for errors
4. Verify database subscriptions table has correct data
