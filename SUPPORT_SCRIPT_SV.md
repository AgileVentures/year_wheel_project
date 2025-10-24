# YearWheel Supportskript för Användaronboarding

**Syfte**: Vägleda nya användare genom YearWheels huvudfunktioner i en live-demo  
**Tidsåtgång**: ~20-25 minuter  
**Format**: Följ stegen tillsammans med användaren, låt dem klicka/interagera

**Tips för bästa resultat:**
- Låt användaren aktivt utföra varje steg själv
- Pausa efter varje steg för att svara på frågor
- Anpassa tempo efter användarens erfarenhetsnivå
- Fokusera på de funktioner som är mest relevanta för deras användningsfall

---

## 1. REGISTRERING & INLOGGNING

**📸 Screenshot: Landing page med registreringsformuläret synligt**

### Navigera till:
- Öppna webbläsaren på `https://yearwheel.com` (eller er domän)
- Klicka **"Kom igång"** eller **"Registrera"** i toppnavigationen

### Guida användaren att:
- **Klicka**: "Registrera"-fliken
- **Ange**: E-postadress
- **Ange**: Lösenord (minst 6 tecken)
- **Klicka**: "Skapa konto"-knappen

### Förklara pedagogiskt:
> "YearWheel använder säker autentisering för att skydda ditt arbete. När du registrerar dig skapar vi ditt eget personliga konto där alla dina planeringar sparas säkert i molnet. Du kommer att få ett bekräftelsemejl - detta är för att verifiera att det verkligen är du som skapar kontot."
>
> "För denna demo använder vi ett demokonto som redan är verifierat, så vi kan hoppa direkt in och börja planera!"

### Alternativ (om ni använder demo):
- **Klicka**: "Logga in"-fliken
- **Ange**: Demo-inloggningsuppgifter
- **Klicka**: "Logga in"

### Vanliga frågor att förutse:
- **Q: Kostar det något att skapa konto?**  
  A: Nej, YearWheel är gratis att komma igång med. Du kan skapa upp till 2 hjul gratis.
  
- **Q: Kan jag logga in från flera enheter?**  
  A: Ja! Ditt konto är molnbaserat så du kan komma åt dina hjul från vilken dator eller surfplatta som helst.

---

## 2. ÖVERSIKT AV DASHBOARD

**📸 Screenshot: Dashboard med flera hjulkort, "Skapa nytt hjul"-knappen och team-sektionen synlig**

### Navigera till:
- Efter inloggning hamnar du på `/dashboard`

### Peka ut med muspekaren:
- **Övre delen**: "Mina Hjul" - *"Här finns alla årsplaneringar du har skapat"*
- **Hjulkort**: Visa titel, år, och "Senast ändrad"-datum
- **Höger sida**: "Skapa nytt hjul"-knapp (blå, framträdande)
- **Team-sektion**: *"Här ser du hjul som delas med dig av andra"*
- **Mallar-knapp** (om synlig): *"Färdiga utgångspunkter för snabb start"*

### Förklara pedagogiskt:
> "Detta är din dashboard - din kommandocentral i YearWheel. Tänk på denna sida som ditt dokumentbibliotek, fast för årsplaneringar."
>
> "Varje kort här representerar ett komplett årshjul - du kan ha flera samtidigt. Kanske ett för marknadsföring, ett för HR, och ett personligt. Allt sparas automatiskt i molnet."
>
> "Det verkliga arbetet sker inne i editorn, som vi öppnar härnäst. Men dashboarden är där du snabbt kan hoppa mellan olika planeringar och se vad som senast uppdaterats."

### Framgångsindikatorer:
✅ Användaren förstår att kort = separat årsplanering  
✅ Användaren kan identifiera "Skapa nytt hjul"-knappen  
✅ Användaren ser datumet för senaste ändring på korten

---

## 3. SKAPA DITT FÖRSTA HJUL

**📸 Screenshot: "Skapa nytt hjul"-knappen markerad med muspekare**

### Guida användaren att:
- **Klicka**: Blå **"Skapa nytt hjul"**-knappen (uppe till höger)
- **Vänta**: 2-3 sekunder medan hjulet skapas och editorn laddas
- **Observera**: URL:en ändras till `/dashboard/wheel/{wheelId}`

### Förklara medan det laddar:
> "YearWheel skapar nu ditt första årsplaneringshjul. Det får automatiskt ett unikt ID och sparas direkt i ditt konto. Ingen data går förlorad!"

**📸 Screenshot: Editorn med alla huvudområden markerade (hjulvisualisering, sidopanel, header)**

### Peka ut viktiga områden (gör en "rundtur"):

**1. Centerområdet - Hjulvisualiseringen:**
> "Detta är själva årshjulet - din cirkulära årskalender. Varje månad är en sektion, och året roterar medurs från januari högst upp."

**2. Vänster sidofält - Organisationspanelen:**
> "Detta är din kontrollpanel. Här skapar och redigerar du allt innehåll. Observera de tre flikarna längst upp:"
- 🎯 **Skiva** - *"Visar ringar och aktiviteter hierarkiskt, precis som de ser ut på hjulet"*
- 📋 **Lista** - *"Tabellvy för snabb redigering av många aktiviteter"*
- 📅 **Kalender** - *"Traditionell månadvy om du föredrar det"*

**3. Övre headern - Verktygsraden:**
> "Här hittar du alla huvudfunktioner:"
- **Spara-knapp** - *"Sparar dina ändringar (men autosparning fungerar också!)"*
- **Export** - *"Ladda ner som bild eller PDF för presentationer"*
- **Versionshistorik** - *"Återställ till tidigare versioner om något går fel"*
- **Dela-knapp** - *"Bjud in teammedlemmar eller skapa publik länk"*

### Viktigt sammanhang:
> "Editorn kan verka komplex första gången, men varje funktion är där av en anledning. Under nästa 10 minuter fokuserar vi på de grundläggande: skapa ringar, lägga till aktiviteter, och navigera hjulet. När du känner dig bekväm med det kan du utforska de avancerade funktionerna."

