import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsletterRequest {
  recipientType: 'all' | 'premium' | 'free' | 'admins' | 'custom'
  customEmails?: string[]
  subject: string
  htmlContent: string
  fromName?: string
  templateType?: string
  templateData?: any
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

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      recipientType, 
      customEmails, 
      subject, 
      htmlContent,
      fromName = 'Thomas från YearWheel',
      templateType,
      templateData
    } = await req.json() as NewsletterRequest

    // Get recipient emails based on type
    let recipients: string[] = []

    if (recipientType === 'custom' && customEmails) {
      recipients = customEmails
    } else {
      let query = supabase
        .from('profiles')
        .select('email')

      if (recipientType === 'premium') {
        // Get premium users from subscriptions table
        const { data: premiumUsers } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('status', 'active')
          .in('plan_type', ['monthly', 'yearly'])

        if (premiumUsers && premiumUsers.length > 0) {
          const premiumUserIds = premiumUsers.map(s => s.user_id)
          query = query.in('id', premiumUserIds)
        } else {
          recipients = []
        }
      } else if (recipientType === 'free') {
        // Get users without active subscription
        const { data: premiumUsers } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('status', 'active')
          .in('plan_type', ['monthly', 'yearly'])

        if (premiumUsers && premiumUsers.length > 0) {
          const premiumUserIds = premiumUsers.map(s => s.user_id)
          query = query.not('id', 'in', `(${premiumUserIds.join(',')})`)
        }
      } else if (recipientType === 'admins') {
        query = query.eq('is_admin', true)
      }
      // 'all' uses base query

      const { data: profilesData, error: recipientsError } = await query

      if (recipientsError) {
        throw recipientsError
      }

      recipients = profilesData?.map(p => p.email).filter(Boolean) || []
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send emails via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send emails in batches of 100 (Resend batch limit)
    const batchSize = 100
    const results = []
    const errors = []

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)

      try {
        const response = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(
            batch.map(email => ({
              from: `${fromName} <hello@yearwheel.se>`,
              to: email,
              subject: subject,
              html: htmlContent
            }))
          )
        })

        if (!response.ok) {
          const error = await response.text()
          console.error(`Batch ${i / batchSize + 1} failed:`, error)
          errors.push({ batch: i / batchSize + 1, error })
        } else {
          const result = await response.json()
          results.push(result)
        }
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error)
        errors.push({ batch: i / batchSize + 1, error: error.message })
      }
    }

    // Log newsletter send
    await supabase
      .from('newsletter_sends')
      .insert({
        sent_by: user.id,
        recipient_type: recipientType,
        subject: subject,
        recipient_count: recipients.length,
        success_count: results.length * batchSize,
        error_count: errors.length * batchSize,
        template_type: templateType,
        template_data: templateData,
        sent_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter sent to ${recipients.length} recipients`,
        totalRecipients: recipients.length,
        successfulBatches: results.length,
        failedBatches: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-newsletter function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
