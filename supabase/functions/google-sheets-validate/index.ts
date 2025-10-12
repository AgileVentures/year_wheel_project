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

    // Check token expiry and refresh if needed
    const tokenExpiresAt = new Date(integration.token_expires_at)
    let accessToken = integration.access_token
    
    if (tokenExpiresAt < new Date()) {
      console.log('🔄 Access token expired, refreshing...')
      
      const refreshToken = integration.refresh_token
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
        .eq('id', integration.id)
      
      accessToken = newTokens.access_token
      console.log('✅ Token refreshed successfully')
    }

    // Fetch spreadsheet metadata
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
