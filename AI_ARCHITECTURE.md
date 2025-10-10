# AI Assistant Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Year Wheel Application                      │
└─────────────────────────────────────────────────────────────────┘

                              USER
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Header.jsx                               │
│                                                                   │
│   [Logo] [Menu] [Pages]         [AI Button] [History] [Save]   │
│                                      ↓                            │
└──────────────────────────────────────┼──────────────────────────┘
                                       │
                                       │ onClick → setIsAIOpen(true)
                                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AIAssistant.jsx                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Header: "AI Assistent" 💫                           [X]  │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  Messages:                                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ AI: "Hej! Vad vill du göra?"                        │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ User: "Skapa en ring för mina projekt" →           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ AI: "✓ Ring skapad!"                                │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  Input: [Type here...] [Send →]                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ handleSubmit()
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Vercel AI SDK (streamText)                      │
│                                                                   │
│  • Streams responses in real-time                               │
│  • Executes tools as needed                                     │
│  • Handles multi-step operations                                │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ API call with tools
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     OpenAI GPT-4 Turbo                           │
│                                                                   │
│  • Understands Swedish prompts                                  │
│  • Decides which tools to use                                   │
│  • Generates natural responses                                  │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ Returns tool calls
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   aiWheelService.js                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Tool Functions:                                         │   │
│  │  • aiCreateRing(wheelId, {name, type, color})          │   │
│  │  • aiCreateActivityGroup(wheelId, {name, color})       │   │
│  │  • aiCreateItem(wheelId, {name, dates, ringId...})    │   │
│  │  • aiCreatePage(wheelId, {year, copyStructure})       │   │
│  │  • aiAnalyzeWheel(wheelId)                            │   │
│  │  • aiDeleteRing(wheelId, {ringId})                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ Calls existing services
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      wheelService.js                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CRUD Operations:                                        │   │
│  │  • fetchWheel(wheelId)                                  │   │
│  │  • saveWheelData(wheelId, orgData)                     │   │
│  │  • updateWheel(wheelId, updates)                       │   │
│  │  • createPage(wheelId, pageData)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ Database operations
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Tables:                                                 │   │
│  │  • year_wheels                                          │   │
│  │  • wheel_rings                                          │   │
│  │  • activity_groups                                      │   │
│  │  • labels                                               │   │
│  │  • items                                                │   │
│  │  • wheel_pages                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ Realtime updates
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    App.jsx (WheelEditor)                         │
│                                                                   │
│  • loadWheelData() - Refreshes wheel from DB                    │
│  • Auto-updates UI after AI changes                             │
│  • Realtime sync with other users                               │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ Updates state
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       YearWheel.jsx                              │
│                                                                   │
│  • Renders updated wheel with new rings/activities              │
│  • Canvas-based circular calendar visualization                 │
│  • Shows user's changes instantly                               │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Example: "Skapa en ring för projekt"

```
1. User types in AIAssistant
   ↓
2. streamText() sends to OpenAI with context:
   {
     "Current wheel": {
       "rings": 2,
       "activityGroups": 3,
       "items": 5
     }
   }
   ↓
3. GPT-4 responds:
   "Jag skapar en ring..."
   TOOL_CALL: createRing({name: "Projekt", type: "outer"})
   ↓
4. aiCreateRing() executes:
   - Fetches current wheel data
   - Creates new ring object
   - Assigns color from palette
   - Saves to database via saveWheelData()
   ↓
5. Database updated:
   INSERT INTO wheel_rings (wheel_id, name, type, color, ...)
   ↓
6. onWheelUpdate() callback:
   - Triggers loadWheelData()
   - Fetches fresh wheel data
   - Updates React state
   ↓
7. YearWheel re-renders:
   - New ring appears on canvas
   - User sees instant update
   ↓
8. AI confirms:
   "✓ Ring 'Projekt' skapad!"
```

## Component Hierarchy

```
App.jsx
├── Header.jsx
│   └── AI Button (toggles AIAssistant)
├── OrganizationPanel.jsx
│   └── Rings/Activities management UI
├── YearWheel.jsx
│   └── Canvas rendering
└── AIAssistant.jsx ← NEW!
    ├── Floating Button
    ├── Chat Window
    │   ├── Messages List
    │   ├── Tool Indicators
    │   └── Input Form
    └── AI Logic
        ├── streamText()
        ├── Tool Definitions
        └── Tool Execution
```

## API Key Flow (Security)

```
Developer
  │
  │ 1. Gets API key from OpenAI
  ↓
.env.local
  VITE_OPENAI_API_KEY=sk-...
  │
  │ 2. Vite injects at build time
  ↓
Browser (import.meta.env.VITE_OPENAI_API_KEY)
  │
  │ 3. Passed to OpenAI SDK
  ↓
OpenAI API
  │
  │ 4. Validates & processes
  ↓
Response streamed back to browser
```

**Note**: For production, move API key to Supabase Edge Function
to keep it server-side and secure.

## Technology Stack

- **Frontend**: React 18 + Vite
- **AI SDK**: Vercel AI SDK (@ai-sdk)
- **AI Model**: OpenAI GPT-4 Turbo
- **Validation**: Zod
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: React hooks + context

## Performance Characteristics

- **First Response**: ~1-2 seconds
- **Streaming**: 20-50 tokens/second
- **Tool Execution**: 0.5-2 seconds
- **Database Update**: 200-500ms
- **Total (creation flow)**: 3-5 seconds

## Cost Breakdown

```
Per Conversation:
├── Prompt (~500 tokens × $0.01/1K) = $0.005
├── Response (~300 tokens × $0.03/1K) = $0.009
└── Total: ~$0.014

Per Tool Call:
├── Extra tokens (~200) = $0.006
└── Total with tool: ~$0.020

Monthly (100 conversations):
├── Basic chat: $1.40
├── With tools: $2.00
└── Heavy use: $5-10
```

Very affordable! 🎉
