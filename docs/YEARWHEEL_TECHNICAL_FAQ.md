# YearWheel Technical FAQ

Vanliga tekniska frågor om YearWheelClass - kärnkomponenten i applikationen.

## Arkitektur & Design

### Varför Canvas istället för SVG eller ren DOM?

**Canvas valdes av flera anledningar:**

1. **Prestanda vid komplex rendering**: Canvas är betydligt snabbare för dynamisk rendering av hundratals element som uppdateras kontinuerligt (t.ex. vid rotation, zoom, drag-and-drop)

2. **Pixel-perfekt kontroll**: Canvas ger exakt kontroll över varje pixels position och färg, vilket är kritiskt för den cirkulära layouten med precisa vinklar och radier

3. **Animationssmidighet**: Kontinuerlig rotation och animering är mer GPU-optimerad med Canvas än DOM-manipulering

4. **Exportfunktionalitet**: Canvas gör det enkelt att exportera hjulet som PNG, JPG, PDF eller SVG (via canvas2svg-biblioteket)

**Styrkor:**
- Hög prestanda vid många element
- Smooth animationer och interaktioner
- Enkel export till olika filformat
- Ingen DOM-overhead

**Svagheter jämfört med ren JavaScript/DOM:**
- Svårare att debugga (ingen element-inspektion i DevTools)
- Kräver egen hit-detection för klick och hover
- Tillgänglighet (accessibility) måste hanteras manuellt
- Ingen automatisk responsivitet (måste hantera zoom/resize själva)

## Rendering Pipeline

### Hur fungerar renderingsflödet?

Huvudmetoden `create()` koordinerar renderingen i två steg:

```javascript
create() {
  this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.drawRotatingElements();  // Månader, veckor, aktiviteter
  this.drawStaticElements();     // Center-år och titel
}
```

**1. Roterande element (`drawRotatingElements()`)**
- Sätter upp rotation med `context.rotate()`
- Ritar månadsring, veckoring, aktivitetsringar
- Ritar alla aktiviteter och deras kopplingar
- Ritar drag-preview om användaren drar något
- All rendering sker i "roterat koordinatsystem"

**2. Statiska element (`drawStaticElements()`)**
- Ritar år och titel i mitten
- Dessa roterar INTE med hjulet

### Vad är skillnaden mellan "logical angles" och "screen angles"?

Detta är kritiskt för korrekt positionering:

