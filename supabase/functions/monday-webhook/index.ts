import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Monday.com app credentials
const MONDAY_CLIENT_ID = '82c44e2678c2b6e8723cf2d69b900250'
const MONDAY_APP_ID = '10727736'
const MONDAY_SIGNING_SECRET = Deno.env.get('MONDAY_SIGNING_SECRET') || '73884bdca237109fd13fb82784bfd8df'

interface MondayWebhookPayload {
  type: string
  data: {
    app_id: number
    user_id: number
    user_email: string
    user_name: string
    user_cluster: string
    account_tier: string
    account_name: string
    account_slug: string
    account_max_users: number
    account_id: number
    version_data: any
    timestamp: string
    subscription?: {
      plan_id?: string
      billing_period?: string
      is_trial?: boolean
      renewal_date?: string
      days_left?: number
    }
    user_country?: string
  }
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: MondayWebhookPayload = await req.json()
    console.log('Monday.com webhook received:', payload.type)

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

    // Handle different event types
    switch (payload.type) {
      case 'install':
        await handleInstall(payload, supabaseAdmin)
        break

      case 'uninstall':
        await handleUninstall(payload, supabaseAdmin)
        break

      case 'app_subscription_created':
        await handleSubscriptionCreated(payload, supabaseAdmin)
        break

      case 'app_subscription_changed':
        await handleSubscriptionChanged(payload, supabaseAdmin)
        break

      case 'app_subscription_cancelled_by_user':
        await handleSubscriptionCancelledByUser(payload, supabaseAdmin)
        break

      case 'app_subscription_renewed':
        await handleSubscriptionRenewed(payload, supabaseAdmin)
        break

      case 'app_trial_subscription_started':
        await handleTrialStarted(payload, supabaseAdmin)
        break

      case 'app_trial_subscription_ended':
        await handleTrialEnded(payload, supabaseAdmin)
        break

      case 'app_subscription_cancelled':
        await handleSubscriptionCancelled(payload, supabaseAdmin)
        break

      case 'app_subscription_cancellation_revoked_by_user':
        await handleCancellationRevoked(payload, supabaseAdmin)
        break

      case 'app_subscription_renewal_attempt_failed':
        await handleRenewalAttemptFailed(payload, supabaseAdmin)
        break

      case 'app_subscription_renewal_failed':
        await handleRenewalFailed(payload, supabaseAdmin)
        break

      default:
        console.log(`Unhandled event type: ${payload.type}`)
    }

    // Always log the event for debugging
    await logEvent(payload, supabaseAdmin)

    return new Response(JSON.stringify({ received: true, event: payload.type }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Monday webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function handleInstall(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling install for user:', payload.data.user_id)

  // Check if a YearWheel user exists with this email
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', payload.data.user_email)
    .single()

  const userData = {
    monday_user_id: payload.data.user_id,
    monday_account_id: payload.data.account_id,
    monday_account_name: payload.data.account_name,
    monday_account_slug: payload.data.account_slug,
    email: payload.data.user_email,
    name: payload.data.user_name,
    country_code: payload.data.user_country,
    user_cluster: payload.data.user_cluster,
    account_tier: payload.data.account_tier,
    subscription_status: 'active',
    current_plan: 'free',
    uninstalled_at: null,
    last_active_at: new Date().toISOString(),
    // Auto-link to existing YearWheel account if found
    profile_id: existingProfile?.id || null
  }

  // Upsert user (update if exists, insert if new)
  const { data, error } = await supabaseAdmin
    .from('monday_users')
    .upsert(userData, { onConflict: 'monday_user_id' })
    .select()
    .single()

  if (error) {
    console.error('Error upserting monday user:', error)
    throw error
  }

  console.log('User installed successfully:', data.id)
  if (existingProfile) {
    console.log('Auto-linked to existing profile:', existingProfile.id)
  }
}

async function handleUninstall(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling uninstall for user:', payload.data.user_id)

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update({ 
      subscription_status: 'uninstalled',
      uninstalled_at: new Date().toISOString()
    })
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating uninstalled user:', error)
    throw error
  }
}

async function handleSubscriptionCreated(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling subscription created for user:', payload.data.user_id)

  const subscription = payload.data.subscription || {}
  const updateData: any = {
    subscription_status: 'active',
    current_plan: subscription.plan_id || 'pro-monthly',
    billing_period: subscription.billing_period || 'monthly',
    is_trial: subscription.is_trial || false,
    last_active_at: new Date().toISOString()
  }

  if (subscription.renewal_date) {
    updateData.renewal_date = subscription.renewal_date
  }

  if (subscription.is_trial && subscription.days_left) {
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + subscription.days_left)
    updateData.trial_ends_at = trialEndDate.toISOString()
  }

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update(updateData)
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating subscription created:', error)
    throw error
  }
}

