# Flows AI Comprehensive Implementation TODO

**Goal:** Replace entire AI assistant architecture with Flows AI for deterministic, reliable operations.

**Strategy Document:** `FLOWS_AI_COMPREHENSIVE_STRATEGY.md`

**Status:** Ready to start

---

## ⚠️ PREREQUISITE (BLOCKING)

- [ ] **Run Database Migration**
  - File: `ADD_PAGE_ID_TO_ITEMS.sql`
  - Location: Supabase Dashboard → SQL Editor
  - Verify: `SELECT * FROM items WHERE page_id IS NULL;` should return 0 rows
  - **⚠️ This MUST be done before any testing!**

---

## Phase 1: Core Infrastructure (3-4 hours)

### Task 1.1: Create Complete Agent Definitions File
- [ ] Create file `src/services/aiAgents.js`

#### Intent Parser Agents (LLM-based)
- [ ] `intentParserAgent` - Extract activity data (name, dates, ring, group, label)
- [ ] `updateIntentParserAgent` - Extract update details (itemId, fields to change)
- [ ] `deleteIntentParserAgent` - Extract deletion criteria (name, date range, ring, group)
- [ ] `listIntentParserAgent` - Extract list/query filters
- [ ] `ringIntentParserAgent` - Extract ring creation data (name, type, color)
- [ ] `groupIntentParserAgent` - Extract group creation data (name, color)
- [ ] `pageIntentParserAgent` - Extract year for page creation
- [ ] `ringUpdateIntentParserAgent` - Extract ring update details
- [ ] `groupUpdateIntentParserAgent` - Extract group update details

#### Action Agents (Pure Functions/Database Operations)
- [ ] `pageResolverAgent` - Map dates to page IDs (split by year if needed)
- [ ] `itemCreatorAgent` - Create item with page_id
- [ ] `itemFinderAgent` - Find item by ID or name (fuzzy search)
- [ ] `sameYearUpdateAgent` - Update item in place
- [ ] `crossYearUpdateAgent` - Delete old, create new on correct pages
- [ ] `itemDeleterAgent` - Delete item from database
- [ ] `ringCreatorAgent` - Create ring
- [ ] `ringUpdaterAgent` - Update ring
- [ ] `ringFinderAgent` - Find ring by ID or name
- [ ] `groupCreatorAgent` - Create activity group
- [ ] `groupUpdaterAgent` - Update activity group
- [ ] `groupFinderAgent` - Find group by ID or name
- [ ] `pageCreatorAgent` - Create new page for year
- [ ] `pageCheckerAgent` - Check if page exists
- [ ] `existingPageAgent` - Return existing page info

#### Fetcher Agents (Read Operations)
- [ ] `itemFetcherAgent` - Fetch items with filters (date, ring, group)
- [ ] `ringFetcherAgent` - Fetch all rings
- [ ] `groupFetcherAgent` - Fetch all activity groups
- [ ] `wheelDataFetcherAgent` - Fetch complete wheel data for analysis

#### Formatter Agents (LLM-based)
- [ ] `confirmationFormatterAgent` - Format operation results into Swedish
- [ ] `listFormatterAgent` - Format item lists into readable text
- [ ] `ringListFormatterAgent` - Format ring lists
- [ ] `groupListFormatterAgent` - Format group lists
- [ ] `analysisReportFormatterAgent` - Format wheel analysis report

#### Analysis Agents (LLM-based)
- [ ] `wheelAnalyzerAgent` - Analyze wheel data (utilization, gaps, patterns)
- [ ] `queryUnderstandingAgent` - Understand general queries
- [ ] `responseGeneratorAgent` - Generate contextual responses
- [ ] `confirmationAgent` - Ask user to confirm bulk operations

**Verification:**
- [ ] All agents imported successfully in Node REPL
- [ ] No TypeScript/ESLint errors
- [ ] File is well-organized with comments

---

