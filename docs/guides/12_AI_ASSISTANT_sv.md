# AI-Assistent

## Översikt

AI-Assistenten hjälper dig att planera och organisera ditt Årshjul med naturligt språk. Det är ett flytande, dragbart fönster som ansluter till ett kraftfullt multi-agent-system drivet av OpenAI GPT-4 och OpenAI Agents SDK.

## Nyckelfunktioner

### Naturlig Språkplanering

Beskriv helt enkelt vad du vill på svenska:

- "Lägg till julkampanj i december"
- "Skapa ring för Kampanjer"
- "Föreslå struktur för HR-planering"
- "Analysera mitt hjul och ge rekommendationer"

### Multi-Agent-System

AI-Assistenten använder 4 specialiserade agenter som arbetar tillsammans:

**Orkestreringsagent**: Huvudkoordinator som analyserar din begäran och delegerar till rätt specialist

**Strukturagent**: Skapar och hanterar ringar, aktivitetsgrupper, etiketter och årssidor

**Aktivitetsagent**: Skapar, uppdaterar, tar bort och söker efter aktiviteter

**Analysagent**: Ger AI-drivna insikter, domänidentifiering och kvalitetsbedömning

**Planeringsagent**: Genererar kompletta projektplaner med ringar, grupper och exempelaktiviteter

### Realtidsströmning

Se AI:n arbeta i realtid med Server-Sent Events (SSE):

- Statusuppdateringar ("Hämtar aktuell kontext...")
- Verktygsexekveringsframsteg ("Skapar aktivitet...")
- Agentsvar som strömmas ord för ord
- Felhantering med vänliga meddelanden

### Serversidans Konversationstillstånd

AI:n använder OpenAI:s Agents SDK med serversideshantering av konversation genom `lastResponseId`. Detta säkerställer:

- Konversationskontinuitet över flera förfrågningar
- Korrekt kontext från tidigare meddelanden
- Effektiva flervändararbetsflöden (som strukturförslag som kräver bekräftelse)

## Hur Man Använder

### Öppna Assistenten

Klicka på **AI**-knappen i editorns verktygsfält. Ett flytande fönster visas som du kan:

- Dra för att flytta (klicka och håll rubriken)
- Ändra storlek från vilken kant eller hörn som helst
- Minimera med minimeringsknappen
- Stänga med X-knappen eller Esc-tangenten

### Fönsterkontroller

Det flytande fönstret har:

- **Dragbar rubrik**: Flytta fönstret var som helst på skärmen
- **8 storlekshandtag**: Hörn och kanter för storleksändring
- **Minimeringsknapp**: Fäll ihop till endast rubrik
- **Stängknapp**: Stäng assistenten
- **Automatiska vyportbegränsningar**: Fönstret stannar inom synligt område

### Grundläggande Arbetsflöde

1. Skriv din begäran på svenska
2. Tryck Enter eller klicka Skicka
3. Se realtidsstatusuppdateringar
4. AI-agenten utför lämpliga verktyg
5. Få bekräftelse med detaljer

Exempel:

```
Användare: "Skapa kampanj i november"

Status: Hämtar aktuell kontext...
Status: Skapar aktivitet "kampanj"...
AI: Klart! Jag har skapat aktiviteten:

Kampanj
November 2025 (2025-11-01 till 2025-11-30)
Ring: Kampanjer
Grupp: Kampanj
```

## Tillgängliga Verktyg (24 Totalt)

### Kontextverktyg

**get_current_context**: Hämtar aktuella ringar, grupper, etiketter, sidor (år) och dagens datum. Returnerar ENDAST synliga objekt från aktuell sida.

### Strukturagentverktyg (15 verktyg)

**Ringhantering**:
- create_ring: Skapa yttre (aktivitets)ringar eller inre (text)ringar
- update_ring: Ändra ringnamn eller färg
- delete_ring: Ta bort ring (misslyckas om aktiviteter finns)
- toggle_ring_visibility: Visa/dölj ring utan att ta bort

**Aktivitetsgruppshantering**:
- create_activity_group: Skapa ny aktivitetskategori
- update_activity_group: Ändra gruppnamn eller färg
- delete_activity_group: Ta bort grupp (misslyckas om aktiviteter finns)
- toggle_group_visibility: Visa/dölj grupp utan att ta bort

