import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  Upload,
  Users,
} from 'lucide-react';
import Footer from '../components/Footer';
import LanguageSwitcher from '../components/LanguageSwitcher';
import WheelVisualization from '../components/WheelVisualization';
import { useCanonicalUrl, usePageMetadata } from '../hooks/useCanonicalUrl';
import { useLanguageAlternates } from '../hooks/useLanguageAlternates';

const pageContent = {
  excel: {
    sv: {
      title: 'Har du redan en plan i Excel? Importera den till YearWheel',
      metaTitle: 'Årshjul från Excel | Importera din plan till YearWheel',
      metaDescription: 'Har du en årsplan i Excel? Importera .xlsx, .xls eller .csv till YearWheel och förvandla raderna till ett interaktivt årshjul. Testa gratis.',
      eyebrow: 'Excel-plan till interaktivt årshjul',
      intro: 'Behåll informationen du redan har och få en tydligare visuell överblick. YearWheel hjälper dig att importera en befintlig Excel-plan och fortsätta planera i ett interaktivt årshjul.',
      cta: 'Trött på Excel? Prova YearWheel gratis',
      secondaryCta: 'Se hur importen fungerar',
      importTitle: 'Importera din befintliga årsplan',
      importText: 'Du behöver inte börja om från noll. Har du redan aktiviteter, datum och kategorier i Excel kan du ta med planen till YearWheel och sedan strukturera den visuellt.',
      steps: [
        { title: 'Exportera eller välj filen', text: 'Använd din befintliga Excel-arbetsbok eller exportera planen som CSV.' },
        { title: 'Importera till YearWheel', text: 'Ladda upp filen och mappa kolumner som aktivitet, startdatum, slutdatum och grupp.' },
        { title: 'Fortsätt visuellt', text: 'Se hela året i ett interaktivt hjul, dela det med teamet och uppdatera planen löpande.' },
      ],
      compareTitle: 'Excel är en bra start. YearWheel gör planen levande.',
      compareText: 'Excel fungerar utmärkt när du samlar in information. När många aktiviteter ska jämföras över ett helt år blir det enklare att se belastning, återkommande mönster och beroenden i ett årshjul.',
      compareItems: [
        ['Din Excel-plan', 'Importera befintliga rader i stället för att kopiera allt manuellt.'],
        ['Interaktiv översikt', 'Se aktiviteter per månad, ring och aktivitetsgrupp i samma vy.'],
        ['Samarbete', 'Låt teamet arbeta vidare i samma uppdaterade plan.'],
        ['Export och delning', 'Gör planen enkel att visa i möten och presentationer.'],
      ],
      annualTitle: 'Year wheel eller annual wheel: samma årsöversikt',
      annualText: 'Ett year wheel, även kallat annual wheel, samlar årets aktiviteter i en cirkulär vy. Det gör det lättare att planera säsonger, deadlines, kampanjer och återkommande arbete.',
      faqTitle: 'Vanliga frågor om Excel-import',
      faqs: [
        ['Vilka filer kan jag importera?', 'YearWheel kan importera Excel-filer i .xlsx och .xls samt CSV-filer.'],
        ['Måste jag skapa om min plan?', 'Nej. Utgå från den plan du redan har och mappa kolumnerna till YearWheels aktivitetsfält.'],
        ['Kan jag arbeta vidare efter importen?', 'Ja. Efter importen kan du redigera aktiviteter, organisera ringar och grupper samt dela planen med teamet.'],
      ],
      finalTitle: 'Gör din Excel-plan lättare att förstå',
      finalText: 'Testa hur din befintliga årsplan fungerar som ett interaktivt årshjul.',
    },
    en: {
      title: 'Already have a plan in Excel? Import it into YearWheel',
      metaTitle: 'Free Year Wheel Template for Excel Import | Interactive Tool',
      metaDescription: 'Already planning your year in Excel? Import .xlsx, .xls or .csv into YearWheel and turn your rows into an interactive year wheel. Try it free.',
      eyebrow: 'From Excel plan to interactive year wheel',
      intro: 'Keep the information you already have and make it easier to understand. YearWheel lets you import an existing Excel plan and continue planning in an interactive year wheel.',
      cta: 'Tired of Excel? Try YearWheel free',
      secondaryCta: 'See how import works',
      importTitle: 'Import the annual plan you already have',
      importText: 'You do not need to start from scratch. If your activities, dates and categories already live in Excel, bring that plan into YearWheel and make it visual.',
      steps: [
        { title: 'Choose your file', text: 'Use your existing Excel workbook or export the plan as CSV.' },
        { title: 'Import into YearWheel', text: 'Upload the file and map columns such as activity, start date, end date and group.' },
        { title: 'Keep planning visually', text: 'See the full year in an interactive wheel, share it with your team and keep it current.' },
      ],
      compareTitle: 'Excel is a useful starting point. YearWheel makes the plan visible.',
      compareText: 'Excel is great for collecting information. When activities need to be compared across a full year, a year wheel makes workload, recurring patterns and dependencies easier to see.',
      compareItems: [
        ['Your Excel plan', 'Import existing rows instead of rebuilding everything manually.'],
        ['Interactive overview', 'See activities by month, ring and activity group in one view.'],
        ['Team collaboration', 'Let everyone work from the same current plan.'],
        ['Sharing and export', 'Make the plan easy to use in meetings and presentations.'],
      ],
      annualTitle: 'Year wheel or annual wheel: one clear yearly overview',
      annualText: 'A year wheel, also known as an annual wheel, brings the year into a circular view. It helps you plan seasons, deadlines, campaigns and recurring work with the bigger picture in view.',
      faqTitle: 'Common questions about Excel import',
      faqs: [
        ['Which files can I import?', 'YearWheel can import Excel files in .xlsx and .xls format, as well as CSV files.'],
        ['Do I need to rebuild my plan?', 'No. Start with the plan you already have and map its columns to YearWheel activity fields.'],
        ['Can I keep working after import?', 'Yes. Edit activities, organize rings and groups, and share the updated plan with your team.'],
      ],
      finalTitle: 'Make your Excel plan easier to understand',
      finalText: 'See how your existing annual plan works as an interactive year wheel.',
    },
  },
  hr: {
    sv: {
      title: 'HR-årshjul för semester, medarbetare och återkommande processer',
      metaTitle: 'HR-årshjul | HR-planering som verktyg och software | YearWheel',
      metaDescription: 'Planera HR-året visuellt med YearWheel. Samla semester, rekrytering, lönerevision och medarbetarsamtal i ett interaktivt HR-årshjul.',
      eyebrow: 'För HR-team och personalansvariga',
      intro: 'Skapa en gemensam årsöversikt för allt som behöver hända inom HR. Från semesterplanering och rekrytering till lönerevision, onboarding och kompetensutveckling.',
      cta: 'Skapa ett HR-årshjul gratis',
      secondaryCta: 'Se HR-funktionerna',
      importTitle: 'Börja med den planering ni redan har',
      importText: 'Har ni en HR-plan i Excel eller Google Sheets? Importera den till YearWheel och samla informationen i en tydlig vy som hela teamet kan arbeta vidare med.',
      steps: [
        { title: 'Samla HR-processerna', text: 'Lägg in eller importera semester, rekrytering, utbildning och viktiga deadlines.' },
        { title: 'Gruppera efter ansvar', text: 'Använd ringar och aktivitetsgrupper för att skilja processer, team eller perioder åt.' },
        { title: 'Planera tillsammans', text: 'Dela en uppdaterad bild med HR, chefer och ledning genom hela året.' },
      ],
      compareTitle: 'Från utspridda HR-listor till en gemensam årsbild',
      compareText: 'Ett visuellt HR-årshjul gör det enklare att upptäcka intensiva perioder, samordna återkommande processer och kommunicera vad som händer härnäst.',
      compareItems: [
        ['Semester och bemanning', 'Se perioder som påverkar kapacitet och kontinuitet.'],
        ['Återkommande processer', 'Planera lönerevision, medarbetarsamtal och uppföljningar.'],
        ['Rekrytering och onboarding', 'Få en tydlig överblick från behov till introduktion.'],
        ['Kompetensutveckling', 'Samla utbildningar, certifieringar och interna aktiviteter.'],
      ],
      annualTitle: 'Ett HR-årshjul är också ett annual wheel',
      annualText: 'Oavsett om ni söker efter HR-årshjul, annual wheel eller yearly HR planning handlar det om samma sak: en gemensam överblick över årets personalprocesser.',
      faqTitle: 'Vanliga frågor om HR-årshjul',
      faqs: [
        ['Kan vi importera vår befintliga HR-plan?', 'Ja. Importera .xlsx, .xls eller .csv och mappa kolumnerna till aktiviteter och datum.'],
        ['Kan olika team använda samma hjul?', 'Ja. Bjud in kollegor och samla HR-processerna i en gemensam plan.'],
        ['Kan planen visas för ledningen?', 'Ja. Dela hjulet eller exportera en tydlig bild för möten och uppföljning.'],
      ],
      finalTitle: 'Gör HR-året tydligt för hela organisationen',
      finalText: 'Samla processerna i ett årshjul som går att förstå vid första anblicken.',
    },
    en: {
      title: 'HR year wheel for holidays, people and recurring processes',
      metaTitle: 'HR Year Wheel | HR Planning Tool and Software | YearWheel',
      metaDescription: 'Plan your HR year visually with YearWheel. Bring holidays, recruitment, reviews and people processes into one interactive HR year wheel.',
      eyebrow: 'For HR teams and people leaders',
      intro: 'Create one shared overview for the work that keeps your people processes moving. From holidays and recruitment to reviews, onboarding and learning.',
      cta: 'Create an HR year wheel free',
      secondaryCta: 'Explore HR planning',
      importTitle: 'Start with the plan you already have',
      importText: 'Already have an HR plan in Excel or Google Sheets? Import it into YearWheel and give the whole team one clear view to work from.',
      steps: [
        { title: 'Collect HR processes', text: 'Add or import holidays, recruitment, learning and important deadlines.' },
        { title: 'Group by responsibility', text: 'Use rings and activity groups to separate processes, teams or periods.' },
        { title: 'Plan together', text: 'Share one current view with HR, managers and leadership throughout the year.' },
      ],
      compareTitle: 'From scattered HR lists to one shared annual view',
      compareText: 'A visual HR year wheel makes busy periods easier to spot, recurring processes easier to coordinate and next steps easier to communicate.',
      compareItems: [
        ['Holidays and capacity', 'See periods that affect staffing and continuity.'],
        ['Recurring processes', 'Plan reviews, compensation cycles and follow-ups.'],
        ['Recruitment and onboarding', 'Keep the path from hiring need to induction visible.'],
        ['Learning and development', 'Collect training, certifications and internal events.'],
      ],
      annualTitle: 'An HR year wheel is also an annual wheel',
      annualText: 'Whether people search for HR year wheel, annual wheel or yearly HR planning, they are looking for the same thing: a shared overview of people processes across the year.',
      faqTitle: 'Common HR year wheel questions',
      faqs: [
        ['Can we import our existing HR plan?', 'Yes. Import .xlsx, .xls or .csv files and map their columns to activities and dates.'],
        ['Can multiple teams use the same wheel?', 'Yes. Invite colleagues and keep HR processes in one shared plan.'],
        ['Can we present the plan to leadership?', 'Yes. Share the wheel or export a clear image for meetings and reviews.'],
      ],
      finalTitle: 'Make the HR year clear for everyone',
      finalText: 'Bring your processes into a year wheel that is understandable at a glance.',
    },
  },
  marketing: {
    sv: {
      title: 'Årshjul för marketing och kommunikation',
      metaTitle: 'Årshjul Marketing & Kommunikation | Planning Tool | YearWheel',
      metaDescription: 'Planera marketing, kampanjer och kommunikation i ett visuellt årshjul. Importera planen från Excel och få hela året samlat i YearWheel.',
      eyebrow: 'För marknads- och kommunikationsteam',
      intro: 'Samla kampanjer, innehåll, lanseringar och återkommande kommunikation i en årsöversikt som hela teamet kan förstå och uppdatera.',
      cta: 'Skapa ett marketing-årshjul gratis',
      secondaryCta: 'Se hur marketing planeras',
      importTitle: 'Ta med kampanjplanen från Excel',
      importText: 'Har ni redan en contentkalender eller marketingplan i Excel? Importera den till YearWheel och gör sambanden mellan kampanjer, kanaler och deadlines synliga.',
      steps: [
        { title: 'Importera kampanjdata', text: 'Ta med aktiviteter, datum, kanaler och ansvariga från er befintliga plan.' },
        { title: 'Se hela kommunikationsåret', text: 'Få kampanjer, lanseringar och redaktionellt innehåll i en samlad vy.' },
        { title: 'Samordna och dela', text: 'Planera tillsammans och ge andra avdelningar en tydlig bild av vad som kommer.' },
      ],
      compareTitle: 'Från contentkalender till strategisk årsöversikt',
      compareText: 'Ett marketing-årshjul hjälper teamet att se krockar, luckor och intensiva perioder innan de blir problem. Det gör också planen lättare att förankra utanför marknadsavdelningen.',
      compareItems: [
        ['Kampanjer', 'Planera införsäljning, lanseringar och säsongsaktiviteter.'],
        ['Innehåll och kanaler', 'Samordna redaktionellt innehåll med sociala medier, webb och nyhetsbrev.'],
        ['Deadlines', 'Håll ihop produktion, godkännanden och publicering.'],
        ['Tvärfunktionellt arbete', 'Gör planen begriplig för sälj, produkt och ledning.'],
      ],
      annualTitle: 'Årshjul, annual wheel eller marketing planner',
      annualText: 'Ett årshjul, även kallat annual wheel, ger marketingteamet en gemensam rytm för kampanjer, innehåll och kommunikation över året.',
      faqTitle: 'Vanliga frågor om marketing-årshjul',
      faqs: [
        ['Kan vi importera vår contentkalender?', 'Ja. Importera .xlsx, .xls eller .csv och koppla kolumnerna till aktiviteter, datum och grupper.'],
        ['Passar YearWheel för flera kanaler?', 'Ja. Skapa grupper för till exempel webb, sociala medier, nyhetsbrev och kampanjer.'],
        ['Kan andra avdelningar följa planen?', 'Ja. Dela en gemensam vy så att sälj, produkt och ledning ser kommande aktiviteter.'],
      ],
      finalTitle: 'Gör marketingplanen till något hela organisationen ser',
      finalText: 'Samla kampanjer och kommunikation i ett interaktivt årshjul.',
    },
    en: {
      title: 'Year wheel for marketing and communications',
      metaTitle: 'Marketing Year Wheel & Communications Planner | YearWheel Tool',
      metaDescription: 'Plan campaigns, content and communications in a visual marketing year wheel. Import your Excel plan and see the full year in YearWheel.',
      eyebrow: 'For marketing and communications teams',
      intro: 'Bring campaigns, content, launches and recurring communications into one annual overview the whole team can understand and maintain.',
      cta: 'Create a marketing year wheel free',
      secondaryCta: 'Explore marketing planning',
      importTitle: 'Bring your campaign plan from Excel',
      importText: 'Already have a content calendar or marketing plan in Excel? Import it into YearWheel and make the links between campaigns, channels and deadlines visible.',
      steps: [
        { title: 'Import campaign data', text: 'Bring activities, dates, channels and owners from your existing plan.' },
        { title: 'See the communications year', text: 'Keep campaigns, launches and editorial content in one shared view.' },
        { title: 'Coordinate and share', text: 'Plan together and give other departments a clear view of what is coming.' },
      ],
      compareTitle: 'From content calendar to strategic annual overview',
      compareText: 'A marketing year wheel helps teams spot collisions, gaps and busy periods before they become problems. It also makes the plan easier to align across the business.',
      compareItems: [
        ['Campaigns', 'Plan launches, seasonal activity and go-to-market work.'],
        ['Content and channels', 'Coordinate editorial work across social, web and email.'],
        ['Deadlines', 'Keep production, approvals and publishing connected.'],
        ['Cross-functional work', 'Make the plan clear to sales, product and leadership.'],
      ],
      annualTitle: 'Year wheel, annual wheel or marketing planner',
      annualText: 'A year wheel, also known as an annual wheel, gives marketing teams a shared rhythm for campaigns, content and communications across the year.',
      faqTitle: 'Common marketing year wheel questions',
      faqs: [
        ['Can we import our content calendar?', 'Yes. Import .xlsx, .xls or .csv files and map columns to activities, dates and groups.'],
        ['Does YearWheel work across channels?', 'Yes. Create groups for web, social media, email, campaigns or any channel you use.'],
        ['Can other departments follow the plan?', 'Yes. Share one common view so sales, product and leadership can see upcoming work.'],
      ],
      finalTitle: 'Make the marketing plan visible across the business',
      finalText: 'Bring campaigns and communications into an interactive year wheel.',
    },
  },
};