### Task 1.2: Create Complete Flow Definitions File
- [ ] Create file `src/services/aiFlows.js`

#### Main Operation Flows
- [ ] `createActivityFlow` - sequence([parseIntent, resolvePages, forEach(createItem), formatConfirmation])
- [ ] `updateActivityFlow` - sequence([parseUpdateIntent, findItem, oneOf(crossYear vs sameYear), formatConfirmation])
- [ ] `deleteActivitiesFlow` - sequence([parseDeleteIntent, findItems, confirmDeletion, forEach(deleteItem), formatConfirmation])
- [ ] `listItemsFlow` - sequence([parseListIntent, fetchItems, formatList])

#### Ring Flows
- [ ] `createRingFlow` - sequence([parseRingIntent, createRing, formatConfirmation])
- [ ] `updateRingFlow` - sequence([parseUpdateIntent, findRing, updateRing, formatConfirmation])
- [ ] `listRingsFlow` - sequence([fetchRings, formatList])

#### Activity Group Flows
- [ ] `createActivityGroupFlow` - sequence([parseGroupIntent, createGroup, formatConfirmation])
- [ ] `updateActivityGroupFlow` - sequence([parseUpdateIntent, findGroup, updateGroup, formatConfirmation])
- [ ] `listActivityGroupsFlow` - sequence([fetchGroups, formatList])

#### Page Flows
- [ ] `createPageFlow` - sequence([parsePageIntent, checkExisting, oneOf(returnExisting vs createNew), formatConfirmation])

#### Analysis & Query Flows
- [ ] `analyzeWheelFlow` - sequence([fetchAllData, performAnalysis, formatReport])
- [ ] `generalQueryFlow` - sequence([understandQuery, generateResponse])

#### Master Routing
- [ ] `masterRoutingFlow` - oneOf([...all 13 flows with conditions])

**Verification:**
- [ ] All flows imported successfully
- [ ] No syntax errors
- [ ] Flow structure matches strategy document
- [ ] Zod schemas defined correctly

---

### Task 1.3: Create Helper Service Functions
- [ ] Create file `src/services/aiWheelServiceExtended.js`

**New Functions Needed:**
- [ ] `aiCreateRing(wheelId, { name, type, color, orientation })`
- [ ] `aiUpdateRing(ringId, updates)`
- [ ] `aiDeleteRing(ringId)`
- [ ] `aiCreateActivityGroup(wheelId, { name, color })`
- [ ] `aiUpdateActivityGroup(groupId, updates)`
- [ ] `aiDeleteActivityGroup(groupId)`
- [ ] `aiUpdateItem(itemId, updates)`
- [ ] `aiDeleteItems(itemIds[])`
- [ ] `aiFindItems(wheelId, criteria)`

**Verification:**
- [ ] All functions use direct Supabase operations (no saveWheelData)
- [ ] All functions return standardized results
- [ ] Error handling in place

---

### Task 1.4: Complete Rewrite of AIAssistant Component
- [ ] Open `src/components/AIAssistant.jsx`

**Major Changes:**
- [ ] Remove all existing imports (streamText, tools, etc.)
- [ ] Add imports:
  - [ ] `import { execute } from 'flows-ai'`
  - [ ] `import { openai } from '@ai-sdk/openai'`
  - [ ] Import all agents from `aiAgents.js`
  - [ ] Import `masterRoutingFlow` from `aiFlows.js`

- [ ] Remove old `handleSubmit` implementation
- [ ] Implement new `handleSubmit`:
  - [ ] Build context object: `{ userMessage, wheelId, currentPageId }`
  - [ ] Call `execute(masterRoutingFlow, { agents, input, model, onFlowStart, onFlowFinish })`
  - [ ] Handle success: add message, trigger wheel reload
  - [ ] Handle error: show error message

- [ ] Remove old system prompt
- [ ] Remove old tool definitions (getAvailablePages, createItem, etc.)
- [ ] Remove detectCrossYearRequest helper (no longer needed)

