/**
 * Email Templates for YearWheel
 * Using brand colors and Resend best practices
 * 
 * Brand Colors:
 * - Primary Teal: #00A4A6
 * - Deep Blue: #1E1EBE
 * - Navy: #1B2A63
 * - Royal Blue: #2D4EC8
 * - Turquoise: #36C2C6
 * - Light Aqua: #A4E6E0
 * - Lime: #9FCB3E
 */

/**
 * Base email layout wrapper
 * Ensures consistent styling across all emails
 */
export const emailLayout = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="sv" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <style>
    td,th,div,p,a,h1,h2,h3,h4,h5,h6 {font-family: "Segoe UI", sans-serif; mso-line-height-rule: exactly;}
  </style>
  <![endif]-->
  <title>YearWheel</title>
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
    
    .preheader {
      display: none;
      max-width: 0;
      max-height: 0;
      overflow: hidden;
      font-size: 1px;
      line-height: 1px;
      color: #f3f4f6;
      opacity: 0;
    }
    
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      line-height: 1.5;
      text-align: center;
    }
    
    .btn:hover {
      background: linear-gradient(135deg, #008B8D 0%, #2DA9AD 100%);
    }
    
    .btn-secondary {
      background: #1E1EBE;
    }
    
    .btn-secondary:hover {
      background: #1515A0;
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
      
      h2 {
        font-size: 20px !important;
      }
    }
  </style>
</head>
<body style="background-color: #f3f4f6; padding: 0; margin: 0; width: 100%;">
  <span class="preheader">${preheader}</span>
  
  <table role="presentation" style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: #336B3E; padding: 32px 40px; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 16px;">
                <img src="https://yearwheel.se/year_wheel_logo.svg" alt="YearWheel" width="200" style="max-width: 200px; height: auto; display: inline-block;">
              </div>
              <p style="margin: 8px 0 0 0; color: #FFFFFF; font-size: 14px; font-weight: 400;">
                Visualisera och planera ditt år!
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                <a href="https://yearwheel.se" style="color: #00A4A6; text-decoration: none; font-weight: 600;">YearWheel.se</a>
              </p>
              <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px;">
                Du får detta mail för att du har ett konto hos YearWheel.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Avregistrera</a> •
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

/**
 * Newsletter template
 */
export const newsletterTemplate = ({ 
  heading, 
  intro, 
  sections = [], 
  cta,
  ps 
}) => {
  const sectionsHtml = sections.map(section => `
    <div style="margin-bottom: 32px;">
      ${section.image ? `
        <img src="${section.image}" alt="${section.title}" 
             style="width: 100%; border-radius: 8px; margin-bottom: 16px;">
      ` : ''}
      
      ${section.title ? `
        <h2 style="color: #1B2A63; font-size: 22px; font-weight: 600; margin: 0 0 12px 0;">
          ${section.title}
        </h2>
      ` : ''}
      
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        ${section.content}
      </p>
      
      ${section.link ? `
        <a href="${section.link.url}" 
           style="color: #00A4A6; text-decoration: none; font-weight: 600; font-size: 15px;">
          ${section.link.text} →
        </a>
      ` : ''}
    </div>
  `).join('')

  const content = `
    <h1 style="color: #1B2A63; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; line-height: 1.3;">
      ${heading}
    </h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
      ${intro}
    </p>
    
    ${sectionsHtml}
    
    ${cta ? `
      <div style="text-align: center; margin: 40px 0 32px 0;">
        <a href="${cta.url}" class="btn" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          ${cta.text}
        </a>
      </div>
    ` : ''}
    
    ${ps ? `
      <div style="border-top: 2px solid #A4E6E0; padding-top: 24px; margin-top: 40px;">
        <p style="color: #2E9E97; font-size: 14px; line-height: 1.6; margin: 0;">
          <strong>P.S.</strong> ${ps}
        </p>
      </div>
    ` : ''}
  `

  return emailLayout(content, intro.substring(0, 100))
}

/**
 * Feature announcement template
 */
export const featureAnnouncementTemplate = ({ 
  feature, 
  description, 
  benefits = [], 
  screenshot, 
  cta 
}) => {
  const benefitsHtml = benefits.map(benefit => `
    <tr>
      <td style="padding: 12px 0;">
        <table role="presentation">
          <tr>
            <td style="width: 32px; vertical-align: top;">
              <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #9FCB3E 0%, #2E9E97 100%); border-radius: 50%; text-align: center; line-height: 24px; color: #ffffff; font-weight: 700; font-size: 14px;">✓</span>
            </td>
            <td style="color: #4b5563; font-size: 15px; line-height: 1.6; padding-left: 12px;">
              ${benefit}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  const content = `
    <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #A4E6E0 0%, #36C2C6 100%); border-radius: 8px; margin-bottom: 32px;">
      <p style="margin: 0; color: #1B2A63; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        Ny Funktion 🎉
      </p>
    </div>
    
    <h1 style="color: #1B2A63; font-size: 28px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
      ${feature}
    </h1>
    
    <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin: 0 0 32px 0;">
      ${description}
    </p>
    
    ${screenshot ? `
      <img src="${screenshot}" alt="${feature}" 
           style="width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 32px;">
    ` : ''}
    
    ${benefits.length > 0 ? `
      <h2 style="color: #1B2A63; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
        Vad du får:
      </h2>
      <table role="presentation" style="width: 100%; margin-bottom: 32px;">
        ${benefitsHtml}
      </table>
    ` : ''}
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${cta.url}" class="btn" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${cta.text}
      </a>
    </div>
  `

  return emailLayout(content, description.substring(0, 100))
}

/**
 * Tips & Tricks template
 */
export const tipsTemplate = ({ title, intro, tips = [], cta }) => {
  const tipsHtml = tips.map((tip, index) => `
    <div style="margin-bottom: 28px; padding: 24px; background-color: #f9fafb; border-left: 4px solid ${
      index % 3 === 0 ? '#00A4A6' : index % 3 === 1 ? '#2D4EC8' : '#9FCB3E'
    }; border-radius: 4px;">
      <h3 style="color: #1B2A63; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
        ${tip.title}
      </h3>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
        ${tip.description}
      </p>
      ${tip.link ? `
        <a href="${tip.link.url}" 
           style="display: inline-block; margin-top: 12px; color: #00A4A6; text-decoration: none; font-weight: 600; font-size: 14px;">
          ${tip.link.text} →
        </a>
      ` : ''}
    </div>
  `).join('')

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="display: inline-block; font-size: 48px;">💡</span>
    </div>
    
    <h1 style="color: #1B2A63; font-size: 28px; font-weight: 700; margin: 0 0 16px 0; text-align: center; line-height: 1.3;">
      ${title}
    </h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
      ${intro}
    </p>
    
    ${tipsHtml}
    
    ${cta ? `
      <div style="text-align: center; margin: 40px 0;">
        <a href="${cta.url}" class="btn-secondary" style="display: inline-block; padding: 14px 32px; background: #1E1EBE; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          ${cta.text}
        </a>
      </div>
    ` : ''}
  `

  return emailLayout(content, intro.substring(0, 100))
}

/**
 * Simple text announcement template
 */
export const simpleAnnouncementTemplate = ({ 
  title, 
  message, 
  cta 
}) => {
  const content = `
    <h1 style="color: #1B2A63; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; line-height: 1.3;">
      ${title}
    </h1>
    
    <div style="color: #4b5563; font-size: 16px; line-height: 1.8;">
      ${message}
    </div>
    
    ${cta ? `
      <div style="text-align: center; margin: 40px 0 0 0;">
        <a href="${cta.url}" class="btn" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00A4A6 0%, #36C2C6 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          ${cta.text}
        </a>
      </div>
    ` : ''}
  `

  return emailLayout(content, title)
}
