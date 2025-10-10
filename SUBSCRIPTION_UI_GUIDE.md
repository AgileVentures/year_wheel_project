# 🎨 Subscription UI Guide - What You'll See

## 1. Dashboard Header - Premium/Upgrade Button

### For Free Users:
```
┌──────────────────────────────────────────────────────────┐
│  [Logo] [Hjul] [Team] [Inbjudningar]    [⭐ Uppgradera] │
└──────────────────────────────────────────────────────────┘
```
- **Yellow button** with "Uppgradera" text
- Click to open subscription pricing modal

### For Premium Users:
```
┌──────────────────────────────────────────────────────────┐
│  [Logo] [Hjul] [Team] [Inbjudningar]    [👑 Premium]    │
└──────────────────────────────────────────────────────────┘
```
- **Gradient blue-purple button** with pulsing crown icon
- Click to open subscription settings

---

## 2. Wheels Section - Usage Indicator

### Free User (Within Limits):
```
┌─────────────────────────────────────────────────────────┐
│  [+ Skapa New wheel]                        1 / 2 hjul  │
└─────────────────────────────────────────────────────────┘
```

### Free User (Limit Reached):
```
┌─────────────────────────────────────────────────────────┐
│  [+ Skapa New wheel]           2 / 2 hjul (uppgradera)  │
└─────────────────────────────────────────────────────────┘
```
- Orange text warning
- Click "Skapa New wheel" → Opens upgrade prompt

### Premium User:
```
┌─────────────────────────────────────────────────────────┐
│  [+ Skapa New wheel]                    (no limit shown)│
└─────────────────────────────────────────────────────────┘
```

---

## 3. Upgrade Prompt Modal

**Appears when free user tries to create 3rd wheel:**

```
┌───────────────────────────────────────────┐
│              ⚠️                           │
│                                           │
│        Uppgradera till Premium            │
│                                           │
│  Du har 2 av 2 tillåtna hjul på          │
│  gratisplanen. Uppgradera till Premium    │
│  för obegränsade hjul!                    │
│                                           │
│  Nuvarande användning: [██████] 2/2       │
│                                           │
│  👑 Med Premium får du:                   │
│    ✓ Obegränsade årshjul                 │
│    ✓ Obegränsade team och medlemmar      │
│    ✓ Alla exportformat                   │
│    ✓ Prioriterad support                 │
│                                           │
│  Från bara:                               │
│    64 kr/månad   eller   79 kr/månad      │
│    (Årlig betalning ger 19% rabatt)      │
│                                           │
│  [Inte nu]        [Se planer]            │
└───────────────────────────────────────────┘
```

---

## 4. Subscription Modal (Pricing Plans)

**Appears when clicking "Uppgradera" or "Se planer":**

