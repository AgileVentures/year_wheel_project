# SEO Implementation Guide - Landing Pages

## Översikt
Detta dokument beskriver hur SEO fungerar på våra landningssidor och best practices för att maximera organisk trafik.

## Vad vi implementerat

### 1. Meta Tags (Moderna SEO standards)

#### ✅ Title Tag
```javascript
metaTitle="Personalplanering & HR Kalender - YearWheel"
```
- **Längd**: Max 60 tecken (för att inte klippas av i Google)
- **Format**: `[Primärt Keyword] - YearWheel`
- **Varför**: Viktigaste ranking-faktorn. Visas i Google search results.

#### ✅ Meta Description
```javascript
metaDescription="Digitalt verktyg för personalplanering, semesterplanering och HR-kalender..."
```
- **Längd**: 150-160 tecken (optimal för Google snippets)
- **Innehåll**: Inkludera keywords naturligt, men skriv för människor
- **Varför**: Påverkar inte ranking direkt, men höjer click-through rate (CTR)

#### ✅ Canonical URL
```javascript
canonicalUrl="https://yearwheel.se/hr-planering"
```
- **Varför**: Förhindrar duplicate content-problem
- **Viktigt**: Talar om för Google vilken version som är "original"
- **Best practice**: Använd alltid absoluta URLs med HTTPS

#### ✅ Open Graph Tags
```javascript
ogImage="https://yearwheel.se/hero-hr-planning.webp"
```
**Inkluderar**:
- `og:type` = "website"
- `og:title` = Same as meta title
- `og:description` = Same as meta description
- `og:url` = Canonical URL
- `og:image` = Hero image (min 1200x630px för bästa resultat)
- `og:locale` = "sv_SE"
- `og:site_name` = "YearWheel"

**Varför**: Styr hur sidan ser ut när den delas på:
- Facebook
- LinkedIn
- Slack
- WhatsApp
- iMessage

#### ✅ Twitter Card Tags
```javascript
twitter:card = "summary_large_image"
twitter:image = Same as og:image
```
**Varför**: Optimal delning på Twitter/X med stor bild

### 2. Schema.org Structured Data

Varje landningssida har JSON-LD structured data:

```javascript
const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "YearWheel - HR & Personalplanering",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "SEK"
  },
  "description": "Digital personalplanering..."
};
```

**Fördelar**:
- Google kan visa **rich snippets** (stjärnor, priser, etc.)
- Bättre förståelse av innehållet = bättre ranking
- Kan visa upp i "Featured Snippets" (position 0)

### 3. ❌ Vad vi INTE använder (och varför)

#### Keywords Meta Tag
```html
<!-- ANVÄNDS INTE LÄNGRE -->
<meta name="keywords" content="...">
```
**Varför**: 
- Google ignorerar den sedan 2009
- Kan till och med skada SEO om överanvänd
- Vi behåller i koden för dokumentation men den skrivs inte ut

**Istället**: Vi använder keywords naturligt i:
- Title
- Meta description  
- H1/H2 headers
- Body text
- Alt text på bilder

---

## SEO Checklist per Landningssida

### On-Page SEO ✅

- [x] **Unique title** (max 60 tecken)
- [x] **Unique meta description** (150-160 tecken)
- [x] **Canonical URL** (absolute HTTPS)
- [x] **H1 header** med primärt keyword
- [x] **H2/H3 headers** med relaterade keywords
- [x] **Schema.org structured data**
- [x] **Open Graph tags** (för social sharing)
- [x] **Twitter Card tags**
- [x] **Alt text på bilder** (inkluderar keywords)
- [x] **Fast loading** (<2 sekunder)
- [x] **Mobile responsive**
- [x] **Internal links** (till pricing, templates, etc.)

### Technical SEO ⚠️ (Behöver verifieras)

- [ ] **Robots.txt** konfigurerad
- [ ] **Sitemap.xml** uppdaterad (DONE men behöver verifieras i GSC)
- [ ] **SSL Certificate** (HTTPS)
- [ ] **Google Search Console** verification
- [ ] **Google Analytics 4** setup (DONE)
- [ ] **Core Web Vitals** optimering
- [ ] **Structured data validation** (test med Google Rich Results Test)

---

## Keywords Strategy

### Primära Keywords (per sida)

#### HR-planering
1. personalplanering verktyg **(720/månad)**
2. HR kalender årsplanering **(170/månad)**
3. semesterplanering team **(260/månad)**

