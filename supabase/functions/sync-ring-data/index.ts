/**
 * Sync Ring Data from Google Calendar or Google Sheets
 * Fetches external data and creates/updates items
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Get Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify JWT token
    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const { ringIntegrationId } = await req.json()

    if (!ringIntegrationId) {
      throw new Error('Missing ringIntegrationId')
    }

    // Get ring integration with related data
    const { data: ringIntegration, error: integrationError } = await supabaseClient
      .from('ring_integrations')
      .select(`
        *,
        ring:wheel_rings(*),
        user_integration:user_integrations(*)
      `)
      .eq('id', ringIntegrationId)
      .single()

    if (integrationError) throw integrationError
    if (!ringIntegration) throw new Error('Integration not found')

    // Check if access token is expired and refresh if needed
    const tokenExpiresAt = new Date(ringIntegration.user_integration.token_expires_at)
    let accessToken = ringIntegration.user_integration.access_token
    
    if (tokenExpiresAt < new Date()) {
      console.log('🔄 Access token expired, refreshing...')
      
      const refreshToken = ringIntegration.user_integration.refresh_token
      if (!refreshToken) {
        throw new Error('No refresh token available - please reconnect your Google account')
      }
      
      // Refresh the access token
      const newTokens = await refreshGoogleToken(refreshToken)
      
      // Update the database with new tokens
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000))
      await supabaseClient
        .from('user_integrations')
        .update({
          access_token: newTokens.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ringIntegration.user_integration.id)
      
      accessToken = newTokens.access_token
      console.log('✅ Token refreshed successfully')
    }

    let syncedItems = []
    let syncError = null

    // Handle different integration types
    if (ringIntegration.integration_type === 'calendar') {
      syncedItems = await syncCalendarData(
        accessToken,
        ringIntegration,
        supabaseClient,
        user.id
      )
    } else if (ringIntegration.integration_type === 'sheet') {
      syncedItems = await syncSheetData(
        accessToken,
        ringIntegration,
        supabaseClient,
        user.id
      )
    } else {
      throw new Error('Unknown integration type')
    }

    // Update last sync status
    await supabaseClient
      .from('ring_integrations')
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
      })
      .eq('id', ringIntegrationId)

    return new Response(
      JSON.stringify({
        success: true,
        itemCount: syncedItems.length,
        items: syncedItems,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error syncing ring data:', error)

    // Try to update error status
    try {
      const { ringIntegrationId } = await req.json()
      if (ringIntegrationId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseClient
          .from('ring_integrations')
          .update({
            last_sync_status: 'error',
            last_sync_error: error.message,
          })
          .eq('id', ringIntegrationId)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/**
 * Get ISO week number for a date
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

/**
 * Get Monday of a given ISO week
 */
function getWeekStart(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOffset = (jan4.getUTCDay() || 7) - 1
  const weekStart = new Date(jan4.getTime() - dayOffset * 86400000)
  weekStart.setUTCDate(weekStart.getUTCDate() + (week - 1) * 7)
  return weekStart
}

/**
 * Create week-aggregated items from calendar events
 * Groups all events within each ISO week into a single item
 */
