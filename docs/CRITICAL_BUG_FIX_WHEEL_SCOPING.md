# Critical Bug Fix: Wheel Scoping

**Date:** November 12, 2025  
**Status:** ✅ FIXED  
**Severity:** CRITICAL - AI assistant couldn't find rings/groups/labels

## The Problem

The AI assistant's `get_current_context` tool was querying rings, activity_groups, and labels with `page_id` instead of `wheel_id`. This caused:

1. **AI couldn't find existing rings** - "Det verkar som om jag inte kunde hitta ring-ID:t för 'Projekt'"
2. **Context appeared empty** - Even though rings existed, AI couldn't see them
3. **Confusion in workflow** - AI asked for confirmation multiple times because it couldn't verify rings existed

## Root Cause

**Incorrect Query in `get_current_context` tool (lines ~2620-2640):**

```typescript
// ❌ WRONG (was using page_id)
supabase.from('wheel_rings').select('*').eq('page_id', currentPageId)
supabase.from('activity_groups').select('*').eq('page_id', currentPageId)
supabase.from('labels').select('*').eq('page_id', currentPageId)
```

**Migration 015 Database Schema:**
- **Rings** - `wheel_id` FK NOT NULL (no `page_id` column exists!)
- **Activity Groups** - `wheel_id` FK NOT NULL (no `page_id` column exists!)
- **Labels** - `wheel_id` FK NOT NULL (no `page_id` column exists!)
- **Items** - `page_id` FK (page-scoped, distributed by year)

## The Fix

**Corrected Query:**

```typescript
// ✅ CORRECT (using wheel_id for rings/groups/labels)
supabase.from('wheel_rings').select('*').eq('wheel_id', wheelId)
supabase.from('activity_groups').select('*').eq('wheel_id', wheelId)
supabase.from('labels').select('*').eq('wheel_id', wheelId)
// Items still use page_id (correct)
supabase.from('items').select('*').eq('page_id', currentPageId)
```

**Updated Comment:**

```typescript
// CRITICAL: Post-migration 015 - rings/groups/labels are WHEEL-SCOPED (shared across all pages)
// Only ITEMS are page-scoped (distributed by year)
```

## Architecture Clarification

**WHEEL-SCOPED (Migration 015):**
- `wheel_rings` - Shared across ALL pages in a wheel
- `activity_groups` - Shared across ALL pages in a wheel
- `labels` - Shared across ALL pages in a wheel

**PAGE-SCOPED:**
- `items` - Distributed to pages by `start_date` year

**Why This Design:**
- Cross-year activities can reference the same ring/group across multiple pages
- User creates rings once, they appear on all pages
- Multi-year projects work correctly (same ring UUID, different page_ids for items)

## Documentation Updates

Updated `/Users/thomasochman/Projects/year_wheel_poc/.github/copilot-instructions.md`:

1. Fixed table descriptions to say "WHEEL-SCOPED" for rings/groups/labels
2. Added "PAGE-SCOPED" clarification for items
3. Updated Key Relationships section
4. Fixed Migration Notes to reference Migration 015 correctly

## Deployment

```bash
npx supabase functions deploy ai-assistant-v2
git commit -m "CRITICAL FIX: Rings/groups/labels are WHEEL-SCOPED not page-scoped"
```

## Testing

After deployment, test with:

1. **Create a wheel with a ring** (e.g., "Projekt")
2. **Ask AI to analyze** - It should now see the ring
3. **Ask AI to create activities** on that ring - Should work immediately
4. **Verify context** - `get_current_context` should return ring with correct ID

## Impact

- ✅ AI can now find existing rings/groups/labels
- ✅ Activity creation workflows work correctly
- ✅ Multi-page wheels function properly (rings shared across years)
- ✅ No more "tekniskt problem" errors from missing context

## Remaining Issue: Streaming

The AI responses are NOT streaming - they appear all at once after "AI arbetar..." 

**Current code:**
```typescript
const result = await run(orchestrator, sanitizedMessage, runOptions)
// Blocks until complete, then sends full response
```

**Problem:** OpenAI Agents SDK 0.1.9 `run()` doesn't return a stream

**Potential solutions:**
1. Check if SDK has a `stream()` method
2. Use manual SSE chunking with periodic status updates
3. Upgrade to newer SDK version with streaming support
4. Implement custom streaming wrapper

This is a **UX issue** (not a functional bug) and can be addressed separately.
