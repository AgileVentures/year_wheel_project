# YearWheel AI-assistent - Avancerad användarguide

**Syfte**: Fördjupning i AI-driven naturlig språkplanering  
**Målgrupp**: Premium-användare, avancerade användare, supportteam  
**Tidsåtgång**: ~10-15 minuter att demonstrera

---

## Översikt

YearWheel AI-assistenten (Premium-funktion) låter användare generera kompletta årsplaner med hjälp av naturliga språkbeskrivningar. Driven av OpenAI GPT-4.1 via Vercel AI SDK kan den skapa ringar, aktivitetsgrupper, aktiviteter med datum och till och med innehåll för inre ringar från konversationsliknande prompter.

**Huvudfunktioner:**
- 🤖 Förståelse av naturligt språk
- 📅 Automatisk datumgenerering och fördelning
- 🎨 Intelligent färgtilldelning
- 🔄 Iterativ förfining
- 📝 Kontextmedvetenhet

---

## Komma åt AI-assistenten

**📸 Skärmdump: AI-assistentknapp i redigeraren (vanligtvis höger sidofält eller flytande knapp)**

### Placering:
- **I hjulredigeraren**: Leta efter AI-assistentikonen (✨ eller 🤖) i headern eller höger sidofält
- **Endast synlig**: För Premium-användare
- **Indikator**: Lila/blå accent för att särskilja från vanliga verktyg

### Öppna assistenten:
1. **Klicka**: På AI-assistentknappen
2. **Sidofält öppnas**: Höger panel med chattgränssnitt
3. **Observera**: Välkomstmeddelande och exempelprompts

---

## Gränssnittskomponenter

**📸 Skärmdump: AI-assistentpanel helt öppen med alla element märkta**

### Huvudelement:

**1. Chattinmatningsområde (Nederkant)**
- Stort textfält för att skriva prompter
- Teckenbegränsningsindikator
- Skicka-knapp (pappersplansikon)
- Rensa/återställningsknapp

**2. Konversationshistorik (Mitten)**
- Användarprompter (högerjusterade, vanligtvis blå/lila)
- AI-svar (vänsterjusterade, vanligtvis grå/vita)
- Genererade innehållsförhandsvisningar
- Åtgärdsknappar (Tillämpa, Redigera, Återskapa)

**3. Exempelprompts (Topp - Första gången)**
- Förskrivna förslag för att komma igång
- Klicka för att använda exempel
- Försvinner efter första interaktionen

**4. Inställningar/Alternativ (Ikon)**
- Temperaturkontroll (kreativitetsnivå)
- Modellval (om flera modeller finns tillgängliga)
- Rensa konversationshistorik

---

## Grundläggande användning: Skapa din första AI-plan

**📸 Skärmdump: AI-assistent med exempelprompt inmatad**

### Enkelt promptexempel:

**Användare skriver:**
```
Skapa en årlig marknadsföringsplan för 2026 med kvartalsvisa kampanjer
```

**AI svarar med:**
```
Jag skapar en marknadsföringsplan för 2026. Här är vad jag föreslår:

Ringar:
- Marknadsföringskampanjer (yttre)
- Budget & Planering (yttre)
- Kvartalsmål (inre)

Aktivitetsgrupper:
- Q1 Kampanjer (Blå #3B82F6)
- Q2 Kampanjer (Grön #10B981)
- Q3 Kampanjer (Gul #F59E0B)
- Q4 Kampanjer (Röd #EF4444)

Aktiviteter:
1. Nyårslansering
   - Ring: Marknadsföringskampanjer
   - Grupp: Q1 Kampanjer
   - Datum: 5 jan - 28 feb, 2026

2. Vårkampanj
   - Ring: Marknadsföringskampanjer
   - Grupp: Q1 Kampanjer
   - Datum: 1 mar - 31 mar, 2026

... (fortsätter med fler aktiviteter)

Innehåll för inre ring (Kvartalsmål):
- Q1: "Bygga varumärkesmedvetenhet, 50K sociala följare"
- Q2: "Lansera 2 nya produkter, 100K webbplatsbesökare"
- Q3: "Expandera till nya marknader, 25% intäktstillväxt"
- Q4: "Högsäsongsoptimering, 200K kunder"

Vill du att jag tillämpar detta på ditt hjul?
```

