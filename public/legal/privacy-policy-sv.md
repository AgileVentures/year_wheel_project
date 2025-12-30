# Integritetspolicy

_Senast uppdaterad: 30 december 2025_

---

## Introduktion

Välkommen till YearWheel ("vi", "oss", "vår"). Vi respekterar din integritet och är engagerade i att skydda dina personuppgifter. Denna integritetspolicy förklarar hur vi samlar in, använder, delar och skyddar din information när du använder vår tjänst.

YearWheel tillhandahålls av **CommunitasLabs Inc**, registrerat i USA.

---

## Information vi samlar in

### Information du tillhandahåller

**Kontoinformation**  
Namn, e-postadress, lösenord (krypterat)

**Profilinformation**  
Valfri information du väljer att dela

**Innehåll**  
Årshjul, aktiviteter, anteckningar och annan data du skapar

**Betalningsinformation**  
Behandlas säkert via Stripe (vi lagrar inte fullständiga kortuppgifter)

### Automatiskt insamlad information

**Användningsdata**  
Hur du interagerar med tjänsten

**Enhetsdata**  
IP-adress, webbläsartyp, operativsystem

**Cookies**  
Se vår Cookie-policy för detaljer

### Tredjepartstjänster

**Google Calendar & Sheets**  
Om du väljer att integrera dessa tjänster

**Autentiseringsinformation**  
Via säkra OAuth 2.0-protokoll

---

## Hur vi använder din information

Vi använder din information för att:

- Tillhandahålla och förbättra vår tjänst
- Skapa och hantera ditt konto
- Bearbeta betalningar och hantera prenumerationer
- Skicka dig tjänsterelaterad kommunikation
- Ge kundsupport
- Förhindra bedrägerier och säkerhetshot
- Följa juridiska skyldigheter

---

## Legal grund för behandling (GDPR)

Vi behandlar dina personuppgifter baserat på:

**Avtal**  
För att uppfylla vårt avtal med dig

**Berättigat intresse**  
För att förbättra vår tjänst och säkerhet

**Samtycke**  
För specifika funktioner som marknadsföring (kan återkallas)

**Juridisk skyldighet**  
För att följa lagar och regler

---

## Datadelning och tredje parter

> Vi delar ALDRIG din information för marknadsföringsändamål.

Vi delar data endast med:

### Översikt över tredjepartstjänster

Vår applikation använder minimalt med tredjepartstjänster, främst för infrastruktur, autentisering och analys. Nedan finns en omfattande översikt över alla tredjepartsdomäner och tjänster vi använder:

| Tjänst | Domän(er) | Syfte | Används av | Data som delas |
|---------|-----------|-------|------------|----------------|
| Monday.com | api.monday.com, auth.monday.com | Boarddata, autentisering | Båda apparna | Kontext, boarddata (endast läsning) |
| Supabase | mmysvuymzabstnobdfvo.supabase.co | Backend-infrastruktur, databas | Båda apparna | Användarprofil, OAuth-data |
| Google Analytics | www.google-analytics.com, www.googletagmanager.com | Användningsanalys | Endast huvudapp | Sidvisningar, sessioner (anonymiserade) |
| Google Auth | accounts.google.com, oauth2.googleapis.com | Användarautentisering | Endast huvudapp | E-post, namn, profil (med samtycke) |
| Google Tag Manager | www.googletagmanager.com | Tag-hantering | Endast huvudapp | Händelsespårningsdata |
| Netlify | yearwheel.se | Statisk hosting | Huvudapp | Ingen (värdleverantör) |
| Stripe | stripe.com | Betalningshantering | Huvudapp | Betalningsinformation (PCI DSS-certifierad) |

**Viktig distinktion:**
- **Monday.com Board View App**: Använder endast Monday.com API och Supabase (ingen analys)
- **Huvudappen YearWheel.se**: Använder alla tjänster ovan

### Monday.com API (Förstapartsintegration)

**Domäner:**
- `https://api.monday.com/v2` - GraphQL API
- `https://auth.monday.com/oauth2/authorize` - OAuth-auktorisering
- `https://auth.monday.com/oauth2/token` - OAuth-tokenutbyte

**Syfte:**
- Åtkomst till boarddata: Hämta boardgrupper, objekt, kolumner (endast läsning)
- Användarautentisering: OAuth-flöde för huvudapp
- Kontexthantering: Board view SDK-kontext

