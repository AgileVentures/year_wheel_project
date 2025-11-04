# AI Assistant V2 - Gap Analysis & Future Enhancements

**Date:** November 2, 2025  
**Status:** Analysis Complete, Recommendations Prioritized  
**Context:** Post-implementation of critical fixes

---

## 🎯 Executive Summary

This document outlines **remaining gaps** in the AI Assistant V2 tool ecosystem after implementing critical fixes. Each gap represents a **real use case** that cannot currently be handled efficiently.

**Implementation Priority:**
- ✅ **Critical (Implemented):** Page context, batch creation, query/filter, visibility toggles
- 🟡 **High Priority:** Bulk operations, duplication, label management
- 🔵 **Medium Priority:** Conflict detection, smart scheduling
- ⚪ **Low Priority:** Templates, export/import

---

## 🟡 High Priority Gaps (Recommended for Next Sprint)

### 1. Bulk Move/Update Activities

**Current Limitation:**  
To move multiple activities (e.g., "shift all Q1 campaigns to Q2"), user must:
1. Use `query_activities` to find items
2. Call `update_activity` individually for each (10+ times)
3. Wait for sequential execution

**User Stories:**
- "Flytta alla kampanjer från Q1 till Q2"
- "Skjut fram alla event med 2 veckor"
- "Flytta alla aktiviteter i ringen X till ringen Y"

**Recommended Tool: `bulk_move_activities`**

```typescript
const bulkMoveActivitiesTool = tool<WheelContext>({
  name: 'bulk_move_activities',
  description: 'Move or update multiple activities at once based on criteria',
  parameters: z.object({
    // Selection criteria
    criteria: z.object({
      nameContains: z.string().optional(),
      ringName: z.string().optional(),
      groupName: z.string().optional(),
      quarter: z.number().min(1).max(4).optional(),
    }),
    
    // Updates to apply
    updates: z.object({
      shiftDays: z.number().optional().describe('Days to shift (positive=forward, negative=backward)'),
      newRingId: z.string().uuid().optional(),
      newActivityGroupId: z.string().uuid().optional(),
    })
  }),
  async execute(input, ctx) {
    // 1. Use query_activities logic to find matching items
    // 2. For each item, calculate new dates (if shiftDays provided)
    // 3. Batch update all items in parallel
    // 4. Return summary: { updated: 12, message: "..." }
  }
})
```

**Impact:** 10-15x faster than sequential updates

**Complexity:** Medium (reuses existing query and update logic)

---

### 2. Duplicate Activity with Repeat Pattern

**Current Limitation:**  
To create recurring activities (e.g., "monthly newsletter"), user must:
1. Call `create_activity` for each occurrence
2. Manually calculate dates for each
3. Risk inconsistency in naming/properties

**User Stories:**
- "Kopiera julkampanj till varje månad"
- "Upprepa denna aktivitet 4 gånger"
- "Skapa kvartalsrapporter baserat på Q1-rapporten"

**Recommended Tool: `duplicate_activity`**

```typescript
const duplicateActivityTool = tool<WheelContext>({
  name: 'duplicate_activity',
  description: 'Duplicate an activity with optional date adjustments and naming',
  parameters: z.object({
    sourceActivityName: z.string(),
    count: z.number().min(1).max(12).describe('Number of copies'),
    intervalDays: z.number().optional().describe('Days between each copy (e.g., 30 for monthly)'),
    intervalMonths: z.number().optional().describe('Months between each copy (alternative to days)'),
    nameSuffix: z.boolean().default(true).describe('Add " (2)", " (3)" to names'),
    customNames: z.array(z.string()).optional().describe('Custom names for each copy'),
  }),
  async execute(input, ctx) {
    // 1. Find source activity
    // 2. For each copy:
    //    - Calculate new dates (add intervalDays * i or intervalMonths * i)
    //    - Generate name (suffix or custom)
    //    - Create activity
    // 3. Use batch_create_activities for efficiency
    // 4. Return: { created: 12, names: [...] }
  }
})
```

**Impact:** Enables powerful recurring activity patterns

**Complexity:** Medium (date math, naming logic)

---

### 3. Apply Labels to Multiple Activities

