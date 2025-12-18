import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Admin Grant Premium
 * Allows admins to give users complimentary premium access
 */
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
    const { targetUserId, expiresAt, reason } = await req.json()

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'targetUserId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!expiresAt) {
      return new Response(
        JSON.stringify({ error: 'expiresAt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate expiresAt is a valid date
    const expiryDate = new Date(expiresAt)
    if (isNaN(expiryDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid expiresAt date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if target user exists
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', targetUserId)
      .single()

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    const now = new Date()
    const subscriptionData = {
      user_id: targetUserId,
      plan_type: 'gift',
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: expiryDate.toISOString(),
      cancel_at_period_end: true, // Will not auto-renew
      updated_at: now.toISOString()
    }

    let subscription
    if (existingSub) {
      // Update existing subscription
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (error) throw error
      subscription = data
    } else {
      // Create new subscription
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          created_at: now.toISOString()
        })
        .select()
        .single()

      if (error) throw error
      subscription = data
    }

    // Log the event
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        subscription_id: subscription.id,
        event_type: 'admin_gift',
        event_data: {
          granted_by: user.id,
          granted_by_email: user.email,
          target_user: targetUserId,
          target_email: targetProfile.email,
          expires_at: expiresAt,
          reason: reason || 'Admin granted premium access'
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          plan_type: subscription.plan_type,
          status: subscription.status,
          expires_at: subscription.current_period_end
        },
        user: {
          id: targetProfile.id,
          email: targetProfile.email,
          full_name: targetProfile.full_name
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error granting premium:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