async function createWeekAggregatedItems(events, pages, ringIntegration, activityGroup, calendarId) {
  // Group events by ISO week and year
  const weekGroups = new Map() // Key: "YYYY-WW", Value: { page, events[], weekStart, weekEnd }

  for (const event of events) {
    if (!event.start || (!event.start.date && !event.start.dateTime)) continue

    const startDate = event.start.date || event.start.dateTime.split('T')[0]
    const date = new Date(startDate)
    const { year, week } = getISOWeek(date)
    
    const key = `${year}-${String(week).padStart(2, '0')}`
    
    if (!weekGroups.has(key)) {
      const page = pages.find(p => p.year === year)
      if (!page) {
        console.warn(`[createWeekAggregatedItems] No page for year ${year}, skipping week ${week}`)
        continue
      }

      const weekStart = getWeekStart(year, week)
      const weekEnd = new Date(weekStart)
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6) // Sunday

      weekGroups.set(key, {
        year,
        week,
        page,
        events: [],
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
      })
    }

    weekGroups.get(key).events.push(event)
  }

  console.log(`[createWeekAggregatedItems] Created ${weekGroups.size} week groups`)

  // Create aggregated items
  const itemsToCreate = []
  
  for (const [key, group] of weekGroups) {
    const eventCount = group.events.length
    const eventNames = group.events.map(e => e.summary || 'Untitled').slice(0, 5) // First 5 names
    
    itemsToCreate.push({
      wheel_id: ringIntegration.ring.wheel_id,
      page_id: group.page.id,
      ring_id: ringIntegration.ring_id,
      activity_id: activityGroup.id,
      name: `Week ${group.week} (${eventCount} event${eventCount > 1 ? 's' : ''})`,
      start_date: group.weekStart,
      end_date: group.weekEnd,
      description: eventNames.join(', ') + (eventCount > 5 ? `, +${eventCount - 5} more` : ''),
      source: 'google_calendar',
      external_id: `week_${key}`,
      sync_metadata: {
        calendar_id: calendarId,
        is_week_aggregation: true,
        event_count: eventCount,
        events: group.events.map(e => ({
          id: e.id,
          summary: e.summary,
          start: e.start.date || e.start.dateTime,
          end: e.end?.date || e.end?.dateTime,
          htmlLink: e.htmlLink,
        })),
      },
    })
  }

  if (itemsToCreate.length === 0) {
    return []
  }

  return itemsToCreate
}

/**
 * Sync data from Google Calendar
 */
