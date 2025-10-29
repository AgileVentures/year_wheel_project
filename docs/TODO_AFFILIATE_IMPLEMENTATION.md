# Affiliate System - Implementation TODO

## ✅ Completed
- [x] Database schema created (Migration 020)
- [x] Database functions for tracking clicks, signups, upgrades
- [x] Frontend tracking utilities (`src/utils/affiliateTracking.js`)
- [x] AffiliateTracker component for URL parameter detection
- [x] Documentation guide created

## 🔲 Remaining Implementation Tasks

### 1. Integration Points (Critical)

- [ ] **App.jsx**: Mount `<AffiliateTracker />` component at root level
  ```jsx
  import AffiliateTracker from './components/AffiliateTracker';
  // Add inside Router: <AffiliateTracker />
  ```

- [ ] **AuthPage.jsx**: Add signup tracking after successful registration
  ```jsx
  import { trackAffiliateSignup } from '../utils/affiliateTracking';
  // After signUp success: await trackAffiliateSignup(user.id, supabase);
  ```

- [ ] **Stripe Webhook**: Add upgrade tracking in stripe-webhook Edge Function
  - Get conversion_id from user metadata or separate query
  - Call `record_affiliate_upgrade()` on successful payment
  - Pass plan type ('monthly'/'yearly') and amount

### 2. Affiliate Dashboard UI (Partner-Facing)

Create `src/pages/AffiliateDashboard.jsx`:
- [ ] Overview stats (clicks, signups, upgrades, earnings)
- [ ] List of affiliate links with performance
- [ ] Create new affiliate link form
- [ ] Link management (activate/deactivate)
- [ ] Commission history table
- [ ] Total pending/approved/paid commissions
- [ ] Export functionality (CSV/PDF reports)

### 3. Admin Commission Panel

Create `src/pages/AdminAffiliatePanel.jsx`:
- [ ] List all affiliate organizations
- [ ] Create new affiliate organization form
- [ ] View conversions by organization
- [ ] Approve pending commissions (bulk actions)
- [ ] Mark commissions as paid
- [ ] Commission payment history
- [ ] Fraud detection alerts (duplicate IPs, suspicious patterns)
- [ ] Export payout reports

### 4. User Profile Integration

- [ ] Add "Join Organization" option in user profile
- [ ] Show organization membership in profile
- [ ] Link to affiliate dashboard if user is affiliate member

### 5. Enhanced Tracking

- [ ] Add server-side IP detection for conversions
- [ ] Track geographic data (country, city)
- [ ] Add device type detection (mobile, desktop, tablet)
- [ ] Track browser information
- [ ] Add referrer domain analysis

### 6. Email Notifications

Create email templates and triggers:
- [ ] Welcome email for new affiliate partners
- [ ] New conversion notification (signup/upgrade)
- [ ] Weekly/monthly performance summary
- [ ] Commission approved notification
- [ ] Payment processed notification

### 7. Analytics & Reporting

- [ ] Google Analytics events integration (already in utils)
- [ ] Custom dashboard charts (conversion funnel, timeline)
- [ ] ROI calculator for affiliates
- [ ] Best performing links report
- [ ] Conversion rate by traffic source

### 8. Security & Fraud Prevention

- [ ] Rate limiting on click tracking (prevent spam)
- [ ] Duplicate IP detection (same IP multiple clicks)
- [ ] Self-referral prevention (affiliate can't refer themselves)
- [ ] Cookie hijacking protection
- [ ] Admin review system for suspicious conversions

### 9. Payment Integration

- [ ] Stripe Connect for automated payouts (optional)
- [ ] Manual payout workflow documentation
- [ ] Payment threshold settings (minimum €50 before payout)
- [ ] Monthly payout schedule automation

### 10. Testing

- [ ] E2E test: Click → Signup → Upgrade flow
- [ ] Cookie persistence testing (30 days, 90 days)
- [ ] Commission calculation verification
- [ ] RLS policy testing (ensure data isolation)
- [ ] Load testing for click tracking endpoint

## 🎯 Quick Start Implementation Order

### Phase 1 (Essential - 2-3 hours)
1. Mount AffiliateTracker in App.jsx
2. Add signup tracking in AuthPage.jsx
3. Add upgrade tracking in Stripe webhook
4. Test full flow manually

### Phase 2 (Affiliate Dashboard - 4-6 hours)
1. Create basic affiliate dashboard page
2. Show performance stats and link list
3. Add link creation form
4. Test as affiliate user

### Phase 3 (Admin Panel - 4-6 hours)
1. Create admin affiliate management page
2. Commission approval workflow
3. Payment tracking
4. Basic reporting

### Phase 4 (Polish - 2-4 hours)
1. Email notifications
2. Better analytics
3. Export features
4. Documentation updates

## 📝 Notes

- Migration 020 already applied manually in Supabase SQL editor
- Cookie format: `conversion_id|org_id|link_id|expires_timestamp`
- Commission rates configurable per organization in database
- All RLS policies already configured for security
