/**
 * Validate Google Sheets Access
 * Checks if user has access to a spreadsheet and returns metadata
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { spreadsheetId } = await req.json()

    if (!spreadsheetId) {
      throw new Error('Missing spreadsheetId')
    }

    // Get user's Google Sheets integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_sheets')
      .single()

    if (integrationError || !integration) {
      throw new Error('Google Sheets not connected')
    }

    // Check token expiry
    const tokenExpiresAt = new Date(integration.token_expires_at)
    if (tokenExpiresAt < new Date()) {
      throw new Error('Access token expired - please reconnect')
    }

    // Fetch spreadsheet metadata
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Spreadsheet not found or no access')
      }
      const error = await response.text()
      console.error('Sheets API error:', error)
      throw new Error('Failed to access spreadsheet')
    }

    const data = await response.json()

    // Extract sheet names
    const sheets = (data.sheets || []).map(sheet => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
      index: sheet.properties.index,
      rowCount: sheet.properties.gridProperties?.rowCount,
      columnCount: sheet.properties.gridProperties?.columnCount,
    }))

    return new Response(
      JSON.stringify({
        valid: true,
        spreadsheet: {
          id: data.spreadsheetId,
          title: data.properties.title,
          url: data.spreadsheetUrl,
          sheets: sheets,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error validating sheet:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