### Tillämpa den genererade planen:

**📸 Skärmdump: AI-svar med "Tillämpa på hjul"-knapp markerad**

1. **Granska**: AI:ns föreslagna struktur
2. **Klicka**: **"Tillämpa på hjul"**-knappen längst ner i AI-svaret
3. **Observera**: Laddningsindikator
4. **Vänta**: 3-5 sekunder medan AI skapar ringar, grupper och aktiviteter
5. **Framgång**: Bekräftelsemeddelande + alla element visas på hjulet

**📸 Skärmdump: Hjul efter AI-tillämpning - visar nyligen skapad struktur**

### Framgångsindikatorer:
✅ Alla föreslagna ringar skapade  
✅ Aktivitetsgrupper med korrekta färger  
✅ Aktiviteter placerade vid korrekta datum  
✅ Innehåll för inre ring (om det finns) ifyllt

---

## Avancerade prompttekniker

### 1. Specifik organisationsstruktur

**Effektiv prompt:**
```
Skapa en HR-årsplan för 2026 med dessa avdelningar:
- Rekrytering (25 positioner att fylla under året)
- Onboarding (månatliga kohorter)
- Utbildning & Utveckling (kvartalsvisa workshops)
- Retentionsprogram (pågående initiativ)
- Prestationsutvärderingar (halvårscykler)

Använd professionella färger och fördela aktiviteter jämnt över året.
```

**📸 Skärmdump: Komplext HR-hjul genererat från detaljerad prompt**

**Varför detta fungerar:**
- ✅ Specifika avdelningsnamn
- ✅ Kvantifierade mål (25 positioner, månatliga, kvartalsvisa)
- ✅ Tidsmönster explicit angivna
- ✅ Färgvägledning inkluderad

### 2. Datumspecifik planering

**Effektiv prompt:**
```
Skapa en produktlanseringsplan med:
- Beta-testning: 15 jan - 28 feb, 2026
- Marknadsföringsuppbyggnad: 1 feb - 31 mar, 2026
- Lanseringsevent: 1 april, 2026
- Support efter lansering: 2 april - 30 juni, 2026
- Utvärdering & iteration: 1 juli - 31 aug, 2026
```

**Varför detta fungerar:**
- ✅ Exakta datum angivna
- ✅ Sekventiella beroenden tydliga
- ✅ Överlappande aktiviteter (marknadsföring startar innan beta slutar)

### 3. Branschspecifik terminologi

**Effektiv prompt:**
```
Skapa en SaaS startup-roadmap för 2026 med:
- Sprintcykler (2-veckors sprints, agil metodik)
- Funktionsreleaser (stora releaser kvartalsvis, mindre månatliga)
- Customer success-milstolpar (onboarding, adoption, retention)
- Fundraising-tidslinje (Seed-förlängning Q1, Serie A-förberedelse Q3-Q4)
- Teamtillväxt (anställ 3 ingenjörer Q1, 2 säljare Q2, 1 designer Q3)
```

**📸 Skärmdump: Tech startup-hjul med agila-specifika aktiviteter**

**Varför detta fungerar:**
- ✅ Branschjargong (sprints, Serie A, adoption)
- ✅ Realistiska tidslinjer för techföretag
- ✅ Flera parallella spår (utveckling, försäljning, fundraising)

### 4. Eventdriven planering

