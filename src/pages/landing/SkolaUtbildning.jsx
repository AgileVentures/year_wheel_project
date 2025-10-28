import LandingPageTemplate from './LandingPageTemplate';
import { GraduationCap, BookOpen, Calendar, Users, Award, School, FileSpreadsheet, Share2, Sparkles, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Skola & Utbildning Landing Page
 * Target: Skolledare, rektorer, lärare, kommunala utbildningsförvaltningar
 * Keywords: läsårsplanering, skolkalender digital, terminsplanering verktyg
 */
export default function SkolaUtbildning() {
  const { t } = useTranslation('landing');
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "YearWheel - Skola & Läsårsplanering",
    "applicationCategory": "EducationalApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "SEK"
    },
    "description": "Digital läsårsplanering för skolor och utbildning. Planera terminer, utvecklingsdagar, föräldramöten och elevaktiviteter visuellt."
  };

  return (
    <LandingPageTemplate
      metaTitle="Läsårsplanering & Skolkalender - YearWheel"
      metaDescription="Digital terminsplanering för skolor. Visualisera läsåret med lov, utvecklingsdagar, prov och aktiviteter. Perfekt för skolledare och lärare."
      keywords="läsårsplanering, skolkalender digital, terminsplanering verktyg, planering för skolledare, årsplanering utbildning, lärarplanering, terminsöversikt"
      canonicalUrl="https://yearwheel.se/skola-och-utbildning"
      ogImage="https://yearwheel.se/hero-hr-planning.webp"
      
      heroTitle="Läsårsplanering gjord visuell"
      heroSubtitle="Ett tydligt verktyg för skolledare och lärare att planera terminer, lov, utvecklingsdagar, föräldramöten och elevaktiviteter - hela läsåret i en cirkel."
      heroImage="/hero-hr-planning.webp"
      heroCTA="Planera ditt läsår"
      
      painPoints={[
        "Svårt att få en tydlig helhetsbild av hela läsåret",
        "Utspridda kalendrar och dokument skapar förvirring",
        "Utvecklingsdagar och prov kolliderar med skolans aktiviteter",
        "Tidskrävande att kommunicera planen till föräldrar och kollegor"
      ]}
      
      benefits={[
        {
          title: "Terminsöversikt",
          description: "Visualisera både HT och VT i samma årshjul. Se läsårets alla höjdpunkter på en gång."
        },
        {
          title: "Lov och högtider",
          description: "Markera sportlov, påsklov, sommarlov och röda dagar tydligt för elever och föräldrar."
        },
        {
          title: "Utvecklingsplanering",
          description: "Schemalägg kompetensutveckling för lärare, elevhälsoteam och skolledning."
        },
        {
          title: "Dela med föräldrar",
          description: "Exportera läsårsöversikten som PDF och dela med vårdnadshavare vid terminsstart."
        },
        {
          title: "Elevaktiviteter",
          description: "Planera studiedagar, temaveckor, projekt, prov och aktiviteter visuellt genom läsåret."
        },
        {
          title: "Samarbete i arbetslaget",
          description: "Lärare och pedagoger kan uppdatera sina delar medan rektorn har överblicken."
        }
      ]}
      
      features={[
        {
          icon: <Calendar className="w-6 h-6 text-blue-600" />,
          title: t('features.circularOverview.title'),
          description: t('features.circularOverview.description')
        },
        {
          icon: <Users className="w-6 h-6 text-blue-600" />,
          title: t('features.realTimeCollaboration.title'),
          description: t('features.realTimeCollaboration.description')
        },
        {
          icon: <Copy className="w-6 h-6 text-blue-600" />,
          title: t('features.smartCopy.title'),
          description: t('features.smartCopy.description')
        },
        {
          icon: <Share2 className="w-6 h-6 text-blue-600" />,
          title: t('features.multipleShareModes.title'),
          description: t('features.multipleShareModes.description')
        },
        {
          icon: <FileSpreadsheet className="w-6 h-6 text-blue-600" />,
          title: t('features.highQualityExport.title'),
          description: t('features.highQualityExport.description')
        },
        {
          icon: <Sparkles className="w-6 h-6 text-blue-600" />,
          title: t('features.googleIntegration.title'),
          description: t('features.googleIntegration.description')
        }
      ]}
      
      useCases={[
        {
          icon: <GraduationCap className="w-8 h-8 text-purple-600" />,
          title: "Rektors årsplanering",
          description: "Få överblick över hela skolans aktiviteter, personalutveckling och administrativa höjdpunkter."
        },
        {
          icon: <School className="w-8 h-8 text-purple-600" />,
          title: "Lärarlagets planering",
          description: "Samordna olika ämnens prov, projekt och bedömningar för att undvika överbelastning."
        },
        {
          icon: <BookOpen className="w-8 h-8 text-purple-600" />,
          title: "Utbildningsförvaltning",
          description: "Kommunala förvaltningar kan använda mallar för enhetlig läsårsplanering på alla skolor."
        }
      ]}
      
      templates={[
        {
          name: "Läsårsplanering 2025/2026",
          description: "Komplett mall med terminer, lov, utvecklingsdagar och föräldramöten enligt Skolverkets kalender.",
          wheelId: "9a4beb99-1fc2-4082-94f2-bb82d70af3ec"
        },
        {
          name: "Grundskolans årshjul",
          description: "Anpassad för F-9 med nationella prov, temaveckor och elevaktiviteter.",
          wheelId: "TODO" // Replace with actual wheel ID when template is created
        },
        {
          name: "Gymnasieskolans planering",
          description: "Mall för gymnasiet med betygssättning, APL-perioder och studentexamen.",
          wheelId: "TODO" // Replace with actual wheel ID when template is created
        }
      ]}
      
      testimonial={{
        quote: "Som rektor hade jag problem att få all personal att se helheten. Nu visar vi YearWheel-hjulet på kickoff och alla förstår direkt vad som händer när. Föräldrar älskar också den exporterade PDF:en!",
        author: "Anna Bergström",
        role: "Rektor, F-6 skola"
      }}
      
      schemaData={schema}
    />
  );
}
