import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
const ga4MeasurementId = Deno.env.get('GA4_MEASUREMENT_ID') || ''
const ga4ApiSecret = Deno.env.get('GA4_API_SECRET') || ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    )

    console.log('Webhook event received:', event.type)

    // Initialize Supabase Admin Client
    // Note: Supabase automatically provides these environment variables
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

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabaseAdmin)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object, supabaseAdmin)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabaseAdmin)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, supabaseAdmin)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabaseAdmin)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Log the event
    await logEvent(event, supabaseAdmin)

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})

async function handleCheckoutCompleted(session: any, supabaseAdmin: any) {
  console.log('Checkout completed:', session.id)
  
  // Send GA4 Measurement Protocol event for purchase tracking
  if (ga4MeasurementId && ga4ApiSecret) {
    const gaClientId = session.metadata?.ga_client_id
    const gaUserId = session.metadata?.ga_user_id
    const planType = session.metadata?.plan_type
    const planName = session.metadata?.plan_name || 'Subscription'
    
    if (gaClientId) {
      try {
        // Get payment amount and currency from the session
        const amountTotal = session.amount_total / 100 // Convert from cents
        const currency = session.currency?.toUpperCase() || 'SEK'
        
        // Determine value and items based on plan type
        const items = [{
          item_id: planType === 'monthly' ? 'monthly_plan' : 'yearly_plan',
          item_name: planName,
          price: amountTotal,
          quantity: 1
        }]
        
        // Prepare GA4 Measurement Protocol payload
        const ga4Payload = {
          client_id: gaClientId,
          user_id: gaUserId || undefined,
          events: [{
            name: 'purchase',
            params: {
              transaction_id: session.id,
              value: amountTotal,
              currency: currency,
              coupon: session.discount?.coupon?.id || undefined,
              items: items
            }
          }]
        }
        
        // Send to GA4 Measurement Protocol
        const ga4Response = await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${ga4MeasurementId}&api_secret=${ga4ApiSecret}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(ga4Payload)
          }
        )
        
        if (ga4Response.ok) {
          console.log('GA4 purchase event sent successfully')
        } else {
          console.error('GA4 purchase event failed:', await ga4Response.text())
        }
      } catch (error) {
        console.error('Error sending GA4 purchase event:', error)
      }
    } else {
      console.log('No GA client_id found in session metadata, skipping GA4 tracking')
    }
  }
}

async function handleSubscriptionChange(subscription: any, supabaseAdmin: any) {
  console.log('Handling subscription change:', subscription.id)

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(subscription.customer)
  const userId = customer.metadata?.supabase_user_id

  if (!userId) {
    console.error('No user ID found in customer metadata')
    return
  }

  // Determine plan type from price
  const priceId = subscription.items.data[0]?.price.id
  let planType = 'free'
  
  if (subscription.status === 'active') {
    // Check if monthly or yearly based on interval
    const interval = subscription.items.data[0]?.price.recurring?.interval
    planType = interval === 'month' ? 'monthly' : 'yearly'
  }

  // Upsert subscription
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_type: planType,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    console.error('Error upserting subscription:', error)
  } else {
    console.log('Subscription updated successfully')
  }
}

async function handleSubscriptionDeleted(subscription: any, supabaseAdmin: any) {
  console.log('Handling subscription deletion:', subscription.id)

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(subscription.customer)
  const userId = customer.metadata?.supabase_user_id

  if (!userId) {
    console.error('No user ID found in customer metadata')
    return
  }

  // Update subscription to canceled and revert to free
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      plan_type: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error canceling subscription:', error)
  } else {
    console.log('Subscription canceled successfully')
  }
}

async function handlePaymentSucceeded(invoice: any, supabaseAdmin: any) {
  console.log('Payment succeeded for invoice:', invoice.id)
  
  // Subscription is already updated by subscription.updated event
  // This is just for logging/analytics
}

async function handlePaymentFailed(invoice: any, supabaseAdmin: any) {
  console.log('Payment failed for invoice:', invoice.id)

  // Update subscription status to past_due
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
    const customer = await stripe.customers.retrieve(subscription.customer)
    const userId = customer.metadata?.supabase_user_id

    if (userId) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }
  }
}

async function logEvent(event: any, supabaseAdmin: any) {
  // Find subscription ID from the event
  let subscriptionId = null

  if (event.data.object.object === 'subscription') {
    // Get subscription record from our DB
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', event.data.object.id)
      .single()
    
    subscriptionId = data?.id
  } else if (event.data.object.subscription) {
    // For invoice events
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', event.data.object.subscription)
      .single()
    
    subscriptionId = data?.id
  }

  await supabaseAdmin
    .from('subscription_events')
    .insert({
      subscription_id: subscriptionId,
      event_type: event.type,
      stripe_event_id: event.id,
      event_data: event.data.object,
    })
}
