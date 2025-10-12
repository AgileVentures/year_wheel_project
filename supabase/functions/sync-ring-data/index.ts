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
 * Sync data from Google Calendar
 */
async function syncCalendarData(accessToken, ringIntegration, supabaseClient, userId) {
  const calendarId = ringIntegration.config.calendar_id || 'primary'
  
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

  // Create items from events, mapping to correct page based on year
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
  
  const spreadsheetId = ringIntegration.config.spreadsheet_id
  const sheetName = ringIntegration.config.sheet_name || 'Sheet1'
  const range = ringIntegration.config.range || 'A:D' // Default: columns A-D

  console.log('[syncSheetData] Using:', { spreadsheetId, sheetName, range })

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

  // Expected format: [Name, Start Date, End Date, Color/Notes]
  const itemsToCreate = dataRows
    .filter(row => row.length >= 3 && row[0] && row[1] && row[2]) // Must have name and dates
    .flatMap((row, index) => {
      const startDate = parseDate(row[1])
      const endDate = parseDate(row[2])
      
      const startYear = new Date(startDate).getFullYear()
      const endYear = new Date(endDate).getFullYear()
      
      // Handle cross-year items by splitting them
      if (startYear !== endYear) {
        console.log(`[syncSheetData] Cross-year item: ${row[0]} (${startDate} to ${endDate})`)
        
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
            name: row[0],
            start_date: segmentStart,
            end_date: segmentEnd,
            source: 'google_sheets',
            external_id: `${spreadsheetId}_${sheetName}_${index + 2}`, // +2 for header + 0-index
            sync_metadata: {
              spreadsheet_id: spreadsheetId,
              sheet_name: sheetName,
              row_index: index + 2,
              raw_data: row,
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
          console.warn(`[syncSheetData] No page found for year ${startYear}, skipping item ${row[0]}`)
          return []
        }
        
        return [{
          wheel_id: ringIntegration.ring.wheel_id,
          page_id: page.id, // CRITICAL: Use page_id matching the year
          ring_id: ringIntegration.ring_id,
          activity_id: activityGroup.id,
          name: row[0],
          start_date: startDate,
          end_date: endDate,
          source: 'google_sheets',
          external_id: `${spreadsheetId}_${sheetName}_${index + 2}`, // +2 for header + 0-index
          sync_metadata: {
            spreadsheet_id: spreadsheetId,
            sheet_name: sheetName,
            row_index: index + 2,
            raw_data: row,
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
 */
function parseDate(dateStr) {
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // Try Swedish format (DD/MM/YYYY or YYYY/MM/DD)
  const parts = dateStr.split(/[\/\-.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts
    
    // YYYY-MM-DD or YYYY/MM/DD
    if (a.length === 4) {
      return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    }
    
    // DD-MM-YYYY or DD/MM/YYYY
    if (c.length === 4) {
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    }
  }

  // Try parsing as JavaScript date
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // Fallback to today's date if unparseable
  console.warn(`Could not parse date: ${dateStr}, using today`)
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