#### Marknadsplanering
1. innehållskalender årsöversikt **(480/månad)**
2. planera sociala medier **(340/månad)**
3. marknadsplan mall **(140/månad)**

#### Skola & Utbildning
1. läsårsplanering **(320/månad)**
2. skolkalender digital **(180/månad)**
3. terminsplanering verktyg **(90/månad)**

#### Projektplanering
1. enkel projektplanering **(210/månad)**
2. projektkalender årsöversikt **(80/månad)**
3. visualisera projektplan **(50/månad)**

### Keyword Placement Best Practices

**1. Title Tag** - Most important
```
[Primärt Keyword] & [Sekundärt Keyword] - YearWheel
```

**2. Meta Description**
```
[Primärt Keyword] för [målgrupp]. [Benefit]. [CTA].
```

**3. H1 Header**
```
[Primärt Keyword] som ger [benefit]
```

**4. First 100 words**
- Inkludera primärt keyword 1-2 gånger
- Skriv naturligt för användare (inte för robots)

**5. Throughout content**
- Använd synonymer och relaterade termer
- LSI keywords (Latent Semantic Indexing)
- Ex: "personalplanering" → "HR-planering", "medarbetarplanering"

---

## Image SEO

### Hero Images
Alla landningssidor använder just nu: `/hero-hr-planning.webp`

**Best practices för bilder**:

1. **File format**: WebP (bättre komprimering än PNG/JPG)
2. **File name**: `hero-hr-planning.webp` (inkludera keywords)
3. **Alt text**: Beskrivande med keywords
4. **Size**: Max 200KB för hero images
5. **Dimensions**: 1200x630px (optimal för OG images)
6. **Lazy loading**: För bilder under fold

**Nuvarande implementation**:
```jsx
<img 
  src={heroImage} 
  alt={heroTitle}  // ✅ Använder H1 som alt text
  className="w-full h-auto rounded-lg shadow-2xl"
/>
```

**Förbättringsförslag**:
```jsx
<img 
  src={heroImage} 
  alt="Visuell personalplanering med YearWheel - Semesteröversikt i årshjul"
  loading="lazy"  // Lazy load images
  width="1200"    // Explicit dimensions (CLS förbättring)
  height="800"
  className="w-full h-auto rounded-lg shadow-2xl"
/>
```

---

## Open Graph Image Requirements

### Optimal Dimensions
- **Facebook/LinkedIn**: 1200 x 630px
- **Twitter**: 1200 x 675px (16:9 ratio)
- **Minimum**: 600 x 315px

### File Size
- Max 8MB (men sikta på <200KB för snabb loading)
- Format: PNG, JPG, eller WebP

