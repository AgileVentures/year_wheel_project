import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
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
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { userIds } = await req.json()

    if (!Array.isArray(userIds)) {
      return new Response(
        JSON.stringify({ error: 'userIds must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch subscriptions (bypassing RLS)
    // If userIds is empty, fetch all subscriptions
    let subscriptionsQuery = supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan_type, status, current_period_end')
    
    if (userIds.length > 0) {
      subscriptionsQuery = subscriptionsQuery.in('user_id', userIds)
    }
    
    const { data: subscriptions, error: subError } = await subscriptionsQuery

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
    }

    // Fetch auth metadata for all users (only if userIds provided)
    let userData: any[] = []
    
    if (userIds.length > 0) {
      const userDataPromises = userIds.map(async (userId: string) => {
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
          const providers = authUser.user?.identities?.map((identity: any) => identity.provider) || []
          
          // Get the primary provider
          const primaryProvider = authUser.user?.app_metadata?.provider || 
                                 (providers.length > 0 ? providers[0] : 'email')

          return {
            id: userId,
            provider: primaryProvider,
            last_sign_in_at: authUser.user?.last_sign_in_at,
            confirmed_at: authUser.user?.confirmed_at,
            providers: providers,
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
      
      userData = await Promise.all(userDataPromises)
    }

    // Combine everything into a single response
    return new Response(
      JSON.stringify({
        subscriptions: subscriptions || [],
        authData: userData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
