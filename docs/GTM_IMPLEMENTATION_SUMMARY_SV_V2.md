# GTM Tracking - Implementeringssammanfattning (Svenska)
**Datum:** 27 oktober 2025 (Uppdaterad: Hybrid tracking tillagd)  
**Projekt:** YearWheel SaaS  
**Status:** ✅ Färdig (klient-sida + server-sida)

## Översikt

Vi har implementerat **hybrid tracking** för maximal tillförlitlighet:

### 1. Klient-sida tracking (Primär)
- Spårar händelser via GTM dataLayer när användaren är på sajten
- Ger full kontext (session, referrer, cross-domain tracking)
- Kan misslyckas om användaren stänger webbläsaren eller använder ad blockers

### 2. Server-sida tracking (Backup) - NYTT!
- Spårar köp via GA4 Measurement Protocol direkt från Stripe webhook
- Fungerar ALLTID, även om användaren aldrig återvänder till sajten
- Går förbi ad blockers (server-till-server kommunikation)
- Kräver konfiguration av GA4 API Secret (se `GA4_API_SECRET_SETUP.md`)

## Implementerade events

### Event 1: sign_up
**När:** Efter lyckad registrering (email ELLER OAuth)  
**Spårning:** Endast klient-sida (användaren är på sajten när kontot skapas)  

**Payload:**
```javascript
{
  event: 'sign_up',
  method: 'email' | 'google',
  user_id: 'uuid...',
  plan: 'free'
}
```

**Implementation:**
- Email: `src/contexts/AuthContext.jsx:77-86`
- OAuth: `src/contexts/AuthContext.jsx:36-42`
- Deduplikering via `hasTrackedSignup` state flag

---

### Event 2: purchase (Klient-sida)
**När:** Användaren återvänder till dashboard efter Stripe-betalning  
**Spårning:** Klient-sida via GTM dataLayer  

**Payload:**
```javascript
{
  event: 'purchase',
  ecommerce: {
    transaction_id: 'sub_abc123...', // Stripe subscription ID
    value: 79 | 768,
    currency: 'SEK',
    items: [...]
  },
  user_id: 'uuid...',
  plan: 'monthly' | 'yearly'
}
```

**Implementation:**
- `src/components/dashboard/Dashboard.jsx:208-287`
- Polling-mekanism: 2s intervall, max 10 försök (20s total)
- Deduplikering via `hasTrackedPurchase` flag

**Begränsningar:**
- ❌ Misslyckas om användaren stänger fönstret
- ❌ Blockeras av ad blockers
- ❌ Kräver att användaren återvänder till sajten

---

### Event 2b: purchase (Server-sida) - NYTT BACKUP!
**När:** Stripe webhook tar emot `checkout.session.completed`  
**Spårning:** Server-sida via GA4 Measurement Protocol  

**Payload:**
```javascript
{
  client_id: '123456789.1234567890', // Från _ga cookie
  user_id: 'uuid...',
  events: [{
    name: 'purchase',
    params: {
      transaction_id: 'cs_test_abc123...', // Checkout session ID
      value: 79 | 768,
      currency: 'SEK',
      items: [...]
    }
  }]
}
```

**Implementation:**
1. **Före betalning** (`src/components/subscription/SubscriptionModal.jsx`):
   - Extraherar GA client_id via `window.gtag()` eller `_ga` cookie
   - Skickar till `createCheckoutSession()`

2. **Under checkout** (`supabase/functions/create-checkout-session/index.ts`):
   - Lagrar metadata på Stripe session:
     ```javascript
     metadata: {
       ga_client_id: '123456789.1234567890',
       ga_user_id: 'uuid...',
       plan_type: 'monthly' | 'yearly',
       plan_name: 'YearWheel Månadsvis' | 'YearWheel Årlig'
     }
     ```

3. **Efter betalning** (`supabase/functions/stripe-webhook/index.ts`):
   - Läser metadata från Stripe session
   - Skickar POST till GA4 Measurement Protocol API:
     ```
     https://www.google-analytics.com/mp/collect
       ?measurement_id=G-89PHB9R4XE
       &api_secret={SECRET}
     ```

**Fördelar:**
- ✅ Fungerar ALLTID (ingen beroende av användaren)
- ✅ Går förbi ad blockers (server-till-server)
- ✅ Exakt timing (spåras när betalning lyckas)
- ✅ Perfekt deduplicering (använder checkout session ID)

