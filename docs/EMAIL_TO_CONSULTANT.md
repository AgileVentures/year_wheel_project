# Email till GTM-konsult

**Till:** [Din konsults email]  
**Från:** Thomas Ochman (thomas@freefoot.se)  
**Ämne:** GTM Tracking Implementation - sign_up & purchase events

---

Hej,

Tack för specifikationen! Jag har nu implementerat dataLayer.push() för både sign_up och purchase enligt dina instruktioner.

## Sammanfattning

**sign_up event:**
- Skickas efter lyckad backend-registrering (både email och Google OAuth)
- Payload: `{ event: 'sign_up', method: 'email|google', user_id: UUID, plan: 'free', page_location: URL, timestamp: ISO }`
- Dedupliceringsskydd inkluderat

**purchase event:**
- Skickas när användaren kommer tillbaka från Stripe Checkout
- Väntar på webhook-bekräftelse (polling var 2:e sekund, max 20 sekunder)
- Payload följer GA4 ecommerce-spec:
  ```javascript
  {
    event: 'purchase',
    ecommerce: {
      transaction_id: 'sub_...',
      value: 79 | 768,
      currency: 'SEK',
      items: [...]
    },
    user_id: UUID,
    plan: 'monthly' | 'yearly',
    page_location: URL,
    timestamp: ISO
  }
  ```

## Dokumentation

Bifogat finns tre filer:

1. **GTM_TRACKING_IMPLEMENTATION.md** - Fullständig teknisk dokumentation
   - Exakta payload-exempel för alla scenarios
   - Timing och dataflöde
   - GTM trigger/variable-konfiguration
   - Testinstruktioner

2. **GTM_TEST_CHECKLIST.md** - Steg-för-steg testinstruktioner
   - Manuella tester (dev + production)
   - GTM Preview Mode-verifiering
   - Edge case-tester

3. **GTM_IMPLEMENTATION_SUMMARY_SV.md** - Svensk sammanfattning

## Payload-exempel

### sign_up (Email)
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

### purchase (Årlig prenumeration)
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

## Tekniska detaljer

**Tracking-tidpunkt:**
- `sign_up`: Efter Supabase auth success (ej vid form submit)
- `purchase`: Efter Stripe redirect + webhook-bekräftelse

**Dedupliceringsskydd:**
- Inbyggd flaggning för att förhindra dubbla events
- session_id rensas från URL direkt efter detektering
- Refresh/back-button triggar inga duplicates

**Coupon tracking:**
- Ännu EJ implementerat (Stripe tillåter promo codes men vi skickar inte dem än)
- Enkel att lägga till senare om önskat

## Test-miljö

**Dev:** http://localhost:5173/ (min lokal miljö)  
**Production:** https://yearwheel.se/  
**GTM Container:** GTM-MX5D5LSB

Jag kan ge dig temporär access till en test-account om du behöver verifiera events själv i Preview Mode.

## Nästa steg

1. Vänligen konfigurera GTM triggers och GA4 tags enligt specen i dokumentationen
2. Testa i GTM Preview Mode
3. Meddela mig när setup är klar så kör jag igenom test-checklistorna
4. Vi verifierar tillsammans att events kommer fram till GA4

Någonting du behöver ändrat eller kompletterat?

Mvh,  
Thomas

---

**Bilagor:**
- GTM_TRACKING_IMPLEMENTATION.md
- GTM_TEST_CHECKLIST.md
- GTM_IMPLEMENTATION_SUMMARY_SV.md
