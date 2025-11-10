import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuizSubmission {
  email: string
  persona: 'marketing' | 'project' | 'education'
  answers: Record<string, any>
  sourceUrl?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, persona, answers, sourceUrl } = await req.json() as QuizSubmission

    // Validate input
    if (!email || !persona || !answers) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate scores
    let painScore = 0
    let readinessScore = 0

    Object.entries(answers).forEach(([key, value]: [string, any]) => {
      if (key.startsWith('pain_')) {
        if (Array.isArray(value)) {
          // Multiple choice - sum all scores
          painScore += value.reduce((sum, item) => sum + (item.score || 0), 0)
        } else {
          painScore += value.score || 0
        }
      } else if (key.startsWith('readiness_')) {
        readinessScore += value.score || 0
      }
    })

    // Get user metadata
    const userAgent = req.headers.get('user-agent') || null
    const forwarded = req.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : null

    // Insert quiz lead
    const { data: lead, error: insertError } = await supabase
      .from('quiz_leads')
      .insert({
        email,
        persona,
        answers,
        pain_score: painScore,
        readiness_score: readinessScore,
        source_url: sourceUrl,
        user_agent: userAgent,
        ip_address: ipAddress,
        status: 'new'
      })
      .select()
      .single()

    if (insertError) {
      // Handle duplicate email + persona combo
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            error: 'Du har redan tagit denna quiz',
            message: 'Vi har redan dina svar för denna quiz.'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw insertError
    }

    // TODO: Trigger email automation
    // await sendQuizResultEmail(email, persona, painScore, readinessScore)

    // TODO: Send to CRM/Marketing automation
    // await sendToCRM(lead)

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        painScore,
        readinessScore,
        message: 'Tack för dina svar! Vi skickar din personliga rekommendation till din email.'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in submit-quiz function:', error)
    
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

// Helper function to send result email (TODO: Implement)
async function sendQuizResultEmail(
  email: string,
  persona: string,
  painScore: number,
  readinessScore: number
) {
  // Use Supabase Auth email or external service (SendGrid, Postmark, etc.)
  
  const personaData = {
    marketing: {
      subject: 'Din marknadsplaneringsanalys från YearWheel',
      templateId: 'marketing-quiz-results'
    },
    project: {
      subject: 'Din projektplaneringsanalys från YearWheel',
      templateId: 'project-quiz-results'
    },
    education: {
      subject: 'Din läsårsplaneringsanalys från YearWheel',
      templateId: 'education-quiz-results'
    }
  }

  const { subject, templateId } = personaData[persona as keyof typeof personaData]

  // TODO: Implement email sending
  // Example with SendGrid/Postmark:
  // await fetch('https://api.sendgrid.com/v3/mail/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     personalizations: [{
  //       to: [{ email }],
  //       dynamic_template_data: {
  //         pain_score: painScore,
  //         readiness_score: readinessScore,
  //         persona
  //       }
  //     }],
  //     from: { email: 'hello@yearwheel.se', name: 'YearWheel' },
  //     template_id: templateId
  //   })
  // })
}

// Helper function to send to CRM (TODO: Implement)
async function sendToCRM(lead: any) {
  // Example with HubSpot, Pipedrive, or similar
  // await fetch('https://api.hubapi.com/contacts/v1/contact/', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${Deno.env.get('HUBSPOT_API_KEY')}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     properties: [
  //       { property: 'email', value: lead.email },
  //       { property: 'persona', value: lead.persona },
  //       { property: 'pain_score', value: lead.pain_score },
  //       { property: 'readiness_score', value: lead.readiness_score },
  //       { property: 'lead_source', value: 'quiz' }
  //     ]
  //   })
  // })
}
