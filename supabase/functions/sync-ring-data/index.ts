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

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

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

    // Verify access token is valid (not expired)
    const tokenExpiresAt = new Date(ringIntegration.user_integration.token_expires_at)
    if (tokenExpiresAt < new Date()) {
      // TODO: Implement token refresh
      throw new Error('Access token expired - please reconnect')
    }

    const accessToken = ringIntegration.user_integration.access_token

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
  
  // Get wheel year for date range
  const { data: wheel } = await supabaseClient
    .from('year_wheels')
    .select('year')
    .eq('id', ringIntegration.ring.wheel_id)
    .single()

  const year = wheel?.year || new Date().getFullYear()
  const timeMin = new Date(`${year}-01-01T00:00:00Z`).toISOString()
  const timeMax = new Date(`${year}-12-31T23:59:59Z`).toISOString()

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

  // Create items from events
  const itemsToCreate = events
    .filter(event => {
      // Filter out events without dates
      return event.start && (event.start.date || event.start.dateTime)
    })
    .map(event => {
      const startDate = event.start.date || event.start.dateTime.split('T')[0]
      const endDate = event.end ? (event.end.date || event.end.dateTime.split('T')[0]) : startDate

      return {
        wheel_id: ringIntegration.ring.wheel_id,
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
  const spreadsheetId = ringIntegration.config.spreadsheet_id
  const sheetName = ringIntegration.config.sheet_name || 'Sheet1'
  const range = ringIntegration.config.range || 'A:D' // Default: columns A-D

  if (!spreadsheetId) {
    throw new Error('Missing spreadsheet_id in configuration')
  }

  // Fetch sheet data
  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}`

  const response = await fetch(sheetsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Sheets API error:', error)
    throw new Error('Failed to fetch sheet data')
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
    .map((row, index) => {
      return {
        wheel_id: ringIntegration.ring.wheel_id,
        ring_id: ringIntegration.ring_id,
        activity_id: activityGroup.id,
        name: row[0],
        start_date: parseDate(row[1]),
        end_date: parseDate(row[2]),
        source: 'google_sheets',
        external_id: `${spreadsheetId}_${sheetName}_${index + 2}`, // +2 for header + 0-index
        sync_metadata: {
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName,
          row_index: index + 2,
          raw_data: row,
        },
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