### Framgångsindikatorer:
✅ Användaren kan identifiera de tre vyerna (Skiva/Lista/Kalender)  
✅ Användaren ser hjulet rotera med månadsnamn  
✅ Användaren förstår att vänster panel = input, center = visualisering

---

## 4. VÄXLA RINGSYNLIGHET (Presentationsfunktion)

**📸 Screenshot: Organisationspanelen med en ring markerad, kryssrutan framhävd**

### Navigera till:
- **Se till att du är på**: **Skiva**-fliken i vänster sidopanel
- **Leta upp**: Vilken ring som helst i sektionen "Yttre Ringar" eller "Inre Ringar"
- **Hitta**: Kryssrutan (☑️) till vänster om varje ringnamn

### Guida användaren att:
1. **Klicka**: Kryssrutan bredvid en ring för att bocka ur den
2. **Se på hjulet**: Ringen försvinner omedelbart från visualiseringen
3. **Klicka**: Kryssrutan igen för att bocka i den
4. **Se på hjulet**: Ringen dyker upp igen

**📸 Screenshot: Före/efter-jämförelse - hjul med alla ringar synliga vs några dolda**

### Förklara pedagogiskt med exempel:
> "Detta är en av våra mest populära funktioner - särskilt för chefer och projektledare som presenterar för olika målgrupper."
>
> **Praktiskt exempel:**
> "Säg att du är HR-chef och har ett årshjul med 6 ringar: Rekrytering, Introduktion, Utbildning, Retention, Administration och Budget. När du presenterar för styrelsen vill du kanske bara visa Rekrytering, Utbildning och Budget - och dölja de operativa detaljerna. När du sedan träffar HR-teamet visar du alla 6 ringarna."
>
> "Det fina är att ingen data försvinner - du kontrollerar bara vad som visas. Du kan växla fram och tillbaka under en presentation beroende på vilka frågor som ställs!"

### Varför detta är kraftfullt:
- **Anpassade presentationer** utan att behöva flera kopior av samma hjul
- **Fokusera uppmärksamheten** på det som är relevant just nu
- **Undvik informationsöverbelastning** för mottagaren
- **Ändra snabbt** under möten när diskussionen skiftar fokus

### Framgångsindikatorer:
✅ Användaren kan dölja och visa ringar med kryssrutan  
✅ Användaren ser ändringen realtid på hjulet  
✅ Användaren förstår att data inte tas bort, bara döljs

### Demonstrera användningsfall:
- Dölj 2-3 ringar
- Visa ett renare hjul med fokuserat innehåll
- Växla tillbaka dem igen

---

## 5. BYTA NAMN PÅ STANDARDRINGAR

**📸 Screenshot: Yttre Ringar-sektionen med penna-ikonen markerad på en ring**

### Navigera till:
- **Se till att**: Vänster sidofält är öppet (klicka hamburgermeny ☰ om stängd)
- **Se till att**: "Skiva"-fliken (🎯) är vald
- **Scrolla till**: "Yttre Ringar"-sektion i sidofältet

### Guida användaren att:
1. **Hitta**: Första ringen (t.ex. "Ring 1")
2. **Klicka**: Penna-ikonen (✏️) bredvid ringnamnet
3. **Skriv**: Nytt namn, t.ex. "Marknadsföring"
4. **Tryck**: Enter eller klicka på bocken (✓)
5. **Observera**: Namnet uppdateras både i listan och på hjulet

### Upprepa för 2-3 ringar för att skapa kontext:
- "Marknadsföring"
- "Försäljning"
- "Produktutveckling"

**📸 Screenshot: Hjulet med omdöpta ringar synliga på visualiseringen**

### Förklara med analogi:
> "Ringar är huvudkategorierna i ditt årshjul - tänk på dem som flikar i en mapp eller avdelningar i ett företag."
>
> **Yttre ringar** (dessa vi just döpte om) är de stora kategorierna - kanske avdelningar, projekt eller ansvarsområden. De ligger längst ut på hjulet och är mest framträdande.
>
> **Varför är detta viktigt?** När du sen lägger till aktiviteter måste du koppla dem till en ring. Så 'Marknadsföring'-ringen kommer innehålla alla marknadsaktiviteter, 'Försäljning' alla säljaktiviteter, osv. Det skapar struktur!"

### Tips att dela:
💡 "Välj ringnamn baserat på hur din organisation är strukturerad. Är ni funktionella (Marketing, HR, IT)? Eller projektbaserade (Projekt A, Projekt B)? Eller kanske tematiska (Innovation, Stabilitet, Tillväxt)?"

### Framgångsindikatorer:
✅ Användaren kan byta namn på minst 2 ringar  
✅ Användaren ser att ringnamnen uppdateras på hjulet  
✅ Användaren förstår att ringar = organisatoriska kategorier

---

## 6. LÄGG TILL AKTIVITETSGRUPP

**📸 Screenshot: Aktivitetsgrupper-sektionen med "+ Lägg till aktivitetsgrupp"-knappen markerad**

### Navigera till:
- **Scrolla ner** i vänster sidofält till sektionen "Aktivitetsgrupper"