**Data som skickas till Monday.com:**
- GraphQL-frågor: Board-ID, objektfrågor (ingen PII)
- OAuth-förfrågningar: Klient-ID, redirect URI, state-parameter
- Kontextförfrågningar: Board-kontext från SDK

**Data som tas emot från Monday.com:**
- Boarddata: Grupper, objekt, kolumnvärden
- Användarinfo: E-post, namn, kontouppgifter (endast OAuth)
- Kontext: Board-ID, användarsession

**Varför detta är nödvändigt:**
Monday.com API är kärnfunktionaliteten i integrationen, krävs för att visa boarddata i årshjulsvisualisering och OAuth krävs för huvudappens användarlänkning.

**Integritetspolicy:** https://monday.com/l/legal/privacy-policy

### Supabase (Backend-infrastruktur)

**Domäner:**
- `https://mmysvuymzabstnobdfvo.supabase.co` - Supabase projekt-URL
- `https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/*` - Edge Functions
- `*.supabase.co` - Supabase-infrastruktur

**Syfte:**
- Databas: PostgreSQL för användarprofiler och monday_users-tabell
- Edge Functions: Webhook-hanterare, OAuth init/callback
- Autentisering: OAuth state-lagring
- Lagring: Användardata persistens

**Data som skickas till Supabase:**
- Användarprofiler: E-post, namn (från OAuth eller registrering)
- Monday-användare: monday_user_id, account_id, e-post, namn
- Webhook-data: Monday.com webhook-payloads (installation, prenumerationshändelser)

**Data som tas emot från Supabase:**
- Användarposter: Användarprofildata, monday_users-poster
- OAuth State: CSRF-skydd state-parameter

**Datasäkerhet:**
- Kryptering: AES-256 i vila, TLS 1.3 under överföring
- Säkerhet på radnivå: Databasåtkomstkontroller
- Miljövariabler: Hemligheter inte i kod
- JWT-verifiering: Webhook payload-verifiering

**Värdplats:** Frankfurt, Tyskland (eu-central-1)

**Integritetspolicy:** https://supabase.com/privacy

### Google Analytics & Google Tag Manager (Endast huvudapp)

**Domäner:**
- `https://www.google-analytics.com` - Analytics JavaScript
- `https://www.googletagmanager.com` - Tag Manager
- `https://analytics.google.com` - Analytics backend

**Syfte:**
- Användningsstatistik: Sidvisningar, sessionslängd, enhetstyper
- Användarbeteende: Funktionsanvändning, navigeringsmönster
- Prestandaövervakning: Laddningstider, felfrekvenser
- Händelsespårning: Användarinteraktioner, funktionsanvändning
- Tag-hantering: Centraliserad spårningskonfiguration

**Data som skickas till Google:**
- Sidvisningar: URL, sidtitel, referrer
- Enhetsinfo: Webbläsare, OS, skärmupplösning (anonymiserad)
- Sessionsdata: Sessions-ID, tidsstämpel
- Ingen PII: IP-adresser anonymiserade, inga namn/e-postadresser

**Data som tas emot från Google:**
- Ingen: Envägs dataflöde (app → Google)

**Cookie-samtycke integration:**
- Samtycke krävs: Google Analytics laddas endast efter användaracceptans
- Cookie-banner: Branschstandard samtyckes mekanism
- Opt-out tillgänglig: Användare kan avvisa analytics-cookies
- GDPR-kompatibel: Cookie-policy disclosure

**Varför detta är nödvändigt:**
Produktförbättring, förståelse av användarinteraktioner, buggdetektering, identifiering av fel och prestandaproblem, samt datadrivna utvecklingsbeslut. Används inte för annonser, remarketing eller annonsering.

**Viktigt:** Google Analytics används INTE i Monday.com Board View App iframe (ingen spårning i board view).

**Integritetspolicy:** https://policies.google.com/privacy

### Google-autentisering (Endast huvudapp)

**Domäner:**
- `https://accounts.google.com` - OAuth-auktorisering
- `https://oauth2.googleapis.com` - Tokenutbyte
- `https://www.googleapis.com/oauth2/v3/userinfo` - Användarprofil

**Syfte:**
- Användarautentisering: Logga in med Google-konto
- Identitetsverifiering: E-postverifiering
- Profildata: Namn och profilbild

**Data som skickas till Google:**
- OAuth-förfrågningar: Klient-ID, redirect URI, scope, state-parameter
- Token-förfrågningar: Auktoriseringskod, klientuppgifter

