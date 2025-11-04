# Common Demo Script Corrections

**Date**: November 4, 2025  
**Purpose**: Document UI/UX inaccuracies found in demo scripts and how to fix them

---

## Critical Corrections Made

### ❌ WRONG → ✅ CORRECT

## 1. Ring Editing
**❌ WRONG:**
- "Click the pencil (✏️) icon next to 'Ring 1'"
- "Click pencil, rename each ring"

**✅ CORRECT:**
- "Click directly on 'Ring 1' to edit the name"
- "Click the ring name text, type new name, press Enter"

**Why**: There is NO pencil/edit icon. Ring names are inline-editable input fields. Users click directly on the text.

---

## 2. Ring Location
**❌ WRONG:**
- "Open sidebar → Outer Rings section"
- Default rings are in "Outer Rings"

**✅ CORRECT:**
- "Open sidebar → Inner Rings section"
- New wheels start with one default ring in "Inner Rings" called "Ring 1"

**Why**: The default ring is an inner ring (closer to center). Users can add outer rings separately, but they don't exist by default.

---

## 3. Quarter Focus / Ring Names
**❌ WRONG:**
- Suggesting ring names like "Q1, Q2, Q3, Q4" for quarterly focus

**✅ CORRECT:**
- Rings should be named for CATEGORIES (departments, projects, themes)
- Quarter focus is achieved via **Zoom tab → Q1/Q2/Q3/Q4 buttons**

**Why**: Naming rings "Q1, Q2, Q3, Q4" is confusing and wrong. Quarters are a ZOOM feature (temporal focus), not organizational categories. Rings are WHERE activities belong (Marketing, Sales, etc.), not WHEN.

---

## 4. Rotation Control
**❌ WRONG:**
- "Click 'Rotate' button"

**✅ CORRECT:**
- "In Zoom tab, click 'Start Rotation' button"

**Why**: The button text is "Start Rotation" (not just "Rotate"), and it's located in the Zoom tab of the sidebar, not a standalone button in the header.

---

## 5. Zoom Controls Location
**❌ WRONG:**
- "Bottom control panel" or "control panel at bottom"

**✅ CORRECT:**
- "Zoom tab in the left sidebar"

**Why**: Zoom controls (month dropdown, Q1-Q4 buttons, Full year) are in the **Zoom tab** of the left sidebar, not in a bottom control panel.

---

## 6. Drag & Drop Specificity
**❌ WRONG:**
- "Grab activity in middle"
- "Drag right edge to extend"

**✅ CORRECT:**
- "Click and hold in the **middle** of the activity (not edges)"
- "Hover slowly over the **right edge** until cursor changes to ↔, then click and drag"

**Why**: Users need to know the EXACT interaction pattern. Middle = move, edges = resize. Cursor must change to resize arrows before dragging edges.

---

## 7. Ring Visibility Toggle
**❌ WRONG:**
- "Uncheck 2 rings in sidebar" (no context)

**✅ CORRECT:**
- "In the sidebar, find the checkboxes next to each ring name"
- "Click the checkbox next to 'Product' ring → ring disappears from wheel"

**Why**: Users need to know WHERE the checkboxes are (next to ring names in sidebar) and WHAT happens (ring disappears/reappears).

---

## 8. Activity Group Purpose
**❌ SOMEWHAT MISLEADING:**
- "Activity groups are how you color-code activities - by quarter, by type, whatever makes sense"

**✅ MORE ACCURATE:**
- "Activity groups determine the COLOR of activities. Think of them as color-coding categories"
- Explain they can be named Q1/Q2/Q3/Q4 for quarterly COLOR patterns, but clarify this is NOT the same as quarter ZOOM

**Why**: The original phrasing conflates activity groups (color) with quarter zoom (temporal focus). Be explicit about the difference.

---

## 9. Sidebar State
**❌ WRONG:**
- "Close left sidebar initially (more dramatic reveal)"

**✅ CORRECT:**
- "Left sidebar open to Disc view (they need to see the structure)"

**Why**: Users need to see the sidebar to understand the organizational structure. Closing it for "drama" leaves them confused about where controls are.

---

## 10. "Add Item" vs "Add Activity"
**✅ CORRECT TERMINOLOGY:**
- Button says **"+ Add Item"**
- But we talk about "adding an **activity**"
- Modal title says "Add Activity"

**Demo script should**:
- Say: "Click '+ Add Item' to add an activity"
- This matches the UI while using user-friendly language

**Why**: The UI uses "Item" internally but "Activity" is the user-facing term. Scripts should acknowledge both.

---

## UI Element Reference Guide

### Sidebar Tabs (Top of Sidebar)
1. **Disc** (🎯) - Hierarchical view of rings/activities
2. **List** (📋) - Table view of all items
3. **Calendar** (📅) - Traditional month view
4. **Zoom** - Zoom and navigation controls

### Disc Tab Sections (in order)
1. **Title** input field (at top)
2. **Inner Rings** section
   - Checkboxes for visibility
   - Ring names (click to edit)
   - Item count badges
   - "+ Add Ring" button
3. **Outer Rings** section (if any exist)
   - Same controls as inner rings
4. **Activity Groups** section
   - Color swatches
   - Group names
   - "+ Add Activity Group" button
5. **Labels** section (if enabled)

