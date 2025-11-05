# AI Assistant

## Overview

The AI Assistant helps you plan and organize your Year Wheel using natural language. It's a floating, draggable window that connects to a powerful multi-agent system powered by OpenAI GPT-4 and the OpenAI Agents SDK.

## Key Features

### Natural Language Planning

Simply describe what you want in Swedish:

- "Lägg till julkampanj i december"
- "Skapa ring för Kampanjer"
- "Föreslå struktur för HR-planering"
- "Analysera mitt hjul och ge rekommendationer"

### Multi-Agent System

The AI Assistant uses 4 specialized agents that work together:

**Orchestrator Agent**: Main coordinator that analyzes your request and delegates to the right specialist

**Structure Agent**: Creates and manages rings, activity groups, labels, and year pages

**Activity Agent**: Creates, updates, deletes, and searches for activities

**Analysis Agent**: Provides AI-powered insights, domain identification, and quality assessment

**Planning Agent**: Generates complete project plans with rings, groups, and sample activities

### Real-Time Streaming

Watch the AI work in real-time with Server-Sent Events (SSE):

- Status updates ("Hämtar aktuell kontext...")
- Tool execution progress ("Skapar aktivitet...")
- Agent responses streaming word-by-word
- Error handling with friendly messages

### Server-Side Conversation State

The AI uses OpenAI's Agents SDK with server-side conversation management through `lastResponseId`. This ensures:

- Conversation continuity across multiple requests
- Proper context from previous messages
- Efficient multi-turn workflows (like structure suggestions requiring confirmation)

## How to Use

### Opening the Assistant

Click the **AI** button in the editor toolbar. A floating window appears that you can:

- Drag to reposition (click and hold the header)
- Resize from any edge or corner
- Minimize using the minimize button
- Close with the X button or Esc key

### Window Controls

The floating window has:

- **Draggable header**: Move the window anywhere on screen
- **8 resize handles**: Corners and edges for resizing
- **Minimize button**: Collapse to header only
- **Close button**: Close the assistant
- **Automatic viewport constraints**: Window stays within visible area

### Basic Workflow

1. Type your request in Swedish
2. Press Enter or click Send
3. Watch real-time status updates
4. AI agent executes the appropriate tools
5. Get confirmation with details

Example:

```
User: "Skapa kampanj i november"

Status: Hämtar aktuell kontext...
Status: Skapar aktivitet "kampanj"...
AI: Klart! Jag har skapat aktiviteten:

Kampanj
November 2025 (2025-11-01 till 2025-11-30)
Ring: Kampanjer
Grupp: Kampanj
```

## Available Tools (24 Total)

### Context Tool

**get_current_context**: Fetches current rings, groups, labels, pages (years), and today's date. Returns ONLY visible items from the current page.

### Structure Agent Tools (15 tools)

**Ring Management**:
- create_ring: Create outer (activity) or inner (text) rings
- update_ring: Change ring name or color
- delete_ring: Remove ring (fails if activities exist)
- toggle_ring_visibility: Show/hide ring without deleting

**Activity Group Management**:
- create_activity_group: Create new activity category
- update_activity_group: Change group name or color
- delete_activity_group: Remove group (fails if activities exist)
- toggle_group_visibility: Show/hide group without deleting

**Label Management**:
- create_label: Create optional activity labels
- update_label: Change label name or color
- delete_label: Remove label (safe even if in use)

**Year Page Management**:
- create_year_page: Add new year with optional structure copy
- smart_copy_year: Copy ALL activities from one year to another with automatic date adjustment

**AI-Powered Suggestions**:
- suggest_wheel_structure: AI generates complete structure (rings, groups, sample activities) based on domain or use case

### Activity Agent Tools (6 tools)

- create_activity: Create single activity with dates, ring, group, optional label
- batch_create_activities: Create multiple activities in one operation
- query_activities: Search by name, date range, ring, group, or quarter
- update_activity: Change activity name, dates, ring, or group (supports cross-year moves)
- delete_activity: Remove activity by name
- list_activities: Show all activities for current page

### Analysis Agent Tool (1 tool)

