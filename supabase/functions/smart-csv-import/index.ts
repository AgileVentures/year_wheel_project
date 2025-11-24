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

    const { action, wheelId, currentPageId, csvStructure, csvData, suggestions, inviteEmails, refinementPrompt, previousSuggestions, allRows, manualMapping, customRings, customGroups } = await req.json()

    if (action === 'analyze') {
      // Analyze CSV structure and generate AI mapping rules + apply to ALL rows
      const result = await analyzeCsvWithAI(csvStructure, allRows, wheelId, currentPageId, supabase, {
        refinementPrompt,
        previousSuggestions,
        manualMapping,
        customRings,
        customGroups
      })
      
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Analyze data suitability for YearWheel visualization
 * Returns warning object if data is unsuitable, null otherwise
 */
function analyzeDataSuitability(
  csvStructure: any,
  allRows: any[],
  mapping: any
): {
  severity: 'error' | 'warning' | 'info',
  title: string,
  message: string,
  suggestions: Array<{
    action: string,
    description: string,
    filterColumn?: string,
    filterStrategy?: string,
    multiWheelStrategy?: boolean,
    isFutureFeature?: boolean
  }>,
  blockImport?: boolean
} | null {
  const totalRows = allRows.length
  const headers = csvStructure.headers
  
  // Parse date columns from first few rows to analyze patterns
  const startDateCol = mapping.mapping?.columns?.startDate
  const endDateCol = mapping.mapping?.columns?.endDate
  
  if (!startDateCol || !endDateCol) {
    return null // Can't analyze without date info
  }
  
  // Sample date ranges from first 10 rows
  const dateRanges = allRows.slice(0, Math.min(10, totalRows)).map((row: any) => {
    const startIdx = headers.indexOf(startDateCol)
    const endIdx = headers.indexOf(endDateCol)
    if (startIdx === -1 || endIdx === -1) return null
    
    const startVal = row[startIdx]
    const endVal = row[endIdx]
    
    // Parse dates (handle various formats)
    let start: Date | null = null
    let end: Date | null = null
    
    if (typeof startVal === 'string' && startVal.includes('-')) {
      start = new Date(startVal.split('-')[0])
      end = new Date(startVal.split('-')[1] || startVal.split('-')[0])
    } else {
      start = new Date(startVal)
      end = new Date(endVal)
    }
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    
    const daysDiff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return { start, end, daysDiff }
  }).filter(Boolean)
  
  // PATTERN 1: Most items span the entire year (300+ days)
  const fullYearItems = dateRanges.filter((r: any) => r.daysDiff > 300).length
  const fullYearRatio = dateRanges.length > 0 ? fullYearItems / dateRanges.length : 0
  
  // PATTERN 2: All items have identical date ranges
  const uniqueDateRanges = new Set(dateRanges.map((r: any) => `${r.start.toISOString()}-${r.end.toISOString()}`))
  const allIdenticalDates = uniqueDateRanges.size === 1 && dateRanges.length > 1
  
  // PATTERN 3: Detect high-cardinality columns that could be used for filtering
  const potentialFilterColumns: Array<{ name: string, uniqueCount: number, category: string }> = []
  
  for (const header of headers) {
    const colIdx = headers.indexOf(header)
    const values = allRows.slice(0, Math.min(100, totalRows)).map((row: any) => row[colIdx])
    const uniqueValues = new Set(values.filter(Boolean))
    
    // Skip if it's already used for structure
    if (header === startDateCol || header === endDateCol || 
        header === mapping.mapping?.columns?.activityName ||
        header === mapping.mapping?.columns?.ring ||
        header === mapping.mapping?.columns?.group) {
      continue
    }
    
    // Look for columns with 5-50 unique values (good for filtering)
    if (uniqueValues.size >= 5 && uniqueValues.size <= 50) {
      // Detect category by column name patterns
      let category = 'other'
      const lowerHeader = header.toLowerCase()
      if (lowerHeader.includes('person') || lowerHeader.includes('ansvarig') || 
          lowerHeader.includes('klient') || lowerHeader.includes('client') ||
          lowerHeader.includes('contact') || lowerHeader.includes('namn') || lowerHeader.includes('name')) {
        category = 'person'
      } else if (lowerHeader.includes('status') || lowerHeader.includes('phase') || 
                 lowerHeader.includes('stage') || lowerHeader.includes('typ') || lowerHeader.includes('type')) {
        category = 'status'
      } else if (lowerHeader.includes('team') || lowerHeader.includes('department') || 
                 lowerHeader.includes('avdelning') || lowerHeader.includes('enhet')) {
        category = 'team'
      }
      
      potentialFilterColumns.push({
        name: header,
        uniqueCount: uniqueValues.size,
        category
      })
    }
  }
  
  // DECISION: Return warning/error if data is unsuitable
  if (fullYearRatio > 0.7 && totalRows > 10) {
    // Most items span full year - poor visualization
    const suggestions = []
    
    // Suggest filtering by detected columns
    if (potentialFilterColumns.length > 0) {
      // Prioritize person/client columns, then team, then status
      const prioritized = [...potentialFilterColumns].sort((a, b) => {
        const priority = { person: 0, team: 1, status: 2, other: 3 }
        return (priority[a.category as keyof typeof priority] || 3) - (priority[b.category as keyof typeof priority] || 3)
      })
      
      for (const col of prioritized.slice(0, 3)) {
        suggestions.push({
          action: `Skapa ett årshjul per ${col.name}`,
          description: `Kolumnen "${col.name}" har ${col.uniqueCount} unika värden. Filtrera datan och skapa ett separat årshjul för varje ${col.category === 'person' ? 'person' : col.category === 'team' ? 'team' : 'kategori'}.`,
          filterColumn: col.name,
          filterStrategy: col.category,
          multiWheelStrategy: true
        })
      }
      
      // Add suggestion to import filtered subset
      suggestions.push({
        action: 'Importera endast ett urval',
        description: `Filtrera CSV-filen utanför YearWheel (t.ex. i Excel) och importera endast de rader som hör till ett specifikt projekt/team/person. Skapa sedan fler årshjul för andra grupper.`,
        filterStrategy: 'manual'
      })
    } else {
      suggestions.push({
        action: 'Dela upp datan manuellt',
        description: 'Filtrera CSV-filen i Excel/Google Sheets och skapa separata filer för olika kategorier innan import'
      })
    }
    
    suggestions.push({
      action: 'Använd länkar mellan årshjul (kommande funktion)',
      description: 'Skapa ett "huvudhjul" med översikt och länka till detaljerade årshjul för varje kategori. Detta håller varje vy enkel men sammankopplad.',
      isFutureFeature: true
    })
    
    // BLOCK import if data is severely unsuitable (>15 full-year items)
    const severity = totalRows > 15 ? 'error' : 'warning'
    
    return {
      severity,
      title: severity === 'error' 
        ? '⛔ Import blockerad: Data passar inte för ett enda årshjul'
        : '⚠️ Varning: Data passar inte bra för ett enda årshjul',
      message: severity === 'error'
        ? `Denna CSV innehåller ${totalRows} rader där ${Math.round(fullYearRatio * 100)}% spänner över hela året. Detta skapar en oläslig visualisering med överlappande staplar.\n\n**YearWheel-principen:** Ett årshjul = ett fokusområde (ett team, en person, ett projekt).\n\nDu behöver dela upp datan INNAN import.`
        : `Denna CSV innehåller ${totalRows} rader där ${Math.round(fullYearRatio * 100)}% spänner över hela året. Detta kan skapa överlappande visualiseringar som är svåra att tyda.\n\n**Rekommendation:** Dela upp datan i flera fokuserade årshjul istället för att importera allt på en gång.`,
      suggestions,
      blockImport: severity === 'error'
    }
  }
  
  if (allIdenticalDates && totalRows > 10) {
    // All items have same dates - no temporal variation
    return {
      severity: 'error',
      title: '⛔ Import blockerad: Ingen tidsvariation i data',
      message: `Alla ${totalRows} rader har identiska start- och slutdatum. YearWheel är till för att visualisera aktiviteter **fördelade över tid** - denna data saknar helt tidsvariation.\n\n**Detta passar inte för YearWheel.** Överväg att använda en tabell, lista eller annan visualisering istället.`,
      suggestions: [
        {
          action: 'Kontrollera datumkolumner',
          description: 'Se till att rätt kolumner är mappade till start- och slutdatum. Kanske finns det andra datumkolumner i CSV:n?'
        },
        {
          action: 'Lägg till riktiga datum i källdata',
          description: 'Om aktiviteterna har olika deadlines/milstones, lägg till dessa i CSV-filen innan import'
        },
        {
          action: 'Använd en annan visualisering',
          description: 'För data utan tidsdimension passar en tabell, Kanban-board eller lista bättre än YearWheel'
        }
      ],
      blockImport: true
    }
  }
  
  return null // Data looks suitable
}

/**
 * Analyze CSV structure using OpenAI and generate mapping rules, then apply to ALL rows
 */
async function analyzeCsvWithAI(
  csvStructure: any,
  allRows: any[],
  wheelId: string,
  currentPageId: string,
  supabase: any,
  options: {
    refinementPrompt?: string,
    previousSuggestions?: any,
    manualMapping?: any,
    customRings?: string[],
    customGroups?: string[]
  } = {}
) {
  const { refinementPrompt, previousSuggestions, manualMapping, customRings, customGroups } = options
  
  console.log('[analyzeCsvWithAI] Analyzing CSV structure...', {
    totalRows: csvStructure.totalRows,
    sampleRows: csvStructure.sampleRows?.length,
    allRows: allRows?.length,
    isRefinement: !!refinementPrompt,
    hasManualMapping: !!manualMapping,
    hasCustomRings: !!customRings,
    hasCustomGroups: !!customGroups
  })
  
  // If manual mapping provided, use it to guide or override AI
  if (manualMapping && Object.values(manualMapping).some(v => v !== null && (Array.isArray(v) ? v.length > 0 : true))) {
    console.log('[analyzeCsvWithAI] Manual mapping provided:', manualMapping)
  }
  
  // If custom rings/groups provided, log them
  if (customRings) {
    console.log('[analyzeCsvWithAI] Custom rings provided:', customRings)
  }
  if (customGroups) {
    console.log('[analyzeCsvWithAI] Custom groups provided:', customGroups)
  }
  
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

  const systemPrompt = `You are a smart data transformation assistant that helps users visualize their project data, deadlines, and activities in a YearWheel.

## YEARWHEEL PURPOSE & USE CASES:

A YearWheel is a **circular annual planning tool** that visualizes an entire year at a glance:
- **Primary value**: See all deadlines, projects, and activities distributed across 12 months (arranged clockwise)
- **Key benefit**: Instantly identify busy periods, gaps, conflicts, and patterns
- **Common users**: Project managers, accounting firms tracking client deadlines, teams coordinating workload

**Typical scenarios**:
- Accounting firm tracking tax deadlines for 50+ clients across multiple service types
- Product team managing feature releases, sprints, and quarterly goals
- Executive team planning board meetings, financial reports, and strategic reviews
- Multi-year initiatives spanning 2024-2026 with dependencies and milestones

**How users interact**:
- Filter by person responsible, project type, or status to focus on relevant activities
- Identify overloaded months vs. quiet periods for resource planning
- Coordinate across teams by seeing who owns what and when

${refinementPrompt ? `USER REFINEMENT REQUEST: "${refinementPrompt}"

Adjust the previous suggestions based on this request while maintaining data integrity.` : ''}

## YEARWHEEL TECHNICAL STRUCTURE:

A YearWheel consists of these components:

**1. RINGS** (2-4 concentric circles - STRICT LIMIT):
- PURPOSE: Organize activities into different tracks or organizational dimensions
- **BOTH ring types can contain activities** - the difference is visual and conceptual
- **PREFER "inner" rings** - they are the primary workspace for most YearWheel use cases
- **"inner" rings** (PREFERRED): Main tracks for activities - strategic initiatives, project phases, team workload, ongoing projects
  * Visual: Between center and month ring (most visible area)
  * Use case: Core work streams, primary planning tracks
  * DEFAULT: First ring should be "inner" type
- **"outer" rings** (SECONDARY): Smaller or external events - holidays, vacations, deadlines, milestones
  * Visual: Outside the month ring (on the perimeter)
  * Use case: Context layers, reference points, external constraints
- CONSTRAINT: Users get overwhelmed with >4 rings - simplicity is critical
- DECISION RULE: If data has 50 clients, DON'T make 50 rings - make 2-4 category-based rings
- TYPE ASSIGNMENT: First ring = "inner", additional rings = "inner" (only use "outer" if explicitly needed for external events)

**2. ACTIVITY GROUPS** (5-30 color categories):
- PURPOSE: Color-code activities for quick visual identification
- VISUAL: Each group has a distinct color, activities inherit that color
- EXAMPLES: Individual client names, project types, departments, task categories
- FLEXIBILITY: Can have many groups (unlike rings) - each gets a unique color
- DECISION RULE: One group per unique categorical value is fine here

**3. ITEMS/ACTIVITIES** (the actual work):
- PURPOSE: Represent actual tasks, deadlines, events, meetings, deliverables
- VISUAL: Colored arcs spanning time on the wheel (start date → end date)
- PLACEMENT: Each item must be on exactly ONE ring and have ONE activity group (for color)
- PROPERTIES:
  * name: Short title (e.g., "Q1 Tax Filing - Client ABC")
  * startDate, endDate: YYYY-MM-DD format (span time on wheel)
  * ringId: Which concentric ring to place it on
  * activityId: Which activity group (determines color)
  * labelIds: Optional tags for filtering (e.g., person responsible)
  * description: Additional context/notes

**4. LABELS** (optional filter tags):
- PURPOSE: Enable filtering - "show only Marie's items" or "show only high priority"
- VISUAL: Each label has a color, used to tag items
- EXAMPLES: Person names ("Marie Isidorsson"), statuses ("In Progress"), priorities ("Critical")
- CARDINALITY: Works best with 2-50 unique values
- DECISION RULE: If a column has 2-50 categorical values useful for filtering, make it labels

**5. PAGES** (multi-year support):
- PURPOSE: Handle projects spanning multiple years (2024, 2025, 2026)
- BEHAVIOR: Items automatically distributed to pages based on their start date year
- SHARING: Rings, activity groups, and labels are shared across all pages (wheel-scoped)

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
Analyze BOTH column names AND data values to detect date columns:
- **Data patterns to recognize**:
  * Date RANGES in single column: "YYYYMMDD-YYYYMMDD" (e.g., "20250101-20251231")
  * Excel serial numbers: 40000-50000 range (days since 1900-01-01)
  * ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  * European format: DD/MM/YYYY or DD-MM-YYYY
  * US format: MM/DD/YYYY
  * Text dates: "January 15, 2024", "15 Jan 2024"
- **Column name hints** (examples only): "Räkenskapsår", "Fiscal Year", "Period", "Deadline", "Datum", "Date", "StartDate", "Slutdatum", "Start", "End", "Due", "Frist", "DueDate"
- **DATE RANGE DETECTION**: If a column contains values like "20240101-20241231", set BOTH startDate AND endDate to that column name, and set dateFormat to "range-YYYYMMDD-YYYYMMDD"
- **Behavior**: Examine first 5 rows of data to confirm date patterns
- If only ONE date column exists (not a range), use it for both start AND end dates
- The "startDate" field in mapping.columns MUST be the EXACT column name from the CSV headers

### RING ASSIGNMENT (INTELLIGENT PATTERN DETECTION):
- **STRICT LIMIT: 2-4 rings maximum**
- Rings represent PRIMARY organizational dimension (tracks, workstreams, categories)
- **ANALYZE DATA PATTERNS** - don't just map column values!
- **Pattern detection strategies**:
  * Look for natural categorical splits in the data (2-4 categories)
  * Detect hierarchies: organizational units, priority levels, project phases
  * Identify temporal patterns: time horizons, quarters, fiscal periods
  * Find semantic groupings: company types, service categories, client segments
- **When column has 2-4 distinct values**: Use them directly as rings
- **When column has 5-20 values**: Group into 2-4 broader categories
  * Example: 10 departments → "Operations", "Support", "Development" (3 rings)
  * Example: 8 project types → "Core", "Innovation", "Maintenance" (3 rings)
- **When column has 20+ values**: Create generic rings OR analyze other columns
  * Example: 50 clients → don't use client names, use "Company Type" column instead
  * Example: No categorical column → create generic rings: "Huvudaktiviteter", "Stödaktiviteter"
- **Custom ring suggestion**:
  * Provide a "suggestedRingStrategy" field explaining your reasoning
  * Offer alternative ring options if multiple dimensions detected

### ACTIVITY GROUP ASSIGNMENT (INTELLIGENT PATTERN DETECTION):
- Activity groups provide COLOR-CODING and FILTERING for activities
- **OPTIMAL: 5-15 groups** (up to 20 acceptable, 20-30 is getting cluttered)
- **ANALYZE THE DATA SEMANTICALLY** - don't just map columns!
- **Pattern detection strategies**:
  * If column has 50+ unique values (e.g., client names): DON'T use as-is
  * Instead, detect patterns: fiscal year cycles, geographic regions, alphabetical ranges, team assignments
  * Example: 50 clients with fiscal years → group by "Calendar Year", "May-April", "Jul-Jun", etc. (4-6 groups)
  * Example: 100 companies → group by first letter "A-E", "F-M", "N-Z" (3 groups)
  * Example: Mixed locations → group by region "North", "South", "Central" (3-5 groups)
- **When to use column values directly**:
  * Column has 5-20 distinct categorical values (project types, departments, statuses)
  * Values are meaningful categories, not individual entities
- **Custom group suggestion**:
  * Provide a "suggestedGroupingStrategy" field explaining your reasoning
  * Offer alternative grouping options if multiple patterns detected

### LABEL DETECTION:
- Analyze the DATA VALUES to identify columns containing:
  * Person names (first name, last name, or full name patterns)
  * Status values (categorical data like "Active", "Pending", "Completed")
  * Roles or assignments (who is responsible, assigned, handling)
  * Teams, departments, or organizational units
- **Column names are HINTS only** - Examples: Responsible, Assignee, Handler, Owner, Ansvarig, Handläggare, Klientansvarig, Status, Priority, Department, Team, Medlem
- If a column contains repeated categorical values (2-50 unique values) that could be used for filtering, consider it as a label source
- Create one label per unique value found
- Labels enable filtering and visual categorization
- Format: { id: "label-1", name: "Person Name", color: "#hexcode", visible: true }

### DESCRIPTION FIELD:
- YOUR TASK: Identify which columns should be used for structure (rings, groups, labels, dates) and which for metadata
- Combine ALL remaining metadata columns into the description field
- Any column NOT used for: activityName, startDate, endDate, ring, group, or labels
- Format: "Column Name: Value | Another Column: Value"
- This ensures no data is wasted
- Priority: If a dedicated description/comments/notes column exists, use it first, then append other unused columns

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
      group: string | null,            // EXACT column name for activity grouping (or null if using pattern-based groups)
      labels: string[],                // EXACT column names for person/status/tags
      person: string | null,           // Deprecated: use labels array instead
      comments: string | null          // Deprecated: use descriptionColumns array
    },
    dateFormat: string,                // Description of detected date format
    explanation: string,               // Why you chose these mappings
    ringAssignmentLogic: string,      // How you're assigning rings (2-4 max)
    groupAssignmentLogic: string,     // How you're assigning groups
    suggestedRingStrategy: string,    // EXPLAIN your ring grouping logic with alternatives
    suggestedGroupingStrategy: string // EXPLAIN your group detection logic with alternatives
  },
  rings: Array<{
    id: string,                        // Format: "ring-1", "ring-2", etc.
    name: string,                      // Swedish name based on data OR pattern-based
    type: "outer" | "inner",          // First ring = outer, rest = inner
    color?: string,                    // Hex color (only for outer ring)
    visible: boolean,                  // Always true
    orientation: "vertical" | "horizontal",
    description: string,              // Why this ring exists
    isCustom: boolean                 // true if AI generated pattern-based rings
  }>,
  activityGroups: Array<{
    id: string,                        // Format: "ag-1", "ag-2", etc.
    name: string,                      // Swedish name from data OR pattern-based
    color: string,                     // Hex color for this group
    visible: boolean,                  // Always true
    description: string,              // Purpose of this category
    isCustom: boolean,                // true if AI detected patterns rather than column values
    pattern?: string                  // If isCustom, explain the pattern (e.g., "fiscal-year-cycle", "alphabetical", "geographic")
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
  }>,
  alternativeStrategies?: {           // OPTIONAL: Offer alternative grouping approaches
    rings?: Array<{
      strategy: string,                // E.g., "by-team", "by-priority", "by-phase"
      description: string,             // Why this might work
      ringNames: string[]              // What the rings would be called
    }>,
    groups?: Array<{
      strategy: string,                // E.g., "by-fiscal-cycle", "alphabetical", "geographic"
      description: string,             // Why this might work
      estimatedGroupCount: number      // How many groups this would create
    }>
  }
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
  
  // MANUAL MAPPING OVERRIDES: Apply user selections over AI suggestions
  if (manualMapping) {
    console.log('[analyzeCsvWithAI] Applying manual mapping overrides...')
    if (manualMapping.activityName) {
      mapping.mapping.columns.activityName = manualMapping.activityName
      console.log('[analyzeCsvWithAI] Override activityName:', manualMapping.activityName)
    }
    if (manualMapping.startDate) {
      mapping.mapping.columns.startDate = manualMapping.startDate
      console.log('[analyzeCsvWithAI] Override startDate:', manualMapping.startDate)
    }
    if (manualMapping.endDate) {
      mapping.mapping.columns.endDate = manualMapping.endDate
      console.log('[analyzeCsvWithAI] Override endDate:', manualMapping.endDate)
    }
    if (manualMapping.description) {
      mapping.mapping.columns.description = manualMapping.description
      console.log('[analyzeCsvWithAI] Override description:', manualMapping.description)
    }
    if (manualMapping.ring) {
      mapping.mapping.columns.ring = manualMapping.ring
      console.log('[analyzeCsvWithAI] Override ring:', manualMapping.ring)
    }
    if (manualMapping.group) {
      mapping.mapping.columns.group = manualMapping.group
      console.log('[analyzeCsvWithAI] Override group:', manualMapping.group)
    }
    if (manualMapping.labels && manualMapping.labels.length > 0) {
      mapping.mapping.columns.labels = manualMapping.labels
      console.log('[analyzeCsvWithAI] Override labels:', manualMapping.labels)
    }
  }
  
  // DATA SUITABILITY ANALYSIS: Detect patterns that make poor YearWheel visualizations
  const suitabilityAnalysis = analyzeDataSuitability(csvStructure, allRows, mapping)
  if (suitabilityAnalysis) {
    mapping.suitabilityWarning = suitabilityAnalysis
    console.log('[analyzeCsvWithAI] Data suitability warning:', suitabilityAnalysis)
  }
  
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
  
  console.log('[analyzeCsvWithAI] AI returned columns mapping:', JSON.stringify(mapping.mapping.columns, null, 2))
  console.log('[analyzeCsvWithAI] descriptionColumns:', mapping.mapping.columns.descriptionColumns)
  
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
          dateFormat: mapping.mapping.dateFormat,
          headers: csvStructure.headers,
          firstRowData: row
        })
      }
      
      // Convert dates based on detected format
      // Handle date ranges in single column (e.g., "20250101-20251231")
      let startDate: string
      let endDate: string
      
      if (mapping.mapping.dateFormat?.startsWith('range-')) {
        // Date range in single column
        const rangeStr = String(startDateRaw || '')
        const rangeParts = rangeStr.split('-')
        
        if (rangeParts.length === 2 && rangeParts[0].length === 8 && rangeParts[1].length === 8) {
          // Format: YYYYMMDD-YYYYMMDD
          const startPart = rangeParts[0]
          const endPart = rangeParts[1]
          startDate = `${startPart.slice(0, 4)}-${startPart.slice(4, 6)}-${startPart.slice(6, 8)}`
          endDate = `${endPart.slice(0, 4)}-${endPart.slice(4, 6)}-${endPart.slice(6, 8)}`
        } else {
          // Fallback if range parsing fails
          startDate = convertDate(startDateRaw, mapping.mapping.dateFormat, page?.year)
          endDate = convertDate(endDateRaw, mapping.mapping.dateFormat, page?.year)
        }
      } else {
        // Separate columns or single date column
        startDate = convertDate(startDateRaw, mapping.mapping.dateFormat, page?.year)
        endDate = convertDate(endDateRaw, mapping.mapping.dateFormat, page?.year)
      }
      
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
      
      if (index === 0) {
        console.log('[analyzeCsvWithAI] Building description for first row')
        console.log('  - Primary description column:', mapping.mapping.columns.description)
        console.log('  - descriptionColumns:', mapping.mapping.columns.descriptionColumns)
        console.log('  - Used columns:', Array.from(usedColumnNames))
        console.log('  - All headers:', csvStructure.headers)
      }
      
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
  
  // PATTERN-BASED GROUPING: Use AI's suggestions if they provided custom groupings
  let consolidatedRings: Array<{id: string, name: string, type: string, color?: string, visible: boolean, orientation: string}>
  let actualGroups: Array<{id: string, name: string, color: string, visible: boolean}>
  
  // Generate color palette
  const colorPalette = [
    '#F4A896', '#A8DCD1', '#F5E6D3', '#B8D4E8', 
    '#FFD89B', '#C5B9D6', '#F8C3AF', '#A6E3D7',
    '#FFB6B9', '#C3E5AE', '#FFE5A0', '#B4C7E7',
    '#FFE4E1', '#E0BBE4', '#FFDAC1', '#B2F7EF'
  ]
  
  // CHECK: Did AI provide custom pattern-based rings/groups?
  const hasCustomRings = mapping.rings?.some((r: any) => r.isCustom)
  const hasCustomGroups = mapping.activityGroups?.some((g: any) => g.isCustom)
  
  if (hasCustomRings) {
    // AI provided intelligent ring grouping - use it directly
    console.log('[analyzeCsvWithAI] Using AI custom ring strategy')
    consolidatedRings = mapping.rings.map((ring: any, i: number) => ({
      id: ring.id || `ring-${i + 1}`,
      name: ring.name,
      type: ring.type || (i === 0 ? 'outer' : 'inner'),
      color: ring.color || (i === 0 ? '#F4A896' : undefined),
      visible: true,
      orientation: ring.orientation || 'vertical'
    }))
    
    // Reassign activities to AI's custom ring logic
    activities.forEach(activity => {
      // AI should have set a ring pattern - find matching ring
      const matchingRing = consolidatedRings.find(r => 
        r.name.toLowerCase() === activity.ring?.toLowerCase()
      )
      if (matchingRing) {
        activity.ring = matchingRing.name
      } else {
        // Fallback to first ring if no match
        activity.ring = consolidatedRings[0].name
      }
    })
  } else {
    // Extract unique ring names from activities (traditional approach)
    const uniqueRingNames = new Set<string>()
    activities.forEach(activity => {
      if (activity.ring) uniqueRingNames.add(activity.ring)
    })
    
    const ringNames = Array.from(uniqueRingNames)
    console.log('[analyzeCsvWithAI] Unique rings from activities:', ringNames)
    
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
  }
  
  if (hasCustomGroups) {
    // AI provided intelligent group patterns - use them directly
    console.log('[analyzeCsvWithAI] Using AI custom group strategy')
    actualGroups = mapping.activityGroups.map((group: any, i: number) => ({
      id: group.id || `ag-${i + 1}`,
      name: group.name,
      color: group.color || colorPalette[i % colorPalette.length],
      visible: true
    }))
    
    // Reassign activities to AI's custom group logic (pattern-based matching)
    activities.forEach(activity => {
      // AI should have applied pattern logic in activity.group already
      const matchingGroup = actualGroups.find(g => 
        g.name.toLowerCase() === activity.group?.toLowerCase()
      )
      if (matchingGroup) {
        activity.group = matchingGroup.name
      } else {
        // Fallback to first group if no match
        activity.group = actualGroups[0].name
      }
    })
  } else {
    // Extract unique group names from activities (traditional approach)
    const uniqueGroupNames = new Set<string>()
    activities.forEach(activity => {
      if (activity.group) uniqueGroupNames.add(activity.group)
    })
    
    console.log('[analyzeCsvWithAI] Unique groups from activities:', Array.from(uniqueGroupNames))
    
    // Rebuild activity groups from actual data (groups can be numerous)
    actualGroups = Array.from(uniqueGroupNames).map((groupName, index) => ({
      id: `ag-${index + 1}`,
      name: groupName,
      color: colorPalette[index % colorPalette.length],
      visible: true
    }))
  }
  
  console.log('[analyzeCsvWithAI] Final structure:', consolidatedRings.length, 'rings and', actualGroups.length, 'groups')
  console.log('[analyzeCsvWithAI] Custom strategies:', {
    rings: hasCustomRings,
    groups: hasCustomGroups,
    suggestedRingStrategy: mapping.mapping?.suggestedRingStrategy,
    suggestedGroupingStrategy: mapping.mapping?.suggestedGroupingStrategy
  })
  
  // CUSTOM RING/GROUP OVERRIDE: If user provided custom names, use them instead
  if (customRings && customRings.length > 0) {
    console.log('[analyzeCsvWithAI] Applying custom ring names:', customRings)
    consolidatedRings = customRings.map((ringName, i) => ({
      id: `ring-${i + 1}`,
      name: ringName,
      type: i === 0 ? 'outer' : 'inner',
      color: i === 0 ? '#F4A896' : undefined,
      visible: true,
      orientation: 'vertical'
    }))
    
    // Distribute activities across custom rings (round-robin)
    activities.forEach((activity, index) => {
      activity.ring = consolidatedRings[index % consolidatedRings.length].name
    })
  }
  
  if (customGroups && customGroups.length > 0) {
    console.log('[analyzeCsvWithAI] Applying custom group names:', customGroups)
    actualGroups = customGroups.map((groupName, i) => ({
      id: `ag-${i + 1}`,
      name: groupName,
      color: colorPalette[i % colorPalette.length],
      visible: true
    }))
    
    // Distribute activities across custom groups (round-robin)
    activities.forEach((activity, index) => {
      activity.group = actualGroups[index % actualGroups.length].name
    })
  }
  
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
