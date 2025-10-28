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
    description: 'Skapa interaktiva årshjul för att planera projekt, kampanjer och aktiviteter. AI-assisterad planering, visuell översikt och smart organisering.'
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
    description: 'Börja gratis med 2 årshjul. Uppgradera till Premium för obegränsat antal hjul, AI-assistans och teamsamarbete.'
  }
];

/**
 * Generate prerendered HTML with proper meta tags
 */
function generatePrerenderHTML(page) {
  const baseHTML = fs.readFileSync(
    path.resolve(__dirname, '../dist/index.html'),
    'utf-8'
  );

  // Replace title
  let html = baseHTML.replace(
    /<title>.*?<\/title>/,
    `<title>${page.title}</title>`
  );

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

  const ogTags = `
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${page.title}">
    <meta property="og:description" content="${page.description}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:locale" content="sv_SE">
    <meta property="og:site_name" content="YearWheel">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${page.title}">
    <meta name="twitter:description" content="${page.description}">
    <meta name="twitter:image" content="${ogImage}">
    <link rel="canonical" href="${canonicalUrl}">
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

  let successCount = 0;
  let failCount = 0;

  for (const page of pagesToPrerender) {
    try {
      console.log(`📄 Prerendering: ${page.path}`);

      // Generate HTML
      const html = generatePrerenderHTML(page);

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