**Effektiv prompt:**
```
Skapa ett konferensplaneringshjul för en techkonferens i september 2026:
- Lokalbokning: Nov 2025 - Jan 2026
- Talarrekrytering: Jan - April 2026
- Sponsorrekrytering: Feb - Juni 2026
- Marknadsföringskampanj: Maj - Sept 2026
- Registrering öppnar: 1 juni, 2026
- Event: 15-17 sept, 2026
- Uppföljning efter event: 18 sept - 31 okt, 2026
```

**Varför detta fungerar:**
- ✅ Arbetar bakåt från nyckeldatum (sept-konferens)
- ✅ Ledtider lämpliga för eventplanering
- ✅ Aktiviteter efter event inkluderade

---

## Iterativ förfining

AI-assistenten behåller konversationskontext, vilket möjliggör iterativa förbättringar.

**📸 Skärmdump: Flerstegskonversation som visar förfining**

### Exempelkonversation:

**Användare Tur 1:**
```
Skapa en grundläggande årlig marknadsföringsplan för 2026
```

**AI svarar med grundläggande plan**

**Användare Tur 2:**
```
Lägg till en sociala medier-strategi med dagliga inlägg
```

**AI lägger till:**
```
Jag lägger till en sociala medier-strategi till din befintliga plan:

Ny aktivitetsgrupp:
- Sociala medier (Lila #8B5CF6)

Nya aktiviteter:
1. Dagliga sociala inlägg (återkommande)
   - Ring: Marknadsföringskampanjer
   - Grupp: Sociala medier
   - Datum: 1 jan - 31 dec, 2026

2. Instagram-kampanj
   - Ring: Marknadsföringskampanjer
   - Grupp: Sociala medier
   - Datum: 1 jan - 31 mar, 2026

... (fortsätter)

Ska jag lägga till dessa på hjulet utan att ta bort befintliga aktiviteter?
```

**Användare Tur 3:**
```
Ja, och lägg också till budgetgenomgångar den 1:a i varje kvartal
```

**AI lägger till:**
```
Perfekt! Jag lägger till kvartalsvisa budgetgenomgångar:

Nya aktiviteter:
1. Q1 Budgetgenomgång
   - Ring: Budget & Planering
   - Grupp: Milstolpar
   - Datum: 1 jan, 2026

2. Q2 Budgetgenomgång
   - Ring: Budget & Planering
   - Grupp: Milstolpar
   - Datum: 1 april, 2026

... (fortsätter för Q3, Q4)

Tillämpar alla ändringar nu...
```

### Bästa praxis för iteration:
💡 **Var specifik om vad som ska läggas till/ändras**: "Lägg till X" vs "Ändra allt till X"  
💡 **Referera till befintliga element**: "Lägg till sociala medier i Marknadsföringsringen"  
💡 **En ändring åt gången** för tydlighet  
💡 **Ställ frågor** om AI:ns tolkning verkar fel

---

## Vad AI:n kan göra

### ✅ Funktioner:

**1. Skapa organisationsstruktur:**
- Generera ringar (inre och yttre)
- Definiera aktivitetsgrupper med intelligenta färgpaletter
- Sätta ringorientering (horisontell/vertikal för inre ringar)

**2. Generera aktiviteter:**
- Tolka naturliga språkdatum ("tidigt i mars", "slutet av Q2", "genom sommaren")
- Fördela aktiviteter intelligent (undvik överbeläggning)
- Skapa återkommande aktiviteter ("månatliga möten", "veckorapporter")
- Hantera överlappande aktiviteter (vanligt i verkliga planer)

**3. Skriva innehåll:**
- Inre ringtext (mål, teman, anteckningar)
- Aktivitetsbeskrivningar
- Vettiga aktivitetsnamn

**4. Tillämpa affärslogik:**
- Förstå kvartalsmönster
- Känna igen vanliga affärscykler (räkenskapsår, läsår, säsonger)
- Följa sekventiella beroenden ("X före Y")

**5. Hantera modifieringar:**
- Lägga till i befintlig plan utan att förstöra den
- Modifiera specifika ringar eller grupper
- Ersätta aktiviteter som matchar kriterier
- Skifta tidslinjer ("flytta allt 2 veckor senare")