async function syncCalendarData(accessToken, ringIntegration, supabaseClient, userId) {
  const calendarId = ringIntegration.config.calendar_id || 'primary'
  const aggregateByWeek = ringIntegration.config.aggregate_by_week !== false // Default true
  
  // Fetch ALL pages for this wheel to create items on correct pages by year
  const { data: pages, error: pagesError } = await supabaseClient
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', ringIntegration.ring.wheel_id)
    .order('year')

  if (pagesError) throw pagesError
  if (!pages || pages.length === 0) {
    throw new Error('No pages found for this wheel')
  }

  console.log('[syncCalendarData] Found pages:', pages.map(p => ({ id: p.id, year: p.year })))
  console.log('[syncCalendarData] Aggregate by week:', aggregateByWeek)

  // Get min/max years from pages to fetch wide date range
  const minYear = pages[0].year
  const maxYear = pages[pages.length - 1].year
  const timeMin = new Date(`${minYear}-01-01T00:00:00Z`).toISOString()
  const timeMax = new Date(`${maxYear}-12-31T23:59:59Z`).toISOString()

  // Fetch events from Google Calendar
  const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events')
  calendarUrl.searchParams.set('timeMin', timeMin)
  calendarUrl.searchParams.set('timeMax', timeMax)
  calendarUrl.searchParams.set('singleEvents', 'true')
  calendarUrl.searchParams.set('orderBy', 'startTime')
  calendarUrl.searchParams.set('maxResults', '2500')

  const response = await fetch(calendarUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Calendar API error:', error)
    throw new Error('Failed to fetch calendar events')
  }

  const data = await response.json()
  const events = data.items || []

  // Get or create default activity group
  const { data: activityGroup } = await supabaseClient
    .from('activity_groups')
    .select('id')
    .eq('wheel_id', ringIntegration.ring.wheel_id)
    .limit(1)
    .single()

  if (!activityGroup) {
    throw new Error('No activity groups found - create one first')
  }

  // Delete existing synced items for this ring
  await supabaseClient
    .from('items')
    .delete()
    .eq('ring_id', ringIntegration.ring_id)
    .eq('source', 'google_calendar')

  // Group events by week if aggregation is enabled
  if (aggregateByWeek) {
    const aggregatedItems = await createWeekAggregatedItems(
      events,
      pages,
      ringIntegration,
      activityGroup,
      calendarId
    )
    
    if (aggregatedItems.length === 0) {
      return []
    }

    // Insert aggregated items
    const { data: createdItems, error: insertError } = await supabaseClient
      .from('items')
      .insert(aggregatedItems)
      .select()

    if (insertError) {
      console.error('Error inserting aggregated items:', insertError)
      throw insertError
    }

    return createdItems || []
  }

  // Create items from events, mapping to correct page based on year (legacy daily mode)
  const itemsToCreate = events
    .filter(event => {
      // Filter out events without dates
      return event.start && (event.start.date || event.start.dateTime)
    })
    .flatMap(event => {
      const startDate = event.start.date || event.start.dateTime.split('T')[0]
      const endDate = event.end ? (event.end.date || event.end.dateTime.split('T')[0]) : startDate
      
      const startYear = new Date(startDate).getFullYear()
      const endYear = new Date(endDate).getFullYear()
      
      // Handle cross-year events by splitting them
      if (startYear !== endYear) {
        console.log(`[syncCalendarData] Cross-year event: ${event.summary} (${startDate} to ${endDate})`)
        
        const segments = []
        for (let year = startYear; year <= endYear; year++) {
          const page = pages.find(p => p.year === year)
          if (!page) {
            console.warn(`[syncCalendarData] No page found for year ${year}, skipping segment`)
            continue
          }
          
          const segmentStart = year === startYear ? startDate : `${year}-01-01`
          const segmentEnd = year === endYear ? endDate : `${year}-12-31`
          
          segments.push({
            wheel_id: ringIntegration.ring.wheel_id,
            page_id: page.id, // CRITICAL: Use page_id matching the year
            ring_id: ringIntegration.ring_id,
            activity_id: activityGroup.id,
            name: event.summary || 'Unnamed Event',
            start_date: segmentStart,
            end_date: segmentEnd,
            source: 'google_calendar',
            external_id: event.id,
            sync_metadata: {
              calendar_id: calendarId,
              event_link: event.htmlLink,
              color_id: event.colorId,
              is_segment: true,
              original_start: startDate,
              original_end: endDate,
            },
          })
        }
        
        return segments
      } else {
        // Single-year event
        const page = pages.find(p => p.year === startYear)
        if (!page) {
          console.warn(`[syncCalendarData] No page found for year ${startYear}, skipping event ${event.summary}`)
          return []
        }
        
        return [{
          wheel_id: ringIntegration.ring.wheel_id,
          page_id: page.id, // CRITICAL: Use page_id matching the year
          ring_id: ringIntegration.ring_id,
          activity_id: activityGroup.id,
          name: event.summary || 'Unnamed Event',
          start_date: startDate,
          end_date: endDate,
          source: 'google_calendar',
          external_id: event.id,
          sync_metadata: {
            calendar_id: calendarId,
            event_link: event.htmlLink,
            color_id: event.colorId,
          },
        }]
      }
    })

  if (itemsToCreate.length === 0) {
    return []
  }

  // Insert items
  const { data: createdItems, error: insertError } = await supabaseClient
    .from('items')
    .insert(itemsToCreate)
    .select()

  if (insertError) {
    console.error('Error inserting items:', insertError)
    throw insertError
  }

  return createdItems || []
}

/**
 * Sync data from Google Sheets
 */
