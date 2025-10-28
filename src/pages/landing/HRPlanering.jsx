import LandingPageTemplate from './LandingPageTemplate';
import { Users, Calendar, Clock, BarChart3, UserCheck, Coffee } from 'lucide-react';

/**
 * HR & Personalplanering Landing Page
 * Target: HR-avdelningar, personalchefer
 * Keywords: personalplanering verktyg, HR kalender årsplanering, semesterplanering team
 */
export default function HRPlanering() {
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
    "description": "Digital personalplanering och HR-kalender för årsöversikt. Planera semester, rekrytering och medarbetarutveckling visuellt."
  };

  return (
    <LandingPageTemplate
      metaTitle="Personalplanering & HR Kalender - YearWheel"
      metaDescription="Digitalt verktyg för personalplanering, semesterplanering och HR-kalender. Få årsöversikt över medarbetare, semester och rekrytering. Prova gratis!"
      keywords="personalplanering verktyg, HR kalender årsplanering, semesterplanering team, medarbetarplanering verktyg, digital HR-planering, HR verktyg, personalavdelning, semesterkalender"
      canonicalUrl="https://yearwheel.se/hr-planering"
      ogImage="https://yearwheel.se/hero-hr-planning.webp"
      
      heroTitle="Personalplanering som ger överblick"
      heroSubtitle="Ett visuellt verktyg för HR-avdelningar att planera semester, rekrytering, introduktion och medarbetarutveckling - hela året på en bild."
      heroImage="/hero-hr-planning.webp"
      heroCTA="Testa gratis HR-planering"
      
      painPoints={[
        "Svårt att få överblick över semesterperioder och personalresurser",
        "Excel-ark blir snabbt röriga och svåra att dela med ledningen",
        "Manuell samordning mellan avdelningar tar för mycket tid",
        "Svårt att visualisera bemanningsbehov över hela året"
      ]}
      
      benefits={[
        {
          title: "Semesteröversikt",
          description: "Se hela teamets semesterplanering i ett visuellt årshjul. Undvik konflikter och säkerställ bemanning."
        },
        {
          title: "Rekryteringsplanering",
          description: "Kartlägg när nya medarbetare behöver vara på plats och planera introduktionsprocesser."
        },
        {
          title: "Kompetensutveckling",
          description: "Schemalägg utbildningar, certifieringar och utvecklingssamtal genom året."
        },
        {
          title: "Samarbete i realtid",
          description: "Dela planer med chefer och andra HR-kollegor. Alla ser samma uppdaterade information."
        },
        {
          title: "Snabba rapporter",
          description: "Exportera vackra presentationer till ledningen på sekunder. PowerPoint, PDF eller bild."
        },
        {
          title: "Integrera med era system",
          description: "Koppla till Google Calendar eller Excel/Sheets för att hämta befintlig data."
        }
      ]}
      
      features={[
        {
          icon: <Calendar className="w-6 h-6 text-blue-600" />,
          title: "Semesterkalender",
          description: "Visualisera alla medarbetares semester i ett årshjul. Färgkoda per avdelning eller roll för enkel översikt."
        },
        {
          icon: <Users className="w-6 h-6 text-blue-600" />,
          title: "Teamsamarbete",
          description: "Bjud in chefer och kollegor. Alla kan uppdatera sin egen planering medan HR har överblick."
        },
        {
          icon: <UserCheck className="w-6 h-6 text-blue-600" />,
          title: "Rekryteringsprocess",
          description: "Planera hela rekryteringsflödet från annonsering till onboarding. Följ upp varje steg visuellt."
        },
        {
          icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
          title: "Bemanningsanalys",
          description: "Se snabbt var bemanningen är kritisk. Identifiera perioder med hög frånvaro eller personalbrister."
        }
      ]}
      
      useCases={[
        {
          icon: <Coffee className="w-8 h-8 text-purple-600" />,
          title: "Semesterplanering",
          description: "Koordinera semester mellan team och säkerställ att verksamheten kan drivas året runt."
        },
        {
          icon: <Clock className="w-8 h-8 text-purple-600" />,
          title: "Introduktionsschema",
          description: "Planera introduktionsveckor för nyanställda med tydlig uppföljning månad för månad."
        },
        {
          icon: <Calendar className="w-8 h-8 text-purple-600" />,
          title: "Utvecklingssamtal",
          description: "Schemalägg medarbetarsamtal och lönerevision jämnt över året istället för rusning i december."
        }
      ]}
      
      templates={[
        {
          name: "HR Årsplanering 2026",
          description: "Komplett mall med ringar för rekrytering, semester, utbildning och lönerevisioner."
        },
        {
          name: "Semesterkalender",
          description: "Enkel mall för att visualisera teamets semesterperioder och planera bemanning."
        },
        {
          name: "Onboarding-plan",
          description: "Strukturerad introduktion för nyanställda med milstolpar för första 90 dagarna."
        }
      ]}
      
      testimonial={{
        quote: "Tidigare hade vi Excel-ark överallt. Nu har hela HR-teamet samma visuella översikt och ledningen älskar rapporterna vi kan ta fram på 30 sekunder.",
        author: "Maria Andersson",
        role: "HR-chef, Tech-företag (250 anställda)"
      }}
      
      schemaData={schema}
    />
  );
}