### Guida användaren att:
1. **Klicka**: **"+ Lägg till aktivitetsgrupp"**-knappen
2. **Modal öppnas** (dialogruta i mitten av skärmen)
3. **Ange namn**: "Q1-kampanj"
4. **Klicka**: Färgväljaren (färglåda-ikon)
5. **Välj färg**: T.ex. ljusblå (#3B82F6)
6. **Klicka**: **"Lägg till"**-knappen

**📸 Screenshot: "Lägg till aktivitetsgrupp"-modalen med fält ifyllda**

### Skapa 2-3 fler för variation:
- "Q2-projekt" (grön)
- "Återkommande" (grå)
- "Milstolpar" (röd)

**📸 Screenshot: Flera aktivitetsgrupper listade med sina färger**

### Förklara skillnaden mellan Ringar och Aktivitetsgrupper:

> **Ringar = VAR** aktiviteten hör hemma (avdelning/kategori)  
> **Aktivitetsgrupper = HUR** aktiviteten är färgkodad (typ/tema)
>
> **Praktiskt exempel:**
> - Ring: "Marknadsföring" (var)
> - Aktivitetsgrupp: "Q1-kampanj" (hur - ger blå färg)
> - Resultat: En blå aktivitet i Marknadsföringsringen
>
> "Detta dubbla system ger dig flexibilitet: Du kan ha marknadsaktiviteter i alla kvartalsgrupper, och se dem färgkodade per kvartal. Eller ha återkommande aktiviteter (grå) spridda över alla avdelningar."

### Varför färger är viktiga:
- **Snabb igenkänning** - "Alla blå = Q1" gör det lätt att se kvartalets aktiviteter
- **Visuell gruppering** - Likadana aktiviteter får samma färg även i olika ringar
- **Presentationskraft** - Färger gör hjulet lätt att förstå för nya betraktare

### Framgångsindikatorer:
✅ Användaren kan skapa minst 2 aktivitetsgrupper med olika färger  
✅ Användaren förstår skillnaden mellan ringar (position) och grupper (färg)  
✅ Användaren ser aktivitetsgrupperna listade i sidopanelen

---

## 7. LÄGG TILL DIN FÖRSTA AKTIVITET

**📸 Screenshot: "+ Lägg till aktivitet"-knappen markerad i sidopanelen**

### Guida användaren att:
1. **Klicka**: **"+ Lägg till aktivitet"**-knappen (överst i sidofältet)
2. **Vänta**: Modal (dialogruta) öppnas

**📸 Screenshot: "Lägg till aktivitet"-modalen med alla fält synliga**

### Fyll i formuläret tillsammans:

**Obligatoriska fält:**
- **Namn**: "Vårlansering av produkt"
- **Ring**: Välj "Marknadsföring" från rullgardinsmenyn
- **Aktivitetsgrupp**: Välj "Q1-kampanj" från rullgardinsmenyn
- **Startdatum**: Klicka kalenderikonen → Välj 15 januari 2026
- **Slutdatum**: Klicka kalenderikonen → Välj 31 mars 2026

**Valfria fält:**
- **Beskrivning**: "Lansera ny produktlinje med omfattande kampanj på sociala medier"
- **Tid**: (Lämna tom för nu)

### Slutför:
- **Klicka**: **"Lägg till aktivitet"**-knappen längst ner

**📸 Screenshot: Hjulet med den nya aktiviteten synlig som en färgad båge**

### Peka ut på hjulet:
> "Ser du den blå bågen i Marknadsföringsringen? Det är din aktivitet! Observera:"
- **Position**: Den börjar vid 15 januari (mitt i januari-sektionen)
- **Längd**: Den sträcker sig till 31 mars (slutet av mars-sektionen)
- **Färg**: Blå (från aktivitetsgruppen "Q1-kampanj")
- **Ring**: Yttre ringen (Marknadsföring)

### Förklara med helhetsperspektiv:
> "Detta är kärnan i YearWheel: Aktiviteter är de faktiska uppgifterna, projekten eller händelserna du planerar. Varje aktivitet är en färgad båge som visar:"
> 1. **VAR** den hör hemma (vilken ring)
> 2. **NÄR** den äger rum (start till slut)
> 3. **VAD** det är för typ (färgen från aktivitetsgruppen)
>
> "När du lägger till fler aktiviteter bygger du upp en komplett bild av ditt år. Överlappande aktiviteter? Inga problem - YearWheel staplar dem automatiskt så allt är synligt!"

### Lägg till 1-2 aktiviteter till för att demonstrera:
**Aktivitet 2:**
- Namn: "Sommarkampanj"
- Ring: "Marknadsföring"
- Grupp: "Q2-projekt" (grön)
- Datum: 1 juni - 31 augusti 2026

**Aktivitet 3:**
- Namn: "Månatlig nyhetsbrev"
- Ring: "Marknadsföring"
- Grupp: "Återkommande" (grå)
- Datum: 1 januari - 31 december 2026

**📸 Screenshot: Hjul med 3 aktiviteter - visa hur de staplas och färgkodas**

### Framgångsindikatorer:
✅ Användaren kan skapa en aktivitet från början till slut  
✅ Användaren ser aktiviteten dyka upp på hjulet omedelbart  
✅ Användaren förstår kopplingen: formulär → visualisering  
✅ Användaren ser hur olika färger och längder ser ut på hjulet

---

## 8. LÄGG TILL INRE RINGAR (Text-baserade mål)

**📸 Screenshot: "Inre Ringar"-sektionen med "+ Lägg till ring"-knappen markerad**

### Navigera till:
- **Scrolla** i sidofältet till sektionen "Inre Ringar" (ovanför Yttre Ringar)

### Guida användaren att:
1. **Klicka**: **"+ Lägg till ring"**-knappen
2. **Modal öppnas**
3. **Ange namn**: "Kvartalsmål"
4. **Välj orientering**: Horisontell (text läses åt höger) eller Vertikal (text läses uppifrån)
5. **Klicka**: **"Lägg till"**-knappen

**📸 Screenshot: Hjulet med en ny inre ring synlig innanför månadsringen**

### Förklara skillnaden mellan Inre och Yttre ringar:

> **Yttre ringar** (vi jobbade med förut):
> - Innehåller **aktiviteter** med start- och slutdatum
> - Visas som färgade bågar/segment
> - Bäst för: Projekt, kampanjer, händelser
>
> **Inre ringar** (vi skapar nu):
> - Innehåller **fri text** indelad per månad
> - Redigeras genom att klicka direkt på hjulet
> - Bäst för: Mål, teman, milstolpar, noteringar
>
> "Tänk på inre ringar som 'sticky notes' runt hjulet - perfekt för högre nivå av planering!"

### Demonstrera textinmatning:
1. **Klicka**: På det inre ringsegmentet för januari (runt kl. 1-2 på hjulet)
2. **En textarea öppnas**
3. **Skriv**: "Öka marknadsandel 15%"
4. **Klicka**: Utanför textarean för att spara
5. **Observera**: Texten visas nu i januari-sektionen

**📸 Screenshot: Textarean öppen med text inskriven**

### Fyll i resten av året tillsammans:
- **Februari-Mars**: "Förbättra kundnöjdhet"
- **April-Juni (Q2)**: "Lansera 2 nya produkter"
- **Juli-September (Q3)**: "Expandera till nya marknader"
- **Oktober-December (Q4)**: "Optimera processer 20%"

**📸 Screenshot: Komplett inre ring med alla kvartals mål ifyllda**

### Praktiskt användningsfall:
> "Många av våra kunder använder inre ringar för:"
> - **Kvartalsmål** (som vi just gjorde)
> - **Månadens tema** (t.ex. "Januari: Planering", "Februari: Execution")
> - **Budget-milstolpar** (t.ex. "Q1: 25% av budget")
> - **Strategiska fokusområden** (t.ex. "Innovation", "Effektivisering")
>
> "Det fina är att inre ringar inte kräver exakta datum - bara allmän timing per månad eller kvartal!"

### Framgångsindikatorer:
✅ Användaren kan skapa en inre ring  
✅ Användaren kan klicka på hjulet och skriva text  
✅ Användaren förstår skillnaden mellan inre (text) och yttre (aktiviteter) ringar  
✅ Användaren ser hur inre ringar kompletterar yttre ringar

---

## 9. DRA OCH SLÄPP AKTIVITETER (Interaktiv redigering)

**📸 Screenshot: Muspekare som hovrar över en aktivitet, med "move"-cursor och aktiviteten markerad**

### Förklara konceptet först:
> "En av de mest kraftfulla funktionerna i YearWheel är att du kan dra aktiviteter direkt på hjulet - precis som att flytta post-it-lappar på en tavla. Inget formulär, inga menyer - bara dra och släpp!"

### Demonstrera flytt av aktivitet:
1. **Hovra**: Långsamt över "Vårlansering av produkt"-aktiviteten
2. **Observera tillsammans**: 
   - Muspekaren ändras till en hand eller flyttpil
   - Aktiviteten får en ljusare/mörkare nyans (markering)
   - En verktygstips kan visa aktivitetsnamnet
3. **Klicka och håll**: På mitten av aktiviteten
4. **Dra försiktigt**: Till april-maj-perioden (längre fram i året)
5. **Släpp**: Musen
6. **Se på vänster panel**: Datum har uppdaterats automatiskt!

**📸 Screenshot: Aktivitet som dras med en ghost/preview synlig under musen**

### Demonstrera flyttning mellan ringar:
1. **Klicka och håll**: På "Vårlansering av produkt" igen
2. **Dra radiellt**: Inåt eller utåt till en annan ring (t.ex. från "Marknadsföring" till "Försäljning")
3. **Släpp**: I den nya ringen
4. **Förklara**: "Nu tillhör aktiviteten en annan ring - perfekt när ansvaret skiftar mellan avdelningar!"

**📸 Screenshot: Aktivitet som dras mellan två ringar**

### Demonstrera storleksändring (resize):
1. **Hovra**: Mycket långsamt över vänster kanten av en aktivitet
2. **Vänta**: Tills muspekaren ändras till dubbelpilar (↔)
3. **Förklara**: "Detta betyder du kan ändra aktivitetens start- eller slutdatum"
4. **Klicka och dra**: Vänster kant åt vänster (tidigarelägg start)
5. **Släpp**: Aktiviteten är nu längre
6. **Prova höger kant**: Dra höger kant åt höger (förläng slut)

**📸 Screenshot: Resize-cursor (dubbelpilar) vid aktivitetens kant**

### Förklara varför detta är kraftfullt:
> "Tänk dig detta scenario: Du är i ett möte med din chef. Hon säger 'Kan vi inte flytta produktlanseringen till maj istället?' Tidigare skulle du behöva öppna formulär, hitta aktiviteten, ändra datum, spara. Nu? Dra helt enkelt aktiviteten till maj. Klart på 2 sekunder!"
>
> "Eller säg att ett projekt blev försenat. Istället för att radera och skapa om, drar du bara aktiviteten framåt i tiden. Samma sak om något måste förlängas - dra bara kanten längre."

### Viktiga tips att dela:
💡 **Att komma ihåg**:
- **Mitt på aktiviteten** = Flytta hela aktiviteten (behåller samma längd)
- **Kanterna** = Ändra start- eller slutdatum (ändrar längden)
- **Mellan ringar** = Ändrar vilken ring aktiviteten tillhör
- **Runt hjulet** = Ändrar datum (behåller samma ring)

### Vanliga frågor:
**Q: Vad händer om jag råkar släppa på fel ställe?**  
A: Tryck Ctrl+Z (Windows) eller Cmd+Z (Mac) för att ångra! YearWheel har ångra/gör om för alla ändringar.

**Q: Kan jag dra flera aktiviteter samtidigt?**  
A: För närvarande en åt gången, men du kan snabbt dra dem efter varandra.

### Framgångsindikatorer:
✅ Användaren kan flytta en aktivitet till en annan månad  
✅ Användaren kan flytta en aktivitet till en annan ring  
✅ Användaren kan ändra storlek (resize) på en aktivitet  
✅ Användaren ser att datum uppdateras automatiskt i sidopanelen  
✅ Användaren förstår skillnaden mellan flytta (mitt) och resize (kant)

---

## 10. ZOOMA OCH PANORERA HJULET

**📸 Screenshot: Hela kontrollpanelen längst ner markerad, med alla zoomkontroller synliga**

### Peka ut kontrollpanelen:
> "Längs nederkanten av skärmen finns din navigationspanel - detta är kommandocentralen för att utforska hjulet. Låt oss gå igenom varje sektion från vänster till höger."

### Sektion 1: Zoom-kontroller (Vänster):

**📸 Screenshot: Zoom-kontrollerna (minus, slider, plus, procent) markerade**

**Komponenter:**
- **Minus-knapp (−)**: Zooma ut stegvis
- **Skjutreglage**: Dra för kontinuerlig zoomning (50% till 200%)
- **Plus-knapp (+)**: Zooma in stegvis
- **Procentvisning**: Visar aktuell zoomnivå (t.ex. "100%")

**Guida användaren att prova:**
1. **Klicka**: Plus-knappen (+) 3-4 gånger
   - **Observera**: Hjulet växer, detaljer blir synligare
   - **Förklara**: "Bra när du vill se små aktiviteter tydligare"
   
2. **Dra**: Skjutreglaget helt åt vänster (50%)
   - **Observera**: Hela året syns på en gång
   - **Förklara**: "Perfekt för översiktsvy"
   
3. **Dra**: Skjutreglaget åt höger (150-200%)
   - **Observera**: Nu kan du se aktivitetsnamn mycket tydligare
   - **Förklara**: "Användbart när du har många överlappande aktiviteter"

### Sektion 2: Vyskontroller (Mitt):

**📸 Screenshot: "Anpassa" och "Rotera"-knapparna markerade**

**"Anpassa"-knapp:**
1. **Klicka**: "Anpassa"-knappen
2. **Observera**: Hjulet centreras och anpassas perfekt till fönstret
3. **Förklara**: "Din 'hem'-knapp - använd när du har zoomat runt och vill återställa"

**"Rotera"-knapp:**
1. **Klicka**: "Rotera"-knappen
2. **Observera**: Hjulet börjar rotera långsamt medurs
3. **Knappen ändras**: Nu står det "Stoppa"
4. **Förklara**: "Perfekt för presentationer - låter publiken se hela året flyta förbi. Januari kommer tillbaka till toppen efter ett varv"
5. **Klicka**: "Stoppa" för att stoppa rotationen

**📸 Screenshot: Hjul som roterar (eventuellt motion blur eller flera positioner)**

### Panorering (dra hjulet):
**Demonstrera:**
1. **Zooma in**: Till 150% först
2. **Klicka och håll**: På hjulet (någonstans tomt)
3. **Dra**: Hjulet åt olika håll
4. **Förklara**: "När du har zoomat in kan du dra hjulet för att se olika delar - precis som Google Maps!"

### Varför dessa kontroller är viktiga:
> **För redigering:**
> - Zooma in för att placera aktiviteter exakt
> - Panorera för att se olika delar av ett stort hjul
> - Anpassa för att snabbt få översikt
>
> **För presentationer:**
> - Zooma in på en månad för att diskutera den i detalj
> - Rotera för att dynamiskt visa hela året
> - Zooma ut för big-picture-diskussioner

### Praktiskt scenario:
> "Tänk dig att du presenterar Q2-planer. Du börjar med översikt (50% zoom), pratar om helårsmål. Sedan zoomar du in på april-juni (150%), diskuterar specifika kampanjer. Slutligen zoomar du in ännu mer på en enskild aktivitet (200%) och pratar om den i detalj. Allt utan att byta slide!"

### Framgångsindikatorer:
✅ Användaren kan zooma in och ut med både knappar och slider  
✅ Användaren kan starta och stoppa rotation  
✅ Användaren kan använda "Anpassa" för att centrera hjulet  
✅ Användaren kan panorera (dra) hjulet när inzoomad  
✅ Användaren förstår när olika zoomnivåer är användbara

---

## 11. ZOOMA TILL MÅNAD ELLER KVARTAL (Smart fokusering)

**📸 Screenshot: Höger sektion av kontrollpanelen - månadsdropdown och Q1-Q4 knappar markerade**

### Peka ut (Höger sektion av kontrollpanelen):
- **"Zooma:"-rullgardinsmeny**: Lista med alla 12 månader + "Hela året"
- **Q1, Q2, Q3, Q4-knappar**: Snabbknappar för kvartalsvyer

### Förklara konceptet:
> "Förutom manuell zoomning har vi 'smart fokus' - du kan hoppa direkt till en specifik månad eller kvartal med ett klick. Perfekt för månatliga möten eller kvartalsvisa översikter!"

### Demonstrera månadszoom:

**📸 Screenshot: Månadsdropdown öppen med alla månader synliga**

1. **Klicka**: Rullgardinsmenyn "Hela året"
2. **Skrolla igenom**: Visa alla månader (Januari - December)
3. **Välj**: "Februari"
4. **Observera tillsammans**:
   - Hjulet zoomar in och centrerar på februari
   - Februari-sektionen fyller största delen av skärmen
   - Andra månader visas fortfarande (i bakgrunden) men mindre
   - Alla aktiviteter i februari är nu mycket lättare att läsa

**📸 Screenshot: Hjul zoomat in på februari månad**

5. **Peka ut**: "Se hur mycket lättare det är att se vad som händer under februari!"
6. **Välj**: "Hela året" i dropdownen för att zooma ut igen

### Demonstrera kvartalszoom:

**📸 Screenshot: Q1-Q4 knapparna markerade**

1. **Klicka**: "Q1"-knappen
2. **Observera**: Hjulet visar januari-mars i ett större format
3. **Förklara**: "Kvartalsvy visar 3 månader samtidigt - perfekt för kvartalsmöten"
4. **Klicka igenom**: Q2 → Q3 → Q4 snabbt
5. **Visa**: Hur enkelt det är att hoppa mellan kvartal

**📸 Screenshot: Q3-vy (juli-september) visad**

### Jämför de två metoderna:

| Manuell zoom (slider) | Smart fokus (dropdown/knappar) |
|---|---|
| Kontinuerlig kontroll | Hoppar direkt till period |
| Kan zooma till valfri nivå | Fördefinierade vyer |
| Bra för generell utforskning | Bra för strukturerade möten |

### Praktiska användningsfall:

**Scenario 1: Månatliga teammöten**
> "Säg att du har månatliga planeringsmöten. Istället för att manuellt zooma och leta efter aktuell månad, klickar du bara på dropdownen, väljer 'April', och alla april-aktiviteter fyller skärmen. Meeting startar med relevant fokus!"

**Scenario 2: Kvartalsvisa avstämningar**
> "CFO:n vill se Q2-planer. Du klickar 'Q2'-knappen - boom, april-juni visas med alla kampanjer, projekt och milstolpar tydligt synliga. Nästa kvartal? Klicka Q3. Inget krångel."

**Scenario 3: Årsplanering**
> "När du planerar hela året behöver du översikt. Håll dropdownen på 'Hela året' och zooma ut till 75%. När du diskuterar specifika perioder, zooma snabbt in med Q-knapparna eller månadsvalet."

### Kombination med andra zoomverktyg:
**Demonstrera:**
1. **Välj**: "Q1" (kvartalszoom)
2. **Sedan**: Använd plus-knappen (+) för att zooma in ännu mer
3. **Sedan**: Dra hjulet (panorera) för att se olika delar av Q1
4. **Förklara**: "Du kan kombinera smart fokus med manuell zoom för perfekt kontroll!"

### Tips för powerusers:
💡 **Snabbnavigering:**
- Använd Q-knapparna för att hoppa mellan kvartal under presentationer
- Välj "Hela året" för att snabbt återgå till översikt
- Kombinera månadszoom + manual zoom för maximal detaljnivå på en period

### Framgångsindikatorer:
✅ Användaren kan välja en månad från dropdownen  
✅ Användaren kan klicka Q-knapparna för att zooma till kvartal  
✅ Användaren kan återgå till "Hela året" snabbt  
✅ Användaren förstår när månads- vs kvartalszoom är lämplig  
✅ Användaren kan kombinera smart fokus med manuell zoom

---

## 12. EXPORTERA SOM BILD (Dela utanför YearWheel)

**📸 Screenshot: "Exportera"-knappen i headern markerad**

### Navigera till:
- **Klicka**: **"Exportera"**-knappen i övre headern (vanligtvis till höger)

**📸 Screenshot: Export-modalen öppen med alla formatalternativ synliga**

### Guida användaren genom modalen:

**Förklara varje format:**

1. **PNG (Recommended)**
   - **Användning**: PowerPoint, Word, e-post, webbsidor
   - **Fördel**: Hög kvalitet, transparent bakgrund möjlig
   - **Filstorlek**: Medel
   - **När**: Standard för de flesta användningsfall

2. **SVG (Vector Graphics)**
   - **Användning**: Adobe Illustrator, design-verktyg, fortsatt redigering
   - **Fördel**: Oändligt skalbar utan kvalitetsförlust
   - **Filstorlek**: Minst
   - **När**: Behöver redigera design senare eller skala upp mycket

3. **PDF**
   - **Användning**: Utskrifter, formella dokument, arkivering
   - **Fördel**: Professionell standard, behåller kvalitet vid utskrift
   - **Filstorlek**: Medel-stor
   - **När**: Ska skriva ut på stor plotter eller inkludera i formell rapport

4. **JPG**
   - **Användning**: E-post (mindre filer), snabb delning
   - **Fördel**: Minsta filstorlek
   - **Nackdel**: Förlorar lite kvalitet, ingen transparens
   - **När**: Filstorlek är viktigare än perfekt kvalitet

### Demonstrera PNG-export:

1. **Välj**: PNG (standard)
2. **Observera**: Förhandsgranskning av aktuell vy
3. **Tips**: "Vad du ser på skärmen är vad du får - så justera zoom och rotation först!"
4. **Klicka**: **"Exportera PNG"**-knappen
5. **Vänta**: 2-3 sekunder för rendering
6. **Observera**: Fil laddas ner (vanligtvis till Downloads-mappen)
7. **Öppna**: Filen för att visa resultatet

**📸 Screenshot: Nedladdad PNG-fil öppen i image viewer**

### Viktiga förberedelser före export:

> "Innan du exporterar, tänk på vad du vill visa:"

**Steg-för-steg förberedelse:**
1. **Dölj oanvändbara ringar**: Bocka ur kryssrutor för ringar du inte vill visa
2. **Justera zoom**: 
   - Helårsöversikt? Zooma till 75-100%
   - Fokus på ett kvartal? Använd Q-knappar + zooma till 150%
3. **Centrera**: Klicka "Anpassa" för perfekt centrering
4. **Rotera (valfritt)**: Justera så viktig månad är högst upp
5. **NU exportera**: Vad du ser = vad du får

### Praktiska användningsfall:

**Scenario 1: Styrelsepresentation**
> "Du ska presentera årsplanen för styrelsen. Dölj detaljerade operativa ringar, behåll bara strategiska ringar. Exportera som PDF för professionell känsla. Infoga i PowerPoint eller ta med utskrivet på A3-papper."

**Scenario 2: Teamets väggplanering**
> "Teamet vill ha hjulet på väggen. Zooma till 100%, visa alla ringar, exportera som PDF eller PNG. Skicka till lokal tryckeri och be om A1 eller A0 storlek. Nu har ni fysisk planering på väggen!"

**Scenario 3: Snabb e-postuppdatering**
> "Chefen frågar 'Hur ser Q3 ut?'. Klicka Q3, zooma till 150%, exportera som JPG (mindre fil), bifoga i e-post. Svar på 30 sekunder!"

**Scenario 4: Design-anpassning**
> "Marketing vill matcha hjulet med företagets grafiska profil. Exportera som SVG, öppna i Illustrator, justera färger och typsnitt, använd i årsrapport."

### Tips för bästa resultat:
💡 **Högre kvalitet:**
- Zooma till 100-150% för scharpare text
- Se till att inga aktiviteter är för små att läsa
- Exportera PNG eller PDF (inte JPG) för presentation-kvalitet

💡 **Mindre filstorlek:**
- Exportera JPG istället för PNG
- Dölj onödiga ringar före export (färre element = mindre fil)

### Vanliga frågor:
**Q: Kan jag ändra storleken på bilden?**  
A: Ja! Bilden är hög resolution (typ 2000x2000 pixlar). Du kan skala ner i PowerPoint/Word utan kvalitetsförlust.

**Q: Varför ser exporten annorlunda ut än skärmen?**  
A: Export tar en "snapshot" av exakt vad som visas. Kontrollera zoom, dolda ringar, och rotation före export.

**Q: Kan jag exportera bara en sektion av hjulet?**  
A: Zooma in på önskad sektion före export - hjulet exporteras exakt som du ser det!

### Framgångsindikatorer:
✅ Användaren kan exportera i alla 4 format  
✅ Användaren förstår när varje format är lämpligt  
✅ Användaren kan förbereda hjulet (zoom/dölj) före export  
✅ Användaren kan hitta nedladdad fil och öppna den  
✅ Användaren förstår att export = snapshot av aktuell vy

---

## 13. SPARA DITT ARBETE (Automatiskt & Manuellt)

**📸 Screenshot: "Sparar..." indikator i headern**

### Peka ut autospar-funktionen:
- **Observera**: "Sparar..." eller "Sparat"-indikator i övre headern
- **När visas**: Efter VARJE ändring (lägg till aktivitet, döp om ring, etc.)
- **Timing**: ~1-2 sekunder efter att du slutar skriva/klicka

### Förklara tryggheten:
> "En av de bästa funktionerna i YearWheel: Du behöver ALDRIG oroa dig för att förlora ditt arbete. YearWheel autosparar konstant i bakgrunden."
>
> **Hur det fungerar:**
> 1. Du gör en ändring (t.ex. byter namn på en ring)
> 2. Du ser "Sparar..." i headern
> 3. Efter ~2 sekunder: "Sparat ✓"
> 4. Din data är nu säkert i molnet

**📸 Screenshot: "Sparat ✓" indikator**

### Demonstrera:
1. **Gör en liten ändring**: Byt namn på en ring
2. **Peka på headern**: "Se - 'Sparar...' visas"
3. **Vänta**: "...och nu 'Sparat!' Klart!"
4. **Förklara**: "Om din dator skulle krascha just nu, allt är sparat. Logga in från en annan dator - ändringen finns där."

### Manuell sparning (om tillgänglig):
- **Klicka**: **"Spara"**-knappen (kan vara synlig i vissa lägen)
- **Framgångstoast**: Grönt meddelande "Hjulet har sparats!" visas
- **När använda**: Mest för sinnesfrid - autospar gör jobbet!

### Vad sparas automatiskt?
✅ Nya aktiviteter  
✅ Redigerade aktiviteter  
✅ Borttagna aktiviteter  
✅ Ringnamn och inställningar  
✅ Aktivitetsgrupper och färger  
✅ Inre ring-texter  
✅ Synlighetsinställningar  
✅ Zoom och rotation (i vissa lägen)

### Vanliga frågor:
**Q: Vad händer om jag stänger webbläsaren innan "Sparat" visas?**  
A: Då kan den senaste ändringen gå förlorad. Vänta alltid på "Sparat ✓" innan du stänger!

**Q: Kan jag jobba offline?**  
A: Nej, YearWheel kräver internet för att spara. Men du kan exportera hjulet som .yrw-fil för backup.

**Q: Sparas mina ändringar om internet går ner?**  
A: Ändringar köas lokalt och sparas automatiskt när anslutningen återkommer.

### Framgångsindikatorer:
✅ Användaren ser "Sparar..." och "Sparat"-indikatorerna  
✅ Användaren förstår att ingen manuell sparning normalt behövs  
✅ Användaren vet att vänta på "Sparat" före stängning  
✅ Användaren känner sig trygg med att data inte förloras

---

## 14. SKAPA ETT TEAM

### Navigera till:
- **Klicka**: Tillbaka till Dashboard (logotypen eller "Dashboard"-länken)
- **Leta upp**: "Mina Team"-sektion (höger sidofält eller botten av sidan)

### Guida användaren att:
- **Klicka**: **"Skapa team"**-knappen
- **Modal öppnas**
- **Ange teamnamn**: "Marknadsföringsteam"
- **Ange beskrivning** (valfritt): "Vår arbetsyta för marknadsföringsplanering"
- **Klicka**: **"Skapa team"**-knappen

### Förklara:
> "Team låter dig samarbeta med kollegor. Alla teammedlemmar kan visa och redigera delade hjul i realtid. Perfekt för avdelningsplanering eller tvärfunktionella projekt."

---

## 15. BJUD IN TEAMMEDLEM

### Navigera till:
- **Hitta**: Ditt nyligen skapade "Marknadsföringsteam"-kort
- **Klicka**: **"Hantera"** eller teamnamnet för att öppna teamsidan

### Guida användaren att:
- **Leta upp**: "Bjud in medlemmar"-sektion
- **Ange e-post**: Kollegas e-postadress (eller använd demo-mejl)
- **Klicka**: **"Skicka inbjudan"**-knappen

### Förklara:
> "Teaminbjudningar skickas via e-post. Din kollega kommer att få en länk för att acceptera inbjudan. När den accepterats har de tillgång till alla teamhjul."

### Peka ut:
- **Väntande inbjudningar**: Visas som "Väntande"-status
- **Aktiva medlemmar**: Visas med roll (Ägare, Admin, Medlem)

---

## 16. ACCEPTERA TEAMINBJUDAN (Demo)

### Navigera till:
- **Öppna** inbjudningsmejlet (eller använd demolänk)
- **Klicka**: "Acceptera inbjudan"-länken i mejlet

### Alternativ (om inloggad):
- Röd notisbadge visas på Dashboard
- **Klicka**: Badge eller "Inbjudningar"-sektion
- **Klicka**: **"Acceptera"**-knappen bredvid inbjudan

### Förklara:
> "När den accepterats ser du teamet i din dashboard. Alla teamhjul är nu tillgängliga för dig. Ändringar som görs av någon teammedlem visas i realtid för alla."

---

## 17. DELA HJUL MED TEAM

### Navigera till:
- **Gå tillbaka**: Till hjuleditor (öppna valfritt hjul)
- **Klicka**: Rullgardinsmenyn bredvid hjulets titel i headern

### Guida användaren att:
- **Aktuell ägare**: Visar "Personlig" eller ditt namn
- **Klicka**: Rullgardinsmeny
- **Välj**: "Marknadsföringsteam" (ditt team)
- **Bekräfta**: Om uppmanad

### Peka ut:
- Hjulikonen ändras för att visa teamägande
- Alla teammedlemmar kan nu komma åt detta hjul

### Förklara:
> "Att tilldela ett hjul till ett team gör det till ett samarbetsverktyg. Alla i teamet kan visa och redigera. Utmärkt för delade årsplaner, projekttidslinjer eller avdelningsfärdplaner."

---

## 18. GÖR HJUL OFFENTLIGT (Dela Länk)

### Navigera till:
- **Stanna i**: Hjuleditor
- **Klicka**: **"Dela"**-knappen i övre headern (eller delningsikon)

### Guida användaren att:
- **Växla**: "Offentlig delning"-omkopplare till PÅ
- **Observera**: Delningslänk visas
- **Klicka**: **"Kopiera länk"**-knappen
- **Dela**: Länk via e-post, Slack, etc.

### Förklara:
> "Offentlig delning skapar en skrivskyddad förhandsvisningslänk. Alla med länken kan se ditt hjul, även utan ett YearWheel-konto. Perfekt för att dela med kunder, intressenter eller styrelsemedlemmar. De kan inte redigera - bara visa."

### Säkerhetsnot:
> "Du kontrollerar offentlig åtkomst. Växla av när som helst för att återkalla länken. Endast personer med länken kan komma åt den - den är inte sökbar."

---

## 19. ANVÄND EN MALL FRÅN EDITORN

### Navigera till:
- **Stanna i**: Hjuleditor (eller återvänd till dashboard)
- **Klicka**: **"Mallar"**-knappen i övre headern (gnistor-ikon ✨)
  - Eller från Dashboard: **"Bläddra mallar"**-knappen

### Guida användaren att:
- **Modal öppnas**: Mallgalleri
- **Bläddra**: Tillgängliga mallar (HR, Marknadsföring, Utbildning, etc.)
- **Klicka**: Mallkort för att förhandsgranska
- **Klicka**: **"Använd denna mall"**-knappen

### Vad händer:
- Mallinnehåll laddas in i aktuellt hjul
- Alla ringar, aktiviteter och struktur kopieras
- Datum justeras till aktuellt/valt år
- Färger och stil bevaras

### Förklara:
> "Mallar är färdigbyggda årshjul från verkliga organisationer. Använd dem som startpunkter för att spara tid. Välj en som är nära dina behov, anpassa sedan. Vi lägger till nya mallar regelbundet baserat på användarfeedback."

---

## 20. AVSLUTNING & NÄSTA STEG

### Granska nyckelfunktioner:
✅ Skapa och anpassa hjul  
✅ Lägg till ringar och aktiviteter  
✅ Dra och släpp för enkel planering  
✅ Zooma och panorera för detaljer eller översikt  
✅ Månads- och kvartalszoom för fokuserad planering  
✅ Exportera som bilder  
✅ Autospara håller arbetet säkert  
✅ Teamsamarbete  
✅ Offentlig delning  
✅ Mallar för snabb start  
✅ Växla synlighet för presentationer  

### Uppmuntra utforskning:
- **Flerårigt planering**: Lägg till sidor för 2026, 2027, etc.
- **Versionshistorik**: Återställ tidigare versioner
- **AI-assistent** (Premium): Naturlig språkplanering
- **Integrationer** (Kommer): Google Calendar, Sheets-synk

### Tillhandahåll resurser:
- **Hjälpdokumentation**: Länk till dokumentation
- **Support-e-post**: support@yearwheel.se
- **Videotutorials**: Länk till YouTube/hjälpcenter

### Fråga:
> "Vilken typ av planering ser du dig själv använda YearWheel för? Årsmål? Projekttidslinjer? Marknadsföringskampanjer?"

### Erbjud:
> "Jag finns här om du har frågor. Utforska gärna, och hör av dig när som helst. Lycka till med planeringen!"

---

## FELSÖKNINGSTIPS

### Om hjulet inte laddar:
- Uppdatera webbläsaren (Cmd+R / Ctrl+R)
- Kontrollera internetanslutning
- Rensa webbläsarcache om problem kvarstår

### Om sparning misslyckas:
- Kontrollera "Sparat"-indikatorn i headern
- Verifiera internetanslutning
- Prova manuell sparknapp

### Om teaminbjudan inte mottas:
- Kontrollera skräppost/skräppostmapp
- Verifiera stavning av e-postadress
- Skicka inbjudan igen från teamsidan

### Om dra-och-släpp inte fungerar:
- Se till att du klickar på själva aktiviteten (inte tomt utrymme)
- Prova att zooma in för bättre precision
- Använd dator/laptop (mobil har begränsat dra-stöd)

---

## PREMIUM-FUNKTIONSUTROP

*(Nämn dessa om användaren visar intresse)*

### AI-assistent (Premium):
> "Med Premium får du en AI-assistent som hjälper till att planera ditt år med naturligt språk. Beskriv bara vad du vill ha, så skapar den aktiviteter åt dig."

### Obegränsade hjul (Premium):
> "Gratisanvändare kan skapa upp till 2 hjul. Premium låser upp obegränsade hjul - perfekt för att hantera flera projekt eller avdelningar."

### Obegränsade teammedlemmar (Premium):
> "Gratisteam kan ha upp till 3 medlemmar. Premium-team har inga gränser - fantastiskt för större organisationer."

### Prioriterad support (Premium):
> "Premium-användare får prioriterad e-postsupport och tidig åtkomst till nya funktioner."

---

**Slut på skript**

*Senast uppdaterad: Oktober 2025*  
*Version: 1.0*
