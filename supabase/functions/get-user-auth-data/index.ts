import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with user's auth context for RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Auth error:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - ' + (userError?.message || 'No user') }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Create admin client for service role operations
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

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body to get user IDs
    const { userIds } = await req.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch auth metadata for requested users
    const userAuthData = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId)
          
          if (error || !authUser) {
            return {
              id: userId,
              provider: 'unknown',
              last_sign_in_at: null,
              confirmed_at: null,
              providers: []
            }
          }

          // Extract all providers from identities
          const providers = authUser.user?.identities?.map(identity => identity.provider) || []
          
          // Get the primary provider (usually the most recent or from app_metadata)
          const primaryProvider = authUser.user?.app_metadata?.provider || 
                                 (providers.length > 0 ? providers[0] : 'email')

          return {
            id: userId,
            provider: primaryProvider,
            last_sign_in_at: authUser.user?.last_sign_in_at,
            confirmed_at: authUser.user?.confirmed_at,
            providers: providers, // All linked providers
          }
        } catch (error) {
          console.error(`Error fetching auth data for user ${userId}:`, error)
          return {
            id: userId,
            provider: 'unknown',
            last_sign_in_at: null,
            confirmed_at: null,
            providers: []
          }
        }
      })
    )

    return new Response(
      JSON.stringify({ userAuthData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in get-user-auth-data function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
