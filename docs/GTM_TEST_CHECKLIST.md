# GTM Tracking - Test Checklist

## Pre-Deployment Verification

### Code Review
- [x] `src/utils/gtm.js` - Added `trackSignup()` and `trackPurchase()` functions
- [x] `src/contexts/AuthContext.jsx` - Email and OAuth signup tracking
- [x] `src/components/dashboard/Dashboard.jsx` - Purchase tracking on checkout return
- [x] `index.html` - dataLayer initialization before GTM script
- [x] No TypeScript/ESLint errors in modified files

---

## Manual Testing (Development)

### Test 1: Email Sign-up Tracking
**URL:** http://localhost:5173/ (or dev environment)

1. [ ] Open browser console
2. [ ] Navigate to landing page
3. [ ] Click "Kom igång gratis" or similar
4. [ ] Fill in email/password form
5. [ ] Submit form
6. [ ] **VERIFY:** Console shows:
   ```
   [GTM] sign_up event pushed: { method: 'email', userId: '...', plan: 'free' }
   ```
7. [ ] **VERIFY:** Check `window.dataLayer`:
   ```javascript
   window.dataLayer.filter(e => e.event === 'sign_up')
   // Should return array with 1 object
   ```
8. [ ] **VERIFY:** Event payload matches:
   ```javascript
   {
     event: 'sign_up',
     method: 'email',
     user_id: '<UUID>',
     plan: 'free',
     page_location: '<current URL>',
     timestamp: '<ISO date>'
   }
   ```

### Test 2: Google OAuth Sign-up Tracking
**URL:** http://localhost:5173/

1. [ ] Open browser console
2. [ ] Navigate to landing page
3. [ ] Click "Continue with Google"
4. [ ] Complete Google OAuth flow
5. [ ] After redirect back to site
6. [ ] **VERIFY:** Console shows:
   ```
   [GTM] sign_up event pushed: { method: 'google', userId: '...', plan: 'free' }
   ```
7. [ ] **VERIFY:** Event has `method: 'google'`
8. [ ] **VERIFY:** Refresh page → NO duplicate event

### Test 3: Existing User Login (No Tracking)
**URL:** http://localhost:5173/

1. [ ] Open browser console
2. [ ] Login with existing account (email or Google)
3. [ ] **VERIFY:** NO `sign_up` event in console
4. [ ] **VERIFY:** `window.dataLayer` does NOT contain new sign_up event

### Test 4: Monthly Subscription Purchase
**URL:** http://localhost:5173/dashboard

**Prerequisites:** Stripe test mode enabled

1. [ ] Login as free user
2. [ ] Open console
3. [ ] Click "Uppgradera till Premium"
4. [ ] Select "Månadsvis" (79 kr/månad)
5. [ ] Click upgrade button
6. [ ] Complete Stripe checkout with test card: `4242 4242 4242 4242`
7. [ ] After redirect to `/dashboard?session_id=...`
8. [ ] **VERIFY:** Console shows polling messages:
   ```
   [Dashboard] Stripe checkout successful, refreshing subscription...
   [Dashboard] Polling subscription status (attempt 1/10)...
   ```
9. [ ] **VERIFY:** Within 20 seconds, console shows:
   ```
   [Dashboard] GTM purchase event tracked: { planType: 'monthly', value: 79, userId: '...' }
   ```
10. [ ] **VERIFY:** Check `window.dataLayer`:
    ```javascript
    window.dataLayer.filter(e => e.event === 'purchase')
    ```
11. [ ] **VERIFY:** Payload matches:
    ```javascript
    {
      event: 'purchase',
      ecommerce: {
        transaction_id: 'sub_...',
        value: 79,
        currency: 'SEK',
        items: [{
          item_id: 'yearwheel_monthly',
          item_name: 'YearWheel Månadsvis',
          item_category: 'subscription',
          price: 79,
          quantity: 1
        }]
      },
      user_id: '<UUID>',
      plan: 'monthly',
      page_location: 'http://localhost:5173/dashboard',
      timestamp: '<ISO date>'
    }
    ```
12. [ ] **VERIFY:** Refresh page → NO duplicate purchase event

### Test 5: Yearly Subscription Purchase
**URL:** http://localhost:5173/dashboard

**Repeat Test 4 but:**
- [ ] Select "Årlig" (768 kr/år)
- [ ] **VERIFY:** `value: 768`
- [ ] **VERIFY:** `item_id: 'yearwheel_yearly'`
- [ ] **VERIFY:** `item_name: 'YearWheel Årlig'`

---

## GTM Preview Mode Testing

### Setup
1. [ ] Go to GTM container: https://tagmanager.google.com/ (GTM-MX5D5LSB)
2. [ ] Click "Preview" button
3. [ ] Enter your dev/production URL
4. [ ] GTM Debug window should open

### Test in Preview Mode

