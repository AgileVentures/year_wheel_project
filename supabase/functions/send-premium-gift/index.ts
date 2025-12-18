import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PremiumGiftRequest {
  recipientEmail: string
  recipientName: string
  expiresAt: string
  customMessage?: string
  language?: 'en' | 'sv'
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

    // Verify authentication
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

    // Verify user is admin
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
      recipientEmail,
      recipientName,
      expiresAt,
      customMessage,
      language = 'sv'
    } = await req.json() as PremiumGiftRequest

    // Validate required fields
    if (!recipientEmail || !expiresAt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate duration text
    const expireDate = new Date(expiresAt)
    const durationText = expireDate.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Generate email HTML
    const htmlContent = generatePremiumGiftEmail({
      recipientName: recipientName || recipientEmail.split('@')[0],
      expiresAt: durationText,
      customMessage,
      language
    })

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY environment variable not set')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Sending premium gift email to ${recipientEmail}`)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'YearWheel <hello@notify.yearwheel.se>',
        reply_to: 'hey@communitaslabs.io',
        to: [recipientEmail],
        subject: language === 'en' 
          ? '🎁 You received a YearWheel Premium gift!'
          : '🎁 Du har fått YearWheel Premium i present!',
        html: htmlContent
      })
    })

    const responseText = await response.text()
    console.log(`Resend response status: ${response.status}`)

    if (!response.ok) {
      console.error(`Failed to send premium gift email:`, responseText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: responseText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = JSON.parse(responseText)
    console.log(`Successfully sent premium gift email, ID: ${result.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Premium gift email sent successfully',
        emailId: result.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-premium-gift function:', error)
    
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

/**
 * Generate premium gift email HTML
 * Uses YearWheel brand colors and layout
 */
function generatePremiumGiftEmail({
  recipientName,
  expiresAt,
  customMessage,
  language = 'sv'
}: {
  recipientName: string
  expiresAt: string
  customMessage?: string
  language?: 'en' | 'sv'
}): string {
  const t = language === 'en' ? {
    title: 'You received YearWheel Premium!',
    tagline: 'Visualize and plan your year!',
    badge: '🎁 PREMIUM GIFT',
    heading: 'Congratulations!',
    greeting: `Hi ${recipientName}!`,
    intro: 'Great news! You have received <strong>YearWheel Premium</strong> as a gift.',
    validUntil: `Your premium access is valid until <strong>${expiresAt}</strong>.`,
    features: 'With Premium you get access to:',
    feature1: '✨ Unlimited year wheels',
    feature2: '👥 Team collaboration',
    feature3: '📊 Multi-year planning',
    feature4: '🔄 Version history',
    feature5: '📥 All export formats',
    ctaButton: 'Get started',
    footerText: 'You are receiving this email because you have an account on YearWheel.',
    footerLinks: { support: 'Support', home: 'Home' }
  } : {
    title: 'Du har fått YearWheel Premium!',
    tagline: 'Visualisera och planera ditt år!',
    badge: '🎁 PREMIUM-GÅVA',
    heading: 'Grattis!',
    greeting: `Hej ${recipientName}!`,
    intro: 'Fantastiska nyheter! Du har fått <strong>YearWheel Premium</strong> i present.',
    validUntil: `Ditt premium-medlemskap gäller till <strong>${expiresAt}</strong>.`,
    features: 'Med Premium får du tillgång till:',
    feature1: '✨ Obegränsat antal årshjul',
    feature2: '👥 Team-samarbete',
    feature3: '📊 Flerårsplanering',
    feature4: '🔄 Versionshistorik',
    feature5: '📥 Alla exportformat',
    ctaButton: 'Kom igång',
    footerText: 'Du får detta mail eftersom du har ett konto hos YearWheel.',
    footerLinks: { support: 'Support', home: 'Hem' }
  }

  // Custom message section (if provided)
  const customMessageHtml = customMessage ? `
    <div style="background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="color: #5d4037; font-size: 15px; line-height: 1.8; margin: 0; white-space: pre-line;">
        ${customMessage}
      </p>
    </div>
  ` : ''

  return `
<!DOCTYPE html>
<html lang="${language}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${t.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
      width: 100%;
    }
    
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      max-width: 100%;
      height: auto;
    }
    
    .btn {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      line-height: 1.5;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 164, 166, 0.2);
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 0 16px !important;
      }
      
      .content {
        padding: 24px 20px !important;
      }
      
      h1 {
        font-size: 24px !important;
      }
      
      .btn {
        padding: 14px 32px !important;
        font-size: 16px !important;
      }
    }
  </style>
</head>
<body style="background-color: #f3f4f6; padding: 0; margin: 0; width: 100%;">
  
  <table role="presentation" style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(54, 194, 198, 0.6) 0%, rgba(0, 164, 166, 0.6) 100%); padding: 32px 40px; text-align: center;">
              <div style="margin-bottom: 16px;">
                <h1 style="margin: 0; padding: 0; color: #1B2A63; font-size: 32px; font-weight: 700; font-family: 'Poppins', sans-serif;">YearWheel</h1>
              </div>
              <p style="margin: 8px 0 0 0; color: #1B2A63; font-size: 14px; font-weight: 600;">
                ${t.tagline}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px;">
              
              <!-- Gift Badge -->
              <div style="text-align: center; padding: 16px 24px; background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%); border-radius: 8px; margin-bottom: 32px;">
                <p style="margin: 0; color: #5d4037; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  ${t.badge}
                </p>
              </div>
              
              <!-- Main Message -->
              <h1 style="color: #1B2A63; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; line-height: 1.3; text-align: center;">
                ${t.heading}
              </h1>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 24px 0;">
                ${t.greeting}
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 16px 0;">
                ${t.intro}
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 24px 0;">
                ${t.validUntil}
              </p>
              
              ${customMessageHtml}
              
              <!-- Features Box -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <p style="color: #1B2A63; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                  ${t.features}
                </p>
                <ul style="color: #4b5563; font-size: 15px; line-height: 2; margin: 0; padding-left: 0; list-style: none;">
                  <li>${t.feature1}</li>
                  <li>${t.feature2}</li>
                  <li>${t.feature3}</li>
                  <li>${t.feature4}</li>
                  <li>${t.feature5}</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="https://yearwheel.se/dashboard" class="btn" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(0, 164, 166, 0.2);">
                  ${t.ctaButton}
                </a>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                <a href="https://yearwheel.se" style="color: #00A4A6; text-decoration: none; font-weight: 600;">YearWheel.se</a>
              </p>
              <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px;">
                ${t.footerText}
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://yearwheel.se/support" style="color: #9ca3af; text-decoration: underline;">${t.footerLinks.support}</a> •
                <a href="https://yearwheel.se" style="color: #9ca3af; text-decoration: underline;">${t.footerLinks.home}</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