async function handleSubscriptionChanged(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling subscription changed for user:', payload.data.user_id)

  const subscription = payload.data.subscription || {}
  const updateData: any = {
    subscription_status: 'active',
    current_plan: subscription.plan_id || 'pro-monthly',
    billing_period: subscription.billing_period || 'monthly',
    last_active_at: new Date().toISOString()
  }

  if (subscription.renewal_date) {
    updateData.renewal_date = subscription.renewal_date
  }

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update(updateData)
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating subscription changed:', error)
    throw error
  }
}

async function handleSubscriptionCancelledByUser(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling subscription cancelled by user:', payload.data.user_id)

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update({ 
      subscription_status: 'cancelling',
      last_active_at: new Date().toISOString()
    })
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating cancelled subscription:', error)
    throw error
  }
}

async function handleSubscriptionRenewed(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling subscription renewed for user:', payload.data.user_id)

  const subscription = payload.data.subscription || {}
  const updateData: any = {
    subscription_status: 'active',
    last_active_at: new Date().toISOString()
  }

  if (subscription.renewal_date) {
    updateData.renewal_date = subscription.renewal_date
  }

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update(updateData)
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating renewed subscription:', error)
    throw error
  }
}

async function handleTrialStarted(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling trial started for user:', payload.data.user_id)

  const subscription = payload.data.subscription || {}
  const updateData: any = {
    subscription_status: 'trial',
    is_trial: true,
    last_active_at: new Date().toISOString()
  }

  if (subscription.days_left) {
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + subscription.days_left)
    updateData.trial_ends_at = trialEndDate.toISOString()
  }

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update(updateData)
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating trial started:', error)
    throw error
  }
}

async function handleTrialEnded(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling trial ended for user:', payload.data.user_id)

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update({ 
      subscription_status: 'trial_ended',
      is_trial: false,
      current_plan: 'free',
      last_active_at: new Date().toISOString()
    })
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating trial ended:', error)
    throw error
  }
}

async function handleSubscriptionCancelled(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling subscription cancelled for user:', payload.data.user_id)

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update({ 
      subscription_status: 'cancelled',
      current_plan: 'free',
      last_active_at: new Date().toISOString()
    })
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating cancelled subscription:', error)
    throw error
  }
}

async function handleCancellationRevoked(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling cancellation revoked for user:', payload.data.user_id)

  const subscription = payload.data.subscription || {}
  const updateData: any = {
    subscription_status: 'active',
    current_plan: subscription.plan_id || 'pro-monthly',
    last_active_at: new Date().toISOString()
  }

  if (subscription.renewal_date) {
    updateData.renewal_date = subscription.renewal_date
  }

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update(updateData)
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating revoked cancellation:', error)
    throw error
  }
}

async function handleRenewalAttemptFailed(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling renewal attempt failed for user:', payload.data.user_id)

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update({ 
      subscription_status: 'payment_retry',
      last_active_at: new Date().toISOString()
    })
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating renewal attempt failed:', error)
    throw error
  }
}

async function handleRenewalFailed(payload: MondayWebhookPayload, supabaseAdmin: any) {
  console.log('Handling renewal failed for user:', payload.data.user_id)

  const { error } = await supabaseAdmin
    .from('monday_users')
    .update({ 
      subscription_status: 'payment_failed',
      current_plan: 'free',
      last_active_at: new Date().toISOString()
    })
    .eq('monday_user_id', payload.data.user_id)

  if (error) {
    console.error('Error updating renewal failed:', error)
    throw error
  }
}

async function logEvent(payload: MondayWebhookPayload, supabaseAdmin: any) {
  // Find the user first
  const { data: user } = await supabaseAdmin
    .from('monday_users')
    .select('id')
    .eq('monday_user_id', payload.data.user_id)
    .single()

  const eventData = {
    monday_user_id: user?.id || null,
    event_type: payload.type,
    plan_id: payload.data.subscription?.plan_id || null,
    event_data: payload
  }

  const { error } = await supabaseAdmin
    .from('monday_subscription_events')
    .insert(eventData)

  if (error) {
    console.error('Error logging event:', error)
    // Don't throw - logging failure shouldn't break webhook processing
  }
}