**Etiketthantering**:
- create_label: Skapa valfria aktivitetsetiketter
- update_label: Ändra etikettnamn eller färg
- delete_label: Ta bort etikett (säkert även om den används)

**Årssidshantering**:
- create_year_page: Lägg till nytt år med valfri strukturkopiering
- smart_copy_year: Kopiera ALLA aktiviteter från ett år till ett annat med automatisk datumjustering

**AI-Drivna Förslag**:
- suggest_wheel_structure: AI genererar komplett struktur (ringar, grupper, exempelaktiviteter) baserat på domän eller användningsfall

### Aktivitetsagentverktyg (6 verktyg)

- create_activity: Skapa enskild aktivitet med datum, ring, grupp, valfri etikett
- batch_create_activities: Skapa flera aktiviteter i en operation
- query_activities: Sök efter namn, datumintervall, ring, grupp eller kvartal
- update_activity: Ändra aktivitetsnamn, datum, ring eller grupp (stöder flytt mellan år)
- delete_activity: Ta bort aktivitet efter namn
- list_activities: Visa alla aktiviteter för aktuell sida

### Analysagentverktyg (1 verktyg)

- analyze_wheel: AI-driven analys med domänidentifiering, kvalitetsbedömning, distributionsstatistik och specifika rekommendationer

### Planeringsagentverktyg (2 verktyg)

- suggest_plan: AI genererar komplett projektplan för ett mål och tidsperiod
- apply_suggested_plan: Skapar ringar, grupper och aktiviteter från föreslagen plan

## Agentarbetsflöden

### Strukturagent

**Syfte**: Hanterar hjulets struktur (ringar, grupper, etiketter, årssidor)

**När aktiverad**:
- "skapa ring", "ny ring"
- "skapa aktivitetsgrupp", "ny grupp"
- "föreslå struktur för [domän]"
- "skapa år", "kopiera år"
- "ändra färg på", "byt namn på"
- "ta bort ring/grupp"
- "dölj ring", "visa grupp"

**Föreslå Strukturarbetsflöde**:
1. Användare: "Föreslå struktur för marknadsföring"
2. AI anropar suggest_wheel_structure med domän
3. AI presenterar förslag med beskrivningar
4. AI frågar: "Vill du att jag skapar denna struktur?"
5. Användaren bekräftar
6. AI skapar ringar (får ID:n) → skapar grupper (med ring-ID:n)
7. Användaren kan sedan be Aktivitetsagenten lägga till aktiviteter

### Aktivitetsagent

**Syfte**: Skapar och hanterar aktiviteter/händelser

**När aktiverad** (HÖGSTA PRIORITET):
- ALLA former av "lägg till", "skapa", "ny" + aktivitet/event
- "flytta aktivitet", "ändra datum"
- "ta bort aktivitet"
- "lista aktiviteter"
- Flerstegsförfrågningar som "1. Lägg till X, 2. Omstrukturera Y"

**Smart Matchning**: AI matchar automatiskt nyckelord till ringar/grupper:
- "kampanj" → hittar "Kampanjer"-ring + "Kampanj"-grupp
- "rea" → hittar "REA"-grupp
- "event" → hittar "Händelser"-ring

**Datumhantering**:
- "idag" → använder aktuellt datum från kontext
- "november" → innevarande år om månad >= nu, annars nästa år
- "en vecka" → 7 dagars varaktighet
- Konverterar alltid till ÅÅÅÅ-MM-DD-format

**Fleråriga Aktiviteter**: Skapar/hittar automatiskt årssidor och delar aktiviteter över år.

### Analysagent

**Syfte**: Ger insikter och kvalitetsbedömning

**När aktiverad** (LÄGSTA PRIORITET):
- ENDAST när INGET annat begärs
- "analysera", "hur ser det ut"
- "ge rekommendationer"
- "vilken domän", "statistik"

**Utdata inkluderar**:
- Domänidentifiering (t.ex. "Marknadsföringsstrategi", "Produktlansering")
- Kvalitetsbedömning med specifik feedback
- Bästa praxis för domänen
- Topp 3 handlingsbara rekommendationer
- Kvartalsfördelningsstatistik
- Ring- och gruppfördelning

