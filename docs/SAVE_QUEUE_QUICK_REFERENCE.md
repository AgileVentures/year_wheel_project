# Save Queue - Quick Reference Card

## 🚀 Quick Integration (Copy-Paste Ready)

### 1. Add Import
```javascript
import { useWheelSaveQueue } from './hooks/useWheelSaveQueue';
```

### 2. Initialize Hook
```javascript
const { enqueueSave, isSaving, pendingCount } = useWheelSaveQueue(wheelId, {
  onSaveSuccess: () => markSaved('wheelStructure'),
  onSaveError: (error) => showToast('Kunde inte spara', 'error')
});
```

### 3. Replace Save Calls
```javascript
// OLD: await saveWheelSnapshot(wheelId, snapshot);
// NEW:
enqueueSave(snapshot, { label: 'manual' });
```

### 4. Update Function Signatures
```javascript
// Remove 'async' and 'await':
const handleSave = useCallback((options) => {  // ← removed 'async'
  const snapshot = buildWheelSnapshot();
  enqueueSave(snapshot);  // ← removed 'await'
}, [enqueueSave]);
```

### 5. Add UI Indicator
```javascript
{isSaving ? '💾 Sparar...' : '✓ Sparat'}
```

---

## 📊 API Cheat Sheet

### `enqueueSave(snapshot, metadata)`
```javascript
enqueueSave(
  buildWheelSnapshot(),  // Complete wheel snapshot
  { label: 'drag' }      // Optional: tracking metadata
);
```

### Status Properties
```javascript
isSaving      // boolean: Save in progress
pendingCount  // number: Changes waiting in queue
isIdle        // boolean: Queue empty and nothing saving
```

### Callbacks
```javascript
onSaveSuccess: (changes, metadata) => {
  console.log(`Saved ${metadata.batchSize} changes`);
}

onSaveError: (error, changes, metadata) => {
  console.error('Save failed:', error);
}
```

---

## 🧪 Quick Tests

### Test 1: Rapid Changes
```
1. Drag item → release
2. Drag another item (before save completes)
3. Both should save correctly ✅
```

### Test 2: Console Check
```
Expected log:
[useSaveQueue] Saving batch of 2 changes...
[useSaveQueue] ✅ Saved successfully in 342ms
```

### Test 3: UI Status
```
During save: "💾 Sparar..."
After save:  "✓ Sparat"
```

---

## ⚠️ Common Mistakes

### ❌ DON'T: Use async/await
```javascript
// WRONG:
const handleSave = async () => {
  await enqueueSave(snapshot);  // ❌ Defeats the purpose
};
```

### ✅ DO: Call directly
```javascript
// CORRECT:
const handleSave = () => {
  enqueueSave(snapshot);  // ✅ Non-blocking, queues immediately
};
```

### ❌ DON'T: Bypass the queue
```javascript
// WRONG:
await saveWheelSnapshot(wheelId, snapshot);  // ❌ Causes race conditions
```

### ✅ DO: Always use queue
```javascript
// CORRECT:
enqueueSave(snapshot);  // ✅ Safe, queued
```

---

## 🐛 Debug Checklist

- [ ] Check console for `[useSaveQueue]` logs
- [ ] Verify `wheelId` is valid UUID
- [ ] Ensure `snapshot` has correct structure
- [ ] Confirm no direct `saveWheelSnapshot` calls
- [ ] Test rapid changes (drag items quickly)
- [ ] Verify save status indicator updates

---

## 📈 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Data loss on rapid edits | Common | None | 100% ✅ |
| DB calls for 5 rapid changes | 5 | 1 | 80% ✅ |
| Save time for 5 changes | ~2.5s | ~0.5s | 80% ✅ |
| UI responsiveness | Blocks | Smooth | 100% ✅ |

---

## 📞 Help

**Issue**: Changes getting lost?
→ Check if you're bypassing the queue

**Issue**: Queue not processing?
→ Check console for error logs

**Issue**: Save status not updating?
→ Verify `isSaving` and `pendingCount` are used in JSX

---

## 📚 Full Documentation

- **Complete Guide**: `docs/SAVE_QUEUE_INTEGRATION.md`
- **Code Examples**: `docs/SAVE_QUEUE_IMPLEMENTATION_EXAMPLE.js`
- **Summary**: `docs/SAVE_QUEUE_SUMMARY.md`

---

## ✅ Done When...

- [x] Files created (`useSaveQueue.js`, `useWheelSaveQueue.js`)
- [ ] `App.jsx` updated with queue calls
- [ ] All `async/await` removed from save functions
- [ ] UI indicator added
- [ ] Tests pass (rapid drag, console logs, status updates)
- [ ] Production deployed and monitored

---

**Estimated Implementation Time**: 30-60 minutes
**Risk Level**: Low (easily reversible)
**Impact**: High (eliminates data loss)
