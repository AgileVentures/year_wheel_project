import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Sleep utility to avoid rate limits
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface ReminderRow {
  reminder_id: string
  item_id: string
  item_name: string
  wheel_id: string
  wheel_title: string
  reminder_type: 'before_start' | 'after_start' | 'after_completion'
  days_offset: number
  recipient_type: 'team' | 'user'
  recipient_user_id: string | null
  recipient_email: string | null
  recipient_name: string | null
  custom_message: string | null
  item_start_date: string
  item_end_date: string
  item_description: string | null
  item_status: string
}

/**
 * Check and Send Activity Reminders
 * 
 * This edge function is designed to be called daily via Supabase cron scheduler.
 * It checks for pending AND overdue reminders and sends emails via Resend.
 * 
 * Cron setup: Run daily at 9:00 AM UTC
 * SELECT cron.schedule('check-activity-reminders', '0 9 * * *', 'https://[project-ref].supabase.co/functions/v1/check-activity-reminders');
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('[Reminders] Starting reminder check (includes overdue)...')

    // Get today's AND overdue pending reminders
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .rpc('get_pending_reminders_for_date', { p_date: new Date().toISOString().split('T')[0] })

    if (remindersError) {
      console.error('[Reminders] Error fetching reminders:', remindersError)
      throw remindersError
    }

    if (!reminders || reminders.length === 0) {
      console.log('[Reminders] No pending or overdue reminders')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending reminders', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Reminders] Found ${reminders.length} pending/overdue reminders`)

    // Process each reminder
    let sentCount = 0
    let failedCount = 0
    const results = []

    for (const reminder of reminders as ReminderRow[]) {
      try {
        // Get recipients (either specific user or all team members)
        const recipients = await getRecipients(supabaseAdmin, reminder)

        if (recipients.length === 0) {
          console.warn(`[Reminders] No recipients found for reminder ${reminder.reminder_id}`)
          await markReminderFailed(supabaseAdmin, reminder.reminder_id, 'No recipients found')
          failedCount++
          continue
        }

        // Send email to each recipient
        for (const recipient of recipients) {
          try {
            const emailId = await sendReminderEmail(reminder, recipient)
            console.log(`[Reminders] Sent reminder to ${recipient.email}, email ID: ${emailId}`)
            
            // Add delay to avoid rate limits (Resend allows 2 requests/second)
            await sleep(600)
          } catch (emailError) {
            console.error(`[Reminders] Failed to send to ${recipient.email}:`, emailError)
            throw emailError
          }
        }

        // Mark reminder as sent
        await supabaseAdmin.rpc('mark_reminder_sent', {
          p_reminder_id: reminder.reminder_id,
          p_email_id: `batch-${Date.now()}`
        })

        sentCount++
        results.push({
          reminder_id: reminder.reminder_id,
          item_name: reminder.item_name,
          recipients: recipients.map(r => r.email),
          status: 'sent'
        })

      } catch (error) {
        console.error(`[Reminders] Failed to process reminder ${reminder.reminder_id}:`, error)
        await markReminderFailed(supabaseAdmin, reminder.reminder_id, error.message)
        failedCount++
        results.push({
          reminder_id: reminder.reminder_id,
          item_name: reminder.item_name,
          status: 'failed',
          error: error.message
        })
      }
    }

    console.log(`[Reminders] Completed: ${sentCount} sent, ${failedCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: reminders.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Reminders] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Get email recipients for a reminder
 */
async function getRecipients(supabase: any, reminder: ReminderRow) {
  const recipients: Array<{ email: string; name: string }> = []

  if (reminder.recipient_type === 'user' && reminder.recipient_user_id) {
    // Single user
    recipients.push({
      email: reminder.recipient_email!,
      name: reminder.recipient_name!
    })
  } else if (reminder.recipient_type === 'team') {
    // Get all team members
    const { data: wheel } = await supabase
      .from('year_wheels')
      .select('team_id')
      .eq('id', reminder.wheel_id)
      .single()

    if (wheel?.team_id) {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', wheel.team_id)

      if (teamMembers && teamMembers.length > 0) {
        const userIds = teamMembers.map((m: any) => m.user_id)

        const { data: profiles } = await supabase
          .from('profiles')
          .select('email, full_name')
          .in('id', userIds)

        if (profiles) {
          recipients.push(...profiles.map((p: any) => ({
            email: p.email,
            name: p.full_name || p.email
          })))
        }
      }
    }
  }

  return recipients
}

/**
 * Send reminder email via Resend
 */
