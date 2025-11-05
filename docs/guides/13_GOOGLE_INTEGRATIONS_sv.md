# YearWheel Google-integrationer - Avancerad användarguide

**Syfte**: Guide till att synkronisera Google Kalender och Google Kalkylark med YearWheel  
**Målgrupp**: Premium-användare, IT-administratörer, supportteam  
**Status**: Premium-funktion

---

## Översikt

YearWheels Google-integrationer möjliggör sömlös synkronisering mellan ditt årliga planeringshjul och externa Google-tjänster. Detta möjliggör:

- 📅 **Google Kalender-synk**: Importera händelser som aktiviteter automatiskt
- 📊 **Google Kalkylark-synk**: Hämta data från kalkylark till ringar
- 🔄 **Tvåvägssynk** (kommer): Ändringar i YearWheel återspeglas i Google-verktyg
- 🕐 **Schemalagda uppdateringar**: Varje timme, dagligen eller manuell synkfrekvens

**Huvudfördelar:**
- Ingen duplicerad datainmatning
- Enda källan till sanning för datum
- Teamkalendrar fyller automatiskt på hjul
- Marknadsföringskalendrar matas direkt in i planering

---

## Förutsättningar

### Krävs:
✅ YearWheel Premium-konto  
✅ Google-konto med lämpliga behörigheter  
✅ Tillgång till kalendern eller kalkylarket du vill synka

### Behörigheter som behövs:
- **Google Kalender**: Läsåtkomst (visa händelser)
- **Google Kalkylark**: Läsåtkomst (visa arkdata)
- **OAuth-samtycke**: Engångsauktorisering genom Googles säkra flöde

**📸 Skärmdump: Googles OAuth-samtyckeskärm**

---

## Del 1: Google Kalender-integration

### Användningsfall

**Perfekt för:**
- Importera teamets händelsekalendrar (företagshelger, möten)
- Hämta in marknadsföringskampanjdatum från delade kalendrar
- Synka personlig kalender för att se work-life-balans
- Visa offentliga kalendrar (branschhändelser, konferensdatum)

**Inte idealiskt för:**
- Kalendrar med hundratals dagliga inlägg (för rörigt)
- Mycket känsliga/privata kalendrar (överväg säkerhet)

---

## Konfigurera Google Kalender-synk

### Steg 1: Anslut ditt Google-konto

**📸 Skärmdump: Användarprofilsida eller inställningssida med "Anslut Google"-knapp**

1. **Navigera till**: Profilinställningar eller Integrationer-sida
2. **Klicka**: **"Anslut Google Kalender"**-knappen
3. **OAuth-flöde öppnas** i nytt fönster/flik
4. **Google-inloggning**: Logga in om inte redan inloggad
5. **Behörighetsbegäran**: Google ber om att tillåta YearWheel att "Visa dina kalendrar"
6. **Klicka**: **"Tillåt"**-knappen
7. **Omdirigera tillbaka**: Återvänder till YearWheel med framgångsmeddelande

**📸 Skärmdump: Googles behörighetsbegäran som visar nödvändiga scope**

### Framgångsindikatorer:
✅ Grön "Ansluten"-märkning visas  
✅ Din Google-e-post visas  
✅ "Ansluten den [datum]"-tidsstämpel visas  
✅ Lista över tillgängliga kalendrar visas

---

### Steg 2: Välj en kalender att synka

**📸 Skärmdump: Kalenderval-dropdown som visar flera kalendrar**

Efter anslutning:

1. **Navigera till**: Hjulredigeraren
2. **Välj en ring**: Välj ringen där kalenderhändelser ska visas
3. **Klicka**: Ringinställningsikon (kugghjul ⚙️) eller högerklicka på ring
4. **Välj**: **"Anslut integration"** eller **"Synka med Google Kalender"**
5. **Modal öppnas**: Google Kalender-integrationsinställningar

**📸 Skärmdump: Ring-integrationsmodal med kalender-dropdown**

6. **Välj kalender**: Dropdown listar alla dina Google-kalendrar:
   - Primär kalender
   - Delade teamkalendrar
   - Prenumererade kalendrar
   - Andra kalendrar du har tillgång till

7. **Välj**: Den kalender du vill ha (t.ex. "Marknadsföringshändelser")

---

### Steg 3: Konfigurera synkinställningar

**📸 Skärmdump: Synkkonfigurationspanel med alla alternativ synliga**

**Mappningsalternativ:**

