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
 * @param {string} content - The main email content
 * @param {string} preheader - Preview text shown in email clients
 * @param {string} tagline - Customizable tagline (default: "Visualisera och planera ditt år!")
 */
export const emailLayout = (content, preheader = '', tagline = 'Visualisera och planera ditt år!') => `
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
            <td style="background: linear-gradient(135deg, rgba(54, 194, 198, 0.6) 0%, rgba(0, 164, 166, 0.6) 100%); padding: 32px 40px; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 16px;">
                <img src="https://yearwheel.se/year_wheel_logo_transparent.png" alt="YearWheel" width="220" style="max-width: 220px; height: auto;" />
              </div>
              <p style="margin: 8px 0 0 0; color: #1B2A63; font-size: 14px; font-weight: 600;">
                ${tagline}
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
                <a href="https://yearwheel.se/unsubscribe" style="color: #9ca3af; text-decoration: underline;">Avregistrera från nyhetsbrev</a> •
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
 * @param {string} heading - Main headline
 * @param {string} intro - Introduction paragraph
 * @param {Array} sections - Array of section objects with optional links
 * @param {Object} cta - Call-to-action button {url, text}
 * @param {string} ps - Optional P.S. message
 * @param {string} tagline - Custom tagline for header
 * 
 * Section structure:
 * {
 *   title: string,
 *   content: string,
 *   image: string (optional),
 *   showLink: boolean,
 *   link: { url: string, text: string } (required if showLink is true)
 * }
 */
export const newsletterTemplate = ({ 
  heading, 
  intro, 
  sections = [], 
  cta,
  ps,
  tagline
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
      
      ${section.showLink && section.link ? `
        <a href="${section.link.url}" 
           style="color: #00A4A6; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-flex; align-items: center; gap: 4px;">
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

  return emailLayout(content, intro.substring(0, 100), tagline)
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
              <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #9FCB3E 0%, #2E9E97 100%); border-radius: 50%; text-align: center; line-height: 24px; color: #ffffff; font-weight: 700; font-size: 11px;">✓</span>
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
        Ny Funktion
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
      <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #3b82f6;">TIP</span>
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

/**
 * Composite newsletter template - allows mixing different section types
 * @param {string} heading - Main headline
 * @param {string} intro - Introduction paragraph  
 * @param {Array} sections - Array of section objects with type and data
 * @param {Object} cta - Call-to-action button {url, text}
 * @param {string} ps - Optional P.S. message
 * @param {string} tagline - Custom tagline for header
 * 
 * Section types:
 * - message: { title, content, showLink, link: { text, url } }
 * - feature: { feature, description, benefits: [], screenshot }
 * - tip: { title, description, link: { text, url } }
 */
export const compositeTemplate = ({ 
  heading, 
  intro, 
  sections = [], 
  cta,
  ps,
  tagline
}) => {
  const renderSection = (section, index) => {
    switch (section.type) {
      case 'message':
        return `
          <div style="margin-bottom: 32px;">
            ${section.data.title ? `
              <h2 style="color: #1B2A63; font-size: 22px; font-weight: 600; margin: 0 0 12px 0;">
                ${section.data.title}
              </h2>
            ` : ''}
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              ${section.data.content}
            </p>
            ${section.data.showLink && section.data.link?.url ? `
              <a href="${section.data.link.url}" 
                 style="color: #00A4A6; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-flex; align-items: center; gap: 4px;">
                ${section.data.link.text} →
              </a>
            ` : ''}
          </div>
        `
      
      case 'feature':
        const benefitsHtml = (section.data.benefits || []).filter(b => b).map(benefit => `
          <tr>
            <td style="padding: 8px 0;">
              <table role="presentation">
                <tr>
                  <td style="width: 28px; vertical-align: top;">
                    <span style="display: inline-block; width: 20px; height: 20px; background: linear-gradient(135deg, #9FCB3E 0%, #2E9E97 100%); border-radius: 50%; text-align: center; line-height: 20px; color: #ffffff; font-weight: 700; font-size: 10px;">✓</span>
                  </td>
                  <td style="color: #4b5563; font-size: 14px; line-height: 1.5; padding-left: 8px;">
                    ${benefit}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `).join('')

        return `
          <div style="margin-bottom: 32px; padding: 24px; background: linear-gradient(135deg, rgba(164, 230, 224, 0.3) 0%, rgba(54, 194, 198, 0.2) 100%); border-radius: 8px;">
            <p style="margin: 0 0 8px 0; color: #00A4A6; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
              Ny Funktion
            </p>
            <h2 style="color: #1B2A63; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">
              ${section.data.feature}
            </h2>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
              ${section.data.description}
            </p>
            ${section.data.screenshot ? `
              <img src="${section.data.screenshot}" alt="${section.data.feature}" 
                   style="width: 100%; border-radius: 6px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ` : ''}
            ${benefitsHtml ? `
              <table role="presentation" style="width: 100%;">
                ${benefitsHtml}
              </table>
            ` : ''}
          </div>
        `
      
      case 'tip':
        const borderColors = ['#00A4A6', '#2D4EC8', '#9FCB3E']
        return `
          <div style="margin-bottom: 24px; padding: 20px; background-color: #f9fafb; border-left: 4px solid ${borderColors[index % 3]}; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; color: #3b82f6; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
              Tips
            </p>
            <h3 style="color: #1B2A63; font-size: 17px; font-weight: 600; margin: 0 0 10px 0;">
              ${section.data.title}
            </h3>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
              ${section.data.description}
            </p>
            ${section.data.link?.url ? `
              <a href="${section.data.link.url}" 
                 style="display: inline-block; margin-top: 10px; color: #00A4A6; text-decoration: none; font-weight: 600; font-size: 13px;">
                ${section.data.link.text || 'Läs mer'} →
              </a>
            ` : ''}
          </div>
        `
      
      default:
        return ''
    }
  }

  const sectionsHtml = sections.map((section, idx) => renderSection(section, idx)).join('')

  const content = `
    <h1 style="color: #1B2A63; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; line-height: 1.3;">
      ${heading}
    </h1>
    
    ${intro ? `
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
        ${intro}
      </p>
    ` : ''}
    
    ${sectionsHtml}
    
    ${cta?.url ? `
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

  return emailLayout(content, intro?.substring(0, 100) || heading, tagline)
}