async function syncSheetData(accessToken, ringIntegration, supabaseClient, userId) {
  console.log('[syncSheetData] Ring integration config:', JSON.stringify(ringIntegration.config, null, 2))
  console.log('[syncSheetData] Column mapping:', JSON.stringify(ringIntegration.mapping_config, null, 2))
  
  const spreadsheetId = ringIntegration.config.spreadsheet_id
  const sheetName = ringIntegration.config.sheet_name || 'Sheet1'
  const range = ringIntegration.config.range || 'A:Z' // Wide range to get all columns
  
  // Get column mapping (default to legacy format if not set)
  const columnMapping = ringIntegration.mapping_config || {
    name: 0,
    startDate: 1,
    endDate: 2,
    description: 3
  }

  console.log('[syncSheetData] Using:', { spreadsheetId, sheetName, range, columnMapping })

  if (!spreadsheetId) {
    throw new Error('Missing spreadsheet_id in configuration')
  }

  // Fetch ALL pages for this wheel to create items on correct pages by year
  const { data: pages, error: pagesError } = await supabaseClient
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', ringIntegration.ring.wheel_id)
    .order('year')

  if (pagesError) throw pagesError
  if (!pages || pages.length === 0) {
    throw new Error('No pages found for this wheel')
  }

  console.log('[syncSheetData] Found pages:', pages.map(p => ({ id: p.id, year: p.year })))

  // Determine default year for date parsing (use first page's year)
  const defaultYear = pages[0].year

  // Fetch sheet data
  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}`

  const response = await fetch(sheetsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Sheets API error:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      url: sheetsUrl,
      spreadsheetId,
      sheetName,
      range
    })
    throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText} - ${error}`)
  }

  const data = await response.json()
  const rows = data.values || []

  if (rows.length === 0) {
    return []
  }

  // Skip header row
  const dataRows = rows.slice(1)

  // Get or create default activity group
  const { data: activityGroup } = await supabaseClient
    .from('activity_groups')
    .select('id')
    .eq('wheel_id', ringIntegration.ring.wheel_id)
    .limit(1)
    .single()

  if (!activityGroup) {
    throw new Error('No activity groups found - create one first')
  }

  // Delete existing synced items for this ring
  await supabaseClient
    .from('items')
    .delete()
    .eq('ring_id', ringIntegration.ring_id)
    .eq('source', 'google_sheets')

  // Use column mapping to extract data from rows
  const itemsToCreate = dataRows
    .filter(row => {
      // Must have name and dates in the mapped columns
      const hasName = row[columnMapping.name]
      const hasStartDate = row[columnMapping.startDate]
      const hasEndDate = row[columnMapping.endDate]
      return hasName && hasStartDate && hasEndDate
    })
    .flatMap((row, index) => {
      // Extract values using column mapping
      const name = row[columnMapping.name]
      const startDateRaw = row[columnMapping.startDate]
      const endDateRaw = row[columnMapping.endDate]
      const description = columnMapping.description !== null && columnMapping.description !== undefined
        ? row[columnMapping.description]
        : null
      
      console.log(`[syncSheetData] Row ${index + 2}: name="${name}", start="${startDateRaw}", end="${endDateRaw}", description="${description}", columnMapping:`, columnMapping)
      
      const startDate = parseDate(startDateRaw, defaultYear)
      const endDate = parseDate(endDateRaw, defaultYear)
      
      const startYear = new Date(startDate).getFullYear()
      const endYear = new Date(endDate).getFullYear()
      
      // Handle cross-year items by splitting them
      if (startYear !== endYear) {
        console.log(`[syncSheetData] Cross-year item: ${name} (${startDate} to ${endDate})`)
        
        const segments = []
        for (let year = startYear; year <= endYear; year++) {
          const page = pages.find(p => p.year === year)
          if (!page) {
            console.warn(`[syncSheetData] No page found for year ${year}, skipping segment`)
            continue
          }
          
          const segmentStart = year === startYear ? startDate : `${year}-01-01`
          const segmentEnd = year === endYear ? endDate : `${year}-12-31`
          
          segments.push({
            wheel_id: ringIntegration.ring.wheel_id,
            page_id: page.id, // CRITICAL: Use page_id matching the year
            ring_id: ringIntegration.ring_id,
            activity_id: activityGroup.id,
            name: name,
            start_date: segmentStart,
            end_date: segmentEnd,
            description: description,
            source: 'google_sheets',
            external_id: `${spreadsheetId}_${sheetName}_${index + 2}`, // +2 for header + 0-index
            sync_metadata: {
              spreadsheet_id: spreadsheetId,
              sheet_name: sheetName,
              row_index: index + 2,
              raw_data: row,
              column_mapping: columnMapping,
              is_segment: true,
              original_start: startDate,
              original_end: endDate,
            },
          })
        }
        
        return segments
      } else {
        // Single-year item
        const page = pages.find(p => p.year === startYear)
        if (!page) {
          console.warn(`[syncSheetData] No page found for year ${startYear}, skipping item ${name}`)
          return []
        }
        
        return [{
          wheel_id: ringIntegration.ring.wheel_id,
          page_id: page.id, // CRITICAL: Use page_id matching the year
          ring_id: ringIntegration.ring_id,
          activity_id: activityGroup.id,
          name: name,
          start_date: startDate,
          end_date: endDate,
          description: description,
          source: 'google_sheets',
          external_id: `${spreadsheetId}_${sheetName}_${index + 2}`, // +2 for header + 0-index
          sync_metadata: {
            spreadsheet_id: spreadsheetId,
            sheet_name: sheetName,
            row_index: index + 2,
            raw_data: row,
            column_mapping: columnMapping,
          },
        }]
      }
    })

  if (itemsToCreate.length === 0) {
    console.warn('[syncSheetData] No items to create - all items skipped or filtered out')
    return []
  }

  console.log(`[syncSheetData] Creating ${itemsToCreate.length} items:`, 
    itemsToCreate.map(i => `${i.name} (${i.start_date} to ${i.end_date}) on page ${i.page_id}`))

  // Insert items
  const { data: createdItems, error: insertError } = await supabaseClient
    .from('items')
    .insert(itemsToCreate)
    .select()

  if (insertError) {
    console.error('[syncSheetData] Error inserting items:', insertError)
    throw insertError
  }

  console.log(`[syncSheetData] ✅ Successfully created ${createdItems?.length || 0} items`)
  return createdItems || []
}

