// Supabase Edge Function: Generate unique affiliate link code
// POST /functions/v1/generate-affiliate-code
// Body: { organizationId: string, baseName?: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { organizationId, baseName } = await req.json()

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is member of the organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Not authorized for this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a unique code
    let code = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      // Generate code based on baseName or random
      if (baseName) {
        // Sanitize baseName: lowercase, replace spaces/special chars with hyphens
        const sanitized = baseName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
          .substring(0, 30) // Limit length
        
        // Add random suffix if this is a retry
        const suffix = attempts > 0 ? `-${generateRandomString(4)}` : ''
        code = `${sanitized}${suffix}`
      } else {
        // Generate fully random code
        code = generateRandomString(8)
      }

      // Check if code exists
      const { data: existing, error: checkError } = await supabaseClient
        .from('affiliate_links')
        .select('id')
        .eq('code', code)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (!existing) {
        isUnique = true
      }

      attempts++
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique code after multiple attempts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the generated code
    return new Response(
      JSON.stringify({ code, suggestedUrl: `${getBaseUrl(req)}?ref=${code}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating affiliate code:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to generate random string
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Helper function to get base URL from request
function getBaseUrl(req: Request): string {
  const url = new URL(req.url)
  const origin = req.headers.get('origin') || req.headers.get('referer')
  
  if (origin) {
    return new URL(origin).origin
  }
  
  // Fallback to production URL or localhost
  return Deno.env.get('APP_URL') || 'http://localhost:5173'
}
