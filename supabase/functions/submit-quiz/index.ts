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

    // Send email with results
    try {
      await sendQuizResultEmail(email, persona, painScore, readinessScore, answers)
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // Don't fail the request if email fails
    }

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

// Helper function to send result email with Resend
async function sendQuizResultEmail(
  email: string,
  persona: string,
  painScore: number,
  readinessScore: number,
  answers: Record<string, any>
) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    return
  }

  // Determine pain level
  const painLevel = painScore > 15 ? 'high' : painScore > 8 ? 'medium' : 'low'

  // Persona-specific data
  const personaConfig = {
    marketing: {
      displayName: 'Marknadsplanering',
      template: 'Marknadsplan 2026',
      problem1: 'kaotisk innehållskalender',
      problem2: 'dålig samordning mellan kanaler',
      problem3: 'tidskrävande rapporter till ledningen'
    },
    project: {
      displayName: 'Projektplanering',
      template: 'Kundprojekt 2026',
      problem1: 'verktyg som inte passar',
      problem2: 'svårt att få projektöversikt',
      problem3: 'kunder vill ha enklare presentationer'
    },
    education: {
      displayName: 'Läsårsplanering',
      template: 'Läsårsplanering 2025/2026',
      problem1: 'svårt att få helhetsbild av läsåret',
      problem2: 'krockar mellan aktiviteter',
      problem3: 'föräldrar vill ha tydligare översikt'
    }
  }

  const config = personaConfig[persona as keyof typeof personaConfig]
  
  // Build email content based on pain level
  let subject: string
  let htmlContent: string

  if (painLevel === 'high') {
    subject = `🎯 Vi kan lösa dina ${config.displayName.toLowerCase()}-utmaningar`
    htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 20px;">Hej!</h1>
  
  <p style="font-size: 16px; margin-bottom: 16px;">Tack för att du tog vår quiz! Baserat på dina svar ser vi att du kämpar med:</p>
  
  <ul style="background: #fef2f2; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0;">
    <li style="margin-bottom: 8px;">✗ ${config.problem1}</li>
    <li style="margin-bottom: 8px;">✗ ${config.problem2}</li>
    <li style="margin-bottom: 8px;">✗ ${config.problem3}</li>
  </ul>
  
  <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <h2 style="color: #1e40af; font-size: 18px; margin-top: 0;">Din analys</h2>
    <p style="margin: 8px 0;"><strong>Smärtpoäng:</strong> ${painScore}/30 - Hög potential för förbättring</p>
    <p style="margin: 8px 0;"><strong>Beredskap:</strong> ${readinessScore}/10</p>
  </div>
  
  <h2 style="color: #059669; font-size: 20px; margin-top: 32px;">Goda nyheter!</h2>
  
  <p style="font-size: 16px;">YearWheel kan hjälpa dig direkt genom att:</p>
  <ul style="list-style: none; padding-left: 0;">
    <li style="margin-bottom: 12px;">✓ Ge överblick över hela året på 5 sekunder</li>
    <li style="margin-bottom: 12px;">✓ Eliminera kaos i Excel/Google Sheets</li>
    <li style="margin-bottom: 12px;">✓ Spara dig 4-6 timmar/vecka på administration</li>
  </ul>
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px; margin: 32px 0; text-align: center;">
    <h3 style="color: white; margin-top: 0; font-size: 18px;">Perfekt för dig: ${config.template}</h3>
    <a href="https://yearwheel.se/auth?mode=signup&source=quiz_email&persona=${persona}" 
       style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 12px;">
      Kom igång gratis →
    </a>
    <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 12px; margin-bottom: 0;">Ingen kreditkort krävs • 2 gratis årshjul</p>
  </div>
  
  <p style="font-size: 14px; color: #666; margin-top: 32px;">
    Behöver du hjälp att komma igång? Svara på detta mail så hjälper vi till!
  </p>
  
  <p style="font-size: 16px; margin-top: 24px;">
    Vänliga hälsningar,<br>
    <strong>Thomas</strong><br>
    Grundare, YearWheel
  </p>
  
  <p style="font-size: 14px; color: #059669; border-top: 2px solid #d1fae5; padding-top: 16px; margin-top: 32px;">
    🎁 <strong>P.S.</strong> De första 50 användarna får 3 månaders Premium gratis
  </p>
  
</body>
</html>
    `
  } else if (painLevel === 'medium') {
    subject = `✨ Din ${config.displayName.toLowerCase()}-analys + 3 snabba förbättringar`
    htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 20px;">Hej!</h1>
  
  <p style="font-size: 16px; margin-bottom: 16px;">Tack för att du deltog i vår quiz! Ni är på rätt väg, men vi ser möjligheter att göra det ännu bättre.</p>
  
  <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <h2 style="color: #92400e; font-size: 18px; margin-top: 0;">Din analys</h2>
    <p style="margin: 8px 0;"><strong>Smärtpoäng:</strong> ${painScore}/30 - Bra processer, kan optimeras</p>
    <p style="margin: 8px 0;"><strong>Beredskap:</strong> ${readinessScore}/10</p>
  </div>
  
  <h2 style="color: #2563eb; font-size: 20px; margin-top: 32px;">3 snabba vinster med YearWheel</h2>
  
  <div style="margin: 20px 0;">
    <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 20px;">
      <h3 style="color: #1e40af; font-size: 18px; margin: 0 0 8px 0;">1️⃣ Snabbare rapporter</h3>
      <p style="margin: 0; color: #666;">Från 2 timmar → 5 minuter med visuell export</p>
    </div>
    
    <div style="border-left: 4px solid #8b5cf6; padding-left: 16px; margin-bottom: 20px;">
      <h3 style="color: #5b21b6; font-size: 18px; margin: 0 0 8px 0;">2️⃣ Bättre teamsamordning</h3>
      <p style="margin: 0; color: #666;">Alla ser samma plan i realtid</p>
    </div>
    
    <div style="border-left: 4px solid #ec4899; padding-left: 16px; margin-bottom: 20px;">
      <h3 style="color: #9f1239; font-size: 18px; margin: 0 0 8px 0;">3️⃣ Professionella presentationer</h3>
      <p style="margin: 0; color: #666;">Imponera på stakeholders med ett klick</p>
    </div>
  </div>
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 8px; margin: 32px 0; text-align: center;">
    <h3 style="color: white; margin-top: 0; font-size: 18px;">Rekommenderad mall: ${config.template}</h3>
    <a href="https://yearwheel.se/auth?mode=signup&source=quiz_email&persona=${persona}" 
       style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 12px;">
      Prova gratis i 14 dagar →
    </a>
  </div>
  
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666; font-style: italic;">
      "Vi testade både Monday och Asana men YearWheel ger oss exakt den översikt vi behöver utan krångel"
    </p>
    <p style="margin: 0; font-size: 14px; color: #666;">
      <strong>- Johan S</strong>, Projektledare
    </p>
  </div>
  
  <p style="font-size: 16px; margin-top: 24px;">
    Lycka till med planeringen!<br>
    <strong>Thomas</strong>
  </p>
  
</body>
</html>
    `
  } else {
    subject = `👏 Imponerande! Ta nästa steg i ${config.displayName.toLowerCase()}`
    htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <h1 style="color: #059669; font-size: 24px; margin-bottom: 20px;">Wow - ni är proffs! 👏</h1>
  
  <p style="font-size: 16px; margin-bottom: 16px;">Baserat på dina svar har ni redan ett fungerande system. Det är sällsynt!</p>
  
  <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <h2 style="color: #065f46; font-size: 18px; margin-top: 0;">Din analys</h2>
    <p style="margin: 8px 0;"><strong>Smärtpoäng:</strong> ${painScore}/30 - Ni är duktiga redan</p>
    <p style="margin: 8px 0;"><strong>Beredskap:</strong> ${readinessScore}/10</p>
  </div>
  
  <h2 style="color: #2563eb; font-size: 20px; margin-top: 32px;">Varför YearWheel ändå kan vara relevant</h2>
  
  <p style="font-size: 16px;">För team som er, som redan planerar bra, handlar det om:</p>
  <ul style="list-style: none; padding-left: 0;">
    <li style="margin-bottom: 12px;">✨ Lyfta presentationer till nästa nivå</li>
    <li style="margin-bottom: 12px;">🎯 Wow-effekt i kundmöten och styrelserum</li>
    <li style="margin-bottom: 12px;">🤖 AI-assistans för att hitta mönster och optimera</li>
  </ul>
  
  <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
    <h3 style="color: #1e40af; font-size: 18px; margin-top: 0;">Fokusera på:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Export-funktionen för professionella presentationer</li>
      <li style="margin-bottom: 8px;">AI-assistenten för optimeringsförslag</li>
      <li style="margin-bottom: 8px;">Versionshantering för att spara snapshots</li>
    </ul>
  </div>
  
  <div style="text-align: center; margin: 32px 0;">
    <a href="https://yearwheel.se/templates" 
       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Se mall-galleriet för inspiration →
    </a>
  </div>
  
  <p style="font-size: 16px; margin-top: 24px;">
    Behöver ni något i framtiden, vet ni var ni hittar oss!
  </p>
  
  <p style="font-size: 16px; margin-top: 24px;">
    <strong>Thomas</strong><br>
    YearWheel
  </p>
  
  <p style="font-size: 14px; color: #666; border-top: 2px solid #e5e7eb; padding-top: 16px; margin-top: 32px;">
    <strong>P.S.</strong> Ni kan alltid boka en 15-min demo för att se AI-funktionerna live
  </p>
  
</body>
</html>
    `
  }

  // Send via Resend
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Thomas från YearWheel <hello@notify.yearwheel.se>',
        reply_to: 'info@auctum.se',
        to: email,
        subject: subject,
        html: htmlContent
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resend API error: ${error}`)
    }

    const result = await response.json()
    console.log('Email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Failed to send email via Resend:', error)
    throw error
  }
}

// Helper function to send result email (OLD - keeping for reference)
async function sendQuizResultEmailOLD(
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