const routeConfig = {
  '/arshjul-mall': { key: 'excel', language: 'sv', canonical: '/arshjul-mall', alternate: '/en/year-wheel-template' },
  '/en/year-wheel-template': { key: 'excel', language: 'en', canonical: '/en/year-wheel-template', alternate: '/arshjul-mall' },
  '/hr': { key: 'hr', language: 'sv', canonical: '/hr', alternate: '/en/hr' },
  '/en/hr': { key: 'hr', language: 'en', canonical: '/en/hr', alternate: '/hr' },
  '/marketing': { key: 'marketing', language: 'sv', canonical: '/marketing', alternate: '/en/marketing' },
  '/en/marketing': { key: 'marketing', language: 'en', canonical: '/en/marketing', alternate: '/marketing' },
};

function getPageConfig(pathname) {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  return routeConfig[normalizedPath] || routeConfig['/arshjul-mall'];
}

export default function YearWheelSeoPage() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const config = getPageConfig(pathname);
  const language = config.language;
  const content = pageContent[config.key][language];
  const canonicalUrl = `https://yearwheel.se${config.canonical}`;
  const alternateUrls = {
    sv: `https://yearwheel.se${language === 'sv' ? config.canonical : config.alternate}`,
    en: `https://yearwheel.se${language === 'en' ? config.canonical : config.alternate}`,
    'x-default': 'https://yearwheel.se/',
  };

  useCanonicalUrl(canonicalUrl);
  useLanguageAlternates(alternateUrls);
  usePageMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    ogImage: 'https://yearwheel.se/og-image.png',
    ogType: 'website',
  });

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    document.documentElement.lang = language;
    return () => {
      document.documentElement.lang = 'sv';
    };
  }, [i18n, language]);

  const isExcel = config.key === 'excel';
  const sectionId = isExcel ? 'import' : 'planning';
  const Icon = config.key === 'hr' ? Users : config.key === 'marketing' ? Megaphone : FileSpreadsheet;

  return (
    <div className="min-h-screen bg-[#F7FBFC] text-[#1B2A63]">
      <header className="border-b border-[#D9EEF0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" aria-label="YearWheel home">
            <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-5" aria-label="Primary navigation">
            <Link to="/pricing" className="hidden text-sm font-medium text-slate-600 hover:text-[#00A4A6] sm:inline">
              {language === 'en' ? 'Pricing' : 'Priser'}
            </Link>
            <LanguageSwitcher languageLinks={{ sv: alternateUrls.sv.replace('https://yearwheel.se', ''), en: alternateUrls.en.replace('https://yearwheel.se', '') }} />
            <Link to="/auth" className="inline-flex items-center gap-2 bg-[#1B2A63] px-4 py-2 text-sm font-semibold text-white hover:bg-[#263a83]">
              {language === 'en' ? 'Sign in' : 'Logga in'}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#D9EEF0] bg-[#1B2A63] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_36%,rgba(54,194,198,0.3),transparent_35%),linear-gradient(120deg,#1B2A63_15%,#173b5e_58%,#167d80_100%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
            <div className="max-w-3xl">
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-[#A4E6E0]">{content.eyebrow}</p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">{content.title}</h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#D9F3F1] sm:text-xl">{content.intro}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth?mode=signup" className="inline-flex items-center justify-center gap-2 bg-[#36C2C6] px-5 py-3 font-semibold text-[#102649] hover:bg-[#70d9d9]">
                  {content.cta}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href={`#${sectionId}`} className="inline-flex items-center justify-center gap-2 border border-[#A4E6E0]/50 px-5 py-3 font-semibold text-white hover:bg-white/10">
                  {content.secondaryCta}
                </a>
              </div>
              <p className="mt-5 text-sm text-[#A4E6E0]">
                {language === 'en' ? 'Start with the plan you already have. No rebuild required.' : 'Börja med planen du redan har. Du behöver inte bygga om allt.'}
              </p>
            </div>
            <div className="relative flex min-h-[300px] items-center justify-center border border-[#A4E6E0]/40 bg-white/10 px-8 py-10 backdrop-blur-sm">
              <WheelVisualization variant="full" className="w-full max-w-[360px]" />
              <div className="absolute bottom-4 left-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#D9F3F1]">
                <Icon size={15} aria-hidden="true" />
                {language === 'en' ? 'Interactive year wheel tool' : 'Interaktivt årshjul som verktyg'}
              </div>
            </div>
          </div>
        </section>

        <section id={sectionId} className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f9fa4]">01 / {isExcel ? 'IMPORT' : 'PLAN'}</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{content.importTitle}</h2>
              </div>
              <div>
                <p className="max-w-3xl text-xl leading-9 text-slate-600">{content.importText}</p>
                <div className="mt-10 grid gap-5 md:grid-cols-3">
                  {content.steps.map((step, index) => (
                    <article key={step.title} className="border-t-2 border-[#36C2C6] pt-5">
                      <div className="flex items-center gap-3 text-[#0f9fa4]">
                        <span className="text-sm font-bold">0{index + 1}</span>
                        {index === 0 ? <Upload size={19} aria-hidden="true" /> : index === 1 ? <RefreshCw size={19} aria-hidden="true" /> : <LayoutDashboard size={19} aria-hidden="true" />}
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                      <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#D9EEF0] bg-[#EAF7F6]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f9fa4]">02 / {language === 'en' ? 'WHY YEARWHEEL' : 'VARFÖR YEARWHEEL'}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{content.compareTitle}</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">{content.compareText}</p>
            </div>
            <div className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-2">
              {content.compareItems.map(([title, text]) => (
                <div key={title} className="flex gap-4 border-t border-[#A4E6E0] pt-5">
                  <CheckCircle2 className="mt-1 shrink-0 text-[#0f9fa4]" size={22} aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <p className="mt-2 leading-7 text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f9fa4]">03 / {language === 'en' ? 'THE BIGGER PICTURE' : 'HELHETEN'}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{content.annualTitle}</h2>
            </div>
            <p className="max-w-3xl text-xl leading-9 text-slate-600">{content.annualText}</p>
          </div>
        </section>

        <section className="border-t border-[#D9EEF0] bg-[#F7FBFC]">
          <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 lg:py-24">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f9fa4]">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{content.faqTitle}</h2>
            <div className="mt-8 divide-y divide-[#D9EEF0] border-y border-[#D9EEF0]">
              {content.faqs.map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold text-slate-900">
                    {question}
                    <span className="text-2xl font-normal text-[#0f9fa4] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-3xl leading-7 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#1B2A63] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
            <div>
              <h2 className="text-3xl font-semibold sm:text-4xl">{content.finalTitle}</h2>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-[#D9F3F1]">{content.finalText}</p>
            </div>
            <Link to="/auth?mode=signup" className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#36C2C6] px-5 py-3 font-semibold text-[#102649] hover:bg-[#70d9d9]">
              {content.cta}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
