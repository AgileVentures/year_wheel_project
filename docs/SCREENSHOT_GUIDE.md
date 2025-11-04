# Screenshot Guide for Documentation

**Purpose**: Comprehensive guide for capturing UI screenshots to enhance documentation  
**Created**: November 4, 2025  
**Target files**: Quick Start Guide, Demo Scripts, Feature Guides

---

## General Screenshot Standards

### Technical Requirements
- **Resolution**: 1920x1080 minimum (2560x1440 preferred for retina displays)
- **Browser zoom**: 100% (no browser zoom applied)
- **File format**: PNG for crisp UI elements
- **File naming**: Use descriptive names like `sidebar-disc-view.png`, `drag-resize-cursor.png`
- **Storage location**: `/docs/images/screenshots/`

### Visual Standards
- **Clean demo data**: Use professional example data (avoid "Test 1", "asdf", etc.)
- **Consistent theme**: Use same wheel across multiple screenshots when possible
- **Annotations**: Use red boxes/arrows sparingly, only when absolutely necessary
- **Context**: Show enough UI to orient users, but crop unnecessary elements

---

## Priority 1: Quick Start Guide Screenshots

### Screenshot 1: Dashboard - Create New Wheel
**File**: `01-dashboard-create-wheel.png`  
**Location in guide**: Step 2  
**What to capture**:
- Full dashboard view
- "Create New Wheel" button prominently visible
- 1-2 existing wheels shown (for context)
- Clean, professional look

**Setup**:
- Clean demo account
- 1-2 pre-existing wheels with professional names
- Highlight the "Create New Wheel" button (red box or subtle glow if possible)

---

### Screenshot 2: Sidebar - Inner Rings Section
**File**: `02-sidebar-inner-rings.png`  
**Location in guide**: Step 3  
**What to capture**:
- Left sidebar open on Disc tab
- "Inner Rings" section expanded
- "Ring 1" showing as inline-editable (text input field)
- "+ Add Ring" button visible
- Checkbox for visibility toggle visible

**Setup**:
- New wheel with default "Ring 1"
- Sidebar fully expanded
- No other rings yet (just the default one)
- Zoom 100%

**Critical detail**: Must show that "Ring 1" is clickable/editable text, NOT a pencil icon

---

### Screenshot 3: Sidebar - Activity Groups Section
**File**: `03-sidebar-activity-groups.png`  
**Location in guide**: Step 4  
**What to capture**:
- Sidebar scrolled to "Activity Groups" section
- 3-4 activity groups shown with different colors
- Checkboxes for visibility
- "+ Add Activity Group" button
- Color squares visible next to group names

