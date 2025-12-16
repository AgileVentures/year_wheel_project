import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MONDAY_CLIENT_ID = Deno.env.get('MONDAY_CLIENT_ID') || '82c44e2678c2b6e8723cf2d69b900250'
const REDIRECT_URI = 'https://yearwheel.se/auth/monday/callback'

serve(async (req) => {
  try {
    // Generate random state for CSRF protection
    const state = crypto.randomUUID()
    
    // Store state in cookie for verification in callback
    const headers = new Headers()
    headers.set('Set-Cookie', `monday_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)
    
    // Build Monday OAuth URL
    const authUrl = new URL('https://auth.monday.com/oauth2/authorize')
    authUrl.searchParams.set('client_id', MONDAY_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('state', state)
    
    // Redirect to Monday OAuth
    headers.set('Location', authUrl.toString())
    
    return new Response(null, {
      status: 302,
      headers
    })
  } catch (error) {
    console.error('OAuth init error:', error)
    return new Response(JSON.stringify({ error: 'Failed to initialize OAuth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