#### Sign-up Event
1. [ ] Complete email or Google signup
2. [ ] **VERIFY:** In GTM Debug, "sign_up" event appears in timeline
3. [ ] Click event → Verify Data Layer variables:
   - [ ] `event` = 'sign_up'
   - [ ] `method` = 'email' or 'google'
   - [ ] `user_id` = UUID
   - [ ] `plan` = 'free'

#### Purchase Event
1. [ ] Complete subscription purchase
2. [ ] **VERIFY:** "purchase" event appears in timeline
3. [ ] Click event → Verify Data Layer variables:
   - [ ] `event` = 'purchase'
   - [ ] `ecommerce.transaction_id` = Stripe subscription ID
   - [ ] `ecommerce.value` = 79 or 768
   - [ ] `ecommerce.currency` = 'SEK'
   - [ ] `ecommerce.items[0].item_id` = 'yearwheel_monthly' or 'yearwheel_yearly'

---

## Production Smoke Tests

**⚠️ Use real email/card for production tests!**

### Production Sign-up
- [ ] https://yearwheel.se/ → New account signup
- [ ] Verify in GTM Real-Time reports (if configured)
- [ ] Verify in GA4 Real-Time events (if connected)

### Production Purchase
- [ ] https://yearwheel.se/dashboard → Upgrade to Premium
- [ ] ⚠️ **Use real payment method** (will be charged!)
- [ ] Verify purchase event in GTM/GA4 Real-Time

---

## Edge Case Testing

### Duplicate Prevention
- [ ] Sign up → Refresh page during success message → NO duplicate event
- [ ] Complete purchase → Refresh dashboard → NO duplicate event
- [ ] Complete purchase → Browser back button → NO duplicate event

### Network Issues
- [ ] Disconnect network AFTER signup form submit → Event should fire after reconnect
- [ ] Disconnect network during Stripe checkout → Event should fire when returning to dashboard

### OAuth Edge Cases
- [ ] Sign up with Google → Immediately close tab → Reopen → NO duplicate event
- [ ] Login with existing Google account → NO sign_up event

---

## GA4 Event Verification (After GTM Setup)

**Once your consultant has configured GTM tags:**

### Sign-up Event in GA4
1. [ ] Navigate to GA4 → Reports → Real-time
2. [ ] Complete a signup
3. [ ] **VERIFY:** "sign_up" event appears within 60 seconds
4. [ ] Click event → Verify parameters:
   - [ ] `method` parameter exists
   - [ ] `plan` parameter = 'free'

### Purchase Event in GA4
1. [ ] Navigate to GA4 → Reports → Real-time
2. [ ] Complete a purchase
3. [ ] **VERIFY:** "purchase" event appears within 60 seconds
4. [ ] Click event → Verify:
   - [ ] Revenue = 79 or 768 SEK
   - [ ] Items count = 1
   - [ ] Item name = "YearWheel Månadsvis" or "YearWheel Årlig"

---

## Rollback Plan

**If tracking causes issues:**

### Revert Changes
```bash
git revert <commit-hash>  # Revert GTM tracking commits
git push origin main
```

### Emergency Hotfix
Comment out tracking calls:
```javascript
// In AuthContext.jsx
// trackSignup({ ... });

// In Dashboard.jsx
// trackPurchase({ ... });
```

---

## Known Limitations

- [ ] Coupon codes NOT tracked (future enhancement)
- [ ] Subscription cancellations NOT tracked
- [ ] Failed payments NOT tracked
- [ ] Plan upgrades (monthly → yearly) NOT tracked

---

## Success Criteria

### Minimum Requirements (MVP)
- [x] Sign-up events fire after successful registration
- [x] Purchase events fire after successful payment
- [x] No duplicate events on page refresh
- [x] No errors in browser console
- [x] No impact on user experience if tracking fails

### Ideal Requirements (Production Ready)
- [ ] All manual tests pass
- [ ] GTM Preview Mode shows events correctly
- [ ] GA4 Real-Time reports show events
- [ ] Consultant confirms GTM setup is correct
- [ ] 7-day production monitoring shows stable event count

---

## Post-Deployment Monitoring

### Week 1 Checklist
- [ ] Day 1: Check GA4 for sign_up events (expect ~10-20/day in beta)
- [ ] Day 3: Check GA4 for purchase events (expect ~2-5/day)
- [ ] Day 7: Compare event counts with Supabase database:
  ```sql
  -- Sign-ups (from profiles table)
  SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days';
  
  -- Purchases (from subscriptions table)
  SELECT COUNT(*) FROM subscriptions 
  WHERE status = 'active' 
  AND created_at > NOW() - INTERVAL '7 days';
  ```

### Red Flags
- ⚠️ Zero events in GA4 after 24 hours
- ⚠️ Event count >> database count (duplicate tracking)
- ⚠️ Event count << database count (tracking failures)
- ⚠️ Console errors related to dataLayer

---

**Prepared by:** Thomas Ochman  
**Date:** 27 October 2025  
**Version:** 1.0
