import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Prerendering script for landing pages
 * Generates static HTML for SEO-critical pages
 */

// Pages to prerender
const pagesToPrerender = [
  {
    path: '/',
    title: 'YearWheel - Visualisera och planera ditt år med AI',
    description: 'Skapa interaktiva årshjul för att planera projekt, kampanjer och aktiviteter. AI-assisterad planering, visuell översikt och smart organisering.',
    language: 'sv',
    alternates: {
      sv: 'https://yearwheel.se/',
      en: 'https://yearwheel.se/en/',
      'x-default': 'https://yearwheel.se/'
    }
  },
  {
    path: '/en/',
    title: 'YearWheel | Interactive Year Wheel Tool & Planner',
    description: 'Plan your year with an interactive year wheel tool for teams, projects, campaigns and recurring work. Start free with YearWheel.',
    language: 'en',
    alternates: {
      sv: 'https://yearwheel.se/',
      en: 'https://yearwheel.se/en/',
      'x-default': 'https://yearwheel.se/'
    }
  },
  {
    path: '/hr-planering',
    title: 'Personalplanering & HR Kalender - YearWheel',
    description: 'Digitalt verktyg för personalplanering, semesterplanering och HR-kalender. Få årsöversikt över medarbetare, semester och rekrytering. Prova gratis!'
  },
  {
    path: '/marknadsplanering',
    title: 'Marknadsplanering & Innehållskalender - YearWheel',
    description: 'Planera kampanjer, innehåll och sociala medier visuellt. Innehållskalender för hela året i ett årshjul. Perfekt för marknadsavdelningar och content creators.'
  },
  {
    path: '/skola-och-utbildning',
    title: 'Läsårsplanering & Skolkalender - YearWheel',
    description: 'Digital terminsplanering för skolor. Visualisera läsåret med lov, utvecklingsdagar, prov och aktiviteter. Perfekt för skolledare och lärare.'
  },
  {
    path: '/projektplanering',
    title: 'Enkel Projektplanering & Projektkalender - YearWheel',
    description: 'Projektplanering som är enklare än Asana men kraftfullare än Excel. Visualisera projektplan och milstolpar i ett årshjul. Prova gratis!'
  },
  {
    path: '/pricing',
    title: 'Priser - YearWheel',
    description: 'Börja gratis med 3 årshjul och 1 team. Uppgradera till Premium för obegränsat antal hjul, AI-assistans och teamsamarbete.'
  },
  {
    path: '/arshjul-mall',
    title: 'Årshjul från Excel | Importera din plan till YearWheel',
    description: 'Har du en årsplan i Excel? Importera .xlsx, .xls eller .csv till YearWheel och förvandla raderna till ett interaktivt årshjul. Testa gratis.',
    language: 'sv',
    alternates: {
      sv: 'https://yearwheel.se/arshjul-mall',
      en: 'https://yearwheel.se/en/year-wheel-template',
      'x-default': 'https://yearwheel.se/arshjul-mall'
    }
  },
  {
    path: '/hr',
    title: 'HR-årshjul | HR-planering för team | YearWheel',
    description: 'Planera HR-året visuellt med YearWheel. Samla semester, rekrytering, lönerevision och medarbetarsamtal i ett interaktivt HR-årshjul.',
    language: 'sv',
    alternates: {
      sv: 'https://yearwheel.se/hr',
      en: 'https://yearwheel.se/en/hr',
      'x-default': 'https://yearwheel.se/hr'
    }
  },
  {
    path: '/marketing',
    title: 'Årshjul för marketing och kommunikation | YearWheel',
    description: 'Planera marketing, kampanjer och kommunikation i ett visuellt årshjul. Importera planen från Excel och få hela året samlat i YearWheel.',
    language: 'sv',
    alternates: {
      sv: 'https://yearwheel.se/marketing',
      en: 'https://yearwheel.se/en/marketing',
      'x-default': 'https://yearwheel.se/marketing'
    }
  },
  {
    path: '/en/year-wheel-template',
    title: 'Free Year Wheel Template for Excel Import | Interactive Tool',
    description: 'Already planning your year in Excel? Import .xlsx, .xls or .csv into YearWheel and turn your rows into an interactive year wheel. Try it free.',
    language: 'en',
    alternates: {
      sv: 'https://yearwheel.se/arshjul-mall',
      en: 'https://yearwheel.se/en/year-wheel-template',
      'x-default': 'https://yearwheel.se/arshjul-mall'
    }
  },
  {
    path: '/en/hr',
    title: 'HR Year Wheel | HR Planning Tool and Software | YearWheel',
    description: 'Plan your HR year visually with YearWheel. Bring holidays, recruitment, reviews and people processes into one interactive HR year wheel.',
    language: 'en',
    alternates: {
      sv: 'https://yearwheel.se/hr',
      en: 'https://yearwheel.se/en/hr',
      'x-default': 'https://yearwheel.se/hr'
    }
  },
  {
    path: '/en/marketing',
    title: 'Marketing Year Wheel & Communications Planner | YearWheel Tool',
    description: 'Plan campaigns, content and communications in a visual marketing year wheel. Import your Excel plan and see the full year in YearWheel.',
    language: 'en',
    alternates: {
      sv: 'https://yearwheel.se/marketing',
      en: 'https://yearwheel.se/en/marketing',
      'x-default': 'https://yearwheel.se/marketing'
    }
  }
];