**Verification:**
- [ ] Component compiles without errors
- [ ] Dev server starts successfully
- [ ] No console errors on mount

---

### Task 1.5: Update Context Loading
- [ ] Review `AIAssistant.jsx` - ensure wheelContext includes all necessary data
- [ ] Update `loadWheelContext` if needed to pass more context to agents

---

## Phase 2: Testing All Operations (2-3 hours)

### Test Category: Activity CRUD

#### Test 2.1: Create Single-Year Activity
- [ ] Request: "skapa sommarevent 2025-06-01 till 2025-08-31 på ring Marketing i gruppen Kampanj"
- [ ] Verify: Console logs show flow execution
- [ ] Verify: `[Flows AI] Starting: parseIntent`
- [ ] Verify: `[Flows AI] Starting: resolvePages`
- [ ] Verify: `[Flows AI] Starting: createItemOnPage`
- [ ] Verify: `[Flows AI] Finished: formatConfirmation`
- [ ] Verify: Item appears on 2025 page
- [ ] Verify: Correct ring and group assigned

#### Test 2.2: Create Cross-Year Activity
- [ ] Request: "skapa julkampanj 2025-12-15 till 2026-01-30"
- [ ] Verify: Flow executes completely
- [ ] Verify: 2 items created (one per year)
- [ ] Verify: Item 1 on page-2025 (2025-12-15 to 2025-12-31)
- [ ] Verify: Item 2 on page-2026 (2026-01-01 to 2026-01-30)
- [ ] Verify: Both visible in UI on correct pages

#### Test 2.3: Create Three-Year Activity
- [ ] Request: "skapa långtidsprojekt 2024-10-01 till 2026-03-31"
- [ ] Verify: 3 items created (2024, 2025, 2026)
- [ ] Verify: Date ranges split correctly per year

#### Test 2.4: Update Activity (Same Year)
- [ ] Request: "ändra sommarevent till augusti"
- [ ] Verify: Item found via fuzzy search
- [ ] Verify: End date updated to 2025-08-31
- [ ] Verify: Item stays on same page

#### Test 2.5: Update Activity (Cross Year)
- [ ] Create: "skapa event 2025-11-01 till 2025-11-30"
- [ ] Update: "ändra event till februari 2026"
- [ ] Verify: Old item deleted
- [ ] Verify: New items created on 2025 and 2026 pages
- [ ] Verify: Date range: 2025-11-01 to 2026-02-28

#### Test 2.6: Delete Single Activity
- [ ] Request: "ta bort sommarevent"
- [ ] Verify: Item found
- [ ] Verify: Confirmation requested (optional)
- [ ] Verify: Item deleted
- [ ] Verify: Item no longer visible in UI

#### Test 2.7: Delete Multiple Activities
- [ ] Request: "radera alla aktiviteter i december"
- [ ] Verify: All December items found
- [ ] Verify: Count shown to user
- [ ] Verify: All deleted
- [ ] Verify: None visible in UI

#### Test 2.8: Deletion Persistence
- [ ] Delete an activity
- [ ] Create new activity
- [ ] Verify: Deleted activity does NOT reappear

---

### Test Category: List/Query Operations

#### Test 2.9: List All Activities
- [ ] Request: "visa alla aktiviteter"
- [ ] Verify: All items across all pages returned
- [ ] Verify: Formatted with dates, rings, groups

#### Test 2.10: List Activities by Date Range
- [ ] Request: "lista aktiviteter i mars"
- [ ] Verify: Only March items returned
- [ ] Verify: Formatted chronologically

#### Test 2.11: List Activities by Ring
- [ ] Request: "visa aktiviteter på ring Marketing"
- [ ] Verify: Only Marketing ring items returned

#### Test 2.12: List Activities by Group
- [ ] Request: "vad finns i gruppen Kampanj"
- [ ] Verify: Only Kampanj group items returned