```
┌──────────────────────────────────────────────────────────────────┐
│                    Välj din plan                       [X]        │
│            Uppgradera för obegränsade möjligheter                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐          │
│  │  Gratis  │  │   Premium    │  │💎  Premium      │          │
│  │          │  │   Månadsvis  │  │    Årlig        │ ⭐ Spara 19%!│
│  ├──────────┤  ├──────────────┤  ├─────────────────┤          │
│  │ 0 kr     │  │  79 kr/månad │  │ 768 kr/år       │          │
│  │          │  │              │  │ (64 kr/månad)   │          │
│  ├──────────┤  ├──────────────┤  ├─────────────────┤          │
│  │ ✓ 2 hjul │  │ ✓ Obegränsad │  │ ✓ Obegränsad    │          │
│  │ ✓ 3 team │  │ ✓ Obegränsad │  │ ✓ Obegränsad    │          │
│  │   medlem │  │ ✓ Alla exp.  │  │ ✓ Alla exp.     │          │
│  │ ✓ PNG/SVG│  │ ✓ Prioritet  │  │ ✓ Prioritet     │          │
│  │          │  │ ✓ Versioner  │  │ ✓ Versioner     │          │
│  │          │  │ ✓ Samarbete  │  │ ✓ Samarbete     │          │
│  ├──────────┤  ├──────────────┤  ├─────────────────┤          │
│  │ Nuvarande│  │ Uppgradera nu│  │ Uppgradera nu   │          │
│  │   plan   │  │              │  │                 │          │
│  └──────────┘  └──────────────┘  └─────────────────┘          │
│                                                                  │
│  Vanliga frågor:                                                │
│  • Kan jag avbryta när som helst? Ja!                          │
│  • Vad händer när jag avbryter? Återgår till gratis           │
│  • Är betalningen säker? Ja, vi använder Stripe               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Subscription Settings (Premium Users)

**Appears when Premium users click "Premium" button:**

```
┌─────────────────────────────────────────────────┐
│              Prenumeration              [X]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 👑 Premium Årlig            ✓ Aktiv      │ │
│  │ 768 kr/år                                │ │
│  │                                          │ │
│  │ 📅 Förnyas: 10 oktober 2026              │ │
│  │                                          │ │
│  │ [💳 Hantera betalning]     [Avbryt]      │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Din användning:                               │
│  ┌─────────────────────────────────────────┐   │
│  │ Årshjul: 5 (Obegränsad)                │   │
│  │                                         │   │
│  │ Tillgängliga funktioner:               │   │
│  │ ✓ Obegränsade årshjul                  │   │
│  │ ✓ Obegränsade team och medlemmar       │   │
│  │ ✓ Alla exportformat                    │   │
│  │ ✓ Prioriterad support                  │   │
│  │ ✓ Versionshistorik                     │   │
│  │ ✓ Delning och samarbete                │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 6. Stripe Checkout (After Clicking "Uppgradera nu")

**User is redirected to Stripe-hosted checkout page:**

```
┌─────────────────────────────────────────────┐
│  🔒 Secure Stripe Checkout                  │
├─────────────────────────────────────────────┤
│                                             │
│  Year Wheel Premium Årlig                  │
│  768 kr/år                                  │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Email: user@example.com            │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Card number: 4242 4242 4242 4242  │    │
│  │ MM/YY: 12/26    CVC: 123          │    │
│  └────────────────────────────────────┘    │
│                                             │
│  [Pay 768 kr]                              │
└─────────────────────────────────────────────┘
```

After payment:
- Redirects back to dashboard
- Shows success toast: "Betalning genomförd!"
- Premium button now shows "👑 Premium"

---

## Testing Flow

### As a Free User:
1. ✅ Log in to dashboard
2. ✅ See yellow "Uppgradera" button in header
3. ✅ Create 2 wheels (success)
4. ✅ Try to create 3rd wheel
5. ✅ See upgrade prompt modal
6. ✅ Click "Se planer"
7. ✅ See subscription modal with 3 plans
8. ✅ Click "Uppgradera nu" on yearly plan
9. ✅ Redirected to Stripe checkout

### Testing Payments:
Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`

### As a Premium User:
1. ✅ See gradient "Premium" button with crown
2. ✅ Create unlimited wheels (no limit shown)
3. ✅ Click "Premium" button
4. ✅ See subscription settings modal
5. ✅ Can manage billing or cancel

---

## Color Scheme

- **Free Upgrade Button**: Yellow (#EAB308)
- **Premium Button**: Blue-purple gradient
- **Crown Icon**: Pulsing animation
- **Upgrade Prompt**: Yellow warning (#F59E0B)
- **Success**: Green (#10B981)
- **Yearly Plan**: Highlighted with golden badge

---

## Next Steps to Test

1. Run `yarn dev`
2. Open dashboard in browser
3. You should see the "Uppgradera" button immediately
4. Try creating wheels to trigger the upgrade prompt
5. Click through the subscription flow

**Note**: Make sure you've deployed the Supabase Edge Functions and run the SQL migration first!