### ❌ Nuvarande begränsningar:

**Kan inte (än):**
- ❌ Radera specifika ringar/aktiviteter (kan föreslå, men du raderar manuellt)
- ❌ Importera från externa kalendrar direkt
- ❌ Förstå visuella designpreferenser utöver färger
- ❌ Få tillgång till realtidsdata (teamtillgänglighet, faktiska kalenderkonflikter)
- ❌ Komma ihåg mellan sessioner (varje hjul har oberoende AI-kontext)

---

## Tips för promptteknik

### Gör:

✅ **Var specifik om kvantiteter**
- Bra: "Skapa 4 kvartalsvisa genomgångar"
- Dåligt: "Skapa några genomgångar"

✅ **Specificera datumformat du föredrar**
- Bra: "15 jan, 2026" eller "15 januari, 2026"
- Dåligt: "15/1/26" (tvetydigt: US vs Europeiskt format)

✅ **Nämn parallellt vs sekventiellt**
- Bra: "Marknadsföring och Utveckling sker samtidigt"
- Dåligt: Anta att AI vet att de överlappar

✅ **Använd punktlistor för komplexa förfrågningar**
- Lättare för AI att tolka strukturerade listor

✅ **Referera till året**
- Bra: "Skapa plan för 2026"
- Dåligt: "Skapa plan för nästa år" (tänk om det är 2027?)

### Gör inte:

❌ **Vagt språk**
- Dåligt: "Skapa lite marknadsföringssaker"
- Bättre: "Skapa 3 marknadsföringskampanjer i Q1-Q3"

❌ **Anta att AI kommer ihåg från andra hjul**
- Varje hjuls AI-kontext är oberoende

❌ **Alltför långa prompter (>500 ord)**
- Dela upp i flera turer

❌ **Tvetydiga tidsreferenser**
- Dåligt: "Snart", "senare", "så småningom"
- Bättre: "I februari", "Q3", "Mitt på året"

---

## Vanliga användningsfall

### 1. Komplett årsplan från grunden

**Promptmall:**
```
Skapa en [AVDELNING] årsplan för [ÅR] med:

Ringar:
- [Ring 1 namn och syfte]
- [Ring 2 namn och syfte]
- [Ring 3 namn och syfte]

Nyckelaktiviteter:
- [Aktivitetstyp 1]: [timing/frekvens]
- [Aktivitetstyp 2]: [timing/frekvens]
- [Aktivitetstyp 3]: [timing/frekvens]

Använd [färgschemapreferens] och inkludera kvartalsmål i en inre ring.
```

**Exempel:**
```
Skapa en Content Marketing årsplan för 2026 med:

Ringar:
- Blogginlägg (yttre)
- Videoinnehåll (yttre)
- Sociala medier (yttre)
- Innehållsstrategi (inre)

Nyckelaktiviteter:
- Blogginlägg: 2 per vecka, året runt
- YouTube-videor: 1 per vecka, året runt
- Podcasts: Varannan vecka, startar Q2
- Webbinarier: Månatliga, startar Q1
- E-böcker: Kvartalsvisa

Använd livliga, moderna färger och inkludera kvartalsvisa innehållsteman i den inre ringen.
```

### 2. Lägg till i befintligt hjul

**Promptmall:**
```
Lägg till [NYTT ELEMENT] till mitt befintliga hjul:
- [Detaljer om nytt element]
- Bör passa in i [TIDSRAM]
- Relaterat till [BEFINTLIGT ELEMENT]
```

**Exempel:**
```
Lägg till en produktlanserings­kampanj till mitt befintliga hjul:
- Förlanserings­aktiviteter: Jan-Feb 2026
- Lanseringsevent: 1 mars, 2026
- Support efter lansering: Mars-Maj 2026
- Bör koppla till befintlig Marknadsföringsring
```

### 3. Generera återkommande aktiviteter