### Planeringsagent

**Syfte**: Genererar kompletta projektplaner

**När aktiverad**:
- "föreslå aktiviteter för [mål]"
- "skapa plan för [projekt]"
- "jag ska starta [nytt projekt]"
- "hjälp mig planera [mål]"

**Arbetsflöde**:
1. Användaren beskriver mål och eventuellt tidsperiod
2. AI anropar suggest_plan (använder GPT-4 för domänexpertis)
3. AI presenterar strukturerad plan med ringar, grupper, aktiviteter per kvartal
4. AI ber om bekräftelse
5. Användaren bekräftar
6. AI anropar apply_suggested_plan
7. All struktur skapas, användaren kan sedan justera

## Avancerade Funktioner

### Fleråriga Aktiviteter

Skapa aktiviteter som sträcker sig över flera år:

```
"Lägg till produktutveckling från oktober 2025 till mars 2026"
```

AI:n gör automatiskt:
- Kontrollerar om årssidor finns för 2025 och 2026
- Skapar saknade sidor med struktur kopierad från befintliga sidor
- Delar aktivitet: Okt-Dec 2025-segment + Jan-Mar 2026-segment
- Kopplar båda segmenten till samma ring och grupp

### Smart Datumtolkning

Naturliga språkdatum konverteras intelligent:

- "november" (inget år) → Innevarande år om Nov >= nuvarande månad, annars nästa år
- "idag" → Använder datum från get_current_context-verktyg
- "en vecka i december" → Dec 1-7 av lämpligt år
- "Q2" → 1 april till 30 juni

### Batchoperationer

Skapa flera aktiviteter effektivt:

```
"Skapa 12 månatliga kampanjer för 2025"
```

AI använder `batch_create_activities` för att skapa alla 12 i en databasoperation.

### Synlighetshantering

Dölj/visa utan att ta bort:

```
"Dölj ringen Kampanjer"
"Visa gruppen Marketing igen"
```

Dolda objekt stannar i databasen men är inte synliga på hjulet. Detta är användbart för:
- Säsongsringar som inte alltid behövs
- Testning av olika strukturer
- Tillfällig förenkling av vyn

### Flyttningar Mellan År

Flytta aktiviteter mellan år sömlöst:

```
"Flytta Google-kampanj till 2026"
```

AI:n:
- Tar bort gamla aktivitetsobjekt
- Skapar nya objekt på målårssida
- Bevarar alla andra egenskaper (ring, grupp, etikett)
- Behåller aktivitetsnamn och beskrivning

## Integration med Data

### Hjulkontext Laddad

Varje AI-förfrågan inkluderar:

```javascript
{
  title: "Marknadsplan 2025",
  year: 2025,
  stats: {
    rings: 5,
    activityGroups: 8,
    items: 42
  }
}
```

### Verktygsresultat

När AI utför verktyg får den strukturerade JSON-svar:

```json
{
  "success": true,
  "itemsCreated": 1,
  "message": "Aktivitet 'Julkampanj' skapad",
  "ringName": "Kampanjer",
  "groupName": "Kampanj"
}
```

Detta gör att AI:n kan ge dig detaljerad, korrekt feedback om vad som skapades.

## Premiumfunktioner

**AI-Assistenten kräver ett Premium-abonnemang.**

Gratisanvändare ser en uppgraderingsuppmaning när de klickar på AI-knappen.

### Vad Ingår

- Obegränsade AI-förfrågningar
- Alla 4 specialiserade agenter
- 24 databasverktyg
- GPT-4-driven analys
- Strukturförslag
- Planeringshjälp med domänexpertis
- Realtidsströmmande svar

## Markdown-Rendering

AI-svar renderas med:

- **marked**: Tolkar markdown-syntax
- **DOMPurify**: Sanerar HTML för att förhindra XSS-attacker
- **Ren formatering**: Rubriker, listor, fetstil, kodblock fungerar alla

AI:n formaterar automatiskt svar med:

```markdown
### Rubriker för sektioner
**Fetstil** för betoning
- Punktlistor
1. Numrerade listor
```

## Svarsrensning