### Zoom Tab Controls
- **Month dropdown** (Full year, January-December)
- **Q1, Q2, Q3, Q4 buttons** (quarter focus)
- **Start Rotation button** (auto-rotate wheel)
- **Zoom slider and +/- buttons** (below wheel visualization, not in sidebar)

### Header Buttons
- **Save** (manual save, though auto-save works)
- **Export** (PNG/SVG/PDF/JPG)
- **Version History** (restore previous versions)
- **Share** (team sharing and public links)
- **Settings** icon (color palette, ring name visibility)

---

## Activity Group Naming Best Practices

### ✅ Good Examples:
**By Quarter (Color Pattern)**:
- Q1, Q2, Q3, Q4
- *Clarify*: "These are COLOR categories that happen to be named after quarters. To ZOOM to a quarter, use the Q1-Q4 buttons in the Zoom tab."

**By Status**:
- Planned, In Progress, Completed, Cancelled

**By Priority**:
- High Priority, Medium Priority, Low Priority

**By Type**:
- Campaigns, Events, Recurring Tasks, Milestones, Administrative

**By Department** (if rings aren't departments):
- Marketing, Sales, Product, Operations

### ❌ Confusing Examples:
**Don't use these without explanation**:
- Q1, Q2, Q3, Q4 *without* explaining these are colors, not zoom
- Department names if rings are ALSO departments
- Generic names like "Group 1", "Group 2" (not helpful)

---

## Drag & Drop Interaction Patterns

### Moving an Activity (Change dates, keep same ring)
1. Hover over activity → tooltip appears
2. Click and hold in **middle** (cursor is normal pointer)
3. Drag around the wheel (clockwise/counterclockwise)
4. Release → dates update automatically

### Resizing an Activity (Change duration)
1. Hover slowly over **left or right edge** of activity
2. Wait for cursor to change to **resize arrows** (↔)
3. Click and hold
4. Drag to make longer or shorter
5. Release → start or end date updates

### Moving Between Rings (Change category)
1. Click and hold in middle of activity
2. Drag **radially** (inward or outward)
3. Release in target ring
4. Activity moves to new ring, keeps same dates

**Critical**: Users must understand the cursor feedback. No cursor change = middle (move). Cursor changes to ↔ = edge (resize).

---

## Common Demo Mistakes to Avoid

### 1. Overusing "Outer Rings"
**Mistake**: Always referring to outer rings when demoing
**Fix**: Most wheels use inner rings primarily. Only mention outer rings if specifically relevant.

### 2. Conflating Activity Groups and Quarters
**Mistake**: "Create Q1, Q2, Q3, Q4 activity groups for quarterly planning"
**Fix**: "Create Q1-Q4 activity groups to COLOR-CODE by quarter. To ZOOM to a quarter, use the Zoom tab buttons."

### 3. Not Showing Where Controls Are
**Mistake**: "Click the rotate button" (where?)
**Fix**: "In the Zoom tab of the sidebar, click 'Start Rotation'"

### 4. Assuming Users See Pencil Icons
**Mistake**: "Click the pencil to edit"
**Fix**: "Click directly on the name to edit it"

### 5. Closing Sidebar Too Early
**Mistake**: Closing sidebar to show wheel better
**Fix**: Keep sidebar open - users need to see where controls are

### 6. Not Explaining Cursor Changes
**Mistake**: "Just drag the edge"
**Fix**: "Hover over the edge until cursor changes to arrows, then drag"

---

## Testing Your Demo Script

Before delivering a demo, verify these checkpoints:

### ✅ Pre-Demo Checklist
- [ ] All button names match actual UI text
- [ ] All tab names are correct (Disc, List, Calendar, Zoom)
- [ ] Ring section names are correct (Inner Rings, Outer Rings)
- [ ] No references to non-existent UI elements (pencil icons, bottom panels)
- [ ] Quarter zoom vs activity group naming is clear
- [ ] Drag & drop instructions specify cursor feedback
- [ ] Checkbox locations are specified (next to ring names)
- [ ] All control locations include TAB name (e.g., "in Zoom tab")

### ✅ During Demo Validation
- [ ] Client can find the button/control you just mentioned
- [ ] Client's screen matches your description
- [ ] No confusion about where to click
- [ ] Client understands difference between rings and activity groups
- [ ] Client knows quarters are zoom controls, not ring categories

---

## Quick Reference: Where Is X?

| Feature | Location | Exact Path |
|---------|----------|------------|
| **Ring editing** | Sidebar | Disc tab → Inner/Outer Rings → Click name directly |
| **Activity groups** | Sidebar | Disc tab → Activity Groups section → + Add Activity Group |
| **Add activity** | Sidebar | Top of sidebar → + Add Item button |
| **Ring visibility** | Sidebar | Disc tab → Checkbox next to each ring name |
| **Quarter zoom** | Sidebar | Zoom tab → Q1/Q2/Q3/Q4 buttons |
| **Month zoom** | Sidebar | Zoom tab → Month dropdown |
| **Rotation** | Sidebar | Zoom tab → Start Rotation button |
| **Export** | Header | Top right → Export button |
| **Share** | Header | Top right → Share button |
| **Zoom slider** | Below wheel | Bottom of canvas area (not in sidebar) |

---

## Version History

**v1.0** - November 4, 2025
- Initial corrections based on Quick Start Guide audit
- Fixed 15-min and 30-min demo scripts
- Documented all common UI inaccuracies

---

**For Questions**: Contact product@yearwheel.com  
**To Report New Issues**: Update this document and notify team
