/**
 * Google Sheets Export Edge Function
 * Creates or updates a Google Sheets spreadsheet with Year Wheel data
 * 
 * Required environment variables:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { spreadsheetId, sheetName, title, values } = await req.json()

    if (!sheetName || !title || !values || !Array.isArray(values)) {
      throw new Error('Missing required parameters: sheetName, title, and values are required')
    }

    // Get user's Google Sheets integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_sheets')
      .maybeSingle()

    if (integrationError || !integration) {
      throw new Error('Google Sheets not connected. Please connect in profile settings.')
    }

    // Check if access token needs refresh
    const accessToken = integration.access_token
    const refreshToken = integration.refresh_token
    const expiresAt = new Date(integration.expires_at)

    let currentAccessToken = accessToken

    // Refresh token if expired
    if (new Date() >= expiresAt) {
      console.log('Access token expired, refreshing...')
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh access token')
      }

      const tokenData = await tokenResponse.json()
      currentAccessToken = tokenData.access_token

      // Update stored token
      const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
      await supabase
        .from('user_integrations')
        .update({
          access_token: currentAccessToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', integration.id)
    }

    let resultSpreadsheetId = spreadsheetId
    let spreadsheetUrl = ''

    // Create new spreadsheet if no ID provided
    if (!spreadsheetId) {
      console.log('Creating new spreadsheet:', title)
      
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: title,
          },
          sheets: [{
            properties: {
              title: sheetName,
            },
          }],
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        console.error('Failed to create spreadsheet:', errorData)
        throw new Error(`Failed to create spreadsheet: ${errorData.error?.message || 'Unknown error'}`)
      }

      const createData = await createResponse.json()
      resultSpreadsheetId = createData.spreadsheetId
      spreadsheetUrl = createData.spreadsheetUrl

      console.log('Spreadsheet created:', resultSpreadsheetId)
    } else {
      // Update existing spreadsheet
      console.log('Updating existing spreadsheet:', spreadsheetId)
      
      // Check if sheet exists, create if not
      const sheetsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: { 'Authorization': `Bearer ${currentAccessToken}` },
        }
      )

      if (!sheetsResponse.ok) {
        throw new Error('Failed to access spreadsheet. Check permissions.')
      }

      const sheetsData = await sheetsResponse.json()
      spreadsheetUrl = sheetsData.spreadsheetUrl

      const existingSheet = sheetsData.sheets?.find(
        (s: any) => s.properties.title === sheetName
      )

      if (!existingSheet) {
        // Create new sheet within existing spreadsheet
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [{
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              }],
            }),
          }
        )
      } else {
        // Clear existing sheet data
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:clear`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentAccessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
      }
    }

    // Write data to sheet
    console.log(`Writing ${values.length} rows to sheet ${sheetName}`)
    
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${resultSpreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values,
        }),
      }
    )

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json()
      console.error('Failed to write data:', errorData)
      throw new Error(`Failed to write data: ${errorData.error?.message || 'Unknown error'}`)
    }

    // Format header row (make it bold)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${resultSpreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          }],
        }),
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        spreadsheetId: resultSpreadsheetId,
        spreadsheetUrl: spreadsheetUrl,
        sheetName: sheetName,
        rowCount: values.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in google-sheets-export:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
