/**
 * Google OAuth Callback Handler
 * Exchanges authorization code for tokens and stores them
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Check for OAuth errors
    if (error) {
      const htmlError = `
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>Auktorisering misslyckades</h1>
            <p>Fel: ${error}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'google-oauth-error',
                  error: '${error}'
                }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `
      return new Response(htmlError, {
        headers: { 'Content-Type': 'text/html' },
        status: 400,
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

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured')
    }

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
      console.error('Token exchange failed:', errorData)
      throw new Error('Failed to exchange authorization code')
    }

    const tokens = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const userInfo = await userInfoResponse.json()

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))

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
      console.error('Database error:', dbError)
      throw new Error('Failed to store integration')
    }

    // Return HTML that closes popup and notifies parent
    const htmlSuccess = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .success {
              color: #10b981;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #1f2937;
              margin: 0 0 0.5rem 0;
            }
            p {
              color: #6b7280;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Anslutning lyckades!</h1>
            <p>Du kan nu stänga detta fönster</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'google-oauth-success',
                state: '${state}',
                integration: ${JSON.stringify(integration)}
              }, '*');
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `

    return new Response(htmlSuccess, {
      headers: { 'Content-Type': 'text/html' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in google-oauth-callback:', error)
    
    const htmlError = `
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Error</title></head>
        <body>
          <h1>Ett fel uppstod</h1>
          <p>${error.message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'google-oauth-error',
                error: '${error.message}'
              }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
      </html>
    `
    
    return new Response(htmlError, {
      headers: { 'Content-Type': 'text/html' },
      status: 400,
    })
  }
})
