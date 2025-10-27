# SEO Landing Pages Strategi

## Översikt
Vi har skapat keyword-optimerade landningssidor för att stärka organisk trafik och stödja marknadsföringskampanjer. Varje sida är optimerad för specifika sökord och målgrupper med högt LTV (Lifetime Value).

## Implementerade Landningssidor

### 1. HR & Personalplanering
**URL**: `/hr-planering`  
**Target**: HR-avdelningar, personalchefer, företag med 20+ anställda

**Primära sökord**:
- personalplanering verktyg
- HR kalender årsplanering
- semesterplanering team
- medarbetarplanering verktyg
- digital HR-planering

**LTV**: Hög (abonnemang per avdelning)  
**Unique Value**: Visuell semesteröversikt, rekryteringsplanering, kompetensutveckling

**Mallar**:
- HR Årsplanering 2026
- Semesterkalender
- Onboarding-plan

---

### 2. Marknadsplanering & Innehållskalender
**URL**: `/marknadsplanering`  
**Target**: Marknadsavdelningar, content creators, byråer, influencers

**Primära sökord**:
- innehållskalender årsöversikt
- planera sociala medier årligen
- redaktionell årsplanering
- marknadsplan årshjul mall
- digital marknadsplanering

**LTV**: Hög (byråer och företag med kontinuerligt innehållsbehov)  
**Unique Value**: Multi-kanal översikt (Instagram, LinkedIn, TikTok), kampanjplanering, AI-assistent för innehållsförslag

**Mallar**:
- Marknadsplan 2026
- Social Media Kalender
- Content Production

---

### 3. Skola & Utbildning
**URL**: `/skola-och-utbildning`  
**Target**: Skolledare, rektorer, lärare, kommunala förvaltningar

**Primära sökord**:
- läsårsplanering
- skolkalender digital
- terminsplanering verktyg
- planering för skolledare
- årsplanering utbildning

**LTV**: Mycket hög (retention om används årligen)  
**Unique Value**: Läsårsöversikt med lov, utvecklingsdagar, föräldramöten, nationella prov

**Mallar**:
- Läsårsplanering 2025/2026
- Grundskolans årshjul
- Gymnasieskolans planering

---

### 4. Projektplanering (Light Segment)
**URL**: `/projektplanering`  
**Target**: Projektledare, småföretag, konsulter (tycker Asana/Monday för tungt)

**Primära sökord**:
- enkel projektplanering
- projektkalender årsöversikt
- visualisera projektplan
- årshjul för projektledning
- planeringsverktyg små projekt

**LTV**: Medium-hög (småföretag och konsulter)  
**Unique Value**: "Mellan Excel och Asana" - lagom komplexitet, multi-projekt översikt

**Mallar**:
- Kundprojekt 2026
- Produktutveckling
- Event-planering

---

## Teknisk Implementation

### Återanvändbar Template
Alla landningssidor använder `LandingPageTemplate.jsx` som:
- Stödjer SEO meta tags (title, description, keywords)
- Inkluderar Schema.org structured data för bättre Google indexering
- Responsiv design (mobile-first)
- Snabb laddning med lazy loading
- CTA-optimerad med "Prova gratis" knappar

### SEO Features
- **Meta tags**: Title, description, keywords per sida
- **Schema.org**: SoftwareApplication markup för bättre rich snippets
- **Sitemap**: Uppdaterad med alla nya landningssidor (priority 0.9)
- **Canonical URLs**: Korrekt struktur för att undvika duplicate content
- **Internal linking**: Länkar till pricing, templates, dashboard

### Conversion Funnel
1. **Landing page** → 2. **"Prova gratis" CTA** → 3. **Sign up (AuthPage)** → 4. **Dashboard med mallar** → 5. **Editor** → 6. **Premium upgrade prompt**

---

## Framtida Landningssidor (Roadmap)

### Planerade Sidor

#### A. Funktions-fokuserade
- `/samarbete` - Realtid, kommentarer, teams
- `/integrationer` - Google & Microsoft-kopplingar
- `/export` - PDF, PNG, presentationer
- `/mallar` - Branschspecifika mallar
- `/ai-planering` - AI-assistent

#### B. Nisch-segment
- `/foreningar` - Ideella organisationer & rabatter
- `/byra-planering` - Byrå-specifikt case
- `/event-planering` - Event management

#### C. Jämförelse-sidor
- `/alternativ-till-plandisc` - Konkurrensanalys
- `/alternativ-till-asana` - Jämförelse
- `/alternativ-till-excel` - Upgrade path

#### D. CTA-fokuserade
- `/prova-gratis` - Sign-up optimerad landing page
- `/demo` - Bokningsbar demo för större företag

---

## Content Marketing Strategi