**Current Limitation:**  
Labels exist in the system but **cannot be batch-applied** to activities.  
To label "all Q1 campaigns as high priority":
1. Must update each activity individually
2. No tool to apply labels to matching criteria

**User Stories:**
- "Lägg till etiketten 'prioritet:hög' på alla Q1-kampanjer"
- "Tagga alla event med 'extern'"
- "Markera alla REA-aktiviteter med 'tidsbegränsad'"

**Recommended Tool: `apply_label_to_activities`**

```typescript
const applyLabelToActivitiesTool = tool<WheelContext>({
  name: 'apply_label_to_activities',
  description: 'Apply a label to multiple activities matching criteria',
  parameters: z.object({
    labelName: z.string().describe('Name of label to apply'),
    activityCriteria: z.object({
      nameContains: z.string().optional(),
      ringName: z.string().optional(),
      groupName: z.string().optional(),
      quarter: z.number().min(1).max(4).optional(),
      startAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  }),
  async execute(input, ctx) {
    // 1. Find or create label (by name)
    // 2. Use query_activities to find matching items
    // 3. Batch update all items to set labelId
    // 4. Return: { labeled: 15, labelName: "...", labelColor: "..." }
  }
})
```

**Impact:** Makes label system actually useful

**Complexity:** Low (reuses query logic, simple update)

---

## 🔵 Medium Priority Gaps (Nice to Have)

### 4. Conflict Detection

**Current Limitation:**  
No way to detect:
- Overlapping activities on same ring
- Overcrowded months (too many activities)
- Scheduling conflicts with dependencies

**User Stories:**
- "Finns det några överlappande kampanjer?"
- "Kolla om det blir för mycket i december"
- "Varför syns inte alla aktiviteter?" (too crowded visually)

**Recommended Tool: `detect_conflicts`**

```typescript
const detectConflictsTool = tool<WheelContext>({
  name: 'detect_conflicts',
  description: 'Find overlapping or overcrowded activities',
  parameters: z.object({
    ringName: z.string().optional(),
    monthIndex: z.number().min(0).max(11).optional(),
    threshold: z.number().default(5).describe('Max activities per month before warning'),
  }),
  async execute(input, ctx) {
    // 1. Fetch all activities for criteria
    // 2. Group by ring and check date overlaps
    // 3. Group by month and count (threshold check)
    // 4. Return: { 
    //      overlaps: [{ringName, activities: [a, b]}],
    //      crowded: [{month, count}],
    //      suggestions: ["Move X to Y", "Split campaign"]
    //    }
  }
})
```

**Impact:** Helps users avoid scheduling issues

**Complexity:** Medium (date overlap logic, grouping)

---

### 5. Smart Scheduling Assistant

**Current Limitation:**  
AI cannot suggest **optimal timing** based on existing schedule.  
Planning Agent generates static plans, doesn't adapt to current workload.

**User Stories:**
- "Föreslå bästa tid för produktlansering"
- "Hitta lucka i Q3 för nytt projekt"
- "När har vi minst aktiviteter?"

**Recommended Tool: `suggest_optimal_date`**

```typescript
const suggestSchedulingTool = tool<WheelContext>({
  name: 'suggest_optimal_date',
  description: 'AI-powered suggestion for optimal activity timing',
  parameters: z.object({
    activityName: z.string(),
    duration: z.number().describe('Duration in days'),
    preferredQuarter: z.number().min(1).max(4).optional(),
    avoidOverlap: z.array(z.string()).optional().describe('Ring names to avoid conflicts'),
    constraints: z.array(z.string()).optional().describe('User requirements like "not in summer"'),
  }),
  async execute(input, ctx) {
    // 1. Analyze current schedule (count activities per week/month)
    // 2. Find gaps (weeks with fewer activities)
    // 3. Use OpenAI to evaluate:
    //    - Seasonal appropriateness
    //    - Workload balance
    //    - Strategic timing
    // 4. Return 2-3 suggested date ranges with rationale
  }
})
```

**Impact:** Adds intelligent planning capability

**Complexity:** High (requires OpenAI integration, complex logic)

---

## ⚪ Low Priority Gaps (Future Considerations)

### 6. Template Management

**Use Case:** Save/load reusable structures  
**Complexity:** Medium  
**Value:** Useful for agencies or repeated wheel types