**Logical angles (logiska vinklar):**
- Inkluderar `initAngle = -105°` (justerar så januari är högst upp vid 12 o'clock)
- Används för att LAGRA data och rita i roterat koordinatsystem
- Exempel: En aktivitet med startAngle 45° (logical) börjar i mitten av februari

**Screen angles (skärmvinklar):**
- Inkluderar `rotationAngle` (användarens rotation) men INTE initAngle
- Används för att detektera musklick och hover i roterat tillstånd
- Exempel: Om logical angle är 45° och användaren roterat hjulet 30°:
  - Screen angle = 45° + 30° = 75° (från användarens perspektiv)

**Transformation:**
```javascript
screenAngle = logicalAngle + rotationAngle
logicalAngle = screenAngle - rotationAngle
```

## Datum- och Vinkelhantering

### Hur konverteras datum till vinklar?

Funktionen `dateToAngle()` mappar ett datum till en vinkel (0-360°):

**Fullt år (normal vy):**
- Varje månad = 30° (360° / 12 månader)
- 1 januari = 0° (raw angle, innan initAngle appliceras)
- 31 december ≈ 360°
- Exempel: 15 februari = 30° + ((14/28) × 30°) ≈ 45°
- OBS: Detta är "raw angles" - initAngle (-105°) adderas för final positionering

**Zoomad månad:**
- En månad = 360° (hela cirkeln visar bara den månaden)
- Dag 1 = 0°, sista dagen = 360°

**Zoomad kvartal:**
- Tre månader = 360° (120° per månad)
- Varje månad får jämnt 120° oavsett antal dagar

```javascript
// Förenklad logik för fullt år:
const monthAngle = month * 30;
const dayAngle = ((dayOfMonth - 1) / daysInMonth) * 30;
return monthAngle + dayAngle;
```

### Hur konverteras vinklar tillbaka till datum?

Funktionen `angleToDate()` gör den omvända transformationen:

```javascript
// Ta bort initAngle för att få "ren" vinkel
let rawAngle = angle - this.initAngle;

// Normalisera till 0-360
while (rawAngle < 0) rawAngle += 360;

// Vid fullt år: 30° = 1 månad
const monthFloat = rawAngle / 30;
const month = Math.floor(monthFloat);

// Beräkna dag baserat på månadens verkliga längd
const daysInMonth = new Date(this.year, month + 1, 0).getDate();
const day = Math.round((dayFloat / 30) * daysInMonth + 1);
```

## Zoom & Layout

### Hur fungerar zoom-systemet?

Det finns två typer av zoom:

**1. Tidsperiod-zoom (zoomedMonth/zoomedQuarter):**
- Zoomar in på EN månad eller ETT kvartal
- 360° representerar den kortare tidsperioden
- Påverkar datum-till-vinkel-konvertering
- Ändrar vilka aktiviteter som visas

**2. Visuell zoom (zoomLevel 50-200%):**
- Skalar canvas-storleken och textstorlekar
- Påverkar läsbarhet men inte tidsperioden
- 100% = normal storlek, 200% = dubbel storlek
- Anpassar fontstorlekar och minimigränser dynamiskt

**Kombinerat:**
Båda kan användas samtidigt - t.ex. zooma in på mars (tidsperiod) OCH öka visual zoom till 150% för bättre läsbarhet.

### Hur beräknas ringstorlekar?

**Inre ringar (inner):**
- Delar utrymmet mellan center och månadsring proportionellt
- Om 3 inre ringar: varje får 1/3 av tillgängligt utrymme
- Använder `LayoutCalculator.calculateRingDimensions()`

**Yttre ringar (outer):**
- Fast höjd per ring: `this.size / 23` (skalbar med canvas-storlek)
- Läggs på utanför månads-/veckoring (staplas utåt)
- Varje yttre ring reducerar tillgängligt utrymme för inre ringar
- Innehåller typiskt externa händelser (helgdagar, lov, säsonger)

**Mellanrum:**
- Standard gap: `this.size / 150` mellan ringar och element
- Används också för dashed lines: `setLineDash([size/150, size/250])`
- Håller layout luftig och läsbar

## Interaktion

### Hur fungerar drag-and-drop?

Drag-systemet hanteras av `InteractionHandler.js` men koordineras med YearWheelClass:

**1. Detektera klick-zon:**
```javascript
detectDragZone(x, y, itemRegion) {
  // 15px från kanten = resize-zon
  // Inuti = move-zon
  // Returnerar: 'move', 'resize-start', eller 'resize-end'
}
```

**2. Under drag:**
- Beräkna musens vinkel relativt centrum
- Konvertera till logical angle (ta bort rotationAngle)
- Visa preview med streckad kant
- Validera minimum 1-veckas bredd: `(7/365) × 360° ≈ 6.9°`

**3. Vid släpp:**
- Uppdatera item med nya start/end-datum
- Skicka ändring till React state → Supabase
- Rensa preview och rendera permanent

**Koordinatsystem under drag:**
- Mouse events ger screen coordinates → konverteras till screen angles
- Preview ritas i logical space (canvas redan roterat)
- Slutliga datum beräknas från logical angles

### Hur detekteras hover och klick?

**Under rendering:**
```javascript
// Spara klickbara regioner
this.clickableItems.push({ 
  item, 
  startRadius, 
  endRadius, 
  startAngle,  // logical angle (med initAngle)
  endAngle 
});
```

**Vid musklick:**
1. Räkna ut musens avstånd från centrum (radius)
2. Räkna ut musens vinkel: `Math.atan2(dy, dx)`
3. Justera för rotation: `angle - this.rotationAngle`
4. Hitta matchande region i `clickableItems`
5. Trigga `onItemClick()` callback

**Optimering:**
Hover-detection är throttlad till max 60fps (`hoverThrottleMs = 16ms`) för bättre prestanda.

## Textrendering

### Hur placeras text på den cirkulära ytan?

Text ritas på tre olika sätt beroende på element:

**1. Månadsnamn (arc-aligned):**
- Varje bokstav placeras separat längs cirkelbågen
- Beräknar varje bokstavs bredd med `context.measureText()`
- Roterar varje bokstav vinkelrätt mot cirkeln
- Ger naturligt läsflöde runt hjulet

**2. Aktivitetsnamn (smart multi-line):**
- Intelligent algoritm väljer bästa layout:
  - Horizontal single-line
  - Horizontal multi-line (word wrap)
  - Vertical perpendicular
- Scoring-system (0-100 poäng) baserat på:
  - Fontstorlek (35p): Sweet spot 16-28px
  - Utrymmesutnyttjande (25p): 50-85% är optimalt
  - Komplett text (50p): Bonus om ingen trunkering
- Väljer layout med högst poäng

**3. Ringnamn (perpendicular):**
- Placeras vinkelrätt mot ringen
- Centrerad på ringens mittvinkel
- Fast position (följer INTE rotation)

### Vad händer med text vid zoom?

**Dynamisk fontskalning:**
```javascript
const effectiveDisplaySize = this.size * (zoomLevel / 100);

// Absolut minimum (alltid läsbart)
const absoluteMinFont = Math.max(12, Math.min(effectiveDisplaySize / 200, 16));

// Sweet spot för läsbarhet
const sweetSpotMin = 16;
const sweetSpotMax = 28;
```

**Vid hög zoom (>150%):**
- Lägre trösklar för att visa text på små aktiviteter
- Tillåter större fonter (upp till reasonableMaxFont)
- Fler aktiviteter visar text

**Vid låg zoom (<100%):**
- Striktare trösklar - döljer text på små aktiviteter
- Mindre fonter för att passa layout
- Fokus på översikt snarare än detaljer

## Prestanda & Optimering

### Vilka optimeringar används?

**1. Canvas caching:**
```javascript
this.backgroundCache = document.createElement("canvas");
```
Statiska element (månadsring etc) cachas off-screen och återanvänds. Cache invalideras endast vid dataändring.

**2. Text measurement cache:**
```javascript
this.textMeasurementCache = new Map();
```
Font-mätningar cachas för att undvika upprepade `measureText()` calls.

**3. RequestAnimationFrame throttling:**
```javascript
if (!this.hoverRedrawPending) {
  this.hoverRedrawPending = true;
  requestAnimationFrame(() => { 
    this.create(); 
    this.hoverRedrawPending = false; 
  });
}
```
Förhindrar flera redraws per frame vid hover/drag.

**4. Lazy rendering:**
- Aktiviteter utanför synligt område (vid zoom) ritas inte alls
- Textrendering skippar element under minimitrösklar

**5. Cleanup:**
```javascript
cleanup() {
  this.textMeasurementCache.clear();
  this.clickableItems = [];
  // Förhindra memory leaks
}
```

### Hur många element klarar systemet?

**Testade gränser:**
- 500+ aktiviteter: Smooth prestanda på moderna datorer
- 1000+ aktiviteter: Märkbar fördröjning vid rendering
- Begränsning: Mainly text rendering (mest CPU-intensivt)

**Optimeringsstrategier vid många element:**
- Dölj inaktiva ringar (minskar renderingslast)
- Använd zoom för att fokusera på mindre tidsperiod
- Öka visual zoom istället för att rendera alla detaljer
- Premium-funktioner: Lazy loading, virtual scrolling (planerat)

## Export & Integration

### Hur fungerar export till PNG/SVG/PDF?

**PNG/JPG export:**
1. Skapa en temporary högupplöst canvas (t.ex. 4000x4000px)
2. Rendera hjulet på den stora canvasen
3. Använd `canvas.toBlob()` för att generera bild
4. Trigga nedladdning via `URL.createObjectURL()`

**SVG export:**
1. Använd `canvas2svg` library som emulerar Canvas API
2. Byt ut context mot C2S context: `new C2S(width, height)`
3. Kör samma rendering-kod (tack vare identiskt API)
4. Exportera som SVG-sträng med `getSerializedSvg()`

**PDF export:**
1. Generera PNG i hög upplösning
2. Använd jsPDF library för att skapa PDF
3. Lägg in PNG som bild i PDF
4. Alternativt: Konvertera till SVG först för vektorbaserad PDF

### Kan hjulet integreras i andra applikationer?

Ja, YearWheelClass är designad som en fristående komponent:

**Grundläggande integration:**
```javascript
import YearWheel from './YearWheelClass.js';

const wheel = new YearWheel(
  canvasElement,
  2025,
  "Mitt Projekt",
  ["#F5E6D3", "#A8DCD1"],
  2000,
  {},
  {
    wheelStructure: { 
      rings,           // Ring definitions
      activityGroups,  // Activity categories with colors
      labels,          // Optional labels
      items            // Activities with dates
    },
    showWeekRing: true,
    onItemClick: (item) => console.log(item)
  }
);

wheel.create();
```

**OBSERVERA:** I hela applikationen används en mer komplex struktur med `pages` för multi-år-stöd:
```javascript
const wheelData = {
  metadata: { wheelId, title, year, colors, showWeekRing },
  structure: { rings, activityGroups, labels },
  pages: [
    { id, year, pageOrder, title, items: [...] }
  ],
  currentPageId: 'page-uuid'
};
```
Men YearWheelClass själv förväntar sig en flat `wheelStructure` med items direkt i strukturen (inte i pages).

**Callbacks för interaktion:**
- `onItemClick`: Klick på aktivitet
- `onRotationChange`: Rotation ändrad (för synkronisering)
- `broadcastOperation`: Real-time collaboration events

**API-metoder:**
- `create()`: Rendera hjulet
- `updateWheelStructure(data)`: Uppdatera data
- `updateZoomState(month, quarter)`: Zooma
- `exportToPNG(scale)`: Exportera som bild
- `cleanup()`: Rensa resources

## Modularisering

### Hur är koden strukturerad?

YearWheelClass har nyligen modulariserats med utility-moduler:

**Core Modules:**
- `LayoutCalculator.js`: Beräknar ring-dimensioner och positioner
- `RenderEngine.js`: Hanterar low-level canvas rendering
- `InteractionHandler.js`: Hanterar mus/touch events, drag-and-drop
- `ExportManager.js`: Hanterar export till PNG/SVG/PDF
- `ConfigValidator.js`: Validerar och migrerar wheelStructure data

**Fördelar:**
- Lättare att testa enskilda delar
- Bättre separation of concerns
- Mindre risk för merge conflicts vid parallell utveckling
- Enklare att förstå och underhålla

**Arkitektur:**
```
YearWheel (huvudklass, ~5663 rader)
├── LayoutCalculator (layout-logik, 547 rader)
├── RenderEngine (canvas API wrapper)
├── InteractionHandler (events & drag, 1449 rader)
├── ExportManager (export-funktioner)
└── ConfigValidator (data-validering & migration)
```

## Real-time Collaboration

### Hur fungerar samarbetsfunktionerna?

**Active editors:**
```javascript
this.activeEditors = [
  { userId: '123', email: 'user@example.com', itemId: 'item-456', activity: 'editing' }
];
```

När någon redigerar en aktivitet:
1. Supabase Realtime skickar presence-update
2. YearWheel får `updateActiveEditors()` call
3. Avatar ritas på aktiviteten (blå cirkel med initial)
4. Andra användare ser att aktiviteten är upptagen

**Optimistic updates:**
```javascript
this.pendingItemUpdates = new Map();
// Visa ändringar INNAN databas-bekräftelse
```

Ger snabb feedback medan Supabase-uppdateringen pågår.

## Samarbete & Team-funktioner

### Team Management

**Team Structure:**
```javascript
// Database schema
teams: {
  id: uuid,
  name: string,
  description: string,
  owner_id: uuid,
  created_at: timestamp
}

team_members: {
  id: uuid,
  team_id: uuid,
  user_id: uuid,
  role: 'owner' | 'admin' | 'member',
  joined_at: timestamp
}

team_invitations: {
  id: uuid,
  team_id: uuid,
  email: string,
  token: unique_string,
  status: 'pending' | 'accepted' | 'declined' | 'expired',
  invited_by: uuid,
  expires_at: timestamp
}
```

**Roller & Permissions:**
- **Owner**: Skapa team, bjud in medlemmar, radera team, hantera betalning
- **Admin**: Bjud in/ta bort medlemmar, redigera hjul, skapa hjul
- **Member**: Redigera hjul, skapa hjul, kommentera

**Team Limits:**
- Free tier: 3 medlemmar per team
- Premium: Obegränsat antal medlemmar
- Kontroll via `can_add_team_member()` funktion i Supabase

### Real-time Presence

**useWheelPresence Hook:**
```javascript
const activeUsers = useWheelPresence(wheelId);
// Returns: [{ user_id, email, name, joined_at }, ...]
```

**Implementation:**
- Supabase Realtime Presence API
- WebSocket-baserad kommunikation
- Visar online-status för alla team-medlemmar
- Visar vem som tittar på hjulet just nu
- Automatisk cleanup när användare lämnar

**Visual indicators:**
- Avatarer i UI-header visar aktiva användare
- Antal online-användare: "3 users viewing"
- Tooltips visar namn och email vid hover

### Real-time Data Sync

**useRealtimeWheel Hook:**
```javascript
useRealtimeWheel(wheelId, pageId, (eventType, tableName, payload) => {
  // eventType: 'INSERT', 'UPDATE', 'DELETE'
  // tableName: 'items', 'rings', 'activity_groups', 'labels'
  // payload: { old: {...}, new: {...} }
  
  refetchPageData(); // Re-fetch updated data
});
```

**Sync Architecture:**
- Subscribe till Postgres changes (via Supabase Realtime)
- Filtrera events per page_id (undvik cross-page contamination)
- Broadcast changes till alla connected clients
- Automatic reconnection vid nätverksproblem
- Debounced updates för bättre prestanda

**Conflict Resolution:**
- Last-write-wins strategi (senaste ändringen vinner)
- Optimistic updates med rollback vid konflikt
- Visual indicators vid samtidig redigering (locked items)
- Toast notifications vid datauppdateringar från andra

**Supported Events:**
- Item created/updated/deleted
- Ring added/modified/removed
- Activity group color changed
- Label updated
- Wheel settings changed (visibility, rings, zoom)

### Collaboration Features

**1. Shared Editing:**
- Flera användare kan redigera samma hjul samtidigt
- Real-time cursor positions (planerat)
- Activity-level locking (förhindra simultana edits på samma item)
- Conflict warnings vid överlappande ändringar

**2. Comments & Mentions:**
```javascript
// @mention support via react-mentions
<MentionsInput value={comment}>
  <Mention
    trigger="@"
    data={teamMembers}
    displayTransform={(id, display) => `@${display}`}
  />
</MentionsInput>
```

**Features:**
- @mention team-medlemmar i kommentarer
- Email notifications vid mention
- Comment threads på aktiviteter
- Rich text formatting (markdown)

**3. Activity Feed:**
- Real-time notifikationer för team-aktivitet:
  - "Anna skapade aktivitet 'Q1 Launch'"
  - "Erik ändrade färg på Marketing-gruppen"
  - "Lisa bjöd in maria@example.com"
- Filtrera per händelsetyp
- Mark as read functionality
- Email digest (daglig/veckovis)

**4. Version History:**
```javascript
// wheel_versions table
{
  id: uuid,
  wheel_id: uuid,
  version_number: int,
  snapshot_data: jsonb,      // Complete wheel state
  created_by: uuid,
  created_at: timestamp,
  change_description: string,
  is_auto_save: boolean
}
```

**Capabilities:**
- Automatic saves vid varje ändring
- Manual snapshots med beskrivning
- Browse version history
- Restore previous versions
- Diff viewer (visa ändringar mellan versioner)
- Blame view (vem ändrade vad)

**5. Sharing & Permissions:**

**Share Modes:**
- **Private**: Endast team-medlemmar
- **Link sharing**: Alla med länken kan se (readonly)
- **Public**: Publikt sökbart (templates)
- **Embedded**: Kan bäddas in på externa sidor

**Share Settings:**
```javascript
{
  is_public: boolean,
  share_token: unique_string,     // För link sharing
  allow_comments: boolean,
  allow_export: boolean,
  password_protected: boolean,
  expires_at: timestamp           // Time-limited shares
}
```

**6. Casting & Presentation Mode:**

**useRealtimeCast Hook:**
```javascript
const { startSession, sendMessage, disconnect } = useRealtimeCast();

// Presenter
await startSession(wheelId);
sendMessage({ type: 'ZOOM', month: 3 });
sendMessage({ type: 'ROTATE', angle: 45 });

// Viewer (automatisk sync)
// Får updates via WebSocket
```

**Features:**
- Screen sharing för presentationer
- Synkad zoom och rotation mellan presenter/viewers
- Synkad highlight av aktiviteter
- Laser pointer (muspekar-sync)
- iOS/Safari fallback via Supabase Realtime

**Use cases:**
- Team meetings (visa hjul på stor skärm)
- Client presentations
- Workshops och planering sessions
- Remote collaboration

### Notification System

**useRealtimeNotifications Hook:**
```javascript
const { 
  notifications, 
  unreadCount, 
  markAsRead, 
  markAllAsRead 
} = useRealtimeNotifications();
```

**Notification Types:**
- Team invitation received
- Mentioned in comment
- Activity assigned to you
- Wheel shared with you
- Version restored by team member
- Export ready for download
- Subscription renewal reminder

**Delivery Channels:**
- In-app notifications (bell icon)
- Email notifications (customizable frequency)
- Browser push notifications (opt-in)

**Settings:**
- Granular control per notification type
- Email digest: instant, hourly, daily, weekly
- Do Not Disturb hours
- Mute specific wheels/teams

### Integration Points

**Google Calendar Sync:**
- Import calendar events to ring
- Two-way sync (changes reflect in both)
- Multiple calendar support
- Conflict detection

**Google Sheets Integration:**
- Export wheel data to Sheets
- Import activities from Sheets
- Auto-update when sheet changes
- Column mapping configuration

**Webhook Support (Planerat):**
- POST events till externa system
- Custom integrations
- Zapier/Make.com support
- Slack notifications

## Vanliga Fallgropar

### Varför roterar inte alla element?

- `drawRotatingElements()` kör EFTER `context.rotate()` - dessa element roterar
- `drawStaticElements()` kör UTAN rotation - år och titel roterar inte
- Dependency arrows måste ritas FÖRE `context.restore()` för att roteras korrekt

### Varför syns inte aktiviteter efter reload?

Kontrollera att:
1. Parent ring har `visible: true`
2. Länkad activityGroup har `visible: true`
3. Aktivitetens datum överlappar vald år/zoom
4. Database-mapping inkluderar alla fält (speciellt dependencies)

### Varför är text för liten/stor?

Textstorleken beror på:
- Canvas-storlek (`this.size`)
- Visual zoom (`this.zoomLevel`)
- Tillgängligt utrymme (aktivitetens storlek)
- Smart scoring-algoritm (prioriterar läsbarhet)

Justera genom att ändra `sweetSpotMin/Max` konstanterna eller visual zoom.

---

## Systemarkitektur

### Hur är hela applikationen strukturerad?

YearWheel Planner är en modern SaaS-applikation med tydlig separation mellan frontend, backend och AI-tjänster:

```
┌─────────────────────────────────────────────────────────────┐
│                    ANVÄNDARE (Browser)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────▼──────────────┐
                │   Netlify CDN            │
                │   - Static hosting       │
                │   - Instant deploys      │
                │   - Global edge network  │
                └───────────┬──────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
┌───────▼────────┐  ┌──────▼───────┐  ┌────────▼─────────┐
│  React Frontend │  │   Supabase   │  │   OpenAI API     │
│  - Vite build   │  │   Backend    │  │   - GPT-4.1      │
│  - TailwindCSS  │  │   - Postgres │  │   - Agents SDK   │
│  - Canvas API   │  │   - Auth     │  │                  │
│  - Router       │  │   - Storage  │  │                  │
└─────────────────┘  │   - Realtime │  └──────────────────┘
                     │   - RLS      │
                     │   - Edge Fns │
                     └──────┬───────┘
                            │
                    ┌───────▼─────────┐
                    │  Supabase Edge  │
                    │  Functions      │
                    │  (Serverless)   │
                    └─────────────────┘
```

**Frontend (React + Vite):**
- Single Page Application (SPA)
- Client-side routing med React Router 7.9
- Canvas-baserad rendering (YearWheelClass)
- State management via React hooks + custom undo/redo
- Hosted på Netlify CDN för global prestanda

**Backend (Supabase):**
- PostgreSQL databas (managed)
- Row Level Security (RLS) för säkerhet
- Real-time subscriptions för collaboration
- Object storage för avatars/exports
- Serverless Edge Functions (Deno runtime)

**AI Layer (OpenAI):**
- GPT-4.1 multi-agent system
- Tools för CRUD-operationer på hjul-data
- Naturlig språkförståelse för planering
- Streaming responses för snabb feedback

### Vilka är huvudkomponenterna?

**1. Frontend Core:**
```
src/
├── App.jsx                      # Huvudkomponent, routing, state (4752 rader)
├── YearWheelClass.js            # Canvas rendering engine (5663 rader)
├── components/                  # UI-komponenter (modaler, panels)
├── hooks/                       # Custom React hooks
│   ├── useRealtimeWheel.js     # Supabase realtime sync
│   ├── useWheelPresence.js     # Collaboration presence
│   └── useMultiStateUndoRedo.js  # Undo/redo system (10-step history)
├── services/                    # API-integration
│   ├── wheelService.js          # Wheel CRUD operations
│   ├── googleCalendarService.js # Calendar API integration
│   └── googleSheetsService.js   # Sheets API integration
└── utils/                       # Utility-moduler (modulariserad okt 2025)
    ├── LayoutCalculator.js      # Ring calculations (547 rader)
    ├── RenderEngine.js          # Canvas rendering primitives
    ├── InteractionHandler.js    # Mouse/touch events (1449 rader)
    ├── ExportManager.js         # Export PNG/SVG/PDF
    └── ConfigValidator.js       # Data validation & migration
```

**2. Backend Structure:**
```
supabase/
├── migrations/                # SQL-schemaändringar (version control)
├── functions/                 # Edge Functions (serverless)
│   ├── ai-assistant-v2/      # OpenAI integration
│   ├── stripe-webhook/       # Payment processing
│   ├── google-oauth-callback/ # OAuth flow
│   ├── google-calendar-list/ # Calendar sync
│   ├── google-sheets-export/ # Sheets integration
│   └── send-newsletter/      # Email campaigns
└── seed.sql                   # Initial data
```

### Hur hanteras autentisering och säkerhet?

**Supabase Auth:**
- Email/password och social logins (Google)
- JWT-tokens för session management
- Automatic token refresh
- Row Level Security (RLS) policies på databasnivå

**RLS Policies (exempel):**
```sql
-- Användare ser endast sina egna hjul ELLER hjul de är inbjudna till
CREATE POLICY "Users can view their own wheels or team wheels"
ON year_wheels FOR SELECT
USING (
  auth.uid() = user_id 
  OR team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);
```

**API-säkerhet:**
- Alla Edge Functions kräver autentisering
- Rate limiting på Supabase-nivå
- CORS-headers för cross-origin access
- Input validation med Zod schemas

## Infrastruktur

### Netlify - Frontend Hosting

**Deployment Pipeline:**
1. Git push till `main` branch
2. Netlify detectar förändring via webhook
3. Automatic build: `yarn build`
4. Post-build: Prerendering för SEO (landing pages)
5. Deploy till global CDN (200+ edge locations)
6. Instant rollback vid problem

**Funktioner:**
- **Edge caching**: Static assets cachas i 1 år (immutable)
- **HTML caching**: 0s cache för index.html (alltid fresh)
- **Client-side routing**: Alla routes → index.html (SPA)
- **Environment variables**: Säker hantering av API-nycklar
- **Preview deploys**: Varje PR får egen preview-URL
- **A/B testing**: Möjlighet att testa olika versioner

**Performance Headers:**
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**Security Headers:**
- CSP: Tillåter embedding i Google Apps Script
- HSTS: Tvingar HTTPS
- X-Content-Type-Options: Förhindrar MIME-sniffing
- Permissions-Policy: Blockerar onödiga browser APIs

### Cloudflare - CDN & Security Layer

**WAF (Web Application Firewall):**
- DDoS-skydd på nätverksnivå (Layer 3/4 och Layer 7)
- Bot detection och mitigation
- Rate limiting per IP/endpoint
- Custom security rules för API-endpoints

**Performance:**
- 300+ edge locations globalt
- Automatic image optimization (Cloudflare Images - planerat)
- HTTP/3 och QUIC support
- Brotli compression för snabbare laddning

**DNS & SSL:**
- Managed DNS med 100% uptime SLA
- Universal SSL (automatisk cert renewal)
- Always Online™ (cachat fallback vid server-problem)

**Analytics:**
- Real-time traffic analytics
- Security event logging
- Performance metrics (Core Web Vitals)

### Supabase - Backend as a Service

**Databas (PostgreSQL 15):**
- Managed database med automatic backups
- Point-in-time recovery (PITR)
- Connection pooling (PgBouncer)
- Read replicas för skalning (vid behov)
- **EU-region hosting** (Frankfurt, Tyskland)

**Schema:**
- 15+ tabeller för hjul, användare, teams, subscriptions
- JSONB-kolumner för flexibel datalagring (organization_data)
- Foreign keys med CASCADE för dataintegritet
- Indexes på vanliga queries (user_id, wheel_id, team_id)

**Realtime:**
- WebSocket-baserad pub/sub
- Broadcast för presence (vem redigerar vad)
- Postgres changes för live sync
- Automatic reconnection vid nätverksproblem

**Storage:**
- Object storage för user avatars
- Public buckets för exports (time-limited URLs)
- Image optimization (automatic resizing)
- CDN-backed för snabb åtkomst
- **Lagras inom EU** (Frankfurt)

**Edge Functions (Deno runtime):**
- V8 isolates för snabb cold start (<50ms)
- TypeScript native support
- Import maps för dependencies
- Automatic scaling baserat på trafik
- Deploy via Supabase CLI

**Datalagring & GDPR:**
- All data lagras inom EU (Frankfurt, Tyskland)
- GDPR-compliant data processing
- Right to erasure (data deletion)
- Data export functionality för användare
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)