**1. Datummappning (Krävs)**
- **Händelsens startdatum** → Aktivitetens startdatum
- **Händelsens slutdatum** → Aktivitetens slutdatum
- För heldagshändelser: Sträcker sig över hela dagen/dagarna
- För tidsinställda händelser: Endast datum (tid visas i beskrivning)

**2. Aktivitetsgrupp-mappning (Krävs)**
Välj hur kalenderhändelser får färg:
- **Alternativ A**: Alla händelser → En enda aktivitetsgrupp (t.ex. alla blå)
- **Alternativ B**: Mappa efter kalenderfärg (Google Kalenders färg → YearWheel-grupp)
- **Alternativ C**: Mappa efter nyckelord (händelsetitel innehåller "möte" → grå grupp)

**Exempelkonfiguration:**
```
Kalender: "Marknadsföringsteamets kalender"
Ring: "Marknadsföringsaktiviteter"
Aktivitetsgrupp: "Kalenderhändelser" (blå #3B82F6)
Synkfrekvens: Dagligen kl. 06:00
```

**3. Synkfrekvens**
- **Manuell**: Endast när du klickar "Synka nu"
- **Varje timme**: Autosynk varje timme (hög frekvens, använd för snabbt föränderliga kalendrar)
- **Dagligen**: Autosynk en gång per dag vid angiven tid (rekommenderas)

**4. Filter (Valfritt)**
- **Datumintervall**: Synka endast händelser inom 2026 (ignorera tidigare/framtida)
- **Nyckelordsfilter**: Synka endast händelser som innehåller "kampanj" eller "lansering"
- **Exkluderingsmönster**: Hoppa över händelser med "[intern]" i titeln

**📸 Skärmdump: Filterkonfiguration med exempel**

---

### Steg 4: Utför första synkningen

1. **Granska inställningar**: Dubbelkolla kalender-, ring- och gruppval
2. **Klicka**: **"Spara & Synka nu"**-knappen
3. **Vänta**: Förloppsindikator visar synkstatus
   - "Hämtar händelser från Google Kalender..."
   - "Skapar aktiviteter... (15/32)"
   - "Synkning klar! 32 händelser importerade."

**📸 Skärmdump: Synkförloppsdialog**

4. **Observera hjulet**: Kalenderhändelser visas nu som aktiviteter
5. **Kontrollera sidofältet**: Aktiviteter markerade med Google Kalender-ikon (📅)

### Framgångsindikatorer:
✅ Aktiviteter visas i korrekt ring  
✅ Datum matchar Google Kalender exakt  
✅ Aktivitetsnamn = händelsetitlar  
✅ Beskrivningar inkluderar händelsedetaljer  
✅ Källindikator visar "Google Kalender"

---

## Hantera synkade aktiviteter

### Identifiera synkade aktiviteter:

**📸 Skärmdump: Aktivitetskort med Google Kalender-märkning**

Synkade aktiviteter har:
- 📅 Liten Google Kalender-ikon/märkning
- "Källa: Google Kalender" i detaljer
- Externt ID (dolt, används för uppdateringar)
- Lätt gråtonad eller speciell kant (visuell differentiering)

### Redigera synkade aktiviteter:

**⚠️ Viktiga regler:**
- **Kan inte redigera** datum, tid eller titel (styrs av Google Kalender)
- **Kan redigera**: Aktivitetsgrupp (ändra färg), beskrivning (lägg till anteckningar), etiketter
- **Kan dölja**: Avmarkera ringsynlighet för att dölja alla kalenderaktiviteter
- **Kan radera**: Tar bort från YearWheel endast, inte Google Kalender

**📸 Skärmdump: Redigeringsmodal för synkad aktivitet som visar inaktiverade fält**

### Synkuppdateringar:

När kalenderhändelse ändras i Google:
- **Namnändring**: Aktivitetsnamn uppdateras automatiskt
- **Datumändring**: Aktivitet flyttas till nytt datum
- **Händelse raderad**: Aktivitet tas bort från hjul (vid nästa synk)
- **Nya händelser**: Nya aktiviteter visas (som matchar filter)

**Manuell omsynkning:**
- Klicka ringinställningar → "Synka nu"-knapp
- Eller vänta på schemalagd synk (varje timme/dagligen)

---

## Del 2: Google Kalkylark-integration

### Användningsfall

**Perfekt för:**
- Importera marknadsföringskampanjscheman från planeringskalkylark
- Hämta in projekttidslinjer som underhålls i Kalkylark
- Teamlistor med start-/slutdatum
- Budgetposter med timingdata

