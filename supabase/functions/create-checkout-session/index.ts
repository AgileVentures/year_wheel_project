import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { priceId, customerId, userId, successUrl, cancelUrl, gaClientId, planType } = await req.json()

    // Initialize Supabase Admin Client
    // Note: Supabase automatically provides these environment variables
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let stripeCustomerId = customerId

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      // Get user email
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: userId,
        },
      })

      stripeCustomerId = customer.id

      // Update subscription record with customer ID
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', userId)
    }

    // Determine plan name for metadata
    const planName = planType === 'monthly' ? 'YearWheel Månadsvis' : 'YearWheel Årlig'

    // Create checkout session with GA metadata
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
      },
      metadata: {
        ga_client_id: gaClientId || '',
        ga_user_id: userId || '',
        plan_type: planType || '',
        plan_name: planName || 'Subscription',
      },
    })

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url // Return the Checkout URL for modern Stripe.js
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
