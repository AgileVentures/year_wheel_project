# YearLine Image Mapping Guide

Based on the attached screenshots, save them with these filenames in `public/docs/yearline/images/`:

## Image Mapping

### Screenshot 1: Main Monday.com Timeline View (Light Mode)
**Filename**: `01-timeline-overview.png`
**Shows**: The main YearLine timeline interface with:
- Groups sidebar on the left (Marketing, Development groups)
- Timeline bars showing tasks (Analysis, Q1 Campaign, Content, Development & Testing, Testing new features)
- Month headers (Oct, Nov, Dec, Jan, Feb, Mar, Apr, May)
- Monday Colors theme selector dropdown visible
- Status filter and zoom controls

### Screenshot 2: Color Theme Dropdown
**Filename**: `02-color-themes.png`
**Shows**: The expanded Monday Colors dropdown with theme options:
- Monday Colors (selected)
- Pastel Dreams
- Vibrant Energy
- Modern Minimalist
- Nature Fresh
- Ocean Breeze
- Warm Sunset
- Nordic Cool

Visible timeline in background with Development & Testing and Testing new features bars.

### Screenshot 3: Dark Mode Timeline with Edit Dialog
**Filename**: `03-edit-item.png`
**Shows**: Dark mode interface with edit dialog open:
- Edit Item modal dialog showing:
  - Name field: "Content"
  - Group dropdown: "Development"
  - Assigned To dropdown: "Select team members..."
  - Status dropdown: "Select status"
  - Start Date: 2025-12-16
  - End Date (optional): 2026-06-02
  - Cancel and Save buttons
- Timeline visible in background with groups (Marketing, Development)
- Dark navy background theme

### Screenshot 4: Week View
**Filename**: `04-week-view.png`
**Shows**: Timeline zoomed to week level:
- Week numbers in header (W44, W45, W46, W47, W48, W49, W50, W51, W52, W1, W2, W3, W4, W5, W6)
- Groups sidebar showing status categories:
  - Working on it (2 items: Analysis, Product Launch)
  - Stuck (1 item: Q1 Campaign)
  - No Status (3 items: Analysis, Content, Development & Testing)
  - Done (1 item: Testing new features)
- Timeline bars at week granularity
- Zoom controls showing "Week" view

### Screenshot 5: Status Filter View
**Filename**: `05-status-filter.png`
**Shows**: Light mode with Status filter active:
- Status dropdown open showing "Status" label
- Groups view showing status categories similar to week view
- Timeline across months (Oct through May)
- Various colored task bars grouped by status
- "All Years" and "All Members" filters visible

## Quick Save Instructions

To save the images:

1. Download each attached screenshot
2. Rename according to the mapping above
3. Save to: `/Users/thomasochman/Projects/year_wheel_poc/public/docs/yearline/images/`

Or use this command pattern:
```bash
cd /Users/thomasochman/Projects/year_wheel_poc/public/docs/yearline/images/
# Then drag and drop or copy your images here with the correct names
```

## Verification

After saving, verify with:
```bash
ls -la public/docs/yearline/images/
```

You should see:
- 01-timeline-overview.png
- 02-color-themes.png
- 03-edit-item.png
- 04-week-view.png
- 05-status-filter.png