Innan rendering rensas svar för att ta bort:

- UUID:er (databas-ID:n som inte är relevanta för användare)
- Emojis (alla Unicode-emojitecken)
- Onödiga mellanslag

Detta säkerställer professionell, fokuserad utdata.

## Felhantering

### Vanliga Fel och Lösningar

**"Det finns ett strukturellt problem"**

Orsak: Årssidor finns inte för begärda datum

Lösning: 
- Skapa årssida först: "Skapa år 2026"
- Eller byt till befintligt år i sidnavigatorn

**"Ring/Grupp hittades inte"**

Orsak: Saknad struktur (inga ringar eller aktivitetsgrupper finns)

Lösning:
- Skapa struktur: "Skapa ring Kampanjer"
- Eller be om förslag: "Föreslå struktur för marknadsföring"

**"Foreign key constraint violation"**

Orsak: Försök att referera till icke-existerande ringar eller grupper

Lösning:
- Se till att strukturen finns innan aktiviteter skapas
- AI:ns get_current_context-verktyg hjälper till att förhindra detta

### Vänliga Felmeddelanden

AI:n konverterar tekniska fel till svenska:

```
Databasfel: "foreign key constraint"
→ "Strukturen saknas. Skapa ringar och grupper först."

404 Not Found
→ "Kunde inte hitta den begärda resursen."
```

## Dataflöde

1. **Användaren skriver meddelande** → Frontend skickar till Edge Function
2. **Edge Function** → Initierar agenter med WheelContext (supabase-klient, wheelId, userId, currentYear, currentPageId)
3. **Orkestreringsagent** → Analyserar avsikt, delegerar till specialist
4. **Specialistagent** → Utför lämpliga verktyg
5. **Verktyg** → Frågar/uppdaterar Supabase-databas
6. **Verktygsresultat** → Återgår till agent som JSON
7. **Agent** → Formaterar svar på svenska
8. **SSE-Ström** → Skickar statusuppdateringar, verktygsanrop, resultat till frontend
9. **Frontend** → Renderar markdown-svar i AI-fönster

## SSE-Händelsetyper

Frontend tar emot dessa händelsetyper:

- **status**: Verktygsexekveringsstatus ("Hämtar aktuell kontext...")
- **agent**: Agenttänkande/svarande (strömmad text)
- **tool**: Verktygsanrop startar (verktygsnamn + argument)
- **tool_result**: Verktyget slutfört (resultatdata)
- **complete**: Konversation avslutad (inkluderar lastResponseId)
- **error**: Fel uppstod (vänligt meddelande)

## Konversationskontinuitet

AI:n använder `lastResponseId`-tokens från OpenAI Agents SDK:

```javascript
// Första begäran
POST /ai-assistant-v2
Body: { message: "Föreslå struktur för HR" }
Response: { lastResponseId: "abc123..." }

// Uppföljningsbegäran
POST /ai-assistant-v2
Body: { 
  message: "Ja, skapa den", 
  lastResponseId: "abc123..."  // Bibehåller kontext
}
```

Detta möjliggör flervändararbetsflöden som:
1. AI föreslår struktur
2. Användaren granskar och bekräftar
3. AI skapar baserat på tidigare förslag

## Begränsningar

### Språk

Svarar för närvarande främst på svenska. Engelsk input förstås men svar är på svenska.

### Ingen Direkt Kalender/Sheets-Synk

AI-Assistenten synkroniserar INTE direkt med Google Calendar eller Sheets. Den funktionaliteten hanteras av Google-integrationspanelen separat.

AI:n kan:
- Skapa aktiviteter manuellt
- Organisera aktiviteter i ringar och grupper
- Föreslå strukturer

AI:n kan inte:
- Synkronisera kalenderhändelser direkt
- Importera från kalkylblad
- Mappa kolumner eller kalendrar

För Google-integrationer, använd de dedikerade Google Calendar- och Google Sheets-panelerna i editorn.

### Ingen Konversationshistorik-UI

Varje begäran är oberoende (såvida inte lastResponseId används för flervänd). Det finns ingen beständig chatthistorik som visas i UI:t. Konversationen återställs när du stänger fönstret.

### Endast Databasoperationer

