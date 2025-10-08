# Year Wheel POC - AI Coding Agent Instructions

## Project Overview
Year Wheel POC is a React-based circular calendar visualization tool for planning and displaying activities across a year. Built with Vite, it features interactive canvas-based rendering, drag-and-rotate controls, and multi-ring organization of events.

## Core Architecture

### Canvas Rendering Engine
- **Active implementation**: `YearWheelClass.js` (~1500 lines) - handles ALL rendering logic
- **Do NOT modify**: `archive/YearWheelClassRedefined.js` - unused refactoring attempt
- Uses HTML5 Canvas API with `canvas2svg` for SVG export
- Drawing flow: `create()` → `drawRotatingElements()` (months, rings, items) → `drawStaticElements()` (center year/title)

### Data Model (Critical)
```javascript
organizationData = {
  rings: [{ id, name, type: 'inner'|'outer', visible, orientation }],
  activityGroups: [{ id, name, color, visible }], // ⚠️ Legacy: was 'activities'
  labels: [{ id, name, color, visible }],
  items: [{ id, name, startDate, endDate, ringId, activityId, labelId }]
}
```
**Key constraint**: Items MUST link to visible activityGroups to be rendered. Labels are optional.

### Component Hierarchy
```
App.jsx (main state container)
├── Header.jsx (save/load/export controls)
├── OrganizationPanel.jsx (sidebar with 3 views: disc/liste/kalender)
│   ├── AddAktivitetModal.jsx
│   └── EditAktivitetModal.jsx
└── YearWheel.jsx (canvas wrapper + zoom controls)
    ├── YearWheelClass.js (rendering engine)
    └── ItemTooltip.jsx (hover/click details)
```

## Critical Patterns

### ISO Week Numbers
Week generation uses proper ISO 8601 standard (fixed Oct 2025). When modifying date logic:
```javascript
// Correct approach in generateWeeks():
const getISOWeek = (date) => { /* see YearWheelClass.js:44-82 */ }
```
**Never** use simple counters for week numbers.

### Date-to-Angle Conversion
Activities are positioned using proportional month-day angles (360°/12 months):
```javascript
const dateToAngle = (date) => {
  const month = date.getMonth(); // 0-11
  const dayOfMonth = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
  return month * 30 + ((dayOfMonth - 1) / daysInMonth) * 30;
};
```
Located in `drawRotatingElements()` around line 1100. Maintains alignment with month ring.

### Ring Types and Spacing
- **Inner rings**: Between center and month/week rings (fill available space proportionally)
- **Outer rings**: Outside month/week rings (fixed width: `this.size / 23`)
- **Standard gap**: `this.size / 150` used consistently between all ring elements
- Ring name bands: `this.size / 70` width, drawn AFTER items (visible on top)

### Minimum Item Width Enforcement
ALL items get minimum 1-week width (~5.75°) even if shorter duration:
```javascript
const minWeekAngle = (7 / 365) * 360;
if (Math.abs(endAngle - startAngle) < minWeekAngle) {
  const center = (startAngle + endAngle) / 2;
  startAngle = center - minWeekAngle / 2;
  endAngle = center + minWeekAngle / 2;
}
```
See lines ~1183 and ~1364 in YearWheelClass.js.

## Development Workflows

### Running the Project
```bash
yarn dev          # Start dev server (Vite)
yarn build        # Production build
yarn preview      # Preview production build
```
No test runner configured. Manual testing via browser.

### State Persistence
- **localStorage**: `yearWheelData` key stores all wheel state
- **File export**: `.yrw` files (JSON format) with versioning
- Data migration: Handles legacy `activities` → `activityGroups` rename (see App.jsx:66-70)

### Adding New Activity Items
1. Ensure activityGroup exists and is visible
2. Create item with `startDate`/`endDate` (ISO format strings)
3. Link to ring (`ringId`), activityGroup (`activityId`), optional label (`labelId`)
4. YearWheelClass filters by visibility in `drawRotatingElements()` (lines ~1132-1142, ~1304-1314)

### Canvas Redraw Optimization
Hover interactions are throttled using `requestAnimationFrame` flag:
```javascript
if (!this.hoverRedrawPending) {
  this.hoverRedrawPending = true;
  requestAnimationFrame(() => { this.create(); this.hoverRedrawPending = false; });
}
```
See lines 980-987. **Critical**: Don't add frequent redraw calls without throttling.

## Common Pitfalls

### ❌ Gaps Between Ring Sections
Problem: Setting `spacingAngle` > 0 in `addRegularCircleSections()`
Solution: Always use `spacingAngle: 0` for seamless rings (lines 688, 1441, 1458)

### ❌ Items Not Appearing
Checklist:
1. Is parent ring `visible: true`?
2. Is linked activityGroup `visible: true`?
3. Does item's date range overlap with selected year?
4. Check filtering logic at lines 1304-1314 (inner) or 1132-1142 (outer)

### ❌ Text Rendering Issues
- Month names: Use `setCircleSectionTitle()` with character-by-character arc layout (lines 454-531)
- Activity names: Use `setCircleSectionAktivitetTitle()` for vertical perpendicular text (lines 533-604)
- Contrast: Always use `getContrastColor(backgroundColor)` for text (lines 244-256)

### ❌ Clickable Region Misalignment
Store regions during drawing, account for rotation in hit detection:
```javascript
// Store during render (lines ~1238, ~1405):
this.clickableItems.push({ item, startRadius, endRadius, startAngle, endAngle });

// Check clicks with rotation offset (lines 1031-1066):
let angle = Math.atan2(dy, dx) - this.rotationAngle;
```

## File Organization Rules

### Active vs Archived Code
- `src/*.jsx` and `src/YearWheelClass.js` → ACTIVE
- `archive/*` → Do NOT import or modify
- Unused legacy components: `MonthTextarea.jsx`, `RingButton.jsx`, `GeneralInputs.jsx`, `ColorPicker.jsx`, `ActionInputs.jsx`, `RingManager.jsx`, `Ring.jsx` (not imported by App.jsx)

### Swedish Language Convention
UI text uses Swedish (e.g., "Aktivitetsgrupp", "Spara", "Återställ"). Maintain this consistency when adding features. Comments and code can be in English.

## Future Migration Context
Comprehensive Supabase integration planning exists in:
- `SUPABASE_GUIDE.md` - Step-by-step database setup
- `ARCHITECTURE.md` - Complete schema and migration plan
- `PROJECT_SUMMARY.md` - Analysis of current state

When implementing auth or multi-user features, reference these documents for PostgreSQL schema, RLS policies, and React hooks architecture.

## Color Philosophy
- Month ring: Dark grays (`#334155`, `#3B4252`) for readability
- Week ring: Lighter gray (`#94A3B8`) for subtlety
- Activities: Use activityGroup colors, darken 20% on hover (light colors) or lighten 30% (dark colors) via `getHoverColor()` (lines 258-278)
- Ring name bands: White background (`#FFFFFF`) with very dark text (`#0F172A`) for maximum contrast

## Quick References
- Canvas size calculation: `this.size` from props (typically 2000-3000px)
- Center position: `{ x: size/2, y: size/2 }`
- Rotation offset: `this.initAngle = -105°` aligns January to top
- Month indices: 0=January, 11=December (JavaScript Date convention)
