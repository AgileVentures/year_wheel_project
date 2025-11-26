import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TeamInviteRequest {
  invitationId: string
  teamName: string
  inviterName: string
  recipientEmail: string
  inviteToken: string
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

    const { 
      invitationId,
      teamName,
      inviterName,
      recipientEmail,
      inviteToken,
      language = 'sv'
    } = await req.json() as TeamInviteRequest

    console.log('Received team invite request with language:', language)

    // Validate required fields
    if (!invitationId || !teamName || !recipientEmail || !inviteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate invite URL
    const inviteUrl = `${Deno.env.get('SITE_URL') || 'https://yearwheel.se'}/invite/${inviteToken}`

    // Create HTML email using YearWheel brand template
    const htmlContent = generateTeamInviteEmail({
      teamName,
      inviterName: inviterName || (language === 'en' ? 'A team member' : 'Ett teammedlem'),
      inviteUrl,
      recipientEmail,
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

    console.log(`Sending team invite to ${recipientEmail} for team "${teamName}" in ${language}`)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'YearWheel Team <hello@notify.yearwheel.se>',
        reply_to: 'hey@communitaslabs.io',
        to: [recipientEmail],
        subject: language === 'en' 
          ? `Invitation to join "${teamName}" on YearWheel`
          : `Inbjudan till teamet "${teamName}" på YearWheel`,
        html: htmlContent
      })
    })

    const responseText = await response.text()
    console.log(`Resend response status: ${response.status}`)
    console.log(`Resend response: ${responseText}`)

    if (!response.ok) {
      console.error(`Failed to send invite email:`, responseText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send invitation email',
          details: responseText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = JSON.parse(responseText)
    console.log(`Successfully sent team invite email, ID: ${result.id}`)

    // Update invitation record with email sent status
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({ 
        email_sent_at: new Date().toISOString(),
        resend_email_id: result.id
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Failed to update invitation record:', updateError)
      // Don't fail the request, email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Team invitation sent successfully',
        emailId: result.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-team-invite function:', error)
    
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
 * Generate team invitation email HTML
 * Uses YearWheel brand colors and layout
 */
function generateTeamInviteEmail({
  teamName,
  inviterName,
  inviteUrl,
  recipientEmail,
  language = 'sv'
}: {
  teamName: string
  inviterName: string
  inviteUrl: string
  recipientEmail: string
  language?: 'en' | 'sv'
}): string {
  const t = language === 'en' ? {
    title: `Invitation to join "${teamName}" on YearWheel`,
    tagline: 'Visualize and plan your year!',
    badge: '🎉 TEAM INVITATION',
    heading: `You're invited to join "${teamName}"`,
    greeting: 'Hello!',
    intro1: `<strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong> on YearWheel.`,
    intro2: 'With YearWheel, you can visualize and plan your activities throughout the year together. Collaborate in real-time, share wheels, and keep your team synced!',
    ctaButton: 'Accept invitation',
    tipTitle: '💡 Tip:',
    tipText: `If you don't already have an account, you can register with this email address (<strong>${recipientEmail}</strong>) when you accept the invitation.`,
    linkLabel: 'Button not working? Copy and paste this link into your browser:',
    footerText: 'You are receiving this email because someone invited you to a team on YearWheel.',
    footerLinks: { support: 'Support', home: 'Home' }
  } : {
    title: `Inbjudan till "${teamName}" - YearWheel`,
    tagline: 'Visualisera och planera ditt år!',
    badge: '🎉 TEAMINBJUDAN',
    heading: `Du är inbjuden till "${teamName}"`,
    greeting: 'Hej!',
    intro1: `<strong>${inviterName}</strong> har bjudit in dig att bli medlem i teamet <strong>"${teamName}"</strong> på YearWheel.`,
    intro2: 'Med YearWheel kan ni tillsammans visualisera och planera era aktiviteter genom hela året. Samarbeta i realtid, dela hjul och håll teamet synkat!',
    ctaButton: 'Acceptera inbjudan',
    tipTitle: '💡 Tips:',
    tipText: `Om du inte redan har ett konto kommer du att kunna registrera dig med denna e-postadress (<strong>${recipientEmail}</strong>) när du accepterar inbjudan.`,
    linkLabel: 'Fungerar inte knappen? Kopiera och klistra in denna länk i din webbläsare:',
    footerText: 'Du får detta mail eftersom någon har bjudit in dig till ett team på YearWheel.',
    footerLinks: { support: 'Support', home: 'Hem' }
  }

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
              
              <!-- Invitation Badge -->
              <div style="text-align: center; padding: 16px 24px; background: linear-gradient(135deg, #A4E6E0 0%, #36C2C6 100%); border-radius: 8px; margin-bottom: 32px;">
                <p style="margin: 0; color: #1B2A63; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
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
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 24px 0;">
                ${t.intro1}
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 32px 0;">
                ${t.intro2}
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" class="btn" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(0, 164, 166, 0.2);">
                  ${t.ctaButton}
                </a>
              </div>
              
              <!-- Info Box -->
              <div style="background-color: #f9fafb; border-left: 4px solid #00A4A6; border-radius: 4px; padding: 20px; margin: 32px 0;">
                <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong style="color: #1B2A63;">${t.tipTitle}</strong> ${t.tipText}
                </p>
              </div>
              
              <!-- Alternative Link -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
                  ${t.linkLabel}
                </p>
                <p style="color: #00A4A6; font-size: 13px; word-break: break-all; margin: 0;">
                  <a href="${inviteUrl}" style="color: #00A4A6; text-decoration: underline;">${inviteUrl}</a>
                </p>
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
