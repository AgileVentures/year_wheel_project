# How to Export WheelVisualization as SVG for Canva

This guide explains how to export the WheelVisualization component as an SVG file that can be used in Canva for marketing materials.

## Overview

The WheelVisualization component can be rendered in three variants:
- `full` - Complete 360° wheel
- `half` - Upper semicircle (180°)
- `quarter` - Quarter circle (90°)

## Step-by-Step Process

### 1. Configure the Component

Open the file where you want to render the wheel visualization (e.g., `PhilosophySection.jsx`) and set the desired variant:

```jsx
<WheelVisualization variant="half" className="max-w-3xl mx-auto" />
```

**Available variants:**
- `variant="full"` - Complete wheel (best for detailed views)
- `variant="half"` - Half wheel (good for hero sections)
- `variant="quarter"` - Quarter wheel (minimal space usage)

### 2. Render in Browser

1. Start the development server:
   ```bash
   yarn dev
   ```

2. Navigate to the page containing the WheelVisualization component
   - For Philosophy section: Go to landing page and scroll to the philosophy section
   - For other sections: Navigate to the appropriate page

### 3. Extract SVG Code

1. **Open Browser Developer Tools**
   - Right-click on the wheel visualization
   - Select "Inspect Element" or press `F12`

2. **Locate the SVG Element**
   - In the Elements/Inspector tab, find the `<svg>` element
   - The SVG will be nested within the WheelVisualization component
   - Look for `<svg width="..." height="..." viewBox="...">...</svg>`

3. **Copy the SVG Code**
   - Right-click on the `<svg>` element in the inspector
   - Select "Copy" → "Copy outerHTML"
   - This copies the complete SVG markup including all paths, circles, and text

### 4. Clean and Optimize SVG