### Edge Functions - Serverless Backend

**20 aktiva funktioner:**

**AI & Automation:**
- `ai-assistant-v2/` - OpenAI GPT-4.1 multi-agent system
  - Tools för wheel CRUD
  - Handoffs mellan specialized agents
  - Streaming responses (Server-Sent Events)
  - Context: 4166 rader TypeScript

**Payments (Stripe):**
- `create-checkout-session/` - Starta prenumeration
- `create-portal-session/` - Hantera subscription
- `stripe-webhook/` - Webhook events (payment, cancel, etc)
- `cancel-subscription/` - Avsluta prenumeration

**Google Integrations:**
- `google-oauth-init/` - Starta OAuth flow
- `google-oauth-callback/` - Hantera callback + exchange token
- `google-calendar-list/` - Lista användarens kalendrar
- `google-sheets-export/` - Exportera till Google Sheets
- `google-sheets-fetch-headers/` - Hämta sheet-struktur
- `google-sheets-validate/` - Validera sheet-mappning
- `sync-ring-data/` - Synka calendar/sheets → rings

**Admin & Utilities:**
- `admin-get-subscriptions/` - Lista alla subscriptions
- `admin-get-user-data/` - User management
- `get-user-auth-data/` - Hämta user session
- `generate-affiliate-code/` - Affiliate-program
- `send-newsletter/` - Email campaigns
- `resend-webhook/` - Email delivery events
- `submit-quiz/` - Lead generation quiz

