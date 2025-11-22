// Smart CSV Import - Leverages existing AI Assistant V2 infrastructure
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

declare const Deno: any;

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import OpenAI from 'https://esm.sh/openai@4.73.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, wheelId, currentPageId, csvStructure, csvData, suggestions, inviteEmails, refinementPrompt, previousSuggestions, allRows } = await req.json()

    if (action === 'analyze') {
      // Analyze CSV structure and generate AI mapping rules + apply to ALL rows
      const result = await analyzeCsvWithAI(csvStructure, allRows, wheelId, currentPageId, supabase, refinementPrompt, previousSuggestions)
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'import') {
      // Execute import using AI Assistant V2 tools
      const result = await executeImport(wheelId, currentPageId, csvData, suggestions, inviteEmails, supabase, user)
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('[smart-csv-import] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Analyze CSV structure using OpenAI and generate mapping rules, then apply to ALL rows
 */
async function analyzeCsvWithAI(csvStructure: any, allRows: any[], wheelId: string, currentPageId: string, supabase: any, refinementPrompt?: string, previousSuggestions?: any) {
  console.log('[analyzeCsvWithAI] Analyzing CSV structure...', {
    totalRows: csvStructure.totalRows,
    sampleRows: csvStructure.sampleRows?.length,
    allRows: allRows?.length,
    isRefinement: !!refinementPrompt
  })
  
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
  
  // Get current wheel context for smarter suggestions
  const { data: wheel } = await supabase
    .from('year_wheels')
    .select('title, year, colors')
    .eq('id', wheelId)
    .single()

  const { data: page } = await supabase
    .from('wheel_pages')
    .select('year, title')
    .eq('id', currentPageId)
    .single()

  const { data: existingRings } = await supabase
    .from('wheel_rings')
    .select('name, type')
    .eq('wheel_id', wheelId)

  const { data: existingGroups } = await supabase
    .from('activity_groups')
    .select('name, color')
    .eq('wheel_id', wheelId)

  const systemPrompt = `You are a smart data transformation assistant that helps users visualize raw data in a YearWheel - a circular, annual planning visualization.

${refinementPrompt ? `USER REFINEMENT REQUEST: "${refinementPrompt}"

Adjust the previous suggestions based on this request while maintaining data integrity.` : ''}

## WHAT IS A YEARWHEEL?

A YearWheel is a circular calendar visualization where:
- The **center** shows the year (e.g., 2025)
- **Concentric rings** radiate outward, each representing a category or organizational dimension
- **Activities (items)** are placed on rings as colored arcs spanning dates
- **Activity Groups** provide color-coding for different types of activities
- **Pages** represent different years (multi-year projects)

### STRUCTURE COMPONENTS:

**1. RINGS** (concentric circles):
- **Outer rings**: Deadlines, milestones, external dependencies (type: "outer")
- **Inner rings**: Ongoing projects, team-specific work (type: "inner")
- **Keep it simple**: 2-4 rings maximum
- Examples: "Client Projects", "Internal Tasks", "Milestones"

**2. ACTIVITY GROUPS** (color categories):
- Provide color-coding for activities
- Can have many groups (5-15 is fine)
- Examples: Different clients, project types, departments, task categories
- Each group has a unique color

**3. ITEMS (activities)**:
- Placed on a specific ring
- Assigned to an activity group (for color)
- Have start and end dates (span time on the wheel)
- Can have a **description** (additional notes/details)
- Can be tagged with **labels** (e.g., person responsible, status)
- Examples: "Q1 Review Meeting", "Project Alpha Delivery", "Annual Report"

**4. LABELS** (optional tags):
- Used to tag activities with additional context
- Common use: Person responsible, team member, assignee
- Can also be: Status, priority, location, department
- Each label has a unique color
- Examples: "Marie Isidorsson", "Ted Glaumann", "High Priority"

**5. PAGES** (multi-year support):
- Each page represents one year
- Items are distributed to pages based on their start date year
- Enables long-term planning across multiple years

## YOUR TASK:

Analyze this CSV with ${csvStructure.totalRows} rows and generate mapping rules to transform it into a YearWheel structure.

**Context:**
- Target Wheel: "${wheel?.title || 'Unknown'}"
- Target Year: ${page?.year || wheel?.year || 'Unknown'}
- Existing Rings: ${existingRings?.length ? existingRings.map((r: any) => r.name).join(', ') : 'None'}
- Existing Groups: ${existingGroups?.length ? existingGroups.map((g: any) => g.name).join(', ') : 'None'}

**CSV Headers:** ${JSON.stringify(csvStructure.headers)}
**Sample Data (first 20 rows):** ${JSON.stringify(csvStructure.sampleRows)}

## CRITICAL INSTRUCTIONS:

### DATE DETECTION (HIGHEST PRIORITY):
Be VERY careful to detect dates correctly:
- **Excel serial numbers**: 40000-50000 (days since 1900-01-01)
- **ISO format**: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
- **European format**: DD/MM/YYYY or DD-MM-YYYY
- **US format**: MM/DD/YYYY (less common in Swedish data)
- Look for columns named: "Deadline", "Datum", "Date", "StartDate", "Slutdatum", "Start", "End"
- If only ONE date column exists, use it for both start AND end dates
- The "startDate" field in mapping.columns MUST be the EXACT column name from the CSV headers

### RING ASSIGNMENT (2-4 RINGS MAX):
- Analyze the PRIMARY organizational dimension in the data
- Don't create a ring per unique value (e.g., don't make 50 rings for 50 clients)
- Instead, create 2-4 CATEGORY-based rings
- Example: If CSV has "Företagsform" (company type), create rings like:
  * "Aktiebolag/Ekonomisk förening" (outer)
  * "Enskild firma" (inner)
  * "Ideell förening/Stiftelse" (inner)

### ACTIVITY GROUP ASSIGNMENT:
- CAN have many groups (5-15 is fine)
- Map to columns with categorical data
- Extract unique values from the chosen column
- Assign distinct colors to each group

### LABEL DETECTION:
- Look for person names, assignees, or status values
- Common column names: Responsible, Assignee, Handler, Owner, Ansvarig, Handläggare, Klientansvarig
- Also check: Status, Priority, Department, Team, Medlem
- Create one label per unique value found
- Labels enable filtering and visual categorization
- Format: { id: "label-1", name: "Person Name", color: "#hexcode", visible: true }

### DESCRIPTION FIELD:
- Combine ALL unused columns into the description field
- Any column NOT used for: activityName, startDate, endDate, ring, group, or labels
- Format: "Column Name: Value | Another Column: Value"
- This ensures no data is wasted
- If a dedicated description/comments column exists, prioritize it but still append unused data

### RESPONSE SCHEMA:

\`\`\`typescript
{
  mapping: {
    columns: {
      activityName: string | null,     // EXACT column name for activity/event name
      startDate: string | null,        // EXACT column name for date (CRITICAL!)
      endDate: string | null,          // EXACT column name or same as startDate
      description: string | null,      // EXACT column name for primary description/notes
      descriptionColumns: string[],    // Additional columns to append to description
      ring: string,                    // Column name OR constant value for ring assignment
      group: string | null,            // EXACT column name for activity grouping
      labels: string[],                // EXACT column names for person/status/tags
      person: string | null,           // Deprecated: use labels array instead
      comments: string | null          // Deprecated: use descriptionColumns array
    },
    dateFormat: string,                // Description of detected date format
    explanation: string,               // Why you chose these mappings
    ringAssignmentLogic: string,      // How you're assigning rings (2-4 max)
    groupAssignmentLogic: string      // How you're assigning groups
  },
  rings: Array<{
    id: string,                        // Format: "ring-1", "ring-2", etc.
    name: string,                      // Swedish name based on data
    type: "outer" | "inner",          // First ring = outer, rest = inner
    color?: string,                    // Hex color (only for outer ring)
    visible: boolean,                  // Always true
    orientation: "vertical" | "horizontal",
    description: string               // Why this ring exists
  }>,
  activityGroups: Array<{
    id: string,                        // Format: "ag-1", "ag-2", etc.
    name: string,                      // Swedish name from data
    color: string,                     // Hex color for this group
    visible: boolean,                  // Always true
    description: string               // Purpose of this category
  }>,
  labels: Array<{
    id: string,                        // Format: "label-1", "label-2", etc.
    name: string,                      // Label text (person name, status, etc.)
    color: string,                     // Hex color for this label
    visible: boolean,                  // Always true
    source: string                     // Which column(s) this label came from
  }>,
  detectedPeople: Array<{
    name: string,                      // Full name
    email: string | null,             // Email if found
    context: string                    // Column where found
  }>
}
\`\`\`

## VALIDATION RULES:
✅ Column names in mapping.columns MUST match CSV headers EXACTLY
✅ At least 1 ring, at least 1 activity group
✅ Maximum 2-4 rings (consolidate if needed)
✅ startDate and endDate fields are CRITICAL - don't guess, use exact column names
✅ Respond with ONLY valid JSON, no markdown or extra text

Analyze the data and respond with the complete JSON structure.`

  let userPrompt = refinementPrompt 
    ? `Previous suggestions: ${JSON.stringify(previousSuggestions, null, 2)}\n\nREFINEMENT REQUEST: ${refinementPrompt}\n\nGenerate updated mapping rules based on the refinement request.`
    : `Analyze this CSV structure and generate mapping rules that will be applied to ALL ${csvStructure.totalRows} rows server-side.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2, // Low for consistent mapping rules
    response_format: { type: 'json_object' }
  })

  const responseText = completion.choices[0].message.content || '{}'
  console.log('[analyzeCsvWithAI] OpenAI response length:', responseText.length)
  
  const mapping = JSON.parse(responseText)
  
  // CRITICAL DEBUG: Log what AI detected for mapping
  console.log('[analyzeCsvWithAI] AI detected mapping:', {
    activityName: mapping.mapping?.columns?.activityName,
    startDate: mapping.mapping?.columns?.startDate,
    endDate: mapping.mapping?.columns?.endDate,
    ring: mapping.mapping?.columns?.ring,
    group: mapping.mapping?.columns?.group,
    dateFormat: mapping.mapping?.dateFormat,
    ringsCount: mapping.rings?.length,
    groupsCount: mapping.activityGroups?.length
  })
  
  // FALLBACK: If AI didn't detect date column, try common Swedish column names
  if (!mapping.mapping?.columns?.startDate) {
    console.log('[analyzeCsvWithAI] AI did not detect date column, checking fallbacks...')
    console.log('[analyzeCsvWithAI] Available headers:', csvStructure.headers)
    console.log('[analyzeCsvWithAI] First row sample:', csvStructure.sampleRows[0])
    
    const dateColumnCandidates = ['Deadline', 'deadline', 'Datum', 'datum', 'Date', 'date', 'StartDate', 'Start', 'Startdatum', 'Slutdatum', 'End', 'EndDate']
    for (const candidate of dateColumnCandidates) {
      if (csvStructure.headers.includes(candidate)) {
        console.log('[analyzeCsvWithAI] Found date column fallback:', candidate)
        mapping.mapping.columns.startDate = candidate
        mapping.mapping.columns.endDate = candidate
        mapping.mapping.dateFormat = 'auto-detect'
        break
      }
    }
    
    // If still not found, try to detect by looking at data patterns
    if (!mapping.mapping.columns.startDate && csvStructure.sampleRows.length > 0) {
      console.log('[analyzeCsvWithAI] Trying to detect date column by data pattern...')
      const firstRow = csvStructure.sampleRows[0]
      for (let i = 0; i < csvStructure.headers.length; i++) {
        const value = firstRow[i]
        // Check if value looks like a date (contains -, /, or is a number in Excel date range)
        if (value && (
          (typeof value === 'string' && (/\d{4}-\d{2}-\d{2}/.test(value) || /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(value))) ||
          (typeof value === 'number' && value > 40000 && value < 50000)
        )) {
          const columnName = csvStructure.headers[i]
          console.log('[analyzeCsvWithAI] Detected date column by pattern:', columnName, 'sample value:', value)
          mapping.mapping.columns.startDate = columnName
          mapping.mapping.columns.endDate = columnName
          mapping.mapping.dateFormat = 'auto-detect'
          break
        }
      }
    }
  }
  
  console.log('[analyzeCsvWithAI] Final date mapping:', {
    startDate: mapping.mapping?.columns?.startDate,
    endDate: mapping.mapping?.columns?.endDate,
    dateFormat: mapping.mapping?.dateFormat
  })
  
  // Step 2: Apply mapping rules to ALL rows server-side
  console.log('[analyzeCsvWithAI] Applying mapping rules to', allRows.length, 'rows...')
  
  // Track all unique label values across rows
  const labelValuesMap = new Map<string, Set<string>>() // columnName -> Set of unique values
  const usedColumnNames = new Set([
    mapping.mapping.columns.activityName,
    mapping.mapping.columns.startDate,
    mapping.mapping.columns.endDate,
    mapping.mapping.columns.ring,
    mapping.mapping.columns.group,
    mapping.mapping.columns.description,
    ...(mapping.mapping.columns.labels || [])
  ].filter(Boolean))
  
  const activities = allRows.map((row, index) => {
    try {
      // Extract values based on mapping rules
      const activityName = mapping.mapping.columns.activityName 
        ? row[csvStructure.headers.indexOf(mapping.mapping.columns.activityName)]
        : `Aktivitet ${index + 1}`
      
      const startDateColIndex = mapping.mapping.columns.startDate 
        ? csvStructure.headers.indexOf(mapping.mapping.columns.startDate)
        : -1
      
      const endDateColIndex = mapping.mapping.columns.endDate
        ? csvStructure.headers.indexOf(mapping.mapping.columns.endDate)
        : startDateColIndex
      
      const startDateRaw = startDateColIndex >= 0 ? row[startDateColIndex] : null
      const endDateRaw = endDateColIndex >= 0 ? row[endDateColIndex] : startDateRaw
      
      // DEBUG: Log if column not found
      if (index === 0) {
        console.log('[analyzeCsvWithAI] First row column indices:', {
          activityName: mapping.mapping.columns.activityName,
          startDateCol: mapping.mapping.columns.startDate,
          startDateColIndex,
          endDateCol: mapping.mapping.columns.endDate,
          endDateColIndex,
          headers: csvStructure.headers,
          firstRowData: row
        })
      }
      
      // Convert dates based on detected format
      const startDate = convertDate(startDateRaw, mapping.mapping.dateFormat, page?.year)
      const endDate = convertDate(endDateRaw, mapping.mapping.dateFormat, page?.year)
      
      // Debug first few rows to see date conversion
      if (index < 3) {
        console.log('[analyzeCsvWithAI] Row', index, 'date conversion:', {
          startDateRaw,
          endDateRaw,
          dateFormat: mapping.mapping.dateFormat,
          startDate,
          endDate
        })
      }
      
      // Determine ring assignment
      let ringName = mapping.rings[0]?.name || 'Aktiviteter' // Default to first ring
      if (mapping.mapping.columns.ring && typeof mapping.mapping.columns.ring === 'string') {
        const ringColIndex = csvStructure.headers.indexOf(mapping.mapping.columns.ring)
        if (ringColIndex >= 0) {
          ringName = row[ringColIndex] || ringName
        }
      }
      
      // Determine group assignment
      let groupName = mapping.activityGroups[0]?.name || 'Allmänt' // Default to first group
      if (mapping.mapping.columns.group) {
        const groupColIndex = csvStructure.headers.indexOf(mapping.mapping.columns.group)
        if (groupColIndex >= 0) {
          groupName = row[groupColIndex] || groupName
        }
      }
      
      // Extract labels from configured columns
      const itemLabels: string[] = []
      if (mapping.mapping.columns.labels && Array.isArray(mapping.mapping.columns.labels)) {
        mapping.mapping.columns.labels.forEach((labelColumn: string) => {
          const labelColIndex = csvStructure.headers.indexOf(labelColumn)
          if (labelColIndex >= 0) {
            const value = row[labelColIndex]
            if (value && String(value).trim()) {
              const labelValue = String(value).trim()
              itemLabels.push(labelValue)
              
              // Track unique values for this label column
              if (!labelValuesMap.has(labelColumn)) {
                labelValuesMap.set(labelColumn, new Set())
              }
              labelValuesMap.get(labelColumn)!.add(labelValue)
            }
          }
        })
      }
      
      // Build description from primary description + unused columns
      let descriptionParts: string[] = []
      
      // Add primary description if exists
      if (mapping.mapping.columns.description) {
        const primaryDesc = row[csvStructure.headers.indexOf(mapping.mapping.columns.description)]
        if (primaryDesc && String(primaryDesc).trim()) {
          descriptionParts.push(String(primaryDesc).trim())
        }
      }
      
      // Add additional description columns
      if (mapping.mapping.columns.descriptionColumns && Array.isArray(mapping.mapping.columns.descriptionColumns)) {
        mapping.mapping.columns.descriptionColumns.forEach((colName: string) => {
          const colIndex = csvStructure.headers.indexOf(colName)
          if (colIndex >= 0) {
            const value = row[colIndex]
            if (value && String(value).trim()) {
              descriptionParts.push(`${colName}: ${String(value).trim()}`)
            }
          }
        })
      }
      
      // Append unused columns to description
      csvStructure.headers.forEach((headerName: string, headerIndex: number) => {
        if (!usedColumnNames.has(headerName) && !(mapping.mapping.columns.descriptionColumns || []).includes(headerName)) {
          const value = row[headerIndex]
          if (value && String(value).trim()) {
            descriptionParts.push(`${headerName}: ${String(value).trim()}`)
          }
        }
      })
      
      const finalDescription = descriptionParts.length > 0 ? descriptionParts.join(' | ') : undefined
      
      return {
        name: activityName,
        startDate,
        endDate,
        ring: ringName,
        group: groupName,
        labels: itemLabels,
        description: finalDescription
      }
    } catch (err) {
      console.error('[analyzeCsvWithAI] Error processing row', index, err)
      return {
        name: `Aktivitet ${index + 1}`,
        startDate: `${page?.year}-01-01`,
        endDate: `${page?.year}-01-01`,
        ring: mapping.rings[0]?.name || 'Aktiviteter',
        group: mapping.activityGroups[0]?.name || 'Allmänt',
        labels: []
      }
    }
  })
  
  console.log('[analyzeCsvWithAI] Generated', activities.length, 'activities from', allRows.length, 'rows')
  console.log('[analyzeCsvWithAI] Label values collected:', Array.from(labelValuesMap.entries()).map(([col, vals]) => ({ column: col, count: vals.size })))
  
  // CRITICAL FIX: Extract unique ring and group names from activities
  const uniqueRingNames = new Set<string>()
  const uniqueGroupNames = new Set<string>()
  
  activities.forEach(activity => {
    if (activity.ring) uniqueRingNames.add(activity.ring)
    if (activity.group) uniqueGroupNames.add(activity.group)
  })
  
  console.log('[analyzeCsvWithAI] Unique rings from activities:', Array.from(uniqueRingNames))
  console.log('[analyzeCsvWithAI] Unique groups from activities:', Array.from(uniqueGroupNames))
  
  // INTELLIGENT RING CONSOLIDATION: Limit to 2-4 rings maximum
  let consolidatedRings: Array<{id: string, name: string, type: string, color?: string, visible: boolean, orientation: string}>
  const ringNames = Array.from(uniqueRingNames)
  
  if (ringNames.length <= 4) {
    // Good number of rings, use as-is
    consolidatedRings = ringNames.map((name, i) => ({
      id: `ring-${i + 1}`,
      name,
      type: i === 0 ? 'outer' : 'inner',
      color: i === 0 ? '#F4A896' : undefined,
      visible: true,
      orientation: 'vertical'
    }))
  } else {
    // TOO MANY rings - consolidate into 2 generic rings
    console.warn('[analyzeCsvWithAI] Too many rings detected:', ringNames.length, '- consolidating to 2 rings')
    consolidatedRings = [
      { id: 'ring-1', name: 'Aktiviteter', type: 'outer', color: '#F4A896', visible: true, orientation: 'vertical' },
      { id: 'ring-2', name: 'Projekt', type: 'inner', visible: true, orientation: 'vertical' }
    ]
    
    // Reassign all activities to generic rings (alternate between them for visual distribution)
    activities.forEach((activity, index) => {
      activity.ring = index % 2 === 0 ? 'Aktiviteter' : 'Projekt'
    })
  }
  
  // Generate color palette for groups
  const colorPalette = [
    '#F4A896', '#A8DCD1', '#F5E6D3', '#B8D4E8', 
    '#FFD89B', '#C5B9D6', '#F8C3AF', '#A6E3D7',
    '#FFB6B9', '#C3E5AE', '#FFE5A0', '#B4C7E7',
    '#FFE4E1', '#E0BBE4', '#FFDAC1', '#B2F7EF'
  ]
  
  // Rebuild activity groups from actual data (groups can be numerous)
  const actualGroups = Array.from(uniqueGroupNames).map((groupName, index) => ({
    id: `ag-${index + 1}`,
    name: groupName,
    color: colorPalette[index % colorPalette.length],
    visible: true
  }))
  
  console.log('[analyzeCsvWithAI] Final structure:', consolidatedRings.length, 'rings and', actualGroups.length, 'groups')
  
  // Generate labels from collected label values
  const labelColorPalette = [
    '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', 
    '#3B82F6', '#EF4444', '#14B8A6', '#F97316',
    '#8B5CF6', '#EC4899', '#FBBF24', '#34D399'
  ]
  
  const allLabels: Array<{id: string, name: string, color: string, visible: boolean}> = []
  let labelIndex = 0
  
  // Create labels from each label column's unique values
  labelValuesMap.forEach((values, columnName) => {
    Array.from(values).forEach(labelName => {
      allLabels.push({
        id: `label-${labelIndex + 1}`,
        name: labelName,
        color: labelColorPalette[labelIndex % labelColorPalette.length],
        visible: true
      })
      labelIndex++
    })
  })
  
  console.log('[analyzeCsvWithAI] Generated', allLabels.length, 'labels from', labelValuesMap.size, 'label columns')
  
  const suggestions = {
    mapping: mapping.mapping,
    rings: consolidatedRings, // Use consolidated rings
    activityGroups: actualGroups, // Use data-derived groups
    labels: allLabels, // Use extracted labels
    activities, // All activities generated server-side
    detectedPeople: mapping.detectedPeople || []
  }
  
  return {
    success: true,
    suggestions,
    message: `AI har analyserat ${csvStructure.totalRows} rader och genererat ${activities.length} aktiviteter`
  }
}

/**
 * Convert date from various formats to YYYY-MM-DD with intelligent year adjustment
 */
function convertDate(dateValue: any, format: string, defaultYear: number): string {
  if (!dateValue) {
    return `${defaultYear}-01-01`
  }
  
  let parsedDate: Date | null = null
  
  // Already in YYYY-MM-DD format
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    parsedDate = new Date(dateValue)
  }
  
  // Excel serial date (number between 1 and 60000)
  else if (typeof dateValue === 'number' && dateValue > 1 && dateValue < 60000) {
    // Excel epoch is December 30, 1899
    const excelEpoch = new Date(1899, 11, 30)
    parsedDate = new Date(excelEpoch.getTime() + dateValue * 86400000)
  }
  
  // Try parsing as string
  else if (typeof dateValue === 'string') {
    // ISO 8601 variants: 2024-02-12T00:00:00, 2024-02-12T00:00:00.000Z
    const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      parsedDate = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`)
    }
    
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = dateValue.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/)
    if (ddmmyyyyMatch && !parsedDate) {
      const day = parseInt(ddmmyyyyMatch[1])
      const month = parseInt(ddmmyyyyMatch[2])
      const year = parseInt(ddmmyyyyMatch[3])
      parsedDate = new Date(year, month - 1, day)
    }
    
    // Try JavaScript Date parser as last resort
    if (!parsedDate) {
      try {
        const parsed = new Date(dateValue)
        if (!isNaN(parsed.getTime())) {
          parsedDate = parsed
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  // Validate and adjust year if needed
  if (parsedDate && !isNaN(parsedDate.getTime())) {
    let year = parsedDate.getFullYear()
    const month = parsedDate.getMonth() + 1
    const day = parsedDate.getDate()
    
    // YEAR VALIDATION
    // Only adjust if year is clearly wrong (before 2000 or more than 10 years in future)
    const currentYear = new Date().getFullYear()
    if (year < 2000) {
      console.warn(`[convertDate] Year ${year} is before 2000 for date ${dateValue}, adjusting to ${defaultYear}`)
      year = defaultYear
    } else if (year > currentYear + 10) {
      console.warn(`[convertDate] Year ${year} is more than 10 years in future for date ${dateValue}, adjusting to ${defaultYear}`)
      year = defaultYear
    }
    // OTHERWISE: Keep the original year (support multi-year imports!)
    
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return `${year}-${monthStr}-${dayStr}`
  }
  
  // Fallback
  console.warn('[convertDate] Could not parse date:', dateValue, 'format:', format)
  return `${defaultYear}-01-01`
}

/**
 * Execute import using direct Supabase operations (no AI Assistant needed)
 */
async function executeImport(
  wheelId: string,
  currentPageId: string,
  csvData: any,
  suggestions: any,
  inviteEmails: string[],
  supabase: any,
  user: any
) {
  console.log('[executeImport] Starting direct database import...')
  console.log('[executeImport] Suggestions counts:', {
    rings: suggestions.rings?.length || 0,
    activityGroups: suggestions.activityGroups?.length || 0,
    activities: suggestions.activities?.length || 0
  })
  
  const results = {
    success: true,
    created: {
      rings: 0,
      groups: 0,
      activities: 0,
      invitations: 0
    },
    errors: [] as string[],
    warnings: [] as string[]
  }

  try {
    // Step 1: Check which rings already exist
    const { data: existingRings } = await supabase
      .from('wheel_rings')
      .select('id, name, type')
      .eq('wheel_id', wheelId)
    
    const existingRingMap = new Map((existingRings || []).map((r: any) => [r.name.toLowerCase(), r]))
    
    // Create new rings (only those that don't exist)
    const ringsToCreate = suggestions.rings.filter((r: any) => 
      !existingRingMap.has(r.name.toLowerCase())
    )
    
    const ringNameToIdMap = new Map()
    
    if (ringsToCreate.length > 0) {
      console.log('[executeImport] Creating', ringsToCreate.length, 'new rings...')
      
      const ringInserts = ringsToCreate.map((ring: any) => ({
        wheel_id: wheelId,
        name: ring.name,
        type: ring.type,
        color: ring.color || null,
        visible: true,
        ring_order: 0
      }))
      
      const { data: createdRings, error: ringError } = await supabase
        .from('wheel_rings')
        .insert(ringInserts)
        .select()
      
      if (ringError) {
        console.error('[executeImport] Ring creation error:', ringError)
        results.errors.push(`Kunde inte skapa ringar: ${ringError.message}`)
      } else {
        results.created.rings = createdRings?.length || 0
        createdRings?.forEach((r: any) => ringNameToIdMap.set(r.name, r.id))
      }
    }
    
    // Map existing rings
    existingRings?.forEach((r: any) => ringNameToIdMap.set(r.name, r.id))
    
    // Step 2: Check which activity groups already exist
    const { data: existingGroups } = await supabase
      .from('activity_groups')
      .select('id, name')
      .eq('wheel_id', wheelId)
    
    const existingGroupMap = new Map((existingGroups || []).map((g: any) => [g.name.toLowerCase(), g]))
    
    // Create new activity groups (only those that don't exist)
    const groupsToCreate = suggestions.activityGroups.filter((g: any) => 
      !existingGroupMap.has(g.name.toLowerCase())
    )
    
    const groupNameToIdMap = new Map()
    
    if (groupsToCreate.length > 0) {
      console.log('[executeImport] Creating', groupsToCreate.length, 'new activity groups...')
      
      const groupInserts = groupsToCreate.map((group: any) => ({
        wheel_id: wheelId,
        name: group.name,
        color: group.color,
        visible: true
      }))
      
      const { data: createdGroups, error: groupError } = await supabase
        .from('activity_groups')
        .insert(groupInserts)
        .select()
      
      if (groupError) {
        console.error('[executeImport] Group creation error:', groupError)
        results.errors.push(`Kunde inte skapa aktivitetsgrupper: ${groupError.message}`)
      } else {
        results.created.groups = createdGroups?.length || 0
        createdGroups?.forEach((g: any) => groupNameToIdMap.set(g.name, g.id))
      }
    }
    
    // Map existing groups
    existingGroups?.forEach((g: any) => groupNameToIdMap.set(g.name, g.id))
    
    // Step 3: Batch insert ALL activities
    console.log('[executeImport] Preparing to insert', suggestions.activities.length, 'activities...')
    
    const itemInserts = suggestions.activities
      .map((activity: any) => {
        const ringId = ringNameToIdMap.get(activity.ring)
        const activityId = groupNameToIdMap.get(activity.group)
        
        if (!ringId || !activityId) {
          console.warn('[executeImport] Missing ring or group for activity:', activity.name)
          return null
        }
        
        return {
          wheel_id: wheelId,
          page_id: currentPageId,
          ring_id: ringId,
          activity_id: activityId,
          name: activity.name,
          start_date: activity.startDate,
          end_date: activity.endDate,
          description: activity.description || null,
          source: 'manual'
        }
      })
      .filter(Boolean) // Remove nulls
    
    if (itemInserts.length > 0) {
      console.log('[executeImport] Batch inserting', itemInserts.length, 'items...')
      
      // Supabase has a limit on batch size, so chunk if needed
      const BATCH_SIZE = 500
      let totalInserted = 0
      
      for (let i = 0; i < itemInserts.length; i += BATCH_SIZE) {
        const batch = itemInserts.slice(i, i + BATCH_SIZE)
        
        const { data: insertedItems, error: itemError } = await supabase
          .from('items')
          .insert(batch)
          .select('id')
        
        if (itemError) {
          console.error('[executeImport] Item batch insert error:', itemError)
          results.errors.push(`Fel vid import av aktiviteter (batch ${Math.floor(i/BATCH_SIZE) + 1}): ${itemError.message}`)
        } else {
          totalInserted += insertedItems?.length || 0
        }
      }
      
      results.created.activities = totalInserted
      console.log('[executeImport] Successfully inserted', totalInserted, 'activities')
    }

    // Step 4: Handle team invitations if any people selected
    if (inviteEmails && inviteEmails.length > 0) {
      console.log('[executeImport] Sending team invitations...')
      
      // Get the wheel's team_id
      const { data: wheel } = await supabase
        .from('year_wheels')
        .select('team_id')
        .eq('id', wheelId)
        .single()

      if (wheel?.team_id) {
        for (const email of inviteEmails) {
          try {
            const { error: inviteError } = await supabase
              .from('team_invitations')
              .insert({
                team_id: wheel.team_id,
                email: email.toLowerCase().trim(),
                invited_by: user.id
              })

            if (inviteError) {
              // Check if already invited
              if (inviteError.code === '23505') {
                results.warnings.push(`${email} har redan en väntande inbjudan`)
              } else {
                results.warnings.push(`Kunde inte bjuda in ${email}: ${inviteError.message}`)
              }
            } else {
              results.created.invitations++
              console.log(`[executeImport] Sent invitation to ${email}`)
            }
          } catch (err) {
            console.error('[executeImport] Invitation error:', err)
            results.warnings.push(`Fel vid inbjudan till ${email}`)
          }
        }
      } else {
        results.warnings.push('Hjulet har inget team - inbjudningar kunde inte skickas')
      }
    }

    console.log('[executeImport] Import complete:', results)

  } catch (error) {
    console.error('[executeImport] Critical error:', error)
    results.success = false
    const errorMessage = error instanceof Error ? error.message : 'Okänt fel vid import'
    results.errors.push(errorMessage)
  }

  return {
    success: results.success,
    results,
    message: results.success 
      ? `Import klar! Skapade ${results.created.rings} ringar, ${results.created.groups} grupper, ${results.created.activities} aktiviteter${results.created.invitations > 0 ? `, och skickade ${results.created.invitations} inbjudningar` : ''}`
      : 'Import misslyckades. Se fel nedan.'
  }
}