**Deduplicering:**
Klient-sida och server-sida använder OLIKA transaction IDs:
- Klient: `transaction_id = sub_abc123...` (subscription ID)
- Server: `transaction_id = cs_test_abc123...` (checkout session ID)

Detta säkerställer att GA4 inte deduplicerar events (båda räknas).

---

## Konfiguration krävs

### Steg 1: Hämta GA4 API Secret
1. Gå till Google Analytics 4 → Admin → Data Streams
2. Välj din data stream (Measurement ID: `G-89PHB9R4XE`)
3. Scrolla ner till "Measurement Protocol API secrets"
4. Klicka "Create" → ge den ett namn → kopiera secret
5. **VIKTIGT:** Spara secret någonstans säkert, den visas bara en gång!

### Steg 2: Lägg till i Supabase
Via Supabase Dashboard:
1. https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/settings/functions
2. "Edge Functions" → "Secrets"
3. Lägg till:
   - `GA4_MEASUREMENT_ID` = `G-89PHB9R4XE`
   - `GA4_API_SECRET` = [din secret från steg 1]

ELLER via CLI:
```bash
npx supabase secrets set GA4_MEASUREMENT_ID=G-89PHB9R4XE
npx supabase secrets set GA4_API_SECRET=din_secret_här
```

### Steg 3: Edge functions är redan deployade
✅ `create-checkout-session` - lagrar GA metadata
✅ `stripe-webhook` - skickar Measurement Protocol events

---

## Testning

### Klient-sida tracking
1. Öppna DevTools → Console
2. Registrera nytt konto (email eller Google)
3. Verifiera i console: `dataLayer.push` för `sign_up`
4. Uppgradera till prenumeration
5. Återvänd till dashboard efter Stripe-betalning
6. Verifiera i console: `dataLayer.push` för `purchase`

### Server-sida tracking
1. Gör en testbetalning i Stripe test mode
2. Kontrollera Supabase Edge Functions logs:
   - https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/logs/edge-functions
3. Leta efter: "GA4 purchase event sent successfully"
4. Verifiera i GA4 Realtime:
   - https://analytics.google.com/analytics/web/#/p508956250/realtime/overview

---

## Teknisk info för konsulten

### GA4 Property
- Property ID: **508956250**
- Measurement ID: **G-89PHB9R4XE**
- GTM Container: **GTM-MX5D5LSB**

### Implementerade filer
**Klient-sida:**
- `src/utils/gtm.js` - Utility functions
- `src/contexts/AuthContext.jsx` - sign_up tracking
- `src/components/dashboard/Dashboard.jsx` - purchase tracking (klient)
- `src/components/subscription/SubscriptionModal.jsx` - GA client_id extraction

**Server-sida:**
- `supabase/functions/create-checkout-session/index.ts` - Metadata storage
- `supabase/functions/stripe-webhook/index.ts` - Measurement Protocol events

### Dataflöde (Purchase)

```
Användare klickar "Uppgradera"
  ↓
SubscriptionModal extraherar GA client_id
  ↓
createCheckoutSession() skickar gaClientId + planType
  ↓
create-checkout-session lagrar i Stripe metadata
  ↓
Användare betalar på Stripe
  ↓
Stripe webhook: checkout.session.completed
  ↓
stripe-webhook läser metadata → skickar till GA4 MP
  ↓
[SAMTIDIGT]
  ↓
Användare återvänder till dashboard (om inte fönstret stängts)
  ↓
Dashboard pollar subscription status
  ↓
dataLayer.push() → GTM → GA4
```

### Deduplicering i GA4
- Båda events räknas (olika transaction IDs)
- Klient-sida: `sub_abc123...` (subscription ID)
- Server-sida: `cs_test_abc123...` (checkout session ID)
- GA4 ser dem som separata transaktioner
- Detta är AVSIKTLIGT för backup-coverage

### Fördröjning
- Klient-sida: 0-20 sekunder (polling)
- Server-sida: ~2-5 sekunder (webhook processing)
- Server-sida kommer nästan alltid först

---

## Dokumentation
- Teknisk spec: `GTM_TRACKING_IMPLEMENTATION.md`
- GA4 setup guide: `GA4_API_SECRET_SETUP.md`
- Test checklist: `GTM_TEST_CHECKLIST.md`