/**
 * Generate prerendered HTML with proper meta tags
 */
function generatePrerenderHTML(page, baseHTML) {

  // Replace title
  let html = baseHTML.replace(
    /<title>.*?<\/title>/,
    `<title>${page.title}</title>`
  );

  if (page.language === 'en') {
    html = html.replace('<html lang="sv"', '<html lang="en"');
  }

  html = html.replace(/\s*<link rel="canonical" href=".*?" \/>/, '');

  // Replace or add meta description
  if (html.includes('<meta name="description"')) {
    html = html.replace(
      /<meta name="description" content=".*?">/,
      `<meta name="description" content="${page.description}">`
    );
  } else {
    html = html.replace(
      '</head>',
      `<meta name="description" content="${page.description}"></head>`
    );
  }

  // Add Open Graph tags
  const canonicalUrl = `https://yearwheel.se${page.path === '/' ? '' : page.path}`;
  const ogImage = 'https://yearwheel.se/hero-hr-planning.webp';

  const alternateTags = page.alternates
    ? Object.entries(page.alternates)
      .map(([language, url]) => `<link rel="alternate" hreflang="${language}" href="${url}">`)
      .join('\n    ')
    : '';

  const ogTags = `
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${page.title}">
    <meta property="og:description" content="${page.description}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:locale" content="${page.language === 'en' ? 'en_GB' : 'sv_SE'}">
    <meta property="og:site_name" content="YearWheel">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${page.title}">
    <meta name="twitter:description" content="${page.description}">
    <meta name="twitter:image" content="${ogImage}">
    <link rel="canonical" href="${canonicalUrl}">
    ${alternateTags}
  `;

  html = html.replace('</head>', `${ogTags}\n</head>`);

  return html;
}

/**
 * Main prerender function
 */
async function prerender() {
  console.log('🚀 Starting prerendering process...\n');

  const distPath = path.resolve(__dirname, '../dist');

  // Check if dist folder exists
  if (!fs.existsSync(distPath)) {
    console.error('❌ Error: dist folder not found. Run "yarn build" first.');
    process.exit(1);
  }

  const baseHTML = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

  let successCount = 0;
  let failCount = 0;

  for (const page of pagesToPrerender) {
    try {
      console.log(`📄 Prerendering: ${page.path}`);

      // Generate HTML
      const html = generatePrerenderHTML(page, baseHTML);

      // Determine output path
      let outputPath;
      if (page.path === '/') {
        outputPath = path.join(distPath, 'index.html');
      } else {
        const pagePath = path.join(distPath, page.path.slice(1));
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(pagePath)) {
          fs.mkdirSync(pagePath, { recursive: true });
        }
        
        outputPath = path.join(pagePath, 'index.html');
      }

      // Write prerendered HTML
      fs.writeFileSync(outputPath, html, 'utf-8');
      
      console.log(`✅ Successfully prerendered: ${page.path} → ${outputPath}\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to prerender ${page.path}:`, error.message, '\n');
      failCount++;
    }
  }

  console.log('\n📊 Prerendering Summary:');
  console.log(`✅ Success: ${successCount} pages`);
  console.log(`❌ Failed: ${failCount} pages`);
  console.log('\n🎉 Prerendering complete!\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run prerender
prerender().catch(error => {
  console.error('❌ Prerendering failed:', error);
  process.exit(1);
});