### 7. Export/Import CSV

**Use Case:** Data portability, Excel integration  
**Complexity:** Low  
**Value:** Useful for reporting, but frontend export exists

### 8. Activity Dependencies/Links

**Use Case:** "This activity depends on completion of X"  
**Complexity:** High (requires new data model)  
**Value:** Advanced project management feature

---

## 📊 Implementation Roadmap

### Sprint 1 (Week 1-2) - High Priority
- [ ] `bulk_move_activities` - Highest ROI, reuses existing code
- [ ] `apply_label_to_activities` - Quick win, makes labels useful

### Sprint 2 (Week 3-4) - High Priority
- [ ] `duplicate_activity` - Enables recurring patterns
- [ ] Add to Activity Agent instructions and tool array

### Sprint 3 (Week 5-6) - Medium Priority
- [ ] `detect_conflicts` - Quality of life improvement
- [ ] `suggest_optimal_date` - AI showcase feature

### Backlog - Low Priority
- [ ] Template save/load
- [ ] CSV export/import
- [ ] Activity dependencies

---

## 🧪 Testing Strategy for New Tools

### For Each New Tool:

1. **Unit Testing**
   - [ ] Empty input → Graceful error
   - [ ] Partial matches → Works correctly
   - [ ] No matches → Helpful message
   - [ ] Large datasets → Performance acceptable

2. **Integration Testing**
   - [ ] Works with multi-year wheels
   - [ ] Respects page scope (organization_data)
   - [ ] Handles cross-year activities
   - [ ] Legacy data formats supported

3. **User Acceptance Testing**
   - [ ] Natural language requests work
   - [ ] Agent instructions are clear
   - [ ] Error messages are helpful
   - [ ] Results are accurate

---

## 💡 Design Principles for New Tools

Based on successful implementations, follow these patterns:

### 1. **Reuse Query Logic**
```typescript
// Good: Reuse query_activities filtering
const matchingActivities = await queryActivities(ctx, criteria)

// Bad: Duplicate filtering logic
```

### 2. **Batch Operations**
```typescript
// Good: Parallel execution
await Promise.all(items.map(item => updateItem(item)))

// Bad: Sequential loops
for (const item of items) { await updateItem(item) }
```

### 3. **Clear Success Messages**
```typescript
// Good: Specific, actionable
return { success: true, updated: 12, message: "Flyttade 12 aktiviteter till Q2" }

// Bad: Vague
return { success: true, message: "Done" }
```

### 4. **Error Handling**
```typescript
// Good: User-friendly Swedish
throw new Error('Kunde inte hitta aktiviteter med namnet "X"')

// Bad: Technical jargon
throw new Error('Query returned 0 rows')
```

---

## 📈 Expected Impact

### Performance Improvements:
- Bulk move: **10-15x faster** than sequential updates
- Duplicate: **5-10x faster** than manual recreation
- Label apply: **20-30x faster** (currently impossible efficiently)

### User Experience:
- **Reduced friction:** Complex tasks become single commands
- **Increased capability:** Tasks that were impossible are now easy
- **Better planning:** Conflict detection and smart scheduling help decision-making

### Business Value:
- **Power users:** Advanced features unlock professional workflows
- **New use cases:** Agencies, consultants can manage client wheels more efficiently
- **Competitive advantage:** AI-powered scheduling is unique selling point

---

## 🚀 Next Steps

1. **Review & Prioritize:** Stakeholder approval for Sprint 1 tools
2. **Implement:** Follow implementation patterns from critical fixes
3. **Test:** Use testing checklist for each new tool
4. **Deploy:** Gradual rollout with feature flags
5. **Monitor:** Track usage metrics and user feedback
6. **Iterate:** Based on real-world usage, adjust priorities

---

## 📚 References

- **Critical Fixes:** See `AI_ASSISTANT_V2_IMPROVEMENTS.md`
- **Architecture:** See `.github/copilot-instructions.md`
- **Database Schema:** See `supabase/migrations/005_*.sql`
- **Current Implementation:** `supabase/functions/ai-assistant-v2/index.ts`

---

**Questions or Feedback?**  
This is a living document. Update priorities based on:
- User requests in support channels
- Usage analytics (which tools are called most)
- Performance bottlenecks
- Competitive landscape
