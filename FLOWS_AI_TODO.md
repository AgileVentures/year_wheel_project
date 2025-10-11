# ⚠️ THIS FILE IS DEPRECATED

**This implementation plan was TOO NARROW in scope.**

## Use Instead: `FLOWS_AI_COMPREHENSIVE_TODO.md`

The comprehensive plan uses Flows AI for **ALL operations**, not just cross-year activities.

**Why the change:**
- Original plan only fixed cross-year activities
- Kept unreliable streamText for other operations
- Still had model-dependent behavior issues

**New approach:**
- Complete replacement of AI assistant architecture
- ALL operations use deterministic Flows AI workflows
- 13 different flows covering every operation
- 30+ agents for complete functionality

---

## Quick Links

**📋 Comprehensive TODO:** `FLOWS_AI_COMPREHENSIVE_TODO.md`  
**📖 Strategy Document:** `FLOWS_AI_COMPREHENSIVE_STRATEGY.md`  
**📚 Quick Reference:** `FLOWS_AI_QUICK_REFERENCE.md` (still relevant)

---

## ⚠️ PREREQUISITE (BLOCKING)

- [ ] **Run Database Migration**
  - File: `ADD_PAGE_ID_TO_ITEMS.sql`
  - Location: Supabase Dashboard → SQL Editor
  - Verify: `SELECT * FROM items WHERE page_id IS NULL;` should return 0 rows
  - **⚠️ This MUST be done before any testing!**

---

## Phase 1: Setup & Core Agents (2-3 hours)

### Task 1.1: Create Agent Definitions
- [ ] Create file `src/services/aiAgents.js`
- [ ] Define `intentParserAgent` (LLM-based)
  - [ ] Add system prompt with examples
  - [ ] Use openai('gpt-4o')
  - [ ] Extract: name, startDate, endDate, ringId, activityGroupId, crossYear
- [ ] Define `pageResolverAgent` (Pure function)
  - [ ] Import `aiGetAvailablePages`
  - [ ] Parse start/end dates
  - [ ] Split date ranges by year if needed
  - [ ] Return array of `{ pageId, startDate, endDate }`
- [ ] Define `itemCreatorAgent` (Wrapper)
  - [ ] Import `aiCreateItem`
  - [ ] Call with pageId and item data
  - [ ] Return result
- [ ] Test: Import agents in Node REPL to verify no syntax errors

### Task 1.2: Create Flow Definitions
- [ ] Create file `src/services/aiFlows.js`
- [ ] Import `sequence`, `forEach` from flows-ai/flows
- [ ] Import zod for schema validation
- [ ] Define `crossYearActivityFlow`
  - [ ] Step 1: parseIntent (intentParserAgent)
  - [ ] Step 2: resolvePages (pageResolverAgent)
  - [ ] Step 3: forEach with itemCreatorAgent
  - [ ] Add unique names to each step
- [ ] Define `singleYearActivityFlow` (optional)
- [ ] Test: Import flows in Node REPL to verify structure

### Task 1.3: Update AIAssistant Component
- [ ] Open `src/components/AIAssistant.jsx`
- [ ] Add imports:
  - [ ] `import { execute } from 'flows-ai'`
  - [ ] Import agents from `aiAgents.js`
  - [ ] Import flows from `aiFlows.js`
- [ ] Add `detectCrossYearRequest(message)` helper
  - [ ] Check for date patterns in different years
  - [ ] Check for keywords: "till", "mellan", "över årsskifte"
- [ ] Update `handleSubmit`:
  - [ ] Before streamText, check if cross-year request
  - [ ] If yes, call `execute(crossYearActivityFlow, { ... })`
  - [ ] Add `onFlowStart` logging
  - [ ] Add `onFlowFinish` logging
  - [ ] Handle success: reload wheel, show message
  - [ ] Handle error: show error message
  - [ ] If no, proceed with existing streamText
- [ ] Test: Start dev server, verify no console errors

---

## Phase 2: Testing & Refinement (1-2 hours)

### Task 2.1: Database Migration (PREREQUISITE)
- [ ] Run migration in Supabase
- [ ] Verify page_id column exists
- [ ] Verify foreign key constraint
- [ ] Verify index created
- [ ] Check backfill: All items have page_id

