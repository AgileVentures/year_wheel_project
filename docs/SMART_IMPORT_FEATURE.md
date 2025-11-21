# Smart CSV Import Feature

## Overview
The Smart Import feature uses AI (OpenAI GPT-4) to intelligently analyze CSV files and automatically create wheel structures including rings, activity groups, activities, and even detect people for team invitations.

## Architecture

### Components
1. **SmartImportModal.jsx** - React component providing the UI workflow
   - File upload and parsing (using xlsx library)
   - AI analysis progress
   - Review and confirmation interface
   - Person detection and invitation selection

2. **AI Assistant V2 Integration** - Leverages existing infrastructure
   - Uses existing `suggest_plan` functionality for structure analysis
   - Uses existing `apply_suggested_plan` for creation
   - Reuses all ring/group/activity creation logic
   - Maintains consistency with manual AI assistant workflow

### Workflow

#### Stage 1: Upload
- User uploads CSV/XLSX file
- File parsed using `xlsx` library
- Headers and sample rows extracted

#### Stage 2: AI Analysis
- CSV structure sent to AI Assistant V2
- AI analyzes:
  - Column mappings (activity name, dates, categories, etc.)
  - Date format detection
  - Ring suggestions (outer vs inner)
  - Activity group suggestions
  - Activity mappings with dates
  - Person/email detection for team invitations

#### Stage 3: Review
- User reviews AI suggestions:
  - Rings to be created (with type and colors)
  - Activity groups to be created
  - Activities to be imported
  - Detected people with selectable invitations
  - Column mapping explanation

#### Stage 4: Import
- AI Assistant V2 applies the plan using existing tools:
  - `aiCreateRing` - Creates rings in database
  - `aiCreateActivityGroup` - Creates activity groups
  - `aiCreateItem` - Creates activities with proper page distribution
- Team invitations sent separately via `team_invitations` table
- Progress events emitted for UI updates

#### Stage 5: Complete
- Summary displayed with counts
- Data automatically refreshed in editor
- Option to close modal

## Key Features

### Smart Mapping
- **Automatic Column Detection**: Identifies activity names, dates, categories, owners
- **Date Format Flexibility**: Handles multiple date formats (YYYY-MM-DD, DD/MM/YYYY, etc.)
- **Intelligent Ring Assignment**: Suggests outer rings for external events, inner for strategic work
- **Category Grouping**: Creates logical activity groups based on data patterns

### Person Detection
- **Email Pattern Recognition**: Finds email addresses in any column
- **Name Extraction**: Detects person names and associates with emails
- **Context Tracking**: Shows where each person was mentioned
- **Selective Invitation**: User can choose which people to invite

### Reuse Existing Structure
- AI detects existing rings and groups
- Reuses matching structures instead of duplicating
- Only creates new rings/groups when necessary
- Maintains consistency with manual workflow

### Error Handling
- Comprehensive validation at each stage
- Helpful error messages for common issues
- Rollback capability if imports fail
- Warnings for partial successes

## Usage

### From Editor
1. Open a wheel in the editor
2. Click the menu (three dots) in header
3. Select "Smart Import (CSV)" with AI badge
4. Upload your CSV file
5. Review AI suggestions
6. Select people to invite (optional)
7. Click "Importera" to apply changes

### CSV Format Recommendations
For best results, your CSV should have:
- Clear header row with column names
- Activity/task names
- Start dates and end dates
- Categories or groupings
- Optional: Person names, emails, descriptions

Example CSV structure:
```csv
Activity,Start Date,End Date,Category,Owner,Description
Q1 Planning,2025-01-01,2025-03-31,Planning,john@example.com,Quarterly planning session
Marketing Campaign,2025-02-01,2025-02-28,Marketing,sarah@example.com,Valentine's campaign
Team Building,2025-03-15,2025-03-15,HR,hr@example.com,Quarterly team event
```

## Technical Details

### Dependencies
- `xlsx` (v0.18.5) - CSV/Excel parsing
- OpenAI GPT-4o via AI Assistant V2
- Existing AI Assistant V2 infrastructure
- Supabase Edge Functions

### Database Integration
- Uses existing wheel_rings, activity_groups, items tables
- Respects wheel-scoped vs page-scoped data (Migration 015)
- Handles multi-year activities automatically
- Sends team invitations via team_invitations table

### AI Prompt Engineering
The AI receives:
- Current wheel context (title, year, existing structure)
- CSV structure (headers, sample rows, row count)
- Instructions for mapping and suggestion generation
- Guidelines for ring types and activity grouping

The AI returns JSON with:
- Column mappings
- Ring suggestions (with reuse flags)
- Activity group suggestions (with reuse flags)
- Activity mappings with proper dates
- Detected people with emails and context

## Future Enhancements

### Planned Features
- [ ] Description/comment parsing and attachment to activities
- [ ] Support for recurring activities
- [ ] Multi-file batch import
- [ ] Import history and undo
- [ ] Template CSV downloads for different use cases
- [ ] Advanced mapping customization UI
- [ ] Import scheduling (periodic updates from external sources)

### Integration Opportunities
- Google Sheets direct import (leveraging existing sync)
- Microsoft Excel Online integration
- Project management tool imports (Asana, Trello, Jira)
- Calendar exports from external systems

## Troubleshooting

### Common Issues

**"AI kunde inte generera förslag"**
- Check CSV has clear headers and at least 2 rows of data
- Ensure dates are in recognizable formats
- Try simplifying column names

**"Ring med ID ... hittades inte"**
- This indicates a mapping error
- Contact support if issue persists

**"Ingen sida hittades för år ..."**
- AI creates pages automatically for missing years
- Ensure your dates are valid YYYY-MM-DD format

**Invitations not sent**
- Wheel must have an associated team
- Email addresses must be valid
- User must have permission to invite team members

## Performance Notes
- Analysis typically takes 3-5 seconds for files up to 100 rows
- Import speed depends on number of rings/groups/activities
- Large imports (>200 activities) may take 30+ seconds
- Real-time progress updates keep user informed

## Security Considerations
- CSV data is sent to OpenAI for analysis (not stored permanently)
- Email addresses detected are only used for invitations if user confirms
- All database operations respect RLS (Row Level Security) policies
- Rate limiting prevents abuse of AI analysis