**Deployment:**
```bash
# Deploy alla funktioner
supabase functions deploy

# Deploy en specifik funktion
supabase functions deploy ai-assistant-v2
```

**Miljövariabler:**
```bash
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_CLIENT_ID=...
RESEND_API_KEY=re_...
```

## DevOps & Monitoring

### CI/CD Pipeline

**Git Workflow:**
```
main (production)
  ↓ automatic deploy
Netlify Production

feature/* branches
  ↓ PR opened
Netlify Preview Deploy
  ↓ merged to main
Deploy to production
```

**Build Process:**
1. Code push triggers webhook
2. Netlify runs: `yarn install` → `yarn build`
3. Post-build: Prerendering script för SEO
4. Asset optimization (minification, compression)
5. Deploy till CDN
6. Cache invalidation
7. Health check

**Supabase Migrations:**
```bash
# Local development
supabase db reset               # Reset to migration baseline
supabase db diff -f new_feature # Generate migration

# Production deployment
supabase db push                # Apply pending migrations
supabase functions deploy       # Deploy edge functions
```

**Version Control:**
- Database schema i Git (migrations/)
- Edge Functions i Git (supabase/functions/)
- Environment variables i Netlify/Supabase dashboards
- Feature flags för gradual rollouts (planerat)

### Sentry - Error Tracking & Performance Monitoring (Planerad)