**Data som tas emot från Google:**
- Användarprofil: E-post, namn, profilbild-URL
- Åtkomsttoken: För API-åtkomst (om nödvändigt)
- ID-token: JWT med användaridentitet

**Användarsamtycke:**
- OAuth-samtyckeskärm: Användare godkänner explicit datadelning
- Scope-upplysning: Anger tydligt vilken data som begärs (e-post, profil)
- Återkallningsbar: Användare kan återkalla åtkomst via Google-kontoinställningar

**Datasäkerhet:**
- OAuth 2.0: Branschstandard autentiseringsprotokoll
- State-parameter: CSRF-skydd
- Endast HTTPS: Krypterad kommunikation
- Ingen lösenordslagring: Google hanterar autentisering

**Integritetsöverväganden:**
- Valfritt: Användare kan också skapa konton med e-post/lösenord
- Begränsad scope: Begär endast nödvändig data (e-post, namn, profil)
- Inga Google API:er: Kommer inte åt Gmail, Drive eller andra Google-tjänster
- Datakontroll: Användare kontrollerar vilken data de delar

**Viktigt:** Google Auth används INTE i Monday.com Board View App (board view använder Monday.com SDK-autentisering).

**Integritetspolicy:** https://policies.google.com/privacy

### Netlify (Värdleverantör)

**Domän:**
- `https://yearwheel.se` - Anpassad domän på Netlify

**Syfte:**
- Statisk hosting: Huvudappen YearWheel.se hosting
- CDN: Globalt innehållsleveransnätverk
- SSL-certifikat: Automatiska Let's Encrypt-certifikat
- HTTPS: Automatisk omdirigering och HSTS

**Data som skickas till Netlify:**
- Statiska tillgångar: HTML, CSS, JavaScript-filer (ingen användardata)
- Build-artefakter: Kompilerad applikationskod

**Data som tas emot från Netlify:**
- Ingen: Netlify är värdleverantör (ingen datautbyte)

**Datasäkerhet:**
- Endast HTTPS: All trafik krypterad
- HSTS aktiverad: Tvinga HTTPS
- Ingen datalagring: Netlify lagrar inte användardata

**Integritetspolicy:** https://www.netlify.com/privacy/

### Stripe (Betalningshantering)

**Syfte:**
- Betalningshantering (PCI DSS-certifierad)
- Säker hantering av betalningsinformation

**Data som delas:**
- Betalningsinformation behandlas säkert via Stripe
- Vi lagrar inte fullständiga kortuppgifter

**Integritetspolicy:** https://stripe.com/privacy

### Tjänster vi INTE använder

Vi använder uttryckligen **INTE**:
- Facebook Pixel eller Facebook Login: Ingen spårning av sociala medier
- Google Ads: Ingen annonsering eller remarketing
- Hotjar/FullStory: Ingen sessionuppspelning eller värmekartorr
- Amplitude/Mixpanel: Ingen avancerad analys (utöver Google Analytics)
- Tredjepartsnätverk för annonser: Ingen annonsering
- Twitter/LinkedIn/Apple Login: Inga andra sociala inloggningar (endast Google Auth och Monday.com OAuth)

### Juridiska krav

Vi kan dela information om det krävs enligt lag eller för att:
- Följa juridiska processer
- Skydda våra rättigheter
- Förhindra bedrägeri eller säkerhetshot

### Dataflödesdiagram

Vårt dataflöde mellan olika tjänster ser ut som följer:

```
┌─────────────────────────────────────────────────────────────┐
│                    Monday.com Board View                     │
│                  (ZIP hosted on Monday.com)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌──────────┐ ┌──────────────┐
│ Monday.com API│ │ Supabase │ │ (No Analytics│
│ api.monday.com│ │ Backend  │ │  in iframe)  │
└───────────────┘ └──────────┘ └──────────────┘
        │
┌───────────────────────────────────────────────────────────────┐
│                    Main YearWheel.se App                       │
│                    (Netlify hosted)                           │
└───────────────────────┬───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┬──────────┐
        │               │               │               │          │
        ▼               ▼               ▼               ▼          ▼
┌───────────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────┐ ┌────────────┐
│ Monday.com API│ │ Supabase │ │Google Analytics│ │ Netlify │ │Google Auth │
│ (OAuth)       │ │ Backend  │ │& Tag Manager   │ │  CDN    │ │(Sign-in)   │
└───────────────┘ └──────────┘ └──────────────┘ └─────────┘ └────────────┘
```