---

### Test Category: Ring Operations

#### Test 2.13: Create Ring
- [ ] Request: "skapa inre ring Sales"
- [ ] Verify: Ring created with type=inner
- [ ] Verify: Confirmation message shown
- [ ] Verify: Ring visible in wheel

#### Test 2.14: Create Ring with Color
- [ ] Request: "lägg till yttre ring Support med blå färg"
- [ ] Verify: Ring created with type=outer, color=#0000FF (or similar blue)

#### Test 2.15: Update Ring
- [ ] Request: "ändra ring Sales till röd färg"
- [ ] Verify: Ring found
- [ ] Verify: Color updated
- [ ] Verify: Wheel updates

#### Test 2.16: List Rings
- [ ] Request: "visa alla ringar"
- [ ] Verify: All rings listed with types and colors

---

### Test Category: Activity Group Operations

#### Test 2.17: Create Activity Group
- [ ] Request: "skapa grupp Events"
- [ ] Verify: Group created
- [ ] Verify: Confirmation shown

#### Test 2.18: Create Group with Color
- [ ] Request: "lägg till kategori Projekt med grön färg"
- [ ] Verify: Group created with specified color

#### Test 2.19: Update Group
- [ ] Request: "ändra grupp Events till gul färg"
- [ ] Verify: Group found
- [ ] Verify: Color updated

#### Test 2.20: List Groups
- [ ] Request: "visa alla grupper"
- [ ] Verify: All groups listed with colors

---

### Test Category: Page Operations

#### Test 2.21: Create Page
- [ ] Request: "skapa sida för 2027"
- [ ] Verify: Page created for year 2027
- [ ] Verify: Page visible in UI

#### Test 2.22: Create Existing Page
- [ ] Request: "skapa sida för 2025" (already exists)
- [ ] Verify: Returns existing page info
- [ ] Verify: No duplicate created

---

### Test Category: Analysis & General Queries

#### Test 2.23: Wheel Analysis
- [ ] Request: "analysera mitt hjul"
- [ ] Verify: All data fetched
- [ ] Verify: Analysis performed (utilization, gaps, patterns)
- [ ] Verify: Report formatted in Swedish

#### Test 2.24: General Query
- [ ] Request: "hur fungerar det här?"
- [ ] Verify: Contextual response generated
- [ ] Verify: Response is helpful and relevant

---

## Phase 3: Refinement & Polish (1-2 hours)

### Task 3.1: Refine Intent Parsers
- [ ] Test with various natural language inputs:
  - [ ] "julkampanj från 15 dec 2025 till 30 jan 2026"
  - [ ] "lägg till event mellan mars och maj"
  - [ ] "skapa projekt på ring Marketing från nov till feb"
  - [ ] "ta bort alla i gruppen Kampanj"
  - [ ] "ändra namn på event till 'Nyårsparty'"

- [ ] If parser fails, update system prompts with examples
- [ ] Add context-aware year inference
- [ ] Add ring/group name extraction improvements

### Task 3.2: Improve Error Handling
- [ ] Add try-catch around all database operations
- [ ] Return user-friendly error messages
- [ ] Handle edge cases:
  - [ ] Item not found
  - [ ] Ring not found
  - [ ] Group not found
  - [ ] Invalid date format
  - [ ] Page doesn't exist for year

### Task 3.3: Add Progress Indicators
- [ ] Show "Bearbetar..." during flow execution
- [ ] Show step-by-step progress (optional)
- [ ] Disable input during processing

### Task 3.4: Optimize Performance
- [ ] Cache wheel context to avoid repeated fetches
- [ ] Batch database operations where possible
- [ ] Profile slow flows and optimize

---

## Phase 4: Advanced Features (OPTIONAL, 2-3 hours)

### Task 4.1: Add Batch Creation Support
- [ ] Create `batchIntentParserAgent`
- [ ] Create `batchActivityFlow` using forEach
- [ ] Test: "skapa 5 events från januari till december, en per månad"