**Promptmall:**
```
Skapa [FREKVENS] [AKTIVITETSTYP] genom [TIDSRAM]
```

**Exempel:**
```
- "Skapa månatliga teammöten genom 2026"
- "Skapa varannan veckas sprintplaneringsmöten från jan till dec 2026"
- "Skapa kvartalsvisa styrelsemöten på första måndagen i varje kvartal"
```

### 4. Temabaserad planering

**Promptmall:**
```
Skapa en [TEMA]-baserad årsplan där varje [PERIOD] fokuserar på:
- [Period 1]: [Tema 1]
- [Period 2]: [Tema 2]
- [Period 3]: [Tema 3]
- [Period 4]: [Tema 4]
```

**Exempel:**
```
Skapa en personlig utvecklingsplan för 2026 där varje kvartal fokuserar på:
- Q1: Fysisk hälsa (gym 3x/vecka, näring, sömn)
- Q2: Ekonomisk hälsa (budgetering, investeringar, sidoinkomst)
- Q3: Karriärutveckling (certifieringar, nätverk, portfölj)
- Q4: Relationer (familjetid, vänskap, gemenskap)
```

---

## Felsöka AI-svar

### Om AI missförstår:

**❌ Problem:** AI skapar aktiviteter i fel månader

**✅ Lösning:**
```
Vårkampanjen bör vara feb-april, inte maj-juli. Vänligen justera.
```

### Om AI genererar för många aktiviteter:

**❌ Problem:** Hjulet blir rörigt

**✅ Lösning:**
```
Det är för många aktiviteter. Behåll endast de 5 viktigaste kampanjerna per kvartal.
```

### Om färgerna inte fungerar:

**❌ Problem:** Färgerna är för lika eller krockar

**✅ Lösning:**
```
Använd mer distinkta färger: blå för Q1, grön för Q2, orange för Q3, röd för Q4.
```

### Om datum inte stämmer överens:

**❌ Problem:** Aktiviteter startar innan beroenden är klara

**✅ Lösning:**
```
Flytta marknadsföringskampanj till att starta EFTER att produktutveckling slutförts den 28 feb.
```

---

## Avancerat: Kombinera AI med manuell redigering

**Bästa arbetsflöde:**
1. **AI genererar struktur** (ringar, grupper, huvudaktiviteter)
2. **Användare förfinar manuellt** (justera specifika datum, lägg till detaljer)
3. **AI lägger till kompletterande aktiviteter** (återkommande uppgifter, mindre objekt)
4. **Användare slutför** (dölj ringar för presentation, exportera)

**📸 Skärmdump: Delad skärm som visar AI-förslag + manuella dra-och-släpp-justeringar**

### Varför detta hybrida tillvägagångssätt fungerar:
- AI hanterar bulk/tråkigt arbete (50+ aktiviteter)
- Människa säkerställer noggrannhet och anpassning till verkligheten
- AI kan återskapa sektioner utan att påverka manuella redigeringar (om promptad noggrant)

---

## Tips för supportteam

### Hjälpa användare att komma igång:

**📸 Skärmdump: Supportrepresentant guidar användare genom första AI-prompt**

1. **Börja enkelt**: "Prova att be den skapa en grundläggande marknadsföringsplan först"
2. **Visa exempel**: Ha 3-4 förskrivna prompter redo
3. **Iterera tillsammans**: Gör 2-3 förfiningar med användaren som tittar på
4. **Förklara kontext**: "AI:n kommer ihåg vår konversation, så du kan bygga på den"

### Vanliga användarfrågor:

**F: "Kommer AI radera mitt befintliga arbete?"**
- S: Nej, om du inte specifikt ber den ersätta allt. Standardinställningen är additiv.

**F: "Kan AI läsa min Google Kalender?"**
- S: Inte ännu, men du kan beskriva händelser och AI kommer att skapa dem.

**F: "Hur får jag AI att generera bättre resultat?"**
- S: Var mer specifik (kvantiteter, datum, beroenden).