- analyze_wheel: AI-powered analysis with domain identification, quality assessment, distribution stats, and specific recommendations

### Planning Agent Tools (2 tools)

- suggest_plan: AI generates complete project plan for a goal and time period
- apply_suggested_plan: Creates rings, groups, and activities from suggested plan

## Agent Workflows

### Structure Agent

**Purpose**: Manages wheel structure (rings, groups, labels, year pages)

**When activated**:
- "skapa ring", "ny ring"
- "skapa aktivitetsgrupp", "ny grupp"
- "föreslå struktur för [domain]"
- "skapa år", "kopiera år"
- "ändra färg på", "byt namn på"
- "ta bort ring/grupp"
- "dölj ring", "visa grupp"

**Suggest Structure Workflow**:
1. User: "Föreslå struktur för marknadsföring"
2. AI calls suggest_wheel_structure with domain
3. AI presents suggestions with descriptions
4. AI asks: "Vill du att jag skapar denna struktur?"
5. User confirms
6. AI creates rings (gets IDs) → creates groups (using ring IDs)
7. User can then ask Activity Agent to add activities

### Activity Agent

**Purpose**: Creates and manages activities/events

**When activated** (HIGHEST PRIORITY):
- ANY form of "lägg till", "skapa", "ny" + activity/event
- "flytta aktivitet", "ändra datum"
- "ta bort aktivitet"
- "lista aktiviteter"
- Multi-step requests like "1. Lägg till X, 2. Omstrukturera Y"

**Smart Matching**: AI automatically matches keywords to rings/groups:
- "kampanj" → finds "Kampanjer" ring + "Kampanj" group
- "rea" → finds "REA" group
- "event" → finds "Händelser" ring

**Date Handling**:
- "idag" → uses current date from context
- "november" → current year if month >= now, else next year
- "en vecka" → 7 days duration
- Always converts to YYYY-MM-DD format

**Multi-Year Activities**: Automatically creates/finds year pages and splits activities across years.

### Analysis Agent

**Purpose**: Provides insights and quality assessment

**When activated** (LOWEST PRIORITY):
- ONLY when NOTHING else is requested
- "analysera", "hur ser det ut"
- "ge rekommendationer"
- "vilken domän", "statistik"

**Output includes**:
- Domain identification (e.g., "Marketing Strategy", "Product Launch")
- Quality assessment with specific feedback
- Best practices for the domain
- Top 3 actionable recommendations
- Quarterly distribution stats
- Ring and group distribution

### Planning Agent

**Purpose**: Generates complete project plans

**When activated**:
- "föreslå aktiviteter för [goal]"
- "skapa plan för [project]"
- "jag ska starta [new project]"
- "hjälp mig planera [goal]"

**Workflow**:
1. User describes goal and optionally time period
2. AI calls suggest_plan (uses GPT-4 for domain expertise)
3. AI presents structured plan with rings, groups, activities by quarter
4. AI asks for confirmation
5. User confirms
6. AI calls apply_suggested_plan
7. All structure is created, user can then adjust

## Advanced Features

### Multi-Year Activities

Create activities spanning multiple years:

```
"Lägg till produktutveckling från oktober 2025 till mars 2026"
```

The AI automatically:
- Checks if year pages exist for 2025 and 2026
- Creates missing pages with structure copied from existing pages
- Splits activity: Oct-Dec 2025 segment + Jan-Mar 2026 segment
- Links both segments to same ring and group

### Smart Date Inference

Natural language dates are converted intelligently:

- "november" (no year) → Current year if Nov >= current month, else next year
- "idag" → Uses date from get_current_context tool
- "en vecka i december" → Dec 1-7 of appropriate year
- "Q2" → April 1 to June 30

### Batch Operations

Create multiple activities efficiently:

```
"Skapa 12 månatliga kampanjer för 2025"
```

AI uses `batch_create_activities` to create all 12 in one database operation.

### Visibility Management

Hide/show without deleting:

```
"Dölj ringen Kampanjer"
"Visa gruppen Marketing igen"
```

