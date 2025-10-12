/**
 * Google OAuth Initialization
 * Generates OAuth URL for user to authenticate with Google
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client with auth context of the user that called the function
    // This way your row-level-security (RLS) policies are applied
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the token from the Authorization header
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

    const token = authHeader.replace('Bearer ', '')
    
    // Get the user from the token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - ' + (authError?.message || 'No user') }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Get request body
    const { provider = 'google', scopes = [] } = await req.json()

    // Google OAuth configuration
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`

    if (!clientId) {
      throw new Error('Google OAuth not configured - missing GOOGLE_CLIENT_ID')
    }

    // Default scopes based on provider
    // Always include userinfo scopes so we can identify the user
    let defaultScopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
    
    if (provider === 'google_calendar') {
      defaultScopes.push('https://www.googleapis.com/auth/calendar.readonly')
    } else if (provider === 'google_sheets') {
      defaultScopes.push('https://www.googleapis.com/auth/spreadsheets.readonly')
    }

    // Merge with requested scopes (remove duplicates)
    const allScopes = [...new Set([...defaultScopes, ...scopes])]

    // Generate state parameter (includes user_id and provider for callback)
    const state = btoa(JSON.stringify({
      user_id: user.id,
      provider: provider,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    }))

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: allScopes.join(' '),
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Always show consent screen to get refresh token
      state: state,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return new Response(
      JSON.stringify({
        authUrl,
        state: state,
        provider,
        scopes: allScopes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in google-oauth-init:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