**Setup**:
- Create 4 activity groups:
  - Q1 (Blue - #3B82F6)
  - Q2 (Green - #10B981)
  - Q3 (Orange - #F97316)
  - Q4 (Red - #EF4444)
- All checked (visible)
- Professional appearance

---

### Screenshot 4: Add Activity Modal
**File**: `04-add-activity-modal.png`  
**Location in guide**: Step 5  
**What to capture**:
- Full "Add Activity" modal dialog
- All form fields visible:
  - Name input
  - Ring dropdown (showing options)
  - Activity Group dropdown
  - Start Date picker
  - End Date picker
  - Description textarea (optional)
- "Add Activity" button at bottom

**Setup**:
- Modal open with example data:
  - Name: "Spring Product Launch"
  - Ring: "Marketing"
  - Activity Group: "Q1"
  - Start: January 15, 2026
  - End: March 31, 2026
- Professional, realistic data

---

### Screenshot 5: Wheel with Single Activity
**File**: `05-wheel-first-activity.png`  
**Location in guide**: Step 5 (after adding)  
**What to capture**:
- Full year wheel
- One activity visible as colored arc
- Month ring visible
- Week ring visible (optional)
- Sidebar can be closed or minimized for cleaner view

**Setup**:
- Newly created activity from previous step
- Centered wheel view
- Clear visual showing the arc spanning January-March
- Blue color (Q1)

---

### Screenshot 6: Wheel with Multiple Activities
**File**: `06-wheel-multiple-activities.png`  
**Location in guide**: Step 6  
**What to capture**:
- Full year wheel with 4-5 activities across different rings
- Multiple colors visible
- Activities of varying lengths (1 month, 3 months, full year)
- Professional layout

**Setup**:
- 2-3 rings visible
- 4-5 activities total:
  - "Spring Product Launch" (Jan-Mar, Blue, Marketing ring)
  - "Summer Campaign" (Jun-Aug, Green, Marketing ring)
  - "Monthly Newsletter" (Jan-Dec, Orange, Marketing ring - spans full year)
  - "Q2 Sales Push" (Apr-Jun, Green, Sales ring)
  - "Annual Review" (Dec, Red, Operations ring)

---

### Screenshot 7: Drag & Drop - Move Cursor
**File**: `07-drag-move-cursor.png`  
**Location in guide**: Step 7  
**What to capture**:
- Mouse cursor hovering in **middle** of activity
- Standard cursor (arrow or hand, depending on browser)
- Activity highlighted or slightly elevated (if UI provides visual feedback)

**Critical**: Must show cursor in CENTER of activity, not on edges

**Setup**:
- Hover over activity
- Capture at exact moment when cursor is in middle
- May need multiple attempts to get perfect screenshot

---

### Screenshot 8: Drag & Drop - Resize Cursor
**File**: `08-drag-resize-cursor.png`  
**Location in guide**: Step 7  
**What to capture**:
- Mouse cursor hovering on **edge** of activity (left or right)
- Resize cursor visible (↔ bidirectional arrow)
- Activity edge clearly visible

**Critical**: Must show the ↔ cursor change that indicates resize mode

**Setup**:
- Hover slowly over right edge of activity
- Wait for cursor to change to resize (↔)
- Capture screenshot
- Annotate with red arrow pointing to cursor if needed

---

### Screenshot 9: Zoom Tab - Quarter Buttons
**File**: `09-zoom-tab-quarters.png`  
**Location in guide**: "What's Next" section  
**What to capture**:
- Sidebar on Zoom tab
- Q1, Q2, Q3, Q4 buttons visible
- Month dropdown visible
- "Full year" option visible
- "Fit" button visible

**Setup**:
- Switch sidebar to Zoom tab
- Show all zoom controls
- Annotate Q1-Q4 buttons with note "Use these for quarterly focus"

---

## Priority 2: Demo Script Screenshots

### Screenshot 10: Presentation Mode - Before/After
**Files**: `10a-presentation-all-rings.png`, `10b-presentation-hidden-rings.png`  
**Location**: 15-min demo, 30-min demo  
**What to capture**:

**10a - All rings visible**:
- Full wheel with 5 rings visible
- All activities showing
- Professional, busy appearance

**10b - Some rings hidden**:
- Same wheel
- 2-3 rings hidden (unchecked)
- Only strategic rings visible (e.g., Marketing, Sales)
- Cleaner, executive-friendly view

**Setup**:
- Create wheel with 5 rings
- Take first screenshot with all visible
- Uncheck 2-3 ring checkboxes
- Take second screenshot
- Show side-by-side in documentation

---

### Screenshot 11: Export Modal
**File**: `11-export-modal.png`  
**Location**: Demo scripts  
**What to capture**:
- Export modal open
- All format options visible (PNG, PDF, SVG, JPG)
- Resolution/quality options if available
- "Export" button

**Setup**:
- Open export dialog
- Show all options clearly
- Professional appearance

---

### Screenshot 12: Version History Modal
**File**: `12-version-history.png`  
**Location**: Version History guide  
**What to capture**:
- Version history modal open
- List of 3-5 versions with timestamps
- "Restore" buttons visible
- Version descriptions

**Setup**:
- Create several versions with descriptive names:
  - "Initial setup - added rings"
  - "Added Q1 activities"
  - "Moved product launch to Q2"
  - "Added Q3-Q4 campaigns"

---

### Screenshot 13: Team Sharing Modal
**File**: `13-team-sharing.png`  
**Location**: Teams guide, Demo scripts  
**What to capture**:
- Team sharing modal
- Email input field
- List of current team members (2-3)
- Roles visible (Owner, Admin, Member)
- "Share" or "Invite" button

**Setup**:
- Open sharing modal
- Show 2-3 existing members with different roles
- Professional email addresses (not personal)

---

### Screenshot 14: Public Share Link
**File**: `14-public-share-link.png`  
**Location**: Sharing guide  
**What to capture**:
- Public sharing toggle (ON state)
- Generated share link visible
- Copy button next to link
- "Anyone with link can view" text

**Setup**:
- Enable public sharing
- Show generated link
- Highlight copy functionality

---

## Priority 3: Advanced Feature Screenshots

### Screenshot 15: AI Assistant Interface
**File**: `15-ai-assistant.png`  
**Location**: AI Assistant guide  
**What to capture**:
- AI Assistant panel/modal open
- Input field with example prompt
- Generated activities visible
- "Apply" or "Add to wheel" button

**Setup**:
- Example prompt: "Create a 12-month content marketing plan with monthly blog posts"
- Show AI-generated result
- Professional, realistic output

---

### Screenshot 16: Calendar Sidebar
**File**: `16-calendar-sidebar.png`  
**Location**: Calendar view guide  
**What to capture**:
- Sidebar on Calendar tab
- List view of activities with dates
- Scrollable list
- Edit buttons visible

**Setup**:
- Switch to Calendar tab
- Show 5-6 activities in list format
- Dates visible
- Professional data

---

### Screenshot 17: Google Calendar Integration
**File**: `17-google-calendar-integration.png`  
**Location**: Google Integrations guide  
**What to capture**:
- Google Calendar connection modal
- OAuth authorization flow (if safe to show)
- Calendar selection dropdown
- Sync options

**Setup**:
- Open integration modal
- Show connection flow
- Blur any sensitive account info

---

### Screenshot 18: Inner Ring Text Editing
**File**: `18-inner-ring-text.png`  
**Location**: Advanced editing guide  
**What to capture**:
- Inner ring segment with editable text
- Text input visible inside ring segment
- Month name visible
- Professional content (goals, themes)

**Setup**:
- Click inner ring segment (e.g., January)
- Show text editing capability
- Example text: "Q1 Goals: Launch, Grow, Optimize"

---

## Screenshot Workflow

### Preparation
1. Create clean demo account
2. Build professional demo wheel with realistic data:
   - Company: "Acme Marketing Team 2026"
   - Rings: Marketing, Sales, Product, Operations
   - Activities: 10-15 realistic campaigns/projects
   - Activity Groups: Q1, Q2, Q3, Q4 with proper colors
3. Clear browser cache/cookies
4. Use incognito/private window for clean UI
5. Close all browser extensions that might appear in screenshots

### Capture Process
1. Set browser to 100% zoom
2. Position window for optimal capture (centered, full screen if needed)
3. Use screenshot tool: macOS Cmd+Shift+4, Windows Snipping Tool, or browser extension
4. Capture each screenshot according to specifications above
5. Save with descriptive filename
6. Review for clarity and professionalism

### Post-Processing (Optional)
- **Crop**: Remove unnecessary browser chrome, OS elements
- **Annotate**: Add red boxes/arrows ONLY where absolutely necessary
- **Compress**: Optimize PNG files (use tools like TinyPNG, ImageOptim)
- **Blur**: Blur any sensitive info (email addresses if not demo accounts)

### Organization
```
/docs/images/
  /screenshots/
    /quickstart/
      01-dashboard-create-wheel.png
      02-sidebar-inner-rings.png
      ...
    /demos/
      10a-presentation-all-rings.png
      10b-presentation-hidden-rings.png
      ...
    /features/
      15-ai-assistant.png
      16-calendar-sidebar.png
      ...
```

---

## Adding Screenshots to Documentation

### Markdown Syntax
```markdown
![Alt text describing screenshot](../images/screenshots/quickstart/01-dashboard-create-wheel.png)
*Caption: Click "Create New Wheel" to start your first annual plan*
```

### Best Practices
- **Alt text**: Describe what's shown for accessibility
- **Caption**: Add context below image (italicized)
- **Placement**: Put screenshot immediately after the step it illustrates
- **Sizing**: Let images display at native size (Markdown default)

### Example Integration in Quick Start Guide

**Before** (text only):
```markdown
## Step 2: Create Your First Wheel

1. Click **"Create New Wheel"** on your dashboard
2. Your wheel is created automatically with:
   - A month ring (Jan-Dec)
   - Default outer rings
   - The current year
```

**After** (with screenshot):
```markdown
## Step 2: Create Your First Wheel

1. Click **"Create New Wheel"** on your dashboard

![Dashboard with Create New Wheel button](../images/screenshots/quickstart/01-dashboard-create-wheel.png)
*Click "Create New Wheel" to instantly generate a new year wheel*

2. Your wheel is created automatically with:
   - A month ring (Jan-Dec)
   - Default outer rings
   - The current year
```

---

## Maintenance Schedule

### When to Update Screenshots
- ✅ **Major UI changes**: Redesigns, new themes, layout changes
- ✅ **Feature updates**: New buttons, controls, options added
- ✅ **Bug fixes**: If screenshots showed incorrect UI state
- ❌ **Minor copy changes**: Small text edits don't require new screenshots
- ❌ **Color tweaks**: Unless drastically different

### Review Cadence
- **Quarterly**: Review all screenshots for accuracy
- **After major releases**: Capture new screenshots for changed features
- **User feedback**: Update if users report confusion due to outdated screenshots

---

## Troubleshooting Common Issues

### Problem: Screenshots look blurry
**Solution**: Capture at 2x resolution (retina display) or increase browser zoom to 150%, then downscale

### Problem: Cursor doesn't show in screenshots
**Solution**: Use video recording tool, capture frame with cursor visible, or use browser extensions that preserve cursor

### Problem: Modal dialogs have dark overlay
**Solution**: Increase exposure in post-processing, or use browser dev tools to remove overlay temporarily

### Problem: Demo data looks unrealistic
**Solution**: Spend 10 minutes creating professional example data before capture session

### Problem: Screenshots are too large (file size)
**Solution**: Use PNG compression tools (TinyPNG, ImageOptim), aim for under 500KB per image

---

## Quick Checklist for Screenshot Session

- [ ] Clean demo account created
- [ ] Professional demo wheel built (realistic data)
- [ ] Browser at 100% zoom
- [ ] Browser extensions disabled
- [ ] Screenshot tool ready
- [ ] File naming convention clear
- [ ] Target resolution set (1920x1080+)
- [ ] List of 18 screenshots printed/open
- [ ] Time blocked (2-3 hours for all screenshots)
- [ ] Backup plan if UI doesn't cooperate

---

**Estimated time**: 2-3 hours for all 18 screenshots (including setup)  
**Priority order**: Quick Start (1-9) → Demo Scripts (10-14) → Advanced (15-18)  
**Next step after capture**: Add screenshots to markdown files using syntax above

**Note**: You may want to do this in batches:
- **Session 1**: Quick Start screenshots (9 images, ~1 hour)
- **Session 2**: Demo script screenshots (5 images, ~45 min)
- **Session 3**: Advanced features (4 images, ~45 min)

---

**Created**: November 4, 2025  
**For questions**: Contact documentation team or reference this guide