Hidden items stay in database but aren't visible on the wheel. This is useful for:
- Seasonal rings that aren't always needed
- Testing different structures
- Temporarily simplifying the view

### Cross-Year Updates

Move activities between years seamlessly:

```
"Flytta Google kampanj till 2026"
```

The AI:
- Deletes old activity items
- Creates new items on target year page
- Preserves all other properties (ring, group, label)
- Maintains activity name and description

## Integration with Data

### Wheel Context Loaded

Every AI request includes:

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

### Tool Results

When AI executes tools, it gets structured JSON responses:

```json
{
  "success": true,
  "itemsCreated": 1,
  "message": "Aktivitet 'Julkampanj' skapad",
  "ringName": "Kampanjer",
  "groupName": "Kampanj"
}
```

This allows the AI to give you detailed, accurate feedback about what was created.

## Premium Features

**AI Assistant requires a Premium subscription.**

Free users see an upgrade prompt when clicking the AI button.

### What's Included

- Unlimited AI requests
- All 4 specialized agents
- 24 database tools
- GPT-4 powered analysis
- Structure suggestions
- Planning assistance with domain expertise
- Real-time streaming responses

## Markdown Rendering

AI responses are rendered with:

- **marked**: Parses markdown syntax
- **DOMPurify**: Sanitizes HTML to prevent XSS attacks
- **Clean formatting**: Headers, lists, bold, code blocks all work

The AI automatically formats responses with:

```markdown
### Headers for sections
**Bold** for emphasis
- Bullet lists
1. Numbered lists
```

## Response Cleaning

Before rendering, responses are cleaned to remove:

- UUIDs (database IDs not relevant to users)
- Emojis (all Unicode emoji characters)
- Unnecessary whitespace

This ensures professional, focused output.

## Error Handling

### Common Errors and Solutions

**"Det finns ett strukturellt problem"**

Cause: Year pages don't exist for requested dates

Solution: 
- Create year page first: "Skapa år 2026"
- Or switch to existing year in page navigator

**"Ring/Grupp hittades inte"**

Cause: Missing structure (no rings or activity groups exist)

Solution:
- Create structure: "Skapa ring Kampanjer"
- Or ask for suggestions: "Föreslå struktur för marknadsföring"

**"Foreign key constraint violation"**

Cause: Trying to reference non-existent rings or groups

Solution:
- Ensure structure exists before creating activities
- AI's get_current_context tool helps prevent this

### Friendly Error Messages

The AI converts technical errors to Swedish:

```
Database error: "foreign key constraint"
→ "Strukturen saknas. Skapa ringar och grupper först."

404 Not Found
→ "Kunde inte hitta den begärda resursen."
```

## Data Flow

1. **User types message** → Frontend sends to Edge Function
2. **Edge Function** → Initializes agents with WheelContext (supabase client, wheelId, userId, currentYear, currentPageId)
3. **Orchestrator Agent** → Analyzes intent, delegates to specialist
4. **Specialist Agent** → Executes appropriate tools
5. **Tools** → Query/update Supabase database
6. **Tool results** → Return to agent as JSON
7. **Agent** → Formats response in Swedish
8. **SSE Stream** → Sends status updates, tool calls, results to frontend
9. **Frontend** → Renders markdown response in AI window

## SSE Event Types

The frontend receives these event types:

- **status**: Tool execution status ("Hämtar aktuell kontext...")
- **agent**: Agent thinking/responding (streamed text)
- **tool**: Tool call starting (tool name + arguments)
- **tool_result**: Tool completed (result data)
- **complete**: Conversation finished (includes lastResponseId)
- **error**: Error occurred (friendly message)

## Conversation Continuity

The AI uses `lastResponseId` tokens from OpenAI Agents SDK:

```javascript
// First request
POST /ai-assistant-v2
Body: { message: "Föreslå struktur för HR" }
Response: { lastResponseId: "abc123..." }

// Follow-up request
POST /ai-assistant-v2
Body: { 
  message: "Ja, skapa den", 
  lastResponseId: "abc123..."  // Maintains context
}
```

This enables multi-turn workflows like:
1. AI suggests structure
2. User reviews and confirms
3. AI creates based on previous suggestion