**F: "Kan jag ångra AI-ändringar?"**
- S: Ja, Ctrl+Z / Cmd+Z fungerar, eller använd Versionshistorik för att återställa hela hjulet.

**F: "Används min data för att träna AI-modeller?"**
- S: Nej, konversationer används inte för träning (enligt OpenAI:s policy för företagskunder).

---

## Exempelskript för vanliga scenarier

### Scenario 1: HR-chef - Ny anställds onboarding

```
Skapa ett medarbetaronboarding-program för 2026:

Ringar:
- Rekrytering (yttre) - anställningspipeline-aktiviteter
- Onboarding (yttre) - första 90 dagarnas program
- Retention (yttre) - pågående engagemang
- Månatliga teman (inre) - fokusområden

Aktiviteter:
- Jobbannonser: Kontinuerligt genom året
- Intervjuveckor: Första veckan i varje månad
- Anställningsprocesser: 2 veckor efter intervjuer
- Onboarding-kohorter: Månatliga börjar den 15:e
- 30-60-90 dagars uppföljningar: För varje kohort
- Teambuilding-event: Kvartalsvisa
- Prestationsutvärderingar: Juni och december

Använd professionella, företagsfärger.
```

### Scenario 2: Frilansare - Hantering av flera kunder

```
Skapa en frilansarbetsplan för 2026 som hanterar 3 kunder:

Ringar:
- Kund A Projekt (yttre)
- Kund B Projekt (yttre)
- Kund C Projekt (yttre)
- Personlig utveckling (yttre)
- Månatliga intäktsmål (inre)

Kund A: Hemsideomdesign (jan-mars), sedan underhåll
Kund B: Pågående innehållsskrivning (2 artiklar/vecka hela året)
Kund C: Sociala medier-hantering (startar april, pågående)

Personligt: Ta augusti ledigt för semester, professionell utveckling i Q4

Använd distinkta färger per kund.
```

### Scenario 3: Ideell organisation - Insamlingskalender

```
Skapa en ideell insamlingskalender för 2026:

Stora event:
- Vår-gala: 15 april
- Sommar-löparlopp: 20 juli
- Höst-auktion: 10 oktober
- Årsslutsgivarkampanj: 15 nov - 31 dec

Stödjande aktiviteter:
- Bidragsansökningar: Kvartalsvisa (förfallodatum: 1 mars, 1 juni, 1 sept, 1 dec)
- Givarkontakt: Kontinuerlig
- Nyhetsbrev: Månatligt, skickat den 5:e
- Styrelsemöten: Varannan månad, första torsdagen

Använd varma, vänliga färger.
```

---

## Prestanda & bästa praxis

### Svarstider:
- Enkla planer (1-2 ringar, <10 aktiviteter): 3-5 sekunder
- Komplexa planer (5+ ringar, 50+ aktiviteter): 10-15 sekunder
- Iterativa tillägg: 2-4 sekunder

### Optimeringstips:
💡 Begär aktiviteter i batchar om du skapar 100+ objekt  
💡 Använd "Tillämpa på hjul" selektivt (granska innan tillämpning)  
💡 Rensa konversationshistorik om kontexten blir för lång  
💡 Dela upp mycket komplexa årsplaner i kvartal (generera Q1, sedan Q2, etc.)

---

## Framtida förbättringar (Roadmap)

*Kommande funktioner (kontrollera senaste versionen):*
- 🔄 Synk med Google Kalender (importera händelser direkt)
- 📊 Importera från Google Sheets / Excel
- 🗣️ Röstinmatning för prompter
- 🤝 Team-AI-kontext (AI kommer ihåg teammönster)
- 🎨 Stilinlärning (AI anpassar sig till dina färgpreferenser över tid)
- 📈 Prediktiva förslag ("Baserat på förra året, överväg att lägga till...")

---

**Slut på AI-assistentguide**

*För mer hjälp: support@yearwheel.com*
