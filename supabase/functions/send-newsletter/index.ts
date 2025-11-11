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
      console.error('RESEND_API_KEY environment variable not set')
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log what we're about to send
    console.log(`Attempting to send to ${recipients.length} recipients`)
    console.log(`From: ${fromName} <hello@yearwheel.se>`)
    console.log(`Subject: ${subject}`)

    // Send emails in batches of 100 (Resend batch limit)
    const batchSize = 100
    const results = []
    const errors = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1

      console.log(`Processing batch ${batchNumber} with ${batch.length} recipients`)

      try {
        const payload = batch.map(email => ({
          from: `${fromName} <hello@yearwheel.se>`,
          to: [email],
          subject: subject,
          html: htmlContent
        }))

        console.log(`Sending batch ${batchNumber} to Resend API`)
        
        const response = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        const responseText = await response.text()
        console.log(`Batch ${batchNumber} response status: ${response.status}`)
        console.log(`Batch ${batchNumber} response: ${responseText}`)

        if (!response.ok) {
          console.error(`Batch ${batchNumber} failed with status ${response.status}:`, responseText)
          errors.push({ 
            batch: batchNumber, 
            error: responseText,
            status: response.status,
            recipients: batch.length
          })
          errorCount += batch.length
        } else {
          const result = JSON.parse(responseText)
          results.push(result)
          successCount += batch.length
          console.log(`Batch ${batchNumber} succeeded: ${batch.length} emails`)
        }
      } catch (error) {
        console.error(`Batch ${batchNumber} exception:`, error)
        errors.push({ 
          batch: batchNumber, 
          error: error instanceof Error ? error.message : String(error),
          recipients: batch.length
        })
        errorCount += batch.length
      }
    }

    console.log(`Send complete: ${successCount} succeeded, ${errorCount} failed`)

    // Log newsletter send
    const logResult = await supabase
      .from('newsletter_sends')
      .insert({
        sent_by: user.id,
        recipient_type: recipientType,
        subject: subject,
        recipient_count: recipients.length,
        success_count: successCount,
        error_count: errorCount,
        template_type: templateType,
        template_data: templateData,
        sent_at: new Date().toISOString()
      })

    if (logResult.error) {
      console.error('Failed to log newsletter send:', logResult.error)
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Newsletter sent successfully to ${successCount} recipients`
          : `Partially sent: ${successCount} succeeded, ${errorCount} failed`,
        totalRecipients: recipients.length,
        successCount: successCount,
        errorCount: errorCount,
        successfulBatches: results.length,
        failedBatches: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: errors.length === 0 ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-newsletter function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
