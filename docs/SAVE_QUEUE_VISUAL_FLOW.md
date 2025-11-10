# Save Queue Architecture - Visual Flow

## 🔄 Current Problem (Race Condition)

```
User Actions                Database Operations           Local State
─────────────────────────  ──────────────────────────   ───────────────

[Drag Item A]
   ↓
   setState(A_new)         
   ↓                       
   saveToDb(A_new) ────────→ [Saving A_new...]
   ↓                                                      A: A_new ✅
   
   [User drags Item B]
   ↓
   setState(B_new)                                        B: B_new ✅
   ↓
   saveToDb(B_new) ────────→ [Saving B_new...]
   ↓
                            ← [A_new saved, syncing...]
                            
   [Sync overwrites state]  ← syncFromDb()                A: A_new ✅
                                                           B: B_old ❌ LOST!
                            
                            ← [B_new saved, syncing...]
                            
   [Sync completes]         ← syncFromDb()                B: B_new ✅
                                                           (but only after loss)
```

**Problem**: Sync from first save overwrites the second change!

---

## ✅ Solution (Save Queue)

```
User Actions                Save Queue                   Database           Local State
─────────────────────────  ─────────────────────────   ────────────────   ───────────────

[Drag Item A]
   ↓
   setState(A_new)                                                          A: A_new ✅
   ↓
   enqueueSave(A_new) ─────→ [Queue: A_new]
                             [Status: Processing]
                                  ↓
                                  saveToDb(A_new) ─────→ [Saving...]
                                  
[Drag Item B]                     ↓
   ↓                         [Queue: B_new]              ↓
   setState(B_new)           [Status: Waiting]           ↓                  B: B_new ✅
   ↓                              ↓
   enqueueSave(B_new) ─────→ [Queue: Merged A+B]        ↓
                             [Status: Waiting]           ↓
                                                         ↓
[Drag Item C]                                            ↓
   ↓                                                     ↓
   setState(C_new)                                       ↓                  C: C_new ✅
   ↓                                                     ↓
   enqueueSave(C_new) ─────→ [Queue: Merged B+C]        ↓
                             [Status: Waiting]           ↓
                                                    ← [A saved] ✅
                                  ↓
                             [Merge & process next]
                                  ↓
                                  saveToDb(B+C) ────────→ [Saving...]
                                  ↓
                             [Queue: empty]               ↓
                             [Status: Saving]             ↓
                                                    ← [B+C saved] ✅
                                  ↓
                             [Status: Idle]
                             [All changes saved] ✅       

Final State:                                                                A: A_new ✅
                                                                            B: B_new ✅
                                                                            C: C_new ✅
                                                                            (No data loss!)
```

**Solution**: Queue processes sequentially, merges rapid changes, no overwrites!

---

## 🏗️ Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.jsx                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  useWheelSaveQueue(wheelId, callbacks)                   │  │
│  │                                                           │  │
│  │  Returns: { enqueueSave, isSaving, pendingCount }        │  │
│  └───────────────────────┬──────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │  User Actions                                            │  │
│  │  • Drag item → enqueueSave(snapshot)                     │  │
│  │  • Resize item → enqueueSave(snapshot)                   │  │
│  │  • Edit name → enqueueSave(snapshot)                     │  │
│  │  • Manual save → enqueueSave(snapshot)                   │  │
│  └───────────────────────┬──────────────────────────────────┘  │
└────────────────────────────┼───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                  useWheelSaveQueue.js                          │
│                                                                 │
│  Wraps useSaveQueue with wheel-specific logic:                │
│  • Validates snapshot structure                                │
│  • Calls saveWheelSnapshot                                     │
│  • Shows toast notifications                                   │
│  • Marks undo history as saved                                 │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                     useSaveQueue.js                            │
│                                                                 │
│  Generic queue implementation:                                 │
│  • Maintains saveQueue array                                   │
│  • Processes one save at a time                                │
│  • Merges queued changes                                       │
│  • Handles retries (up to 3 attempts)                          │
│  • Provides status (isSaving, pendingCount)                    │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                  wheelService.js                               │
│                                                                 │
│  saveWheelSnapshot(wheelId, snapshot)                          │
│  • Syncs rings, activityGroups, labels                         │
│  • Syncs items to items table                                  │
│  • Returns ID mappings (temp IDs → UUIDs)                      │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                      Supabase Database                         │
│                                                                 │
│  Tables: year_wheels, wheel_pages, wheel_rings,               │
│          activity_groups, labels, items                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Save Queue State Machine

