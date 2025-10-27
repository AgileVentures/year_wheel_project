# GTM Tracking Implementation - Sammanfattning

## Vad jag har implementerat

Jag har lagt till komplett Google Tag Manager tracking för både sign-ups och subscriptions enligt din konsults specifikation.

## Implementerade ändringar

### 1. **GTM Utility Functions** (`src/utils/gtm.js`)
Lagt till två nya funktioner:
- `trackSignup()` - Skickar sign_up event till dataLayer
- `trackPurchase()` - Skickar purchase event med full ecommerce-data

### 2. **Sign-up Tracking** (`src/contexts/AuthContext.jsx`)
**Email signup:**
- Trackar efter lyckad Supabase `signUp()` (rad 77-86)
- Payload: `{ event: 'sign_up', method: 'email', user_id: UUID, plan: 'free' }`

**Google OAuth signup:**
- Trackar vid `SIGNED_IN` event för nya användare (rad 36-42)
- Använder 5-sekunders tidsfönster för att identifiera nya konton
- Payload: `{ event: 'sign_up', method: 'google', user_id: UUID, plan: 'free' }`

### 3. **Purchase Tracking** (`src/components/dashboard/Dashboard.jsx`)
- Detekterar `session_id` från Stripe redirect (rad 208-287)
- Pollar subscription-status tills webhook processat betalningen
- Trackar när subscription bekräftad:
  ```javascript
  {
    event: 'purchase',
    ecommerce: {
      transaction_id: 'sub_...',
      value: 79 | 768,
      currency: 'SEK',
      items: [{...}]
    },
    user_id: UUID,
    plan: 'monthly' | 'yearly'
  }
  ```

### 4. **DataLayer Initialization** (`index.html`)
- Lagt till explicit `window.dataLayer = window.dataLayer || [];` före GTM-script
- Säkerställer att dataLayer existerar även vid snabba redirects

## Payload-exempel

### Sign-up (Email)
```javascript
{
  event: 'sign_up',
  method: 'email',
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  plan: 'free',
  page_location: 'https://yearwheel.se/',
  timestamp: '2025-10-27T14:23:15.123Z'
}
```

### Purchase (Årlig)
```javascript
{
  event: 'purchase',
  ecommerce: {
    transaction_id: 'sub_1OabCd2eZvKYlo2C3vWxYz4K',
    value: 768,
    currency: 'SEK',
    items: [{
      item_id: 'yearwheel_yearly',
      item_name: 'YearWheel Årlig',
      item_category: 'subscription',
      price: 768,
      quantity: 1
    }]
  },
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  plan: 'yearly',
  page_location: 'https://yearwheel.se/dashboard',
  timestamp: '2025-10-27T14:30:22.789Z'
}
```

## Timing & Deduplication

### Sign-up
- ✅ Skickas EFTER backend-success (inte vid form submit)
- ✅ OAuth: Endast för nya användare (created_at < 5 sekunder sedan)
- ✅ Dedupliceringsflagg förhindrar dubbla events

### Purchase
- ✅ Skickas när användaren kommer tillbaka från Stripe (`/dashboard?session_id=...`)
- ✅ Väntar på webhook-bekräftelse (polling var 2:e sekund, max 20 sekunder)
- ✅ Endast EN gång per checkout-session
- ✅ `session_id` rensas från URL direkt

## Testning

### Manuell testning:
```bash
# 1. Öppna konsolen på https://yearwheel.se/
# 2. Registrera ny användare (email eller Google)
# 3. Leta efter: "[GTM] sign_up event pushed: ..."
# 4. Verifiera i GTM Preview Mode

# För purchase:
# 1. Logga in på /dashboard
# 2. Uppgradera till Premium
# 3. Använd Stripe test card: 4242 4242 4242 4242
# 4. Efter redirect → konsollen visar: "[Dashboard] GTM purchase event tracked..."
```

### GTM Preview Mode:
1. Gå till GTM (GTM-MX5D5LSB)
2. Klicka "Preview"
3. Kör signup/purchase flow
4. Verifiera att events dyker upp i timeline

## Dokumentation

**Fullständig dokumentation för din konsult finns i:**
`GTM_TRACKING_IMPLEMENTATION.md`

Innehåller:
- Exakta payload-exempel för alla scenarios
- GTM trigger/variable-konfiguration
- Testinstruktioner
- Edge cases och lösningar
- Framtida förbättringar

## Edge Functions (Ingen ändring behövdes!)

Din Stripe webhook (`supabase/functions/stripe-webhook/index.ts`) behöver INTE ändras. Tracking sker på klient-sidan efter att användaren redirectar tillbaka. Detta är enligt best practice för GA4:
- Server-side tracking kräver Measurement Protocol API
- Client-side är enklare och ger bättre attribution
- Vi väntar på webhook-bekräftelse innan vi pushar event

## Nästa steg

1. **Deploy koden** till produktion
2. **Skicka `GTM_TRACKING_IMPLEMENTATION.md`** till din konsult
3. **Be konsulten konfigurera GTM:**
   - Skapa triggers för `sign_up` och `purchase`
   - Skapa GA4 event tags
   - Testa i Preview Mode
4. **Verifiera** med riktiga test-transaktioner

## Övrigt

- ❌ Coupon tracking är INTE implementerat (Stripe tillåter promo-koder men vi skickar inte dem än)
- ❌ Cancellation/upgrade events är inte implementerade (kan läggas till senare)
- ✅ Deduplicering är byggd in (inga dubbla events vid refresh)
- ✅ Fel i tracking påverkar INTE användarupplevelsen (try/catch överallt)

---

**Frågor?** Kolla `GTM_TRACKING_IMPLEMENTATION.md` för detaljerad teknisk dokumentation.