### Task 4.2: Add Validation Flow
- [ ] Wrap critical flows in `evaluator`
- [ ] Define success criteria
- [ ] Test with intentional failures

### Task 4.3: Add Undo/Redo Support
- [ ] Track operations in history
- [ ] Add "ångra senaste" flow
- [ ] Store operation metadata for reversal

---

## Verification Checklist

After completing Phase 1-3:

- [ ] All 24 test cases pass
- [ ] Console logs show deterministic execution for every operation
- [ ] Items appear on correct pages
- [ ] Deleted items stay deleted
- [ ] Ring operations work correctly
- [ ] Activity group operations work correctly
- [ ] Cross-year activities handled perfectly
- [ ] Natural language understanding is good
- [ ] Error messages are user-friendly
- [ ] No TypeScript/ESLint errors
- [ ] No runtime errors in console
- [ ] Code is well-commented
- [ ] Performance is acceptable (< 3s per operation)

---

## Rollback Plan

If Flows AI causes critical issues:

### Option 1: Feature Flag
- [ ] Add `USE_FLOWS_AI = false` constant
- [ ] Keep old AIAssistant code in `AIAssistant.backup.jsx`
- [ ] Conditional import based on flag

### Option 2: Complete Revert
```bash
git checkout HEAD -- src/components/AIAssistant.jsx
rm src/services/aiAgents.js
rm src/services/aiFlows.js
rm src/services/aiWheelServiceExtended.js
```

---

## Documentation Updates

After successful implementation:

- [ ] Update README.md with Flows AI usage
- [ ] Document all available operations
- [ ] Add troubleshooting guide
- [ ] Update .github/copilot-instructions.md
- [ ] Add examples of natural language commands
- [ ] Document agent architecture
- [ ] Document flow structure

---

## Current Status

**Last Updated:** 2025-10-11

**Phase:** Not started

**Blockers:**
- Database migration not yet run

**Next Action:**
1. Run database migration in Supabase (`ADD_PAGE_ID_TO_ITEMS.sql`)
2. Start Task 1.1 (Create aiAgents.js)

---

## Quick Reference

**Strategy Document:** `FLOWS_AI_COMPREHENSIVE_STRATEGY.md`

**Key Files to Create:**
- `src/services/aiAgents.js` - All agent definitions (~800 lines)
- `src/services/aiFlows.js` - All flow orchestrations (~400 lines)
- `src/services/aiWheelServiceExtended.js` - Helper functions (~300 lines)
- `src/components/AIAssistant.jsx` - Complete rewrite (~150 lines)

**Key Concepts:**
- `sequence([...])` - Run steps in order
- `forEach({ item, input })` - Iterate over collection
- `oneOf([...])` - Conditional routing
- `agent({ model, system })` - Define LLM agent
- `execute(flow, { agents, input })` - Run flow

**Flows AI Docs:**
- https://flows-ai.callstack.com/

---

## Estimated Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1 | Core Infrastructure | 3-4 hours |
| Phase 2 | Testing All Operations | 2-3 hours |
| Phase 3 | Refinement & Polish | 1-2 hours |
| Phase 4 | Advanced Features (Optional) | 2-3 hours |
| **TOTAL** | **Core Complete** | **6-9 hours** |
| **TOTAL** | **With Advanced** | **8-12 hours** |

---

## Success Definition

Implementation is complete when:

✅ **ALL** 24 test cases pass  
✅ **ALL** operations use Flows AI (no streamText)  
✅ **ZERO** AI stopping issues  
✅ **100%** deterministic execution  
✅ **ZERO** deleted items reappearing  
✅ Cross-year activities work perfectly  
✅ Natural language understanding is excellent  
✅ Error handling is robust  
✅ Performance is acceptable  
✅ Code is well-documented  

---

**Ready to implement? Start with database migration, then Task 1.1!**
