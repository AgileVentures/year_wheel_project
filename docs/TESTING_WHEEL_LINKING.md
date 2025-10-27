# Inter-Wheel Linking - Testing Checklist

## Pre-Testing Setup

- [ ] Run migration `022_ADD_WHEEL_LINKING.sql` in Supabase SQL Editor
- [ ] Verify columns added: `SELECT linked_wheel_id, link_type FROM items LIMIT 1;`
- [ ] Verify function exists: `SELECT can_link_to_wheel('test-uuid', 'test-uuid');`
- [ ] Start local dev server: `yarn dev`
- [ ] Open browser console for error monitoring

## Test Scenario 1: Basic Link Creation

### Create Two Wheels
- [ ] Create "Wheel A - Strategy 2025"
- [ ] Create "Wheel B - Project Phoenix"
- [ ] Add at least one ring and activity group to each

### Link Item from A to B
- [ ] In Wheel A, add new item "Project Phoenix Initiative"
- [ ] In "Link to Another Wheel" section, select "Wheel B"
- [ ] Verify preview card appears with "Project Phoenix (2025)"
- [ ] Save the item
- [ ] Verify blue chain link icon (🔗) appears on the wheel canvas
- [ ] Verify item saved successfully (no console errors)

## Test Scenario 2: Navigation

### Test Tooltip Display
- [ ] Hover over linked item in Wheel A
- [ ] Verify tooltip shows "Linked Wheel:" section
- [ ] Verify "Project Phoenix (2025)" displays correctly
- [ ] Verify "Open Wheel →" button with external link icon appears

### Test Navigation
- [ ] Click "Open Wheel →" button in tooltip
- [ ] Verify new tab opens with Wheel B
- [ ] Verify URL contains `?from=<wheelAId>` parameter
- [ ] Verify Wheel B loads correctly

## Test Scenario 3: Edit Linked Item

### Change Link Target
- [ ] In Wheel A, click Edit on linked item
- [ ] Verify current linked wheel is pre-selected in dropdown
- [ ] Change to different wheel or select "No link"
- [ ] Save changes
- [ ] Verify link icon updates appropriately

### Remove Link
- [ ] Edit the item again
- [ ] Select "No link" from dropdown
- [ ] Save changes
- [ ] Verify chain link icon disappears from canvas
- [ ] Verify tooltip no longer shows "Linked Wheel" section

## Test Scenario 4: Permission Validation

### Test Team Wheel Access
- [ ] Create Wheel C with a team
- [ ] In Wheel A (as owner), try to link to Wheel C
- [ ] Verify Wheel C appears in dropdown (if team member)
- [ ] Verify Wheel C does NOT appear (if not team member)

### Test Self-Link Prevention
- [ ] Try to link an item in Wheel A to Wheel A itself
- [ ] Verify Wheel A does NOT appear in the dropdown

## Test Scenario 5: Circular Reference Detection

### Create Potential Loop
- [ ] In Wheel A, link Item 1 to Wheel B
- [ ] In Wheel B, try to link Item 2 to Wheel A
- [ ] This SHOULD work (depth 1)
- [ ] Create Wheel C, link B → C → A
- [ ] Verify circular detection prevents infinite loops (max depth: 3)

## Test Scenario 6: Visual Rendering

### Verify Icon Placement
- [ ] Create items with different durations (1 day, 1 week, 1 month)
- [ ] Link all items to another wheel
- [ ] Verify chain link icon appears at start of each item
- [ ] Verify icon doesn't overlap with item text
- [ ] Verify icon doesn't conflict with label badges

### Test Inner vs Outer Rings
- [ ] Link items on inner rings - verify icon renders correctly
- [ ] Link items on outer rings - verify icon renders correctly
- [ ] Verify icon scales appropriately with wheel size

## Test Scenario 7: Data Persistence

### Reload Test
- [ ] Create and link an item
- [ ] Refresh the page (F5)
- [ ] Verify linked item still shows chain link icon
- [ ] Verify tooltip still displays correct linked wheel

