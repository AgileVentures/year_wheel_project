import { useState, useEffect, useRef } from 'react';
import LandingPageTemplate from './LandingPageTemplate';
import PersonaQuiz from '../../components/PersonaQuiz';
import { projectQuiz } from '../../data/quizData';
import { Target, ClipboardList, Users, BarChart3, Calendar, Workflow, FileSpreadsheet, Share2, CheckCircle2, Sparkles, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Projektplanering Landing Page
 * Target: Projektledare, småföretag som tycker Asana/Monday är för tungt
 * Keywords: enkel projektplanering, projektkalender årsöversikt, visualisera projektplan
 */
export default function Projektplanering() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuiz, setShowQuiz] = useState(false);
  const quizRef = useRef(null);

  // Check URL hash on mount and when location changes
  useEffect(() => {
    if (location.hash === '#quiz') {
      setShowQuiz(true);
      setTimeout(() => {
        quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.hash]);

  // Update URL hash when quiz is shown
  useEffect(() => {
    if (showQuiz) {
      window.history.pushState(null, '', '#quiz');
      setTimeout(() => {
        quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (location.hash === '#quiz') {
      window.history.pushState(null, '', location.pathname);
    }
  }, [showQuiz, location.pathname, location.hash]);

  const handleQuizComplete = async (results) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'quiz_lead_generated', {
        persona: 'project',
        email: results.email
      });
    }

    console.log('Quiz results:', results);
    navigate('/auth?mode=signup&source=quiz&persona=project');
  };
  
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

  const quizSection = showQuiz ? {
    className: 'py-20 bg-gradient-to-br from-blue-600 to-purple-600',
    content: (
      <div ref={quizRef} id="quiz" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PersonaQuiz
          persona={projectQuiz.persona}
          questions={projectQuiz.questions}
          resultMessages={projectQuiz.resultMessages}
          onComplete={handleQuizComplete}
        />
      </div>
    )
  } : {
    className: 'py-20 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50',
    content: (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-sm shadow-2xl p-10">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frustrerad över projektverktygen?
            </h2>
            <div className="space-y-3 text-left max-w-2xl mx-auto mb-6">
              <div className="flex items-start gap-3 text-lg">
                <X className="text-red-600 w-5 h-5 mt-0.5" />
                <p className="text-gray-700">"Asana och Monday är för komplicerat för våra behov"</p>
              </div>
              <div className="flex items-start gap-3 text-lg">
                <X className="text-red-600 w-5 h-5 mt-0.5" />
                <p className="text-gray-700">"Excel-ark blir rörigt när flera projekt pågår"</p>
              </div>
              <div className="flex items-start gap-3 text-lg">
                <X className="text-red-600 w-5 h-5 mt-0.5" />
                <p className="text-gray-700">"Kunden vill ha enkel översikt, inte Gantt-diagram"</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Är du redo att...
            </h3>
            <div className="space-y-2 text-left max-w-2xl mx-auto mb-6">
              <div className="flex items-start gap-3">
                <Check className="text-green-600 w-5 h-5 mt-0.5" />
                <p className="text-gray-700">Se alla projekt och milstolpar i en enda vy?</p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-green-600 w-5 h-5 mt-0.5" />
                <p className="text-gray-700">Uppdatera projektplan på 2 minuter istället för 20?</p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-green-600 w-5 h-5 mt-0.5" />
                <p className="text-gray-700">Få kunder att säga "WOW" när de ser projektplanen?</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-sm p-6 mb-6">
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              Hitta rätt projektverktyg (2 minuters quiz)
            </h4>
            <p className="text-gray-700 mb-4">
              Svara på 10 frågor och få en personlig analys av hur YearWheel passar era projektbehov - och hur mycket tid ni kan spara.
            </p>
            <button
              onClick={() => setShowQuiz(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-sm shadow-lg hover:shadow-xl transition-all"
            >
              <Target className="w-5 h-5" />
              Starta quiz - hitta din lösning
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Projektledare och byråer älskar mellanvägen mellan Excel och Asana
          </p>
        </div>
      </div>
    )
  };

  return (
    <LandingPageTemplate
      metaTitle="Enkel Projektplanering & Projektkalender - YearWheel"
      metaDescription="Projektplanering som är enklare än Asana men kraftfullare än Excel. Visualisera projektplan och milstolpar i ett årshjul. Prova gratis!"
      keywords="enkel projektplanering, projektkalender årsöversikt, visualisera projektplan, årshjul för projektledning, planeringsverktyg små projekt, enkel projektledning"
      canonicalUrl="https://yearwheel.se/projektplanering"
      ogImage="https://yearwheel.se/hero-hr-planning.webp"
      
      heroTitle="Frustrerad över projektplaneringen?"
      heroSubtitle="För dig som tycker Asana är för tungt men Excel för enkelt. Visualisera projekt, milstolpar och leveranser i en tydlig årsöversikt."
      heroImage="/hero-hr-planning.webp"
      heroCTA="Börja planera projekt"
      
      painPoints={[
        "Asana och Monday känns överdimensionerat",
        "Excel blir rörigt när flera projekt pågår",
        "Svårt att få överblick över tidslinje och beroenden",
        "Kunden vill se enkel översikt - inte Gantt-diagram"
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
          icon: <Calendar className="w-6 h-6 text-blue-600" />,
          title: t('features.circularOverview.title'),
          description: t('features.circularOverview.description')
        },
        {
          icon: <Sparkles className="w-6 h-6 text-blue-600" />,
          title: t('features.aiAssistant.title'),
          description: t('features.aiAssistant.description')
        },
        {
          icon: <Copy className="w-6 h-6 text-blue-600" />,
          title: t('features.smartCopy.title'),
          description: t('features.smartCopy.description')
        },
        {
          icon: <Users className="w-6 h-6 text-blue-600" />,
          title: t('features.realTimeCollaboration.title'),
          description: t('features.realTimeCollaboration.description')
        },
        {
          icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
          title: t('features.comments.title'),
          description: t('features.comments.description')
        },
        {
          icon: <FileSpreadsheet className="w-6 h-6 text-blue-600" />,
          title: t('features.highQualityExport.title'),
          description: t('features.highQualityExport.description')
        },
        {
          icon: <History className="w-6 h-6 text-blue-600" />,
          title: t('features.versionHistory.title'),
          description: t('features.versionHistory.description')
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
      
      customSections={[quizSection]}
      
      schemaData={schema}
    />
  );
}