AI:n modifierar endast databasposter (wheel_pages, wheel_rings, activity_groups, items, labels). Den kan inte:
- Redigera canvas-renderingsinställningar
- Ändra UI-preferenser
- Modifiera abonnemangsplaner
- Få åtkomst till andra användares hjul

## Tekniska Detaljer

### Edge Function

- **Plats**: `supabase/functions/ai-assistant-v2/index.ts`
- **Runtime**: Deno (Supabase Edge Functions)
- **Modell**: GPT-4 (OpenAI)
- **Ramverk**: OpenAI Agents SDK v0.1.9
- **Strömning**: Server-Sent Events (SSE)

### Frontend-Komponent

- **Plats**: `src/components/AIAssistant.jsx`
- **Tillstånd**: React hooks (useState, useEffect, useRef)
- **Position**: Dragbar med vyportbegränsningar
- **Storlek**: Storleksbar med min/max-begränsningar
- **Rendering**: marked + DOMPurify för säker markdown

### Använda Databastabeller

- wheel_pages (organization_data JSONB)
- wheel_rings
- activity_groups
- labels
- items

### Autentisering

Kräver giltig Supabase-autentiseringstoken. Användar-ID extraheras från JWT och används för:
- RLS-policies
- Hjulägarskapsverifiering
- Premiumstatuskontroll

## Bästa Praxis

### Var Specifik

**Bra**: "Lägg till julkampanj 15-31 december i ringen Kampanjer"

**Mindre optimalt**: "Lägg till kampanj"

### Använd Naturligt Språk

**Bra**: "Skapa 12 månatliga recensioner"

**Mindre optimalt**: "create_activity name='Review' start='2025-01-01' end='2025-01-31'"

### Bygg Struktur Först

Innan du skapar aktiviteter:
1. Skapa ringar: "Skapa ring Kampanjer"
2. Skapa grupper: "Skapa aktivitetsgrupp Kampanj med färg #ff0000"
3. Skapa sedan aktiviteter: "Lägg till julkampanj i december"

Eller använd strukturförslag:
1. "Föreslå struktur för marknadsföring"
2. Granska förslag
3. Bekräfta: "Ja, skapa det"
4. Lägg sedan till specifika aktiviteter

### Flerstegsförfrågningar

Aktivitetsagenten hanterar flerstegsförfrågningar sekventiellt:

```
"1. Lägg till utvärdering i mars
 2. Omstrukturera kampanjer till Q2
 3. Inför buffertar mellan projekt"
```

AI utför varje steg i ordning och rapporterar alla resultat.

### Analys Efter Skapande

Efter att ha lagt till många aktiviteter:

```
"Analysera mitt hjul och ge rekommendationer"
```

Få insikter om:
- Domänpassning
- Planeringskvalitet
- Saknade kritiska aktiviteter
- Arbetsbelastningsfördelning
- Specifika förbättringar

## Integritet & Säkerhet

### Data Skickad till OpenAI

- Din meddelandetext
- Hjultitel och år
- Ring-, grupp-, etikettnamn och ID:n (endast synliga objekt)
- Aktivitetsnamn och datum (endast aktuell sida)
- Grundläggande statistik (antal)

### Data SOM INTE Skickas

- Användarens e-post eller personlig information
- Andra användares hjul
- Fullständigt databasinnehåll
- Betalningsinformation
- Konversationshistorik (lagras inte på våra servrar)

### Serversidebearbetning

All AI-bearbetning sker i Supabase Edge Functions (inte på frontend). Detta säkerställer:
- Databasuppgifter exponeras aldrig för webbläsaren
- RLS-policies tillämpas
- Premiumstatus verifieras på serversidan
- OpenAI API-nyckel säkrad

## Tangentbordsgenvägar

- **Esc**: Stäng AI-assistentfönster
- **Enter**: Skicka meddelande (när fokuserad i textområde)

## Kommer Snart

- Engelska språksvar
- Röstinmatning
- Beständig konversationshistorik i UI
- Mallförslagsbibliotek
- Fler specialiserade agenter (Budgetagent, Resursagent, Tidslinje-agent)
- Ångra/gör om-stöd för AI-åtgärder
- Aktivitetsmallar med smarta standardvärden