/**
 * Parse various date formats from Google Sheets
 * Only applies defaultYear if the date string doesn't contain a year
 */
function parseDate(dateStr, defaultYear = null) {
  // Handle empty or undefined dates
  if (!dateStr || dateStr.trim() === '') {
    console.warn('Empty date string, using today')
    return new Date().toISOString().split('T')[0]
  }

  const cleanDateStr = dateStr.trim()

  // Try ISO format first (YYYY-MM-DD) - has year
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
    return cleanDateStr
  }

  // Try formats with explicit year (DD/MM/YYYY, YYYY/MM/DD, etc.)
  const parts = cleanDateStr.split(/[\/\-.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts
    
    // YYYY-MM-DD or YYYY/MM/DD (has year)
    if (a.length === 4) {
      return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    }
    
    // DD-MM-YYYY or DD/MM/YYYY (has year)
    if (c.length === 4) {
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    }
    
    // MM-DD-YY or DD-MM-YY (2-digit year)
    if (c.length === 2) {
      // Treat 00-50 as 2000-2050, 51-99 as 1951-1999
      const fullYear = parseInt(c) <= 50 ? `20${c}` : `19${c}`
      // Assume DD-MM-YY format (European)
      return `${fullYear}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    }
  }

  // Check if string contains a 4-digit year anywhere
  const yearMatch = cleanDateStr.match(/\b(19|20)\d{2}\b/)
  const hasExplicitYear = yearMatch !== null

  // Try parsing as JavaScript date (handles "November 10", "Nov 10 2025", etc.)
  const date = new Date(cleanDateStr)
  if (!isNaN(date.getTime())) {
    // If no explicit year found in string AND we have a defaultYear, apply it
    if (!hasExplicitYear && defaultYear) {
      const month = date.getMonth()
      const day = date.getDate()
      const withYear = new Date(defaultYear, month, day)
      console.log(`[parseDate] No year in "${cleanDateStr}", applying wheel year ${defaultYear}: ${withYear.toISOString().split('T')[0]}`)
      return withYear.toISOString().split('T')[0]
    }
    // Date string had a year, use it as-is
    console.log(`[parseDate] Parsed "${cleanDateStr}" with explicit year: ${date.toISOString().split('T')[0]}`)
    return date.toISOString().split('T')[0]
  }

  // Fallback to today's date if unparseable
  console.warn(`Could not parse date: ${cleanDateStr}, using today`)
  return new Date().toISOString().split('T')[0]
}

/**
 * Refresh Google OAuth access token using refresh token
 */
async function refreshGoogleToken(refreshToken: string) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Token refresh failed:', error)
    throw new Error('Failed to refresh access token - please reconnect your Google account')
  }

  return await response.json()
}