**Inte idealiskt för:**
- Ark med rörig/inkonsekvent data
- Realtidssamarbete-ark (synkfördröjning)
- Ark med komplexa formler som beräknar datum

---

## Konfigurera Google Kalkylark-synk

### Steg 1: Anslut Google-konto

(Samma som Google Kalender - Steg 1 ovan)

Om redan ansluten för Kalender, hoppa till Steg 2.

---

### Steg 2: Välj kalkylark och blad

**📸 Skärmdump: Kalkylarksvalgränssnitt**

1. **Navigera till**: Ringinställningar i hjulredigeraren
2. **Klicka**: **"Anslut integration"** → **"Google Kalkylark"**
3. **Modal öppnas**: Google Kalkylark-integrationsguide

**📸 Skärmdump: Guide som visar kalkylarksväljare**

4. **Välj kalkylark**: 
   - Dropdown listar alla ark du har tillgång till
   - Eller klistra in Google Kalkylark-URL
   - Sök efter namn om många ark

5. **Välj specifikt blad** (flik inom kalkylark):
   - "2026 Kampanjkalender"
   - "Q1 Projekt"
   - Etc.

---

### Steg 3: Mappa kolumner till fält

**📸 Skärmdump: Kolumnmappningsgränssnitt som visar kalkylarkförhandsgranskning**

**Här händer magin:** YearWheel behöver veta vilka kalkylarkkolumner som mappar till aktivitetsfält.

**Exempelkalkylark:**
| Kampanjnamn | Startdatum | Slutdatum | Team | Status |
|---|---|---|---|---|
| Vårlansering | 2026-01-15 | 2026-03-31 | Marknadsföring | Planerad |
| Sommarrea | 2026-06-01 | 2026-08-31 | Försäljning | Bekräftad |

**Mappningskonfiguration:**

1. **Aktivitetsnamnfält**:
   - Välj kolumn: "Kampanjnamn"
   - Detta blir aktivitetstiteln på hjulet

2. **Startdatumfält**:
   - Välj kolumn: "Startdatum"
   - Datumformat: Auto-detekterat (ÅÅÅÅ-MM-DD, MM/DD/ÅÅÅÅ, etc.)
   - Om fel format detekteras, specificera manuellt

3. **Slutdatumfält**:
   - Välj kolumn: "Slutdatum"
   - Kan vara samma som startdatum för endagshändelser

4. **Aktivitetsgruppfält** (Valfritt):
   - Välj kolumn: "Team" eller "Status"
   - YearWheel skapar/mappar grupper baserat på unika värden:
     - "Marknadsföring" → Marknadsföringsgrupp (autofärg)
     - "Försäljning" → Försäljningsgrupp (autofärg)

5. **Beskrivningsfält** (Valfritt):
   - Välj kolumn: "Status" eller valfri textkolumn
   - Fyller i aktivitetsbeskrivning

**📸 Skärmdump: Slutförd kolumnmappning med förhandsgranskning**

---

### Steg 4: Konfigurera synkalternativ

**📸 Skärmdump: Synkalternativpanel**

**Alternativ:**

1. **Radfilter**:
   - Synka endast rader där Status = "Bekräftad"
   - Hoppa över rader med tomma datum
   - Endast rader 2-50 (ignorera rubrikrad 1)

2. **Synkfrekvens**:
   - Endast manuellt
   - Dagligen vid specifik tid
   - Varje timme (rekommenderas inte för Kalkylark, för frekvent)

3. **Konflikthantering**:
   - **Ersätt alla**: Radera befintliga aktiviteter, importera fräscht från Kalkylark
   - **Uppdatera befintliga**: Behåll manuella aktiviteter, uppdatera endast synkade
   - **Lägg endast till nya**: Radera aldrig, lägg endast till nya rader

4. **Datavalidering**:
   - Kräv både start- och slutdatum (hoppa över ofullständiga rader)
   - Kräv aktivitetsnamn (hoppa över tomma namn)
   - Datumintervallvalidering (endast 2026, ignorera andra)

---

### Steg 5: Utför första synkningen

1. **Klicka**: **"Förhandsgranska import"** för att se vad som kommer skapas
   - Visar tabell över väntande aktiviteter
   - Markerar eventuella fel (ogiltiga datum, saknade obligatoriska fält)

**📸 Skärmdump: Importförhandsgranskningstabellen**

2. **Granska**: Kontrollera att mappningen är korrekt
3. **Klicka**: **"Importera till hjul"**-knappen
4. **Vänta**: Förloppsindikator
5. **Framgång**: "Importerade 15 aktiviteter från Google Kalkylark"

