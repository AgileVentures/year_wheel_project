import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const b64urlToString = (s: string) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : ''
  return atob(s + pad)
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

    const { sid, e, ts, sig } = await req.json()
    if (!sid || !e || !ts || !sig) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const secret = Deno.env.get('UNSUBSCRIBE_SECRET') ?? ''
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const toVerify = `${sid}.${e}.${ts}`
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(toVerify))
    const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

    if (expected !== sig) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Optional: reject very old tokens (e.g. > 180 days)
    // const now = Math.floor(Date.now() / 1000)
    // if (now - Number(ts) > 15552000) { ... }

    const email = b64urlToString(e)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        newsletter_subscribed: false,
        newsletter_unsubscribed_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