**Error Monitoring:**
- Real-time error tracking med stack traces
- Source map support för minifierad kod
- User context (email, plan type, browser)
- Breadcrumbs för error reproduction
- Release tracking med Git commits

**Performance Monitoring:**
- Frontend performance metrics:
  - Initial page load time
  - Canvas rendering performance
  - React component render times
  - API call latency
- Backend metrics:
  - Edge Function execution time
  - Database query performance
  - External API latency (OpenAI, Google, Stripe)

**Integration:**
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://...@sentry.io/...",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% av requests för performance tracking
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({ // Session replay för debugging
      maskAllText: true,
      blockAllMedia: true,
    })
  ],
  beforeSend(event, hint) {
    // Filter ut känslig data
    if (event.user) {
      delete event.user.email;
    }
    return event;
  }
});
```

**Alerts:**
- Slack notifications vid kritiska errors
- Email alerts vid performance regression
- PagerDuty integration för on-call (planerat)
- Weekly error digest för teamet

### Logging & Observability

**Application Logs:**
- Console logs i utvecklingsmiljö
- Structured logging i produktion (JSON format)
- Log aggregation via Cloudflare Workers (planerat)

**Metrics:**
- Custom metrics för business events:
  - Wheel created
  - AI assistant usage
  - Export generation
  - Team invitations
  - Subscription events

**Uptime Monitoring:**
- Healthcheck endpoints (`/api/health`)
- Synthetic monitoring (Pingdom/UptimeRobot)
- Status page för användare (planerat)

### Backup & Disaster Recovery

**Database Backups:**
- Automatic daily backups (Supabase managed)
- Point-in-time recovery (30 dagar retention)
- Manual backup triggers före stora deploys
- Backup testing: Quarterly restore tests

**Data Retention:**
- User data: Permanent (till användaren raderar kontot)
- Deleted items: 30 dagar soft delete (återställningsbart)
- Logs: 90 dagar retention
- Analytics: 1 år aggregerad data

**Disaster Recovery Plan:**
1. Database failure → Automatic failover till replica
2. Supabase outage → Användare ser cached data + readonly mode
3. Complete data loss → Restore från senaste backup (<24h data loss)
4. RTO (Recovery Time Objective): 4 timmar
5. RPO (Recovery Point Objective): 24 timmar

## AI-Assistent (OpenAI GPT-4.1)

### Hur fungerar AI-assistenten?

YearWheel använder OpenAI Agents SDK (0.1.9) för en sofistikerad multi-agent arkitektur:

**Agent Types:**
1. **Orchestrator Agent** - Huvudagent som dirigerar användarbegäran
2. **Planning Agent** - Skapar strategiska planer från naturligt språk
3. **Data Agent** - Hanterar CRUD-operationer på hjul-data
4. **Analysis Agent** - Analyserar befintliga hjul och ger insikter

**Tools (funktioner som AI:n kan använda):**

**Läs-operationer:**
- `fetch_wheel_data()` - Hämta komplett hjulstruktur
- `list_rings()` - Lista alla ringar och deras properties
- `list_activity_groups()` - Lista aktivitetsgrupper med färger
- `list_activities()` - Lista alla aktiviteter med datum
- `search_activities(query)` - Fuzzy search på aktivitetsnamn

**Skriv-operationer:**
- `create_ring(name, type, color)` - Skapa ny ring
- `create_activity_group(name, color)` - Skapa ny kategori
- `create_activity(name, startDate, endDate, ringId, groupId)` - Skapa aktivitet
- `update_activity(name, newData)` - Uppdatera befintlig aktivitet
- `delete_activity(name)` - Ta bort aktivitet
- `bulk_create_activities([...])` - Skapa flera aktiviteter samtidigt

**Smart Features:**
- `suggest_structure(description)` - AI föreslår ringar + grupper INNAN skapande
- `create_from_suggestions()` - Skapar föreslagna element efter godkännande
- `analyze_workload()` - Analyserar arbetsbelastning över tid
- `detect_conflicts()` - Hittar överlappande aktiviteter

**Handoffs (agent-to-agent):**
```typescript
handoff(
  'planning_agent',
  'Transfer to specialized planning agent for strategic advice'
)
```

Möjliggör att olika agenter tar över konversationen baserat på användarens behov.

**Streaming Implementation:**
```typescript
// Server-Sent Events (SSE) för real-time feedback
const encoder = new TextEncoder();