async function sendReminderEmail(
  reminder: ReminderRow,
  recipient: { email: string; name: string }
): Promise<string> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const APP_URL = Deno.env.get('APP_URL') || 'https://yearwheel.se'
  const wheelUrl = `${APP_URL}/wheel/${reminder.wheel_id}?item=${reminder.item_id}`

  // Format dates
  const startDate = new Date(reminder.item_start_date).toLocaleDateString('sv-SE')
  const endDate = new Date(reminder.item_end_date).toLocaleDateString('sv-SE')

  // Determine reminder context text
  let reminderContext = ''
  if (reminder.reminder_type === 'before_start') {
    reminderContext = `börjar om ${reminder.days_offset} dag${reminder.days_offset !== 1 ? 'ar' : ''}`
  } else if (reminder.reminder_type === 'after_start') {
    reminderContext = `startade för ${reminder.days_offset} dag${reminder.days_offset !== 1 ? 'ar' : ''} sedan`
  } else if (reminder.reminder_type === 'after_completion') {
    reminderContext = `skulle vara klar för ${reminder.days_offset} dag${reminder.days_offset !== 1 ? 'ar' : ''} sedan`
  }

  // Build HTML email with YearWheel template
  const emailContent = `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hej ${recipient.name}!
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Detta är en påminnelse om aktiviteten <strong>"${reminder.item_name}"</strong> som ${reminderContext}.
    </p>

    <!-- Activity Card -->
    <div style="background-color: #f9fafb; border-left: 4px solid #00A4A6; padding: 20px; margin-bottom: 24px; border-radius: 4px;">
      <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 12px 0; font-weight: 600;">
        ${reminder.item_name}
      </h2>
      
      <div style="color: #6b7280; font-size: 14px; line-height: 1.8;">
        <p style="margin: 4px 0;"><strong>Hjul:</strong> ${reminder.wheel_title}</p>
        <p style="margin: 4px 0;"><strong>Startdatum:</strong> ${startDate}</p>
        <p style="margin: 4px 0;"><strong>Slutdatum:</strong> ${endDate}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> ${translateStatus(reminder.item_status)}</p>
        ${reminder.item_description ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #374151;"><strong>Beskrivning:</strong></p>
            <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${reminder.item_description}</p>
          </div>
        ` : ''}
      </div>
    </div>

    ${reminder.custom_message ? `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
          <strong>Meddelande:</strong><br>
          ${reminder.custom_message}
        </p>
      </div>
    ` : ''}

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${wheelUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Visa aktivitet
      </a>
    </div>

    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
      Länken tar dig direkt till aktiviteten i ditt hjul.
    </p>
  `

  const htmlContent = emailLayout(emailContent, `Påminnelse: ${reminder.item_name}`, 'Visualisera och planera ditt år!')
  
  // Email layout function (based on emailTemplates.js)
  function emailLayout(content: string, preheader = '', tagline = 'Visualisera och planera ditt år!') {
    return `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>YearWheel</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
      width: 100%;
    }
    table { border-collapse: collapse; border-spacing: 0; }
    img { border: 0; max-width: 100%; height: auto; }
    .preheader { display: none; max-width: 0; max-height: 0; overflow: hidden; }
  </style>
</head>
<body style="background-color: #f3f4f6; padding: 0; margin: 0;">
  <span class="preheader">${preheader}</span>
  <table role="presentation" style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, rgba(54, 194, 198, 0.6) 0%, rgba(0, 164, 166, 0.6) 100%); padding: 32px 40px; text-align: center;">
              <div style="margin-bottom: 16px;">
                <img src="https://yearwheel.se/year_wheel_logo_transparent.png" alt="YearWheel" width="220" />
              </div>
              <p style="margin: 8px 0 0 0; color: #1B2A63; font-size: 14px; font-weight: 600;">${tagline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">${content}</td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                <a href="https://yearwheel.se" style="color: #00A4A6; text-decoration: none; font-weight: 600;">YearWheel.se</a>
              </p>
              <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px;">
                Du får detta mail för att du har ett konto hos YearWheel.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://yearwheel.se/settings" style="color: #9ca3af; text-decoration: underline;">Inställningar</a>
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

  // Send via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'YearWheel Påminnelser <hello@notify.yearwheel.se>',
      reply_to: 'hey@communitaslabs.io',
      to: [recipient.email],
      subject: `Påminnelse: ${reminder.item_name} ${reminderContext}`,
      html: htmlContent
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${error}`)
  }

  const result = await response.json()
  return result.id
}

/**
 * Mark reminder as failed
 */
async function markReminderFailed(supabase: any, reminderId: string, errorMessage: string) {
  await supabase.rpc('mark_reminder_failed', {
    p_reminder_id: reminderId,
    p_error_message: errorMessage
  })
}

/**
 * Translate status to Swedish
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'planned': 'Planerad',
    'not_started': 'Ej påbörjad',
    'started': 'Påbörjad',
    'in_progress': 'Pågående',
    'done': 'Klar'
  }
  return translations[status] || status
}
