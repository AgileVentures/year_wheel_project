import LandingPageTemplate from './LandingPageTemplate';
import { Layers, Target, CheckCircle2, Users, Zap, TrendingUp } from 'lucide-react';

/**
 * Projektplanering Landing Page
 * Target: Projektledare, småföretag som tycker Asana/Monday är för tungt
 * Keywords: enkel projektplanering, projektkalender årsöversikt, visualisera projektplan
 */
export default function Projektplanering() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "YearWheel - Enkel Projektplanering",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "SEK"
    },
    "description": "Enkel projektplanering och projektkalender med årsöversikt. Mellan Excel och Asana - perfekt för mindre projekt och team."
  };

  return (
    <LandingPageTemplate
      metaTitle="Enkel Projektplanering & Projektkalender - YearWheel"
      metaDescription="Projektplanering som är enklare än Asana men kraftfullare än Excel. Visualisera projektplan och milstolpar i ett årshjul. Prova gratis!"
      keywords="enkel projektplanering, projektkalender årsöversikt, visualisera projektplan, årshjul för projektledning, planeringsverktyg små projekt, enkel projektledning"
      
      heroTitle="Projektplanering utan krångel"
      heroSubtitle="För dig som tycker Asana är för tungt men Excel för enkelt. Visualisera projekt, milstolpar och leveranser i en tydlig årsöversikt."
      heroImage="/hero-project.png"
      heroCTA="Börja planera projekt"
      
      painPoints={[
        "Asana och Monday känns överdimensionerat för våra behov",
        "Excel-ark blir snabbt rörigt när flera projekt pågår samtidigt",
        "Svårt att få överblick över projektens tidslinje och beroenden",
        "Kunden vill se en enkel, visuell översikt - inte komplicerade Gantt-scheman"
      ]}
      
      benefits={[
        {
          title: "Projektöversikt",
          description: "Se alla projekt, faser och milstolpar i ett visuellt årshjul. Identifiera resurskrockar direkt."
        },
        {
          title: "Enkel tidslinje",
          description: "Dra och släpp projekt i tidslinjen. Ändra start/slutdatum utan att bygga om allt."
        },
        {
          title: "Mellan Excel och Asana",
          description: "Lagom komplexitet för små och medelstora projekt. Lätt att komma igång, kraftfullt när du behöver det."
        },
        {
          title: "Dela med kunden",
          description: "Exportera projektplanen som vacker bild eller PDF. Kunden ser direkt vad som händer när."
        },
        {
          title: "Teamsamarbete",
          description: "Bjud in teammedlemmar och se vem som jobbar med vad. Enkel kommentering och uppdatering."
        },
        {
          title: "Multi-projekt",
          description: "Hantera flera projekt parallellt och se var resurser behövs mest genom året."
        }
      ]}
      
      features={[
        {
          icon: <Layers className="w-6 h-6 text-blue-600" />,
          title: "Projektfaser",
          description: "Dela upp projekt i faser: planering, design, utveckling, test, lansering. Se helheten och detaljerna."
        },
        {
          icon: <Target className="w-6 h-6 text-blue-600" />,
          title: "Milstolpar & Leveranser",
          description: "Markera viktiga deadlines och leveranser. Få varningar när milstolpar närmar sig."
        },
        {
          icon: <CheckCircle2 className="w-6 h-6 text-blue-600" />,
          title: "Status-tracking",
          description: "Färgkoda projekt baserat på status: planerat, pågående, försenat, klart."
        },
        {
          icon: <Users className="w-6 h-6 text-blue-600" />,
          title: "Resursplanering",
          description: "Se vilka projekt som överlappar och identifiera resurskonflikter innan de händer."
        }
      ]}
      
      useCases={[
        {
          icon: <Zap className="w-8 h-8 text-purple-600" />,
          title: "Kundprojekt",
          description: "Visualisera flera kundprojekt parallellt och kommunicera tidslinjer tydligt till kunden."
        },
        {
          icon: <TrendingUp className="w-8 h-8 text-purple-600" />,
          title: "Produktlansering",
          description: "Planera alla steg från idé till lansering: koncept, design, produktion, marknadsföring, release."
        },
        {
          icon: <Target className="w-8 h-8 text-purple-600" />,
          title: "Intern utveckling",
          description: "Koordinera interna projekt som systemuppdateringar, processutveckling och utbildningar."
        }
      ]}
      
      templates={[
        {
          name: "Kundprojekt 2026",
          description: "Mall för konsulter och byråer med typiska projektfaser och milstolpar."
        },
        {
          name: "Produktutveckling",
          description: "Strukturerad mall från idé till lansering för produktteam och startups."
        },
        {
          name: "Event-planering",
          description: "Planera konferenser, mässor eller företagsevent med alla förberedelsesteg."
        }
      ]}
      
      testimonial={{
        quote: "Vi testade både Monday och Asana men det blev för mycket administration. YearWheel ger oss exakt den översikt vi behöver utan massa onödiga funktioner.",
        author: "Johan Svensson",
        role: "Projektledare, Digital Byrå"
      }}
      
      schemaData={schema}
    />
  );
}
