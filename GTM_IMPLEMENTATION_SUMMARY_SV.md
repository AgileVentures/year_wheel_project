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