## Limitations

### Language

Currently responds primarily in Swedish. English input is understood but responses are in Swedish.

### No Direct Calendar/Sheets Sync

The AI Assistant does NOT directly sync with Google Calendar or Sheets. That functionality is handled by the Google Integrations panel separately.

The AI can:
- Create activities manually
- Organize activities into rings and groups
- Suggest structures

The AI cannot:
- Sync calendar events directly
- Import from spreadsheets
- Map columns or calendars

For Google integrations, use the dedicated Google Calendar and Google Sheets panels in the editor.

### No Conversation History UI

Each request is independent (unless using lastResponseId for multi-turn). There's no persistent chat history shown in the UI. The conversation resets when you close the window.

### Database Operations Only

The AI only modifies database records (wheel_pages, wheel_rings, activity_groups, items, labels). It cannot:
- Edit canvas rendering settings
- Change UI preferences
- Modify subscription plans
- Access other users' wheels

## Technical Details

### Edge Function

- **Location**: `supabase/functions/ai-assistant-v2/index.ts`
- **Runtime**: Deno (Supabase Edge Functions)
- **Model**: GPT-4 (OpenAI)
- **Framework**: OpenAI Agents SDK v0.1.9
- **Streaming**: Server-Sent Events (SSE)

### Frontend Component

- **Location**: `src/components/AIAssistant.jsx`
- **State**: React hooks (useState, useEffect, useRef)
- **Position**: Draggable with viewport constraints
- **Size**: Resizable with min/max constraints
- **Rendering**: marked + DOMPurify for safe markdown

### Database Tables Used

- wheel_pages (organization_data JSONB)
- wheel_rings
- activity_groups
- labels
- items

### Authentication

Requires valid Supabase auth token. User ID is extracted from JWT and used for:
- RLS policies
- Wheel ownership verification
- Premium status check

## Best Practices

### Be Specific

**Good**: "Lägg till julkampanj 15-31 december i ringen Kampanjer"

**Less optimal**: "Lägg till kampanj"

### Use Natural Language

**Good**: "Skapa 12 månatliga recensioner"

**Less optimal**: "create_activity name='Review' start='2025-01-01' end='2025-01-31'"

### Build Structure First

Before creating activities:
1. Create rings: "Skapa ring Kampanjer"
2. Create groups: "Skapa aktivitetsgrupp Kampanj med färg #ff0000"
3. Then create activities: "Lägg till julkampanj i december"

Or use structure suggestions:
1. "Föreslå struktur för marknadsföring"
2. Review suggestions
3. Confirm: "Ja, skapa det"
4. Then add specific activities

### Multi-Step Requests

The Activity Agent handles multi-step requests sequentially:

```
"1. Lägg till utvärdering i mars
 2. Omstrukturera kampanjer till Q2
 3. Inför buffertar mellan projekt"
```

AI executes each step in order and reports all results.

### Analysis After Creation

After adding many activities:

```
"Analysera mitt hjul och ge rekommendationer"
```

Get insights about:
- Domain fit
- Quality of planning
- Missing critical activities
- Workload distribution
- Specific improvements

## Privacy & Security

### Data Sent to OpenAI

- Your message text
- Wheel title and year
- Ring, group, label names and IDs (visible items only)
- Activity names and dates (current page only)
- Basic statistics (counts)

### Data NOT Sent

- User email or personal info
- Other users' wheels
- Full database contents
- Payment information
- Conversation history (not stored on our servers)

### Server-Side Processing

All AI processing happens in Supabase Edge Functions (not on frontend). This ensures:
- Database credentials never exposed to browser
- RLS policies enforced
- Premium status verified server-side
- OpenAI API key secured

## Keyboard Shortcuts

- **Esc**: Close AI assistant window
- **Enter**: Send message (when focused in textarea)

## Coming Soon

- English language responses
- Voice input
- Persistent conversation history in UI
- Template suggestions library
- More specialized agents (Budget Agent, Resource Agent, Timeline Agent)
- Undo/redo support for AI actions
- Activity templates with smart defaults