for await (const chunk of stream) {
  if (chunk.type === 'text_delta') {
    const text = chunk.text;
    yield encoder.encode(`data: ${JSON.stringify({ text })}\n\n`);
  }
  
  if (chunk.type === 'tool_call') {
    // Visa vilken operation AI:n utför
    yield encoder.encode(`data: ${JSON.stringify({ 
      type: 'tool_call',
      tool: chunk.name,
      args: chunk.arguments
    })}\n\n`);
  }
}
```

**Guardrails (säkerhetsgränser):**
- Maximal längd på användarinput (5000 tecken)
- Validering av datum (YYYY-MM-DD format)
- Förhindrar bulk-delete utan bekräftelse
- Rate limiting (10 requests/minut/användare)
- Context window management (4000 tokens max)

**Prompt Engineering:**
```typescript
const systemPrompt = `
Du är en AI-assistent för YearWheel, ett verktyg för årsplanering.

REGLER:
1. Prata ALLTID på svenska
2. Föreslå struktur INNAN du skapar element
3. Använd suggest_structure() först, sedan create_from_suggestions()
4. Bekräfta alltid bulk-operationer med användaren
5. När du skapar aktiviteter, fråga om ring och grupp om det är oklart

STRUKTUR:
- Rings: "inner" för huvudspår, "outer" för externa händelser
- ActivityGroups: Färgkodade kategorier för aktiviteter
- Activities: Händelser/uppgifter med start- och slutdatum
`;
```

### Vad kostar AI-assistenten?

**OpenAI GPT-4.1 Pricing (Nov 2025):**
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens
- Function calls: Räknas som output-tokens

**Estimerad kostnad per session:**
- Enkel fråga (hämta data): ~500 tokens = $0.005
- Skapa 10 aktiviteter: ~2000 tokens = $0.02
- Komplex planering (50 aktiviteter): ~8000 tokens = $0.08

**Optimeringar:**
- Cacha wheel structure i context (undvik upprepade fetches)
- Använd bulk_create istället för loop av create
- Begränsa context till relevant data (inte all historik)
- Streaming minskar upplevd latency (ej kostnad)

## Bill of Materials (BOM)

### Frontend Dependencies

**Core Framework:**
- `react` (18.2.0) - UI library
- `react-dom` (18.2.0) - DOM rendering
- `react-router-dom` (7.9.3) - Client-side routing
- `vite` (5.0.8) - Build tool + dev server

**Canvas & Rendering:**
- `canvas2svg` (1.0.16) - SVG export från Canvas
- `jspdf` (3.0.3) - PDF generation
- `d3` (7.8.5) - Data visualization helpers

**Supabase:**
- `@supabase/supabase-js` (2.74.0) - Client library
  - Auth, Database, Storage, Realtime

**AI & Language:**
- `@ai-sdk/openai` (2.0.48) - OpenAI SDK för React
- `ai` (5.0.68) - Vercel AI SDK (streaming support)
- `i18next` (25.6.0) - Internationalization
- `react-i18next` (16.0.0) - React bindings för i18n
- `marked` (16.4.1) - Markdown rendering (AI responses)

**Payments:**
- `@stripe/stripe-js` (8.0.0) - Stripe integration

**UI & Styling:**
- `tailwindcss` (3.x) - Utility-first CSS
- `@tailwindcss/typography` (0.5.19) - Prose styles
- `lucide-react` (0.552.0) - Icon library
- `driver.js` (1.3.6) - Product tours

**Data & Forms:**
- `zod` (3.23.8) - Schema validation
- `immer` (10.1.3) - Immutable state updates
- `react-mentions` (4.4.10) - @mention support
- `fuse.js` (7.1.0) - Fuzzy search

**Integrations:**
- `xlsx` (0.18.5) - Excel export/import
- `dompurify` (3.3.0) - XSS protection för user content
- `chart.js` (4.5.1) + `react-chartjs-2` (5.3.0) - Charts

**Email (for Edge Functions):**
- `@react-email/components` (1.0.0) - Email templates
- `@react-email/render` (2.0.0) - HTML rendering

### Backend Dependencies (Edge Functions)

**Runtime:** Deno (managed av Supabase)

**OpenAI:**
- `openai` (4.73.0) - Official SDK
- `@openai/agents` (0.1.9) - Agents framework

**Database:**
- `@supabase/supabase-js` (2.x) - Client (också på server)

**Validation:**
- `zod` (3.x) - Schema validation (shared med frontend)

**Email:**
- Resend API (via HTTP) - Email delivery

**Payments:**
- Stripe API (via HTTP) - Subscription management

### Build & Development Tools

**Vite Ecosystem:**
- `@vitejs/plugin-react-swc` (3.5.0) - Fast React refresh
- `vite-plugin-inline-css-modules` (0.0.8) - CSS modules

**Linting & Formatting:**
- `eslint` (8.55.0) - Code linting
- `eslint-plugin-react` (7.33.2) - React-specific rules
- `eslint-plugin-react-hooks` (4.6.0) - Hooks rules

**CSS:**
- `postcss` (8.5.6) - CSS processing
- `autoprefixer` (10.4.21) - Vendor prefixes
- `sass` (1.70.0) - SCSS support

**Build Optimization:**
- `terser` (5.44.0) - JS minification

**Total Dependencies:**
- Frontend: 34 production dependencies
- Backend: 4 core dependencies (via ESM imports)
- DevDependencies: 15 build tools

**Bundle Size (production):**
- Gzipped: ~450KB initial load
- Code-splitting: Lazy load modals och heavy components
- Tree-shaking: Unused code elimineras av Vite

### Kostnadsöversikt (Månadskostnad vid skala)

**Netlify (Free Tier):**
- 100GB bandwidth/månad: $0
- Unlimited sites: $0
- Vid behov (Pro): $19/månad

**Supabase (Free Tier):**
- 500MB database: $0
- 1GB file storage: $0
- 2GB bandwidth: $0
- Vid skala (Pro): $25/månad (8GB DB, 100GB bandwidth)

**OpenAI API:**
- Utveckling: ~$5-10/månad (testing)
- Produktion: ~$0.02-0.10/användare/månad
- 1000 aktiva användare: ~$50-100/månad

**Stripe:**
- 2.9% + $0.30 per transaktion
- Ingen månadskostnad

**Total Start Cost:** $0/månad (free tiers)  
**Total Production Cost (1000 users):** ~$100-150/månad

**Infrastructure Costs Breakdown:**
- Netlify: $0-19/månad
- Supabase: $0-25/månad
- Cloudflare: $0-20/månad (Pro plan)
- OpenAI: $50-100/månad (usage-based)
- Sentry: $0-26/månad (planerat, Developer tier)
- Stripe: Transaction fees only

---

## Teknisk Översikt

### Arkitektur i Korthet

**Stack:**
- **Frontend**: React 18 + Vite 5 + TailwindCSS 3
- **Canvas Engine**: Custom YearWheelClass (5663 rader)
- **Backend**: Supabase (PostgreSQL 15, Auth, Storage, Realtime)
- **Serverless**: 20 Deno Edge Functions
- **AI**: OpenAI GPT-4.1 Agents SDK
- **CDN**: Netlify + Cloudflare
- **Monitoring**: Sentry (planerat)

**Infrastructure:**
- **Hosting**: Netlify (global CDN)
- **Database**: Supabase PostgreSQL (Frankfurt, EU)
- **Security**: Cloudflare WAF + DDoS protection
- **Data Storage**: EU-only (GDPR compliant)
- **Backups**: Automatic daily + PITR (30 dagar)

**Key Numbers:**
- 5663 rader: YearWheelClass (core rendering)
- 4752 rader: App.jsx (main application)
- 1449 rader: InteractionHandler (drag & drop)
- 547 rader: LayoutCalculator (geometry)
- 20 Edge Functions: Serverless backend
- 34 npm packages: Production dependencies
- 15+ database tables
- <50ms cold start: Edge Functions
- 300+ edge locations: Cloudflare CDN
- 99.9% uptime SLA

### Collaboration & Team Features Summary

**Real-time Collaboration:**
- ✅ Multi-user editing med presence tracking
- ✅ WebSocket-baserad sync (Supabase Realtime)
- ✅ Optimistic updates för snabb feedback
- ✅ Conflict detection och resolution
- ✅ Activity-level locking

**Team Management:**
- ✅ Obegränsat antal team-medlemmar (Premium)
- ✅ 3 roller: Owner, Admin, Member
- ✅ Email-baserade inbjudningar
- ✅ Team-scoped wheels och permissions

**Communication:**
- ✅ @mentions i kommentarer
- ✅ Real-time notifications
- ✅ Activity feed med ändringshistorik
- ✅ Email notifications (customizable)
- ⏳ Push notifications (planerat)

**Sharing:**
- ✅ Private, link sharing, public modes
- ✅ Readonly shares med optional export
- ✅ Time-limited shares
- ⏳ Password-protected shares (planerat)
- ✅ Embedded mode för externa sidor

**Version Control:**
- ✅ Automatic snapshots vid ändringar
- ✅ Manual versions med beskrivningar
- ✅ Restore previous versions
- ⏳ Diff viewer (planerat)
- ✅ 10-step undo/redo i UI

**Presentation:**
- ✅ Casting mode för screen sharing
- ✅ Synkad zoom och rotation
- ✅ iOS/Safari fallback (Supabase Realtime)
- ⏳ Laser pointer sync (planerat)

### DevOps & Operations Summary

**CI/CD:**
- Git-based deployment workflow
- Automatic builds via Netlify
- Preview deploys för PRs
- Database migrations via Supabase CLI
- Zero-downtime deploys

**Monitoring (Planerat - Sentry):**
- Real-time error tracking
- Performance monitoring
- Session replay för debugging
- Custom business metrics
- Slack/Email alerts

**Backup & DR:**
- Daily automatic backups
- 30-day point-in-time recovery
- 4h RTO (Recovery Time Objective)
- 24h RPO (Recovery Point Objective)
- Quarterly disaster recovery tests

**Security:**
- WAF + DDoS protection (Cloudflare)
- Row Level Security (Supabase RLS)
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- GDPR compliant (EU data residency)

### Integration Ecosystem

**Google Workspace:**
- ✅ Calendar sync (two-way)
- ✅ Sheets import/export
- ✅ OAuth authentication
- ⏳ Drive storage (planerat)

**Payments:**
- ✅ Stripe integration
- ✅ Subscription management
- ✅ Webhooks för events
- ✅ Portal för self-service

**Email:**
- ✅ Resend API för transactional emails
- ✅ React Email templates
- ✅ Webhook tracking (delivery, opens, clicks)

**Export Formats:**
- ✅ PNG (high-res), SVG (vector), PDF (print-ready)
- ✅ JPG (web-optimized), Excel (.xlsx)
- ✅ JSON (.yrw proprietary format)

---

## Summering

YearWheel Planner är en sofistikerad enterprise-grade SaaS-applikation som kombinerar modern frontend-teknologi (React + Canvas), managed backend services (Supabase), serverless compute (Edge Functions), AI-driven planering (OpenAI GPT-4.1) och omfattande samarbetsfunktioner.

**Kärnarkitektur:**
- **Frontend**: React SPA med Canvas-rendering, hosted på Netlify CDN
- **Backend**: Supabase BaaS med PostgreSQL, realtime, storage, auth
- **Serverless**: 20 Deno-baserade Edge Functions för AI, payments, integrations
- **AI**: OpenAI Agents SDK med multi-agent system och streaming
- **Security**: Cloudflare WAF + CDN för DDoS-skydd och global distribution
- **DevOps**: Git-based CI/CD, automatic deploys, monitoring med Sentry (planerat)

**Tekniska styrkor:**
- Hög prestanda vid många element (Canvas-baserat)
- Global distribution (Netlify + Cloudflare CDN med 300+ edge locations)
- Real-time collaboration (Supabase Realtime + WebSocket)
- Naturlig språkplanering (OpenAI GPT-4.1 med multi-agent system)
- Säkerhet på databasnivå (RLS policies + WAF)
- Skalbart och kostnadseffektivt (serverless architecture)
- EU-datalagring för GDPR compliance (Frankfurt)

**Collaboration-fokus:**
- Multi-user editing med presence tracking och conflict resolution
- Team management med roller, permissions och email-inbjudningar
- Real-time sync på item-, ring- och group-nivå
- Version control med automatic snapshots och manual versions
- Casting mode för presentationer med synkad zoom/rotation
- Integrationer med Google Workspace (Calendar, Sheets)
- Omfattande notification system (in-app, email, push)

**Infrastruktur & Operations:**
- Instant deploys via Git-push med preview för PRs
- Automatic scaling både frontend och backend (serverless)
- Managed services eliminerar server-hantering
- Built-in backups med 30-dagars PITR
- Free tier för utveckling och tidiga kunder
- 99.9% uptime SLA med disaster recovery plan
- <50ms Edge Function cold start
- Cloudflare WAF för säkerhet och DDoS-skydd
- EU data residency för GDPR compliance

**DevOps & Monitoring:**
- Git-based workflow med database migrations i version control
- Error tracking och performance monitoring via Sentry (planerat)
- Disaster recovery plan: 4h RTO, 24h RPO
- Quarterly DR tests för validering
- Custom business metrics och alerts
- Session replay för advanced debugging

**Production-Ready:**
Lösningen är väl beprövad i produktion och klarar enterprise-användningsfall:
- 100-500 aktiviteter per hjul utan prestandaförlust
- 1000+ samtidiga användare med real-time sync
- Multi-team collaboration med isolerad data
- EU-datalagring för GDPR compliance
- 99.9% uptime SLA med disaster recovery
- <50ms API response times (Edge Functions)
- Global CDN distribution för låg latency
- Skalbar arkitektur (serverless + managed services)

---

*Dokumentet uppdaterat: November 2025*  
*Version: 2.0*  
*Kontakt: thomas@comunitaslabs.io*
- Naturlig språkplanering (OpenAI GPT-4.1)
- Säkerhet på databasnivå (RLS policies)
- Skalbart och kostnadseffektivt (serverless)

**Infrastruktur-fördelar:**
- Instant deploys via Git-push
- Automatic scaling (både frontend och backend)
- Managed services (ingen server-hantering)
- Built-in backups och versioning
- Free tier för utveckling och tidiga kunder

Lösningen är väl beprövad i produktion och klarar realistiska användningsfall (100-500 aktiviteter per hjul, 1000+ samtidiga användare) med god prestanda och användarupplevelse.