**📸 Skärmdump: Hjul som visar importerade Kalkylark-aktiviteter**

### Framgångsindikatorer:
✅ Aktiviteter från kalkylark visas på hjulet  
✅ Datum, namn, färger matchar kalkylarkdata  
✅ Källindikator visar "Google Kalkylark"  
✅ Inga felaktiviteter (röda flaggor)

---

## Hantera synkad Kalkylark-data

### När kalkylark uppdateras:

**Användare uppdaterar Kalkylark:**
1. Ändrar rad: "Vårlansering" → "Vårens megalansering"
2. Ändrar datum: Startdatum 01/15 → 01/20
3. Sparar kalkylark

**YearWheel-synk (nästa schemalagda eller manuell):**
1. Upptäcker ändrad rad via externt ID
2. Uppdaterar aktivitetsnamn och datum automatiskt
3. Visar "Senast synkad: 2 minuter sedan"-indikator

**📸 Skärmdump: Synkstatusindikator som visar senaste uppdatering**

### Koppla bort Kalkylark-synk:

1. **Ringinställningar** → **"Hantera integration"**
2. **Klicka**: **"Koppla bort Google Kalkylark"**
3. **Välj**: 
   - Behåll befintliga aktiviteter (föräldralösa dem, blir manuella)
   - Radera alla synkade aktiviteter (rent bord)

---

## Avancerat: Kombinera Kalender + Kalkylark

**Kraftfullt arbetsflöde:**

**Scenario: Marknadsföringsteam**
- **Google Kalender**: Teammöten, kampanjmilstolpar (Ring: "Nyckelhändelser")
- **Google Kalkylark**: Detaljerade kampanjaktiviteter (Ring: "Kampanjer")
- **Manuella aktiviteter**: Ad-hoc-uppgifter, interna anteckningar (Ring: "Internt arbete")

**Resultat**: Komplett bild med minimal manuell inmatning!

**📸 Skärmdump: Hjul med tre ringar - Kalendersynk, Kalkylarksynk, Manuell**

---

## Felsökning

### Problem: "Misslyckades med att ansluta Google-konto"

**Orsaker:**
- Pop-up-blockerare förhindrar OAuth-fönster
- Cookie/integritetsinställningar blockerar Google-autentisering
- Tillfälligt Google API-problem

**Lösningar:**
1. Tillåt pop-ups för yearwheel.se
2. Prova inkognito/privat fönster
3. Kontrollera Google-kontostatus (inte avstängt)
4. Vänta 5 minuter och försök igen

---

### Problem: "Inga kalendrar hittades"

**Orsaker:**
- Google-kontot har inga kalendrar
- Otillräckliga behörigheter
- API-kvot överskriden (sällsynt)

**Lösningar:**
1. Verifiera att du har minst en kalender i Google Kalender
2. Återauktorisera med fullständiga behörigheter
3. Kontakta support om problemet kvarstår

---

### Problem: "Händelser visas inte på hjulet"

**Orsaker:**
- Händelser utanför datumintervall (inte i 2026 om hjulet är 2026)
- Filter exkluderar händelser (nyckelordsfilter)
- Händelse är inställd i Google Kalender
- Synk har inte körts än

**Lösningar:**
1. Kontrollera händelsedatum i Google Kalender
2. Granska synkfilter i ringinställningar
3. Utför manuell synkning: "Synka nu"-knapp
4. Kontrollera synkloggar för fel

**📸 Skärmdump: Synkloggar som visar filtrerade händelser**

---

### Problem: "Dubbla aktiviteter efter synk"

**Orsaker:**
- Synkades två gånger manuellt utan att använda uppdateringsläge
- Externt ID förlorat (sällsynt databasfel)
- Användare skapade aktivitet med samma namn manuellt

**Lösningar:**
1. Radera dubbletter manuellt
2. Koppla bort och återanslut synk (föräldralösa befintliga aktiviteter först)
3. Använd "Ersätt alla"-läge för rent bord

---

### Problem: "Kalkylarkkolumner mappar inte korrekt"

**Orsaker:**
- Kolumnrubriker ändrade i Kalkylark
- Fel datumformat i Kalkylark
- Formelceller (inte rådata)

**Lösningar:**
1. Säkerställ att kolumnrubriker inte har ändrats
2. Standardisera datumformat i Kalkylark (ÅÅÅÅ-MM-DD rekommenderas)
3. Konvertera formelceller till värden i Kalkylark
4. Gör om kolumnmappning i YearWheel