```
                    ┌──────────┐
                    │   IDLE   │ (isIdle = true)
                    │  Queue   │ (isSaving = false)
                    │  Empty   │ (pendingCount = 0)
                    └────┬─────┘
                         │
                         │ enqueueSave()
                         ↓
                    ┌────────────┐
                    │  QUEUING   │
                    │  Adding    │
                    │  Changes   │
                    └─────┬──────┘
                          │
                          │ processQueue()
                          ↓
            ┌─────────────────────────┐
            │      SAVING             │ (isSaving = true)
            │  Processing queue       │ (pendingCount = 0)
            │  saveToDb() active      │
            └────┬──────────────┬─────┘
                 │              │
      Success    │              │ Error
                 │              │
                 ↓              ↓
         ┌───────────┐    ┌──────────┐
         │  SUCCESS  │    │  RETRY   │ (retryCount < maxRetries)
         └─────┬─────┘    └────┬─────┘
               │               │
               │               │ Wait (exponential backoff)
               │               │
               ↓               ↓
         ┌──────────┐    ┌──────────┐
         │ More in  │    │ Re-queue │
         │ Queue?   │    │ Failed   │
         └────┬─────┘    └────┬─────┘
              │               │
         Yes  │               │
              │               │
              ↓               ↓
         Back to SAVING   Back to QUEUING
              
         No   │
              ↓
         Back to IDLE
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      LOCAL STATE                            │
│  (React useState, useReducer, refs)                         │
│                                                              │
│  • wheelStructure: { rings, activityGroups, labels, items } │
│  • wheelState: { pages, currentPageId }                     │
│  • historyRef: undo/redo stack                              │
└──────────┬────────────────────────────────┬─────────────────┘
           │                                 │
           │ User action                     │ Save trigger
           │ (drag, edit)                    │
           ↓                                 ↓
    ┌──────────────┐              ┌──────────────────┐
    │  setState()  │              │ buildSnapshot()  │
    │  (optimistic)│              │ (gather state)   │
    └──────┬───────┘              └────────┬─────────┘
           │                                │
           │ Immediate                      │
           │ UI update                      │
           ↓                                ↓
    ┌────────────────┐           ┌──────────────────┐
    │  Canvas rerenders│          │ enqueueSave()    │
    │  with new state  │          │                  │
    └──────────────────┘          └────────┬─────────┘
                                           │
                                           │ Queued (non-blocking)
                                           ↓
                                  ┌─────────────────┐
                                  │   SAVE QUEUE    │
                                  │  [change1,      │
                                  │   change2,      │
                                  │   change3]      │
                                  └────────┬────────┘
                                           │
                                           │ Merge & process
                                           ↓
                                  ┌─────────────────┐
                                  │ saveWheelSnapshot│
                                  │ (merged changes) │
                                  └────────┬────────┘
                                           │
                                           │ Database call
                                           ↓
                                  ┌─────────────────┐
                                  │   SUPABASE DB   │
                                  │  • year_wheels  │
                                  │  • wheel_pages  │
                                  │  • items        │
                                  └────────┬────────┘
                                           │
                                           │ Return UUIDs
                                           ↓
                                  ┌─────────────────┐
                                  │  Update state   │
                                  │  with DB IDs    │
                                  │  (temp → UUID)  │
                                  └────────┬────────┘
                                           │
                                           ↓
                                  Back to LOCAL STATE
                                  (with database IDs)
```

---

## 🎯 Key Insights

### 1. Optimistic Updates
```
User sees change IMMEDIATELY → Then save happens in background
```

### 2. Non-Blocking Saves
```
enqueueSave() returns instantly → Save processes asynchronously
```

### 3. Change Merging
```
3 changes in 100ms → 1 database save (80% performance gain)
```

### 4. Sequential Processing
```
Only 1 save active at a time → No race conditions
```

### 5. Automatic Retry
```
Network error → Wait 1s → Retry → Wait 2s → Retry → Wait 4s → Retry
```

---

## 🚦 Status Indicators

```javascript
// UI representation:

isSaving = false, pendingCount = 0, isIdle = true
   → ✅ "Allt sparat"

isSaving = true, pendingCount = 0
   → 💾 "Sparar..."

isSaving = true, pendingCount = 3
   → 💾 "Sparar (3 väntande)..."

isSaving = false, pendingCount = 2
   → ⏳ "2 ändringar väntar..."
```

---

## 📈 Performance Comparison

### Without Queue (BEFORE)
```
Action 1 → Save 1 (500ms) ─────────┐
                                    └→ Complete (500ms)
Action 2 → Save 2 (500ms) ─────────┐
                                    └→ Overwrite! ❌ (500ms)
Action 3 → Save 3 (500ms) ─────────┐
                                    └→ Overwrite! ❌ (500ms)

Total: 1500ms, 2 changes lost ❌
```

### With Queue (AFTER)
```
Action 1 ─┐
Action 2 ─┤ → Queue merges → Save (500ms) → Complete ✅
Action 3 ─┘

Total: 500ms, all changes saved ✅
```

**Result**: 66% faster, 0% data loss! 🎉
