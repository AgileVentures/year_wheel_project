import { useState, useEffect, useRef } from 'react';
import LandingPageTemplate from './LandingPageTemplate';
import PersonaQuiz from '../../components/PersonaQuiz';
import { marketingQuiz } from '../../data/quizData';
import { Megaphone, Calendar, Image, TrendingUp, Users, Sparkles, FileSpreadsheet, Copy, MessageSquare, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Innehållsplanering & Marknadsföring Landing Page
 * Target: Marknadsavdelningar, content creators, byråer
 * Keywords: innehållskalender årsöversikt, planera sociala medier, marknadsplan årshjul
 */
export default function Marknadsplanering() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuiz, setShowQuiz] = useState(false);
  const quizRef = useRef(null);

  // Check URL hash on mount and when location changes
  useEffect(() => {
    if (location.hash === '#quiz') {
      setShowQuiz(true);
      // Scroll to quiz after state update
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
    // Track quiz completion
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'quiz_lead_generated', {
        persona: 'marketing',
        email: results.email
      });
    }

    // TODO: Send to backend/CRM
    console.log('Quiz results:', results);
    
    // Redirect to signup with context
    navigate('/auth?mode=signup&source=quiz&persona=marketing');
  };
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "YearWheel - Marknadsplanering & Innehållskalender",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "SEK"
    },
    "description": "Visuell innehållskalender och marknadsplan för hela året. Planera kampanjer, innehåll och sociala medier i ett årshjul."
  };

  // Quiz section to inject before templates
  const quizSection = showQuiz ? {
    className: 'py-20 bg-gradient-to-br from-blue-600 to-purple-600',
    content: (
      <div ref={quizRef} id="quiz" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <PersonaQuiz
          persona={marketingQuiz.persona}
          questions={marketingQuiz.questions}
          resultMessages={marketingQuiz.resultMessages}
          onComplete={handleQuizComplete}
        />
      </div>
    )
  } : {
    className: 'py-20 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50',
    content: (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-sm shadow-2xl p-10">
          {/* Pain Hook */}
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Känner du igen dig?
            </h2>
            <div className="space-y-3 text-left max-w-2xl mx-auto mb-6">
              <div className="flex items-start gap-3 text-lg">
                <span className="text-red-600 font-bold text-xl">✗</span>
                <p className="text-gray-700">"Innehållskalendern i Excel blir snabbt kaotisk"</p>
              </div>
              <div className="flex items-start gap-3 text-lg">
                <span className="text-red-600 font-bold text-xl">✗</span>
                <p className="text-gray-700">"Det tar timmar att producera rapporter till ledningen"</p>
              </div>
              <div className="flex items-start gap-3 text-lg">
                <span className="text-red-600 font-bold text-xl">✗</span>
                <p className="text-gray-700">"Teamet tappar överblicken över kampanjer"</p>
              </div>
            </div>
          </div>

          {/* Results Hook */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Är du redo att...
            </h3>
            <div className="space-y-2 text-left max-w-2xl mx-auto mb-6">
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold text-xl">✓</span>
                <p className="text-gray-700">Få överblick över hela årets kampanjer på 5 sekunder?</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold text-xl">✓</span>
                <p className="text-gray-700">Samordna innehåll mellan alla kanaler utan krångel?</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold text-xl">✓</span>
                <p className="text-gray-700">Imponera på stakeholders med professionella presentationer?</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-sm p-6 mb-6">
            <h4 className="text-xl font-bold text-gray-900 mb-3">
              Ta vår quiz (2 minuter)
            </h4>
            <p className="text-gray-700 mb-4">
              Svara på 10 frågor och få en personlig rekommendation om hur YearWheel kan förbättra just er marknadsplanering.
            </p>
            <button
              onClick={() => setShowQuiz(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-sm shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Starta quiz - få din rekommendation
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Över 500 marknadsavdelningar har redan upptäckt hur YearWheel förenklar deras planering
          </p>
        </div>
      </div>
    )
  };

  return (
    <LandingPageTemplate
      metaTitle="Marknadsplanering & Innehållskalender - YearWheel"
      metaDescription="Planera kampanjer, innehåll och sociala medier visuellt. Innehållskalender för hela året i ett årshjul. Perfekt för marknadsavdelningar och content creators."
      keywords="innehållskalender årsöversikt, planera sociala medier årligen, redaktionell årsplanering, marknadsplan årshjul mall, digital marknadsplanering, content kalender, kampanjplanering"
      canonicalUrl="https://yearwheel.se/marknadsplanering"
      ogImage="https://yearwheel.se/hero-hr-planning.webp"
      
      heroTitle="Frustrerad över marknadsplaneringen?"
      heroSubtitle="Skapa en visuell årsöversikt över kampanjer, innehåll och sociala medier. Samordna teamet och imponera på stakeholders med professionella presentationer."
      heroImage="/hero-hr-planning.webp"
      heroCTA="Planera ditt marknadsår"
      
      painPoints={[
        "Innehållskalendern i Excel blir snabbt kaotisk",
        "Teamet tappar överblicken över kampanjer",
        "Svårt att koordinera mellan olika kanaler",
        "Rapporter till ledningen tar timmar att producera"
      ]}
      
      benefits={[
        {
          title: "Kampanjöversikt",
          description: "Se alla kampanjer, produktlanseringar och säsongsaktiviteter på en visuell tidslinje."
        },
        {
          title: "Innehållsplanering",
          description: "Planera bloggposter, videos, podcasts och sociala medier-innehåll månadsvis."
        },
        {
          title: "Kanalsamordning",
          description: "Koordinera innehåll mellan Instagram, LinkedIn, TikTok, nyhetsbrev och webb på ett ställe."
        },
        {
          title: "Teamsamarbete",
          description: "Content creators, designers och marknadsförare ser samma plan och kan kommentera direkt."
        },
        {
          title: "Snygga presentationer",
          description: "Exportera marknadsplanen som PDF eller bild och imponera på ledningen och kunder."
        },
        {
          title: "AI-assistent",
          description: "Få förslag på innehåll och kampanjer baserat på säsonger och högtider."
        }
      ]}
      
      features={[
        {
          icon: <Sparkles className="w-6 h-6 text-blue-600" />,
          title: t('features.aiAssistant.title'),
          description: t('features.aiAssistant.description')
        },
        {
          icon: <Calendar className="w-6 h-6 text-blue-600" />,
          title: t('features.circularOverview.title'),
          description: t('features.circularOverview.description')
        },
        {
          icon: <Copy className="w-6 h-6 text-blue-600" />,
          title: t('features.smartCopy.title'),
          description: t('features.smartCopy.description')
        },
        {
          icon: <FileSpreadsheet className="w-6 h-6 text-blue-600" />,
          title: t('features.highQualityExport.title'),
          description: t('features.highQualityExport.description')
        },
        {
          icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
          title: t('features.comments.title'),
          description: t('features.comments.description')
        },
        {
          icon: <History className="w-6 h-6 text-blue-600" />,
          title: t('features.versionHistory.title'),
          description: t('features.versionHistory.description')
        }
      ]}
      
      useCases={[
        {
          icon: <Sparkles className="w-8 h-8 text-purple-600" />,
          title: "Content-strategi",
          description: "Planera tematiska innehållsperioder och säkerställ variation och relevans genom året."
        },
        {
          icon: <Users className="w-8 h-8 text-purple-600" />,
          title: "Samarbeten & PR",
          description: "Schemalägg influencer-samarbeten, pressreleaser och partnerskap på rätt tidpunkter."
        },
        {
          icon: <Calendar className="w-8 h-8 text-purple-600" />,
          title: "Event-marknadsföring",
          description: "Kartlägg mässor, webbinarier och launches med förberedelsetid och uppföljning."
        }
      ]}
      
      templates={[
        {
          name: "Marknadsplan 2026",
          description: "Komplett mall för kampanjer, innehåll, sociala medier och event genom hela året."
        },
        {
          name: "Social Media Kalender",
          description: "Specifik planering för Instagram, LinkedIn, TikTok med förslag på innehållsteman."
        },
        {
          name: "Content Production",
          description: "Mall för content creators: blogg, video, podcast, nyhetsbrev och SEO-innehåll."
        }
      ]}
      
      testimonial={{
        quote: "Som innehållsbyrå behövde vi ett sätt att visa kunder hela årets planering visuellt. YearWheel blev genombrottet - kunderna förstår strategin direkt!",
        author: "Erik Lundberg",
        role: "Creative Director, Digital Byrå"
      }}
      
      customSections={[quizSection]}
      
      schemaData={schema}
    />
  );
}
