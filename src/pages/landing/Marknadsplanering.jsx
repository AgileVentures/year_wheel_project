import LandingPageTemplate from './LandingPageTemplate';
import { Megaphone, Calendar, Image, TrendingUp, Users, Sparkles } from 'lucide-react';

/**
 * Innehållsplanering & Marknadsföring Landing Page
 * Target: Marknadsavdelningar, content creators, byråer
 * Keywords: innehållskalender årsöversikt, planera sociala medier, marknadsplan årshjul
 */
export default function Marknadsplanering() {
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

  return (
    <LandingPageTemplate
      metaTitle="Marknadsplanering & Innehållskalender - YearWheel"
      metaDescription="Planera kampanjer, innehåll och sociala medier visuellt. Innehållskalender för hela året i ett årshjul. Perfekt för marknadsavdelningar och content creators."
      keywords="innehållskalender årsöversikt, planera sociala medier årligen, redaktionell årsplanering, marknadsplan årshjul mall, digital marknadsplanering, content kalender, kampanjplanering"
      canonicalUrl="https://yearwheel.se/marknadsplanering"
      ogImage="https://yearwheel.se/hero-hr-planning.webp"
      
      heroTitle="Marknadsplanering som inspirerar"
      heroSubtitle="Skapa en visuell årsöversikt över kampanjer, innehåll och sociala medier. Samordna teamet och imponera på stakeholders med professionella presentationer."
      heroImage="/hero-hr-planning.webp"
      heroCTA="Planera ditt marknadsår"
      
      painPoints={[
        "Innehållskalendern i Excel blir snabbt oöverskådlig",
        "Svårt att koordinera kampanjer mellan olika kanaler",
        "Teamet tappar överblicken över vad som händer när",
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
          icon: <Calendar className="w-6 h-6 text-blue-600" />,
          title: "Visuell innehållskalender",
          description: "Se hela årets innehållsplanering cirkulärt. Identifiera luckor och optimera publiceringsfrekvens."
        },
        {
          icon: <Megaphone className="w-6 h-6 text-blue-600" />,
          title: "Kampanjplanering",
          description: "Kartlägg stora kampanjer, produktlanseringar och events. Förbered content i god tid."
        },
        {
          icon: <Image className="w-6 h-6 text-blue-600" />,
          title: "Multi-kanal översikt",
          description: "Olika färgkodade ringar för varje kanal - webb, sociala medier, PR, event, nyhetsbrev."
        },
        {
          icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
          title: "Säsongsanpassning",
          description: "Planera innehåll kring högtider, black friday, sommarsemester och bransch-events."
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
      
      schemaData={schema}
    />
  );
}