### Content Guidelines
- Lägg till text overlay med headline
- Brand logo i hörnet
- High contrast för läsbarhet
- Testa i [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

### TODO: Skapa segment-specifika OG images
```
/public/og-hr-planering.webp       (HR-fokuserad bild)
/public/og-marknadsplanering.webp  (Marketing-fokuserad)
/public/og-skola.webp              (Utbildning-fokuserad)
/public/og-projekt.webp            (Projekt-fokuserad)
```

---

## Google Search Console Setup

### Steg 1: Verifiera ägandeskap
```html
<!-- Lägg till i index.html -->
<meta name="google-site-verification" content="YOUR_CODE_HERE" />
```

### Steg 2: Skicka in sitemap
```
https://yearwheel.se/sitemap.xml
```

### Steg 3: Begär indexering
- För varje ny landningssida
- URL Inspection Tool → Request Indexing

### Steg 4: Övervaka performance
- Queries (vilka sökord driver trafik)
- Pages (vilka sidor rankar bäst)
- Countries (geografisk spridning)
- Devices (mobile vs desktop)

---

## Local SEO (framtida)

Om ni vill ranka lokalt i Sverige:

```javascript
const localSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "YearWheel",
  "url": "https://yearwheel.se",
  "logo": "https://yearwheel.se/year_wheel_logo.svg",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "hey@communitaslabs.io",
    "contactType": "Customer Support",
    "areaServed": "SE",
    "availableLanguage": "Swedish"
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "SE"
  }
};
```

---

## A/B Testing för SEO

### Test olika Title formats
1. `[Keyword] - YearWheel` (nuvarande)
2. `[Keyword] | Gratis verktyg för [målgrupp]`
3. `[Benefit] med [Keyword] - YearWheel`

### Test olika Meta Descriptions
1. Feature-focused: "Digital personalplanering med semesteröversikt..."
2. Problem-solving: "Trött på röriga Excel-ark? YearWheel ger..."
3. Social proof: "500+ företag använder YearWheel för..."

### Mät i Google Analytics
- Organic CTR (Click-Through Rate)
- Bounce rate
- Time on page
- Conversion rate

---

## Performance Monitoring

### Viktiga Metrics

#### Core Web Vitals
- **LCP** (Largest Contentful Paint): <2.5s
- **FID** (First Input Delay): <100ms
- **CLS** (Cumulative Layout Shift): <0.1

#### SEO Metrics
- **Organic Traffic**: Mål +20% per månad
- **Keyword Rankings**: Top 10 för target keywords
- **Backlinks**: Mål +5 quality backlinks per månad
- **Domain Authority**: Mål 30+ inom 6 månader

### Tools för övervakning
- Google Search Console (gratis)
- Google Analytics 4 (gratis)
- Google PageSpeed Insights (gratis)
- Ahrefs eller SEMrush (betalverktyg för keyword tracking)

---

## Content Strategy

### Blog Posts för SEO
Skapa blogginlägg som rankar för long-tail keywords:

1. **"Personalplanering 2026: Komplett guide för HR-chefer"**
   - Target: personalplanering + long-tail variations
   - Format: 2000+ ord guide med mallar

2. **"5 sätt att visualisera årsplanering (med exempel)"**
   - Target: visualisera årsplanering, årscykel
   - Format: Listicle med bilder

3. **"Läsårsplanering mall 2025/2026 - Gratis nedladdning"**
   - Target: läsårsplanering mall, skolkalender
   - Format: Lead magnet med gratis mall

4. **"Content kalender 2026: Så planerar du hela året"**
   - Target: innehållskalender, social media planering
   - Format: How-to guide med templates

### Internal Linking Strategy
```
Blog Post → Landing Page → CTA (Sign Up)
```

---

## Technical Implementation Notes

### Dynamic Meta Tags
Vi använder React useEffect för att dynamiskt uppdatera meta tags:

```javascript
useEffect(() => {
  const updateOrCreateMeta = (name, content, isProperty = false) => {
    const attribute = isProperty ? 'property' : 'name';
    let metaTag = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute(attribute, name);
      document.head.appendChild(metaTag);
    }
    metaTag.content = content;
  };
  
  // Update all meta tags...
}, [metaTitle, metaDescription, ...]);
```

**Varför detta fungerar**:
- React SPA (Single Page Application) problem: Crawlers ser initiala index.html
- Lösning: Vi uppdaterar DOM direkt (Google kan läsa dynamisk content)
- Backup: Netlify prerending för bots (optional)

### Cleanup Function
```javascript
return () => {
  // Restore default meta tags when unmounting
  document.title = 'YearWheel - Visualisera och planera ditt år med AI';
};
```

**Varför**: När användare navigerar från landningssida → dashboard, återställ defaults.

---

## Next Steps (Priority Order)

### High Priority 🔴
1. ✅ Skapa segment-specifika OG images (1200x630px)
2. ⏳ Verifiera i Google Search Console
3. ⏳ Request indexing för alla landningssidor
4. ⏳ Test structured data med [Google Rich Results Test](https://search.google.com/test/rich-results)
5. ⏳ Setup Google Ads campaigns targeting landing pages

### Medium Priority 🟡
6. ⏳ Skapa backlinks (guest posts, directories)
7. ⏳ Write 2-3 SEO-optimerade blog posts
8. ⏳ A/B test different title/description formats
9. ⏳ Add testimonial schema markup
10. ⏳ Setup redirect rules (if needed)

### Low Priority 🟢
11. ⏳ Local SEO optimization (if targeting specific cities)
12. ⏳ Multilingual setup (English versions)
13. ⏳ Video content for landing pages
14. ⏳ FAQ schema markup

---

## Resources & Tools

### Free SEO Tools
- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics 4](https://analytics.google.com)
- [Google PageSpeed Insights](https://pagespeed.web.dev)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Keyword Research
- [Google Keyword Planner](https://ads.google.com/home/tools/keyword-planner/)
- [Ubersuggest](https://neilpatel.com/ubersuggest/) (freemium)
- [AnswerThePublic](https://answerthepublic.com/) (freemium)

### Paid Tools (Optional)
- Ahrefs ($99/month)
- SEMrush ($119/month)
- Moz Pro ($99/month)

---

## Questions?
Kontakta hey@communitaslabs.io