### Blog Topics (för organisk trafik)
1. "5 sätt att visualisera årsplanering - och varför cirklar är bättre än Gantt"
2. "HR-guiden: Så planerar du 2026 års semester redan nu"
3. "Content creators guide till årsplanering (med gratis mall)"
4. "Varför din skola behöver digitalisera läsårsplaneringen"
5. "Projektplanering för småföretag: Mellan Excel och Asana"

### Guest Posts & PR
- Kontakta HR-bloggar (ex. HRbloggen.se)
- Skola & Utbildning publikationer (Lärarförbundet, Skolvärlden)
- Marknadsföringsbloggar (Resumé, Dagens Media)

### Social Media Content
- LinkedIn: Professionella tips för HR och projektledare
- Instagram: Visuella exempel på vackra årshjul
- TikTok: Snabba tutorials "Planera hela 2026 på 60 sekunder"

---

## A/B Testing Plan

### Test 1: Hero CTA
- Variant A: "Prova gratis"
- Variant B: "Skapa ditt första årshjul"
- Variant C: "Kom igång på 2 minuter"

### Test 2: Social Proof
- Med testimonial vs utan
- Med användarsiffror (ex "500+ företag använder YearWheel")

### Test 3: Template Visibility
- Visa 3 mallar vs 6 mallar
- Bildbaserade mallar vs text-beskrivningar

---

## Analytics & Tracking

### Viktiga Metrics
- Organic traffic per landing page
- Bounce rate (mål: <50%)
- Time on page (mål: >2 min)
- CTA click-through rate (mål: >15%)
- Sign-up conversion (mål: >5%)

### Google Analytics Events
- `view_landing_page`: {page: 'hr-planering'}
- `click_cta`: {location: 'hero' | 'mid' | 'bottom'}
- `view_template`: {template_name: 'HR Årsplanering 2026'}
- `sign_up_from_landing`: {source_page: 'hr-planering'}

### Google Search Console
- Övervaka ranking för target keywords
- Identifiera nya keyword-möjligheter
- Fixa crawl errors och indexering-problem

---

## SEO Checklist per Landningssida

✅ Unique meta title (max 60 tecken)  
✅ Meta description (max 160 tecken)  
✅ H1 header med primärt sökord  
✅ H2/H3 med relaterade sökord  
✅ Alt-text på alla bilder  
✅ Schema.org structured data  
✅ Internal links till pricing & templates  
✅ Mobile-responsive design  
✅ Fast loading (<2 sekunder)  
✅ Clear CTA above the fold  

---

## Implementation Timeline

### Phase 1 (Done ✅)
- ✅ Skapa template-komponent
- ✅ 4 prioriterade landningssidor (HR, Marknadsföring, Skola, Projekt)
- ✅ Uppdatera sitemap.xml
- ✅ Lägg till routes i App.jsx

### Phase 2 (Next)
- [ ] Designa hero images för varje sida
- [ ] Samla in testimonials från beta-användare
- [ ] A/B testing setup med Google Optimize
- [ ] Google Ads kampanjer för varje segment

### Phase 3 (Future)
- [ ] Skapa 8 ytterligare landningssidor
- [ ] Implementera blog för content marketing
- [ ] Setup email nurture flows per segment
- [ ] Partner integrations (ex. HR-system, Google Workspace)

---

## Keyword Research Data

### High-Value Keywords (Search Volume/Month - Swedish)
- "personalplanering" - 720
- "årsplanering" - 590
- "projektplanering" - 1300
- "innehållskalender" - 480
- "läsårsplanering" - 320
- "semesterplanering" - 260
- "HR kalender" - 170
- "marknadsplan mall" - 140

### Long-Tail Opportunities
- "visuell projektplanering verktyg" - 50
- "digital skolkalender gratis" - 30
- "årshjul mall HR" - 20
- "planera sociala medier årligen" - 40

---

## Competitive Advantage

**vs Excel/Google Sheets**:
- Visuell representation (cirkel vs rader)
- Teamsamarbete i realtid
- Professionella exporter (PDF/PNG)

**vs Asana/Monday**:
- Enklare att komma igång (<2 minuter)
- Fokus på årsöversikt, inte daily tasks
- Betydligt billigare (79 SEK/mån vs 900+ SEK/mån)

**vs Plandisc (direktkonkurrent)**:
- Modernare UI/UX
- AI-assistent för planering
- Bättre integration (Google Calendar/Sheets)
- Transparent pricing
- Swedish-first (språk och support)

---

## Contact & Next Steps

För att gå vidare med marknadsföringen:
1. ✅ Deploy landningssidorna till production
2. ✅ Verifiera i Google Search Console
3. ⏳ Skapa hero images för varje sida
4. ⏳ Setup Google Ads kampanjer
5. ⏳ Kontakta partners för guest posts

**Questions?** Kontakta hey@communitaslabs.io
