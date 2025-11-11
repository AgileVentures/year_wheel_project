import { useState, useEffect, useRef } from 'react';
import LandingPageTemplate from './LandingPageTemplate';
import PersonaQuiz from '../../components/PersonaQuiz';
import { educationQuiz } from '../../data/quizData';
import { GraduationCap, BookOpen, Calendar, Users, Award, School, FileSpreadsheet, Share2, Sparkles, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Skola & Utbildning Landing Page
 * Target: Skolledare, rektorer, lärare, kommunala utbildningsförvaltningar
 * Keywords: läsårsplanering, skolkalender digital, terminsplanering verktyg
 */
export default function SkolaUtbildning() {
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
        persona: 'education',
        email: results.email
      });
    }

    console.log('Quiz results:', results);
    navigate('/auth?mode=signup&source=quiz&persona=education');
  };
  
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

  const quizSection = showQuiz ? {
    className: 'py-20 bg-gradient-to-br from-blue-600 to-purple-600',
    content: (
      <div ref={quizRef} id="quiz" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PersonaQuiz
          persona={educationQuiz.persona}
          questions={educationQuiz.questions}
          resultMessages={educationQuiz.resultMessages}
          onComplete={handleQuizComplete}
        />
      </div>
    )
  } : {
    className: 'py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50',
    content: (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-sm shadow-2xl p-10">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Känner du igen dig i läsårsplaneringen?
            </h2>
            <div className="space-y-3 text-left max-w-2xl mx-auto mb-6">
              <div className="flex items-start gap-3 text-lg">
                <span className="text-red-600 font-bold text-xl">✗</span>
                <p className="text-gray-700">"Svårt att få helhetsbild av hela läsåret"</p>
              </div>
              <div className="flex items-start gap-3 text-lg">
                <span className="text-red-600 font-bold text-xl">✗</span>
                <p className="text-gray-700">"Utvecklingsdagar krockar med andra aktiviteter"</p>
              </div>
              <div className="flex items-start gap-3 text-lg">
                <span className="text-red-600 font-bold text-xl">✗</span>
                <p className="text-gray-700">"Föräldrar vill ha tydligare översikt"</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Är du redo att...
            </h3>
            <div className="space-y-2 text-left max-w-2xl mx-auto mb-6">
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold text-xl">✓</span>
                <p className="text-gray-700">Få hela läsåret visuellt på en sida?</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold text-xl">✓</span>
                <p className="text-gray-700">Dela professionell översikt med föräldrar direkt?</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold text-xl">✓</span>
                <p className="text-gray-700">Samordna arbetslaget i samma digitala kalender?</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-sm p-6 mb-6">
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              Hur kan YearWheel hjälpa just din skola? (2 min quiz)
            </h4>
            <p className="text-gray-700 mb-4">
              Svara på 10 frågor om er läsårsplanering och få konkreta tips på hur ni kan förbättra kommunikation med föräldrar och samordning i arbetslaget.
            </p>
            <button
              onClick={() => setShowQuiz(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-sm shadow-lg hover:shadow-xl transition-all"
            >
              <GraduationCap className="w-5 h-5" />
              Starta quiz - få personliga tips
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Skolor och lärare runt om i Sverige använder YearWheel för tydligare läsårsplanering
          </p>
        </div>
      </div>
    )
  };

  return (
    <LandingPageTemplate
      metaTitle="Läsårsplanering & Skolkalender - YearWheel"
      metaDescription="Digital terminsplanering för skolor. Visualisera läsåret med lov, utvecklingsdagar, prov och aktiviteter. Perfekt för skolledare och lärare."
      keywords="läsårsplanering, skolkalender digital, terminsplanering verktyg, planering för skolledare, årsplanering utbildning, lärarplanering, terminsöversikt"
      canonicalUrl="https://yearwheel.se/skola-och-utbildning"
      ogImage="https://yearwheel.se/hero-hr-planning.webp"
      
      heroTitle="Frustrerad över läsårsplaneringen?"
      heroSubtitle="Ett tydligt verktyg för skolledare och lärare att planera terminer, lov, utvecklingsdagar, föräldramöten och elevaktiviteter - hela läsåret i en cirkel."
      heroImage="/hero-hr-planning.webp"
      heroCTA="Planera ditt läsår"
      
      painPoints={[
        "Svårt att få helhetsbild av hela läsåret",
        "Utvecklingsdagar krockar med andra aktiviteter",
        "Föräldrar vill ha tydligare översikt",
        "Tidskrävande att kommunicera planen"
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
          wheelId: "b27feedd-4597-4aa9-b41a-dc7a3d497c6b"
        },
        {
          name: "Gymnasieskolans planering",
          description: "Mall för gymnasiet med betygssättning, APL-perioder och studentexamen.",
          wheelId: "2a8f7d84-40c5-474d-9aa8-612c1060a7fa"
        }
      ]}
      
      testimonial={{
        quote: "Som rektor hade jag problem att få all personal att se helheten. Nu visar vi YearWheel-hjulet på kickoff och alla förstår direkt vad som händer när. Föräldrar älskar också den exporterade PDF:en!",
        author: "Anna Bergström",
        role: "Rektor, F-6 skola"
      }}
      
      customSections={[quizSection]}
      
      schemaData={schema}
    />
  );
}