### Task 2.2: Test Cross-Year Activity Creation
- [ ] **Test Case 1: Simple Cross-Year**
  - [ ] Request: "skapa julkampanj 2025-12-15 till 2026-01-30"
  - [ ] Verify: Console logs show flow execution
  - [ ] Verify: 2 items created (one per year)
  - [ ] Verify: Item 1 on page-2025 (2025-12-15 to 2025-12-31)
  - [ ] Verify: Item 2 on page-2026 (2026-01-01 to 2026-01-30)
  - [ ] Verify: Both visible in UI on correct pages

- [ ] **Test Case 2: Three-Year Span**
  - [ ] Request: "skapa långtidsprojekt 2024-10-01 till 2026-03-31"
  - [ ] Verify: 3 items created (2024, 2025, 2026)
  - [ ] Verify: Date ranges split correctly per year

- [ ] **Test Case 3: Single-Year (Fallback)**
  - [ ] Request: "skapa sommarevent 2025-06-01 till 2025-08-31"
  - [ ] Verify: Uses streamText (not Flows AI)
  - [ ] Verify: 1 item created on 2025 page

- [ ] **Test Case 4: Deletion Persistence**
  - [ ] Delete an activity
  - [ ] Create new activity
  - [ ] Verify: Deleted activity does NOT reappear

### Task 2.3: Refine Intent Parser
- [ ] Test with various natural language inputs:
  - [ ] "julkampanj från 15 dec 2025 till 30 jan 2026"
  - [ ] "lägg till event mellan mars och maj"
  - [ ] "skapa projekt på ring Marketing från nov till feb"
- [ ] If parser fails, update system prompt with examples
- [ ] Add context-aware year inference (if year missing, use current page year)
- [ ] Add ring/group name extraction
- [ ] Re-test with refined prompt

---

## Phase 3: Advanced Features (OPTIONAL, 2-3 hours)

### Task 3.1: Batch Creation Support
- [ ] Create `batchIntentParserAgent`
- [ ] Create `batchActivityFlow` using forEach
- [ ] Test: "skapa 5 events från januari till december, en per månad"

### Task 3.2: Conditional Routing
- [ ] Create `masterFlow` using `oneOf`
- [ ] Add conditions for:
  - [ ] Cross-year activities
  - [ ] Batch creation
  - [ ] Single activity
  - [ ] Update/delete operations
- [ ] Test routing logic

### Task 3.3: Evaluation Flow
- [ ] Wrap flows in `evaluator`
- [ ] Define success criteria
- [ ] Test with intentional failures

---

## Verification Checklist

After completing Phase 1 & 2:

- [ ] Cross-year activities created without AI stopping mid-flow
- [ ] All steps execute deterministically (verified via console logs)
- [ ] Items appear on correct pages in UI
- [ ] Deleted items stay deleted
- [ ] Simple queries still work via streamText
- [ ] No TypeScript/ESLint errors
- [ ] No runtime errors in console
- [ ] Code is well-commented

---

## Rollback Plan

If something breaks:

- [ ] Option A: Set `USE_FLOWS_AI = false` feature flag
- [ ] Option B: Revert `AIAssistant.jsx` changes
- [ ] Option C: Remove `aiAgents.js` and `aiFlows.js` imports
- [ ] Verify: App works with original streamText implementation

---

## Documentation Updates

After successful implementation:

- [ ] Update README.md with Flows AI usage
- [ ] Document flow patterns in ARCHITECTURE.md
- [ ] Add troubleshooting guide
- [ ] Update .github/copilot-instructions.md

---

## Current Status

**Last Updated:** 2025-01-XX

**Phase:** Not started

**Blockers:**
- Database migration not yet run

**Next Action:**
1. Run database migration in Supabase
2. Start Task 1.1 (Create aiAgents.js)

---

## Notes

- Keep existing streamText for simple queries (hybrid approach)
- Use event listeners (`onFlowStart`, `onFlowFinish`) for debugging
- Test frequently during implementation
- Commit after each completed task

---

## Quick Reference

**Key Files:**
- `src/services/aiAgents.js` - Agent definitions
- `src/services/aiFlows.js` - Flow orchestration
- `src/components/AIAssistant.jsx` - Integration point
- `ADD_PAGE_ID_TO_ITEMS.sql` - Database migration

**Key Concepts:**
- `sequence([...])` - Run steps in order
- `forEach({ item, input })` - Iterate over collection
- `agent({ model, system })` - Define LLM agent
- `execute(flow, { agents, input })` - Run flow

**Flows AI Docs:**
- https://flows-ai.callstack.com/