### Save and Load
- [ ] Create linked item
- [ ] Navigate away from wheel
- [ ] Return to wheel
- [ ] Verify link persists across navigation

## Test Scenario 8: Internationalization

### Test Swedish Language
- [ ] Switch to Swedish (sv)
- [ ] Add new item with link
- [ ] Verify all labels in Swedish:
  - "Länka till ett annat hjul (valfritt)"
  - "Välj hjul"
  - "Ingen länk"
  - "Länkat till"
- [ ] Verify tooltip shows "Länkat hjul:"

### Test English Language
- [ ] Switch to English (en)
- [ ] Verify all labels in English:
  - "Link to Another Wheel (Optional)"
  - "Select Wheel"
  - "No link"
  - "Linked to"
- [ ] Verify tooltip shows "Linked Wheel:"

## Test Scenario 9: Edge Cases

### Deleted Wheel Handling
- [ ] Link Item A to Wheel B
- [ ] Delete Wheel B
- [ ] Verify Item A no longer shows "Linked Wheel" in tooltip (graceful degradation)
- [ ] Verify no console errors

### Empty Wheel List
- [ ] Create a brand new wheel (only wheel in account)
- [ ] Try to add item with link
- [ ] Verify dropdown shows "No link" only (no other wheels available)

### Long Wheel Titles
- [ ] Create wheel with very long title (>50 characters)
- [ ] Link item to it
- [ ] Verify preview card doesn't break layout
- [ ] Verify tooltip displays correctly

## Test Scenario 10: Performance

### Many Linked Items
- [ ] Create 50+ items, link half of them
- [ ] Verify wheel renders without lag
- [ ] Verify chain link icons don't cause performance issues
- [ ] Check browser console for performance warnings

### Large Wheel List
- [ ] Create 20+ wheels in account
- [ ] Open link dropdown in Add/Edit Item modal
- [ ] Verify dropdown loads quickly
- [ ] Verify scrolling works in dropdown

## Expected Issues (Known Limitations)

### Phase 1 Limitations
- [ ] Dependency link type not yet functional (reserved for Phase 2)
- [ ] No breadcrumb navigation yet (URL parameter present but not used)
- [ ] No visual graph of wheel relationships
- [ ] No backlink display (which wheels link TO current wheel)

### Future Enhancements
- Live status updates from linked wheels (Phase 2)
- Bulk linking operations
- Link templates
- Advanced permission inheritance

## Regression Testing

### Verify Existing Functionality
- [ ] Items without links still work normally
- [ ] Drag and drop still works
- [ ] Undo/redo still works
- [ ] Version history captures linked items correctly
- [ ] Export (PNG/SVG/PDF) includes chain link icons
- [ ] AI Assistant can create linked items (if prompted)

## Browser Testing

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (macOS)
- [ ] Edge

## Mobile Testing (if applicable)

- [ ] Tooltip displays correctly on touch devices
- [ ] Modal link selection works on mobile
- [ ] Chain link icons visible on small screens

---

## Bug Report Template

If you encounter issues, please note:

**Issue Description:**
- What were you trying to do?
- What happened instead?
- What did you expect to happen?

**Steps to Reproduce:**
1. 
2. 
3. 

**Browser & Environment:**
- Browser: [Chrome/Firefox/Safari/Edge]
- OS: [macOS/Windows/Linux]
- Screen size: [Desktop/Tablet/Mobile]

**Console Errors:**
```
[Paste any console errors here]
```

**Database State:**
```sql
-- Run this query and share results:
SELECT id, name, linked_wheel_id, link_type 
FROM items 
WHERE wheel_id = 'YOUR_WHEEL_ID' 
AND linked_wheel_id IS NOT NULL;
```

---

## Success Criteria

✅ All tests pass  
✅ No console errors  
✅ Data persists across reloads  
✅ Performance acceptable with 50+ items  
✅ Both languages work correctly  
✅ Edge cases handled gracefully  

🎉 **Feature ready for production!**
