/**
 * Google OAuth Callback Handler
 * Exchanges authorization code for tokens and stores them
 * Note: This function has verify_jwt = false in supabase/config.toml
 * because it's called by Google's redirect, not by an authenticated user
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
    console.log('🔄 Callback received:', req.url)
    
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    console.log('📋 Parameters:', { hasCode: !!code, hasState: !!state, error })

    // Check for OAuth errors
    if (error) {
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
      const redirectUrl = `${frontendUrl}/profile?oauth_error=${encodeURIComponent(error)}`
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl,
        },
      })
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    // Decode state
    const stateData = JSON.parse(atob(state))
    const { user_id, provider } = stateData

    if (!user_id || !provider) {
      throw new Error('Invalid state parameter')
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || `${supabaseUrl}/functions/v1/google-oauth-callback`

    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri
    })

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured')
    }

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase environment not configured')
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Exchange code for tokens

    console.log('🔑 Exchanging code for tokens...')
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('❌ Token exchange failed:', tokenResponse.status, errorData)
      throw new Error('Failed to exchange authorization code')
    }

    const tokens = await tokenResponse.json()
    console.log('✅ Tokens received')

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text()
      console.error('❌ User info fetch failed:', userInfoResponse.status, errorText)
      throw new Error(`Failed to fetch user info: ${userInfoResponse.status} - ${errorText}`)
    }

    const userInfo = await userInfoResponse.json()
    console.log('✅ User info received:', userInfo.email)

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))

    console.log('💾 Storing integration in database...')
    
    // Store tokens in database
    const { data: integration, error: dbError } = await supabaseAdmin
      .from('user_integrations')
      .upsert({
        user_id: user_id,
        provider: provider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scope: tokens.scope?.split(' ') || [],
        provider_user_id: userInfo.id,
        provider_user_email: userInfo.email,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error(`Failed to store integration: ${dbError.message}`)
    }
    
    console.log('✅ Integration stored successfully')

    // Get frontend URL from environment or use default
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    
    // Redirect back to profile page with success message
    const redirectUrl = `${frontendUrl}/profile?oauth_success=true&provider=${provider}`

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    })

  } catch (error) {
    console.error('Error in google-oauth-callback:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    const redirectUrl = `${frontendUrl}/profile?oauth_error=${encodeURIComponent(errorMessage)}`
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    })
  }
})
