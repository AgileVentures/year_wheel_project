import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const MONDAY_CLIENT_ID = '82c44e2678c2b6e8723cf2d69b900250' // Public - safe to expose
const MONDAY_CLIENT_SECRET = Deno.env.get('MONDAY_CLIENT_SECRET') // REQUIRED: Set in Supabase secrets
const MONDAY_APP_ID = '10727736' // Public - safe to expose
const REDIRECT_URI = 'https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/monday-oauth-callback'

if (!MONDAY_CLIENT_SECRET) {
  console.error('MONDAY_CLIENT_SECRET environment variable is required')
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    
    if (!code) {
      return redirectWithError('Missing authorization code')
    }
    
    // Verify state (CSRF protection)
    const cookies = req.headers.get('cookie') || ''
    const stateCookie = cookies.split(';').find(c => c.trim().startsWith('monday_oauth_state='))
    const expectedState = stateCookie?.split('=')[1]
    
    if (!state || state !== expectedState) {
      return redirectWithError('Invalid state parameter')
    }
    
    // Exchange code for access token
    console.log('Exchanging code for token...')
    const tokenResponse = await fetch('https://auth.monday.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: MONDAY_CLIENT_ID,
        client_secret: MONDAY_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI
      })
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return redirectWithError('Failed to get access token')
    }
    
    const { access_token } = await tokenResponse.json()
    console.log('Access token received')
    
    // Get user info from Monday API
    console.log('Fetching user info from Monday...')
    const userResponse = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Authorization': access_token,
        'Content-Type': 'application/json',
        'API-Version': '2024-10'
      },
      body: JSON.stringify({
        query: `query {
          me {
            id
            email
            name
            photo_original
            account {
              id
              name
              slug
            }
          }
        }`
      })
    })
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('User info fetch failed:', errorText)
      return redirectWithError('Failed to get user info from Monday')
    }
    
    const { data: { me } } = await userResponse.json()
    console.log('Monday user info:', { id: me.id, email: me.email, name: me.name })
    
    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Check if user exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', me.email)
      .single()
    
    let userId: string
    
    if (existingProfile) {
      console.log('Found existing profile:', existingProfile.id)
      userId = existingProfile.id
      
      // Update Monday user link
      await supabaseAdmin
        .from('monday_users')
        .update({ 
          profile_id: existingProfile.id,
          monday_access_token: access_token,
          last_active_at: new Date().toISOString()
        })
        .eq('monday_user_id', parseInt(me.id))
    } else {
      // Create new Supabase user
      console.log('Creating new user...')
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: me.email,
        email_confirm: true,
        user_metadata: {
          full_name: me.name,
          avatar_url: me.photo_original,
          monday_user_id: me.id
        }
      })
      
      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError)
        return redirectWithError('Failed to create account')
      }
      
      userId = newUser.user.id
      console.log('Created new user:', userId)
      
      // Update Monday user link
      await supabaseAdmin
        .from('monday_users')
        .update({ 
          profile_id: userId,
          monday_access_token: access_token,
          last_active_at: new Date().toISOString()
        })
        .eq('monday_user_id', parseInt(me.id))
    }
    
    // Generate magic link for seamless login
    console.log('Generating auth link...')
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: me.email,
      options: {
        redirectTo: 'https://yearwheel.se/dashboard'
      }
    })
    
    if (linkError || !linkData) {
      console.error('Failed to generate link:', linkError)
      return redirectWithError('Failed to create session')
    }
    
    // Extract token from hashed_token
    const token = linkData.properties.hashed_token
    
    // Redirect to app with token and Monday user marker
    const redirectUrl = `https://yearwheel.se/auth/callback?token_hash=${token}&type=magiclink&monday_user=true`
    
    console.log('Redirecting to:', redirectUrl)
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Set-Cookie': 'monday_oauth_state=; Path=/; Max-Age=0' // Clear state cookie
      }
    })
    
  } catch (error) {
    console.error('OAuth callback error:', error)
    return redirectWithError('Authentication failed')
  }
})

function redirectWithError(message: string) {
  const errorUrl = `https://yearwheel.se/?error=${encodeURIComponent(message)}`
  return new Response(null, {
    status: 302,
    headers: { 'Location': errorUrl }
  })
}