**Sammanfattning av dataflöde:**
- Användare → Monday.com Board View: Endast kontext
- Board View → Monday.com API: Board-frågor (endast läsning)
- Board View → Supabase: Inga direkta anrop (endast webhook)
- Huvudapp → Monday.com API: OAuth-autentisering
- Huvudapp → Supabase: Användarprofil, OAuth-data
- Huvudapp → Google Analytics & Tag Manager: Sidvisningar, händelser (med samtycke)
- Huvudapp → Google Auth: Användarinloggning (med samtycke)
- Huvudapp → Netlify: Endast statiska tillgångsförfrågningar

### Compliance-sammanfattning

Alla tredjepartstjänster vi använder följer större dataskyddsstandarder:

| Tjänst | GDPR-kompatibel | Databehandlingsavtal | SOC 2 | ISO 27001 |
|---------|-----------------|----------------------|-------|-----------|
| Monday.com | ✓ | ✓ | ✓ | ✓ |
| Supabase | ✓ | ✓ | ✓ | ✓ |
| Google | ✓ | ✓ | ✓ | ✓ |
| Netlify | ✓ | ✓ | ✓ | ✓ |
| Stripe | ✓ | ✓ | ✓ | ✓ |

**Alla tredjepartstjänster:**
- GDPR-kompatibla
- Tillhandahåller databehandlingsavtal (DPA)
- Certifierade för säkerhetsefterlevnad
- Upprätthåller transparenta integritetspolicyer
- Tillåter radering av användardata på begäran

---

## Datalagring och säkerhet

### Var vi lagrar data

**Primär lagring**  
EU-baserade servrar (via Supabase)

**Backup**  
Krypterade säkerhetskopior i EU-regionen

### Säkerhetsåtgärder

- End-to-end-kryptering för känsliga data
- HTTPS/TLS för all datatransmission
- Regelbundna säkerhetsgranskningar
- Åtkomstkontroll och autentisering
- Automatiska säkerhetskopior

### Lagringsperiod

**Aktiva konton**  
Data lagras så länge ditt konto är aktivt

**Inaktiva konton**  
Data raderas efter 24 månader av inaktivitet

**Raderade konton**  
Data raderas permanent inom 30 dagar

---

## Dina rättigheter (GDPR)

Du har rätt att:

**Åtkomst**  
Begära kopia av dina personuppgifter

**Rättelse**  
Korrigera felaktig information

**Radering**  
Radera ditt konto och all data

**Dataportabilitet**  
Exportera dina data i maskinläsbart format

**Invändning**  
Invända mot viss databehandling

**Begränsning**  
Begränsa behandling av dina uppgifter

**Återkalla samtycke**  
När som helst

> För att utöva dina rättigheter, kontakta oss på: **hey@communitaslabs.io**

---

## Internationell dataöverföring

Om du befinner dig utanför EU kan dina data överföras till EU-servrar. Vi säkerställer adekvat skydd genom:

- EU:s standardavtalsklausuler
- Dataskyddsavtal med alla tredjepartsleverantörer
- GDPR-kompatibla databehandlingsavtal

---

## Barn och minderåriga

YearWheel är inte avsedd för barn under 16 år. Vi samlar inte medvetet in information från barn.

> Om du är förälder och upptäcker att ditt barn har gett oss information, kontakta oss omedelbart.

---

## Cookies och spårning

Vi använder cookies för:

**Nödvändiga cookies**  
För att tjänsten ska fungera

**Funktionella cookies**  
För att komma ihåg dina preferenser

**Analytiska cookies**  
För att förstå hur tjänsten används (kan avvisas)

Du kan hantera cookies i webbläsarens inställningar eller via vår cookie-banner.

---

## Ändringar i policyn

Vi kan uppdatera denna policy då och då. Vid väsentliga ändringar:

- Meddelandebanner vid nästa inloggning
- E-postnotifiering till registrerade användare
- 30 dagars varsel innan ändringar träder i kraft

---

## Kontakta oss

För frågor om integritet eller denna policy:

**E-post**  
hey@communitaslabs.io

**Postadress**  
CommunitasLabs Inc, [Adress]

**EU-representant**  
[Namn och adress om tillämpligt]

---

## Tillsynsmyndighet

Du har rätt att lämna in klagomål till din lokala dataskyddsmyndighet:

**Sverige**  
Integritetsskyddsmyndigheten (IMY)

**EU**  
Din nationella dataskyddsmyndighet

---

_Senast granskad: 30 december 2025_