1. **Open SVG Editor**
   - Go to [https://editsvgcode.com/](https://editsvgcode.com/)
   - Paste the copied SVG code into the editor

2. **Clean the Code (Optional)**
   - Remove any unnecessary attributes like `class` or `style` if needed
   - Adjust `width`, `height`, or `viewBox` if required
   - The code should be clean and optimized

3. **Download the SVG**
   - Click "Download" to save the cleaned SVG file
   - Save with a descriptive name like `yearwheel-half-philosophy.svg`

### 5. Convert for Canva Compatibility

1. **Open Vector Editor**
   - Go to [https://vectorink.io/app/canvas](https://vectorink.io/app/canvas)
   - This step ensures maximum compatibility with Canva

2. **Import the SVG**
   - Click "Import" or drag and drop your SVG file
   - The wheel should appear in the canvas

3. **Select and Export**
   - Select the entire wheel visualization
   - Click "Export Selection"
   - Choose SVG format for best quality
   - Download the final optimized file

### 6. Use in Canva

1. **Upload to Canva**
   - Log in to [https://canva.com](https://canva.com)
   - Create a new design or open existing project
   - Click "Uploads" in the left sidebar
   - Upload your optimized SVG file

2. **Use in Design**
   - Drag the uploaded wheel into your design
   - Resize, rotate, or style as needed
   - The SVG will maintain crisp quality at any size

## Tips and Best Practices

### For Best Quality
- Use `variant="full"` for detailed marketing materials
- Use `variant="half"` for hero sections or banners
- Use `variant="quarter"` for minimal accent elements

### Color Customization
- The wheel uses the default color scheme defined in the component
- Colors can be modified in Canva after import
- For consistent branding, consider updating the component's default colors

### Size Considerations
- SVGs are scalable, so export at a reasonable size (the component's default)
- Canva will allow you to scale without quality loss
- For print materials, ensure the SVG has sufficient detail

### Troubleshooting

**SVG not appearing correctly:**
- Ensure you copied the complete `<svg>` element including closing tag
- Check that all paths and elements are included
- Try refreshing the browser and re-extracting

**Canva upload issues:**
- Use the vectorink.io step to ensure compatibility
- Try exporting as PNG if SVG has issues (though you'll lose scalability)
- Ensure the SVG file size is reasonable (under 5MB)

**Missing elements:**
- Some dynamic elements might not render in the static SVG
- Ensure the component is fully loaded before extracting
- Check browser console for any JavaScript errors

## File Naming Convention

Use descriptive names for your exported files:
- `yearwheel-full-complete.svg` - Complete wheel
- `yearwheel-half-hero.svg` - Half wheel for hero sections
- `yearwheel-quarter-accent.svg` - Quarter wheel for accents
- `yearwheel-full-marketing-blue.svg` - Full wheel with specific color scheme

## Marketing Use Cases

### Social Media
- **Instagram Posts**: Use `variant="full"` for square posts
- **Facebook Covers**: Use `variant="half"` for banner-style layouts
- **LinkedIn**: Use `variant="quarter"` as accent elements

### Print Materials
- **Brochures**: Full wheel for detailed explanations
- **Business Cards**: Quarter wheel as logo accent
- **Posters**: Half wheel for clean, modern look

### Web Graphics
- **Blog Headers**: Half wheel works well
- **Email Signatures**: Quarter wheel as subtle branding
- **Presentation Slides**: Any variant depending on content

## Version Control

When creating multiple versions:
1. Document the variant and purpose in filename
2. Keep source configurations noted
3. Maintain consistent color schemes across materials
4. Store both SVG and any Canva-exported formats

This process ensures you can create high-quality, scalable graphics from the YearWheel component for any marketing need.

---

# Google Sheets Integration - Custom Column Mapping

## Overview

YearWheel now supports flexible column mapping for Google Sheets integration. Instead of requiring a fixed column order (Name, Start Date, End Date, Notes), users can now map their existing sheet columns to the required fields.

## How Column Mapping Works

### 1. Validate Your Sheet

1. **Open Ring Integration Settings**
   - Click on a ring in the editor
   - Select "Integration Settings" or click the integration icon
   - Choose "Google Sheets" as your data source

2. **Enter Spreadsheet Details**
   - Paste your Google Spreadsheet ID (from the URL)
   - Click "Validate Sheet" to verify access
   - Select the specific sheet/tab you want to sync

### 2. Load Column Headers

1. **Auto-Detect Headers**
   - After validating, click "Load Headers" button
   - System fetches the first row of your sheet as column headers
   - Headers are displayed: e.g., "Found 5 columns: Project Name, Due Date, Completion Date, Priority, Owner"

2. **Auto-Mapping**
   - System automatically detects common column patterns:
     - Name field: "name", "activity", "title", "project"
     - Start Date: "start", "från", "begin", "due"
     - End Date: "end", "till", "slut", "completion"
     - Description: "description", "note", "beskrivning", "notes"

### 3. Configure Column Mapping

The Column Mapping section shows four fields:

**Activity Name** (Required)
- Maps to the item name displayed on the wheel
- Examples: "Project Name", "Task", "Activity Title"

**Start Date** (Required)
- Must contain dates in format: YYYY-MM-DD, DD/MM/YYYY, or similar
- Examples: "Start Date", "From", "Begin Date"

**End Date** (Required)
- Must contain dates in format: YYYY-MM-DD, DD/MM/YYYY, or similar
- Examples: "End Date", "To", "Completion Date"

**Description** (Optional)
- Additional text displayed in item tooltips
- Can be set to "None" if you don't want descriptions
- Examples: "Notes", "Details", "Comments"

### 4. Save and Sync

1. **Review Mapping**
   - Each dropdown shows: "Column A: Project Name", "Column B: Start Date", etc.
   - Verify the mapping matches your sheet structure

2. **Save Configuration**
   - Click "Save" to store the integration with column mapping
   - System automatically triggers the first sync
   - Items appear on your wheel based on their dates

3. **Re-sync Anytime**
   - Click "Sync Now" to fetch latest data from Google Sheets
   - Column mapping is preserved between syncs
   - Existing synced items are replaced with fresh data

## Example Sheet Structures

### Standard Format (Auto-detected)
```
| Activity Name | Start Date | End Date   | Notes           |
|---------------|------------|------------|-----------------|
| Q1 Planning   | 2025-01-01 | 2025-03-31 | Budget review   |
| Product Launch| 2025-04-15 | 2025-05-30 | Marketing push  |
```

### Custom Format (Requires Manual Mapping)
```
| Task ID | Owner    | Due Date   | Completed  | Priority | Task Description |
|---------|----------|------------|------------|----------|------------------|
| T-001   | John     | 2025-02-15 | 2025-02-20 | High     | Client meeting   |
| T-002   | Sarah    | 2025-03-01 | 2025-03-10 | Medium   | Design review    |
```

**Mapping:**
- Activity Name → Column F (Task Description)
- Start Date → Column C (Due Date)
- End Date → Column D (Completed)
- Description → Column E (Priority)

### Project Management Format
```
| Project | Phase      | Timeline Start | Timeline End | Budget | Status    |
|---------|------------|----------------|--------------|--------|-----------|
| Web App | Design     | 2025-01-15     | 2025-02-28   | $50k   | Active    |
| Web App | Development| 2025-03-01     | 2025-06-30   | $120k  | Planned   |
```

**Mapping:**
- Activity Name → Column A (Project) or Column B (Phase)
- Start Date → Column C (Timeline Start)
- End Date → Column D (Timeline End)
- Description → Column F (Status)

## Best Practices

### Sheet Setup
1. **Always have a header row** - First row should contain column names
2. **Use consistent date formats** - ISO format (YYYY-MM-DD) is most reliable
3. **Avoid empty rows** - Sync stops at first completely empty row
4. **Keep it simple** - Maximum 26 columns (A-Z) are supported

### Column Selection
1. **Name column** - Choose the most descriptive text for wheel display
2. **Date columns** - Ensure they contain actual date values, not text
3. **Description** - Optional, can combine multiple columns manually in your sheet
4. **Avoid duplicate mappings** - Each field should map to a different column

### Date Formats Supported
- ISO 8601: `2025-01-15`
- European: `15/01/2025`, `15-01-2025`, `15.01.2025`
- US: `01/15/2025` (less reliable, avoid if possible)
- Swedish: `2025-01-15` (preferred)

### Troubleshooting

**Headers not loading:**
- Check that Google Sheets integration is connected in Profile → Integrations
- Verify the sheet name matches exactly (case-sensitive)
- Ensure first row contains text (not empty cells)

**Items not syncing:**
- Verify all required columns (Name, Start Date, End Date) have values
- Check date format is recognized (see supported formats above)
- Ensure dates fall within your wheel's year range
- Check activity group exists (first one is used by default)

**Wrong data appearing:**
- Review column mapping - indices might be off
- Re-load headers and verify the column names match your sheet
- Check for hidden columns that might shift indices

**Cross-year items:**
- Items spanning multiple years are automatically split
- Each segment appears on the correct year page
- Original date range is preserved in item metadata

## Advanced Features

### Multi-Year Sheets
If your sheet contains items spanning multiple years:
- System automatically detects year boundaries
- Items are split and placed on correct year pages
- Each segment retains reference to original item

### Real-Time Updates
- Changes in Google Sheets require manual sync click
- Automatic sync frequency can be set (future feature)
- Syncing replaces ALL items from that sheet on the ring

### Metadata Preservation
Each synced item stores:
- Original spreadsheet ID and sheet name
- Row index in source sheet
- Complete raw row data
- Column mapping configuration used

This allows debugging and future enhancements like bi-directional sync.

## Migration from Old Format

If you previously used Google Sheets integration (before column mapping):

1. **Existing integrations continue working** - Default mapping is Column A = Name, B = Start, C = End, D = Description
2. **Update to custom mapping**:
   - Open Ring Integration Settings
   - Click "Load Headers" to see your current structure
   - Adjust mapping if your columns are in different order
   - Click "Save" to update configuration
3. **No data loss** - Old sync metadata is preserved

## API Integration (Developers)

The column mapping is stored in `ring_integrations.mapping_config` as JSONB:

```json
{
  "name": 0,
  "startDate": 1,
  "endDate": 2,
  "description": 3
}
```

Indices are 0-based (Column A = 0, Column B = 1, etc.).

Edge function `google-sheets-fetch-headers` provides header extraction:
```typescript
// Request
{ "spreadsheetId": "abc123...", "sheetName": "Sheet1" }

// Response
{ "success": true, "headers": ["Name", "Start", "End", "Notes"], "sheetName": "Sheet1" }
```

Sync function `sync-ring-data` uses `mapping_config` to parse rows with custom column positions.
