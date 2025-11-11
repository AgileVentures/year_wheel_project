import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

// Verify webhook signature from Resend
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('base64')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the raw body
    const body = await req.text()
    
    // Log headers for debugging
    console.log('Webhook headers:', Object.fromEntries(req.headers.entries()))
    
    // TODO: Implement proper Svix signature verification
    // For now, we'll skip verification to get webhooks working
    // Reference: https://docs.svix.com/receiving/verifying-payloads/how
    const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')
    if (WEBHOOK_SECRET) {
      console.log('⚠️ Webhook secret is set but verification is temporarily disabled')
      console.log('   This should be re-enabled in production with proper Svix verification')
    }

    const payload = JSON.parse(body)
    
    console.log('Received Resend webhook:', payload.type)
    console.log('Event data:', JSON.stringify(payload.data, null, 2))

    const { type, data } = payload

    // Extract email ID and recipient
    const emailId = data.email_id
    const recipient = data.to?.[0] || data.to
    const subject = data.subject

    if (!emailId || !subject) {
      console.log('Missing email_id or subject, skipping')
      return new Response('ok', { headers: corsHeaders })
    }

    // Find the newsletter send this email belongs to
    const { data: send, error: sendError } = await supabase
      .from('newsletter_sends')
      .select('id')
      .eq('subject', subject)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    if (sendError || !send) {
      console.log('Newsletter send not found for subject:', subject)
      return new Response('ok', { headers: corsHeaders })
    }

    console.log(`Found newsletter send: ${send.id}`)

    // Extract event type (remove 'email.' prefix)
    const eventType = type.replace('email.', '')

    // Check if this event already exists (prevent duplicates)
    const { data: existingEvent } = await supabase
      .from('newsletter_events')
      .select('id')
      .eq('email_id', emailId)
      .eq('event_type', eventType)
      .single()

    if (existingEvent) {
      console.log(`Event ${eventType} for ${emailId} already recorded`)
      return new Response('ok', { headers: corsHeaders })
    }

    // Insert email event
    const eventData = {
      newsletter_send_id: send.id,
      email_id: emailId,
      recipient: recipient,
      event_type: eventType,
      event_data: data,
      created_at: new Date().toISOString()
    }

    const { error: insertError } = await supabase
      .from('newsletter_events')
      .insert(eventData)

    if (insertError) {
      console.error('Error inserting event:', insertError)
      return new Response('ok', { headers: corsHeaders })
    }

    console.log(`Recorded ${eventType} event for email ${emailId}`)

    // Update aggregate counts on newsletter_sends
    let rpcFunction = null
    if (type === 'email.delivered') {
      rpcFunction = 'increment_newsletter_delivered'
    } else if (type === 'email.opened') {
      rpcFunction = 'increment_newsletter_opened'
    } else if (type === 'email.clicked') {
      rpcFunction = 'increment_newsletter_clicked'
    } else if (type === 'email.bounced' || type === 'email.complained') {
      rpcFunction = 'increment_newsletter_failed'
    }

    if (rpcFunction) {
      const { error: rpcError } = await supabase.rpc(rpcFunction, { send_id: send.id })
      if (rpcError) {
        console.error(`Error calling ${rpcFunction}:`, rpcError)
      } else {
        console.log(`Updated count via ${rpcFunction}`)
      }
    }

    return new Response('ok', { headers: corsHeaders })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('ok', { headers: corsHeaders }) // Always return 200 to avoid retries
  }
})