---

## Säkerhet & Integritet

### Vad YearWheel kan komma åt:

**Google Kalender:**
- ✅ Händelsetitlar, datum, tider
- ✅ Händelsebeskrivningar
- ✅ Antal deltagare (inte namn)
- ❌ Kan inte modifiera eller radera kalenderhändelser
- ❌ Kan inte se privata händelsedetaljer (visas som "Upptagen")

**Google Kalkylark:**
- ✅ Läsa cellvärden
- ✅ Läsa bladnamn
- ❌ Kan inte modifiera kalkylark
- ❌ Kan inte radera eller dela kalkylark

### Token-lagring:
- OAuth-tokens lagras krypterade i Supabase
- Refresh-tokens används för att upprätthålla åtkomst
- Återkallbara när som helst från Google-kontoinställningar

### Återkalla åtkomst:
1. Google-konto → Säkerhet → Tredjepartsappar med kontoåtkomst
2. Hitta "YearWheel"
3. Klicka "Ta bort åtkomst"
4. YearWheel kommer att förlora synkförmåga tills återauktorisering

**📸 Skärmdump: Googles tredjepartsapp-hanteringssida**

---

## Bästa praxis

### Gör:

✅ **Använd dedikerade kalendrar**: Skapa "YearWheel-synk"-kalender i Google, dela med team  
✅ **Standardisera namngivning**: Konsekventa händelsenamn gör filtrering enklare  
✅ **Testa med liten dataset**: Synka 5-10 händelser först, verifiera innan synkning av hundratals  
✅ **Dokumentera mappning**: Notera vilka kolumner som mappar till vilka fält (för teamreferens)  
✅ **Sätt lämplig synkfrekvens**: Dagligen för de flesta fall, varje timme endast om kritiskt

### Gör inte:

❌ **Synka inte personlig kalender med känsliga händelser**: Endast arbetskalender  
❌ **Synka inte för många kalendrar till en ring**: Skapar röra  
❌ **Förlita dig inte på omedelbar synk**: Tillåt 1-2 minuter för uppdateringar att spridas  
❌ **Redigera inte datum i YearWheel för synkade aktiviteter**: Redigera i Google, synk kommer uppdatera

---

## Pro-tips

💡 **Färgkodning**: Använd Google Kalender-färger för att automatiskt tilldela aktivitetsgrupper  
💡 **Namnkonvention**: Prefixa kalenderhändelser med [KUND] eller [PROJEKT] för enkel filtrering  
💡 **Backup innan synk**: Exportera hjul som .yrw innan första stora synken  
💡 **Separata ringar**: En ring för kalendersynk, en för Kalkylark, håller det organiserat  
💡 **Återkommande händelser**: YearWheel synkar varje instans som separat aktivitet

---

## Framtida förbättringar (Roadmap)

*Kommande funktioner (kontrollera senaste versionen):*
- 🔄 **Tvåvägssynk**: Ändringar i YearWheel skjuts tillbaka till Google
- 📧 **Gmail-integration**: Skapa aktiviteter från e-posttrådar
- 📁 **Google Drive**: Länka filer till aktiviteter
- 🔔 **Notifieringssynk**: Google Kalender-påminnelser → YearWheel-notifieringar
- 📊 **Avancerade Kalkylark-formler**: Stöd för beräknade datumkolumner

---

## Vanliga frågor

**F: Fungerar synk offline?**  
S: Nej, internet krävs. Köade synkningar kommer att bearbetas när online igen.

**F: Kan jag synka flera kalendrar till en ring?**  
S: Inte direkt. Skapa flera ringar eller kombinera kalendrar i Google först.

**F: Vad händer om jag raderar synkad aktivitet i YearWheel?**  
S: Tas bort från hjul endast. Nästa synk kommer att återimportera den om du inte filtrerar bort den.

**F: Kan jag synka från Microsoft Outlook?**  
S: Inte nativt. Exportera Outlook till Google Kalender, synka sedan därifrån.

**F: Finns det en gräns för synkade aktiviteter?**  
S: Premium tillåter obegränsat. Rekommenderar <200 aktiviteter per ring för prestanda.

**F: Kan teammedlemmar synka sina egna kalendrar till delat hjul?**  
S: Ja, varje teammedlem ansluter sitt Google-konto oberoende.

---

**Slut på Google Integrationer-guide**

*För support: support@yearwheel.com*  
*För API-åtkomst: Se Utvecklardokumentation*
