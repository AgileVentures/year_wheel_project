import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Crown, Check, Sparkles, Users, FileImage, History, Share2, Zap } from 'lucide-react';
import SubscriptionModal from './subscription/SubscriptionModal';

function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' or 'yearly'

  const handleGetStarted = () => {
    if (user) {
      // Already logged in - show subscription modal
      setShowSubscriptionModal(true);
    } else {
      // Not logged in - redirect to auth page
      navigate('/auth');
    }
  };

  const handleBackToDashboard = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="/year_wheel_logo.svg" 
                alt="YearWheel" 
                className="h-8 w-auto"
              />
            </a>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              {user ? 'Till Dashboard' : 'Logga in'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A4A6]/10 backdrop-blur-sm border border-[#36C2C6]/30 rounded-full text-sm font-semibold mb-6">
          <Sparkles size={16} className="text-[#36C2C6]" />
          <span className="text-[#2E9E97]">AI-assisterad planering</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Enkel prissättning för alla
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Börja gratis och uppgradera när du behöver fler funktioner. 
          Ingen bindningstid, avsluta när du vill.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Månadsvis
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A4A6] transition-colors"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Årsvis
          </span>
          {billingCycle === 'yearly' && (
            <span className="inline-flex items-center px-2 py-1 bg-[#9FCB3E]/20 text-[#336B3E] text-xs font-bold rounded-full border border-[#9FCB3E]/30">
              Spara 19%
            </span>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-sm shadow-lg border-2 border-gray-200 p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Gratis</h3>
              <p className="text-gray-600">Perfekt för att komma igång</p>
            </div>

            <div className="mb-6">
              <span className="text-5xl font-bold text-gray-900">0 kr</span>
              <span className="text-gray-600 ml-2">/månad</span>
            </div>

            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-sm font-semibold transition-colors mb-8"
            >
              Kom igång gratis
            </button>

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">3 årshjul</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">1 team med 3 medlemmar</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Export som PNG och SVG</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Grundläggande funktioner</span>
              </div>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-[#1B2A63] via-[#2D4EC8] to-[#2E9E97] rounded-sm shadow-2xl border-2 border-[#36C2C6]/50 p-8 flex flex-col relative overflow-hidden">
            {/* Popular Badge */}
            <div className="absolute top-0 right-0 bg-[#9FCB3E] text-[#336B3E] px-4 py-1 text-xs font-bold rounded-bl-lg">
              POPULÄRAST
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-[#9FCB3E]" />
                <h3 className="text-2xl font-bold text-white">Premium</h3>
              </div>
              <p className="text-[#A4E6E0]">Allt du behöver för professionell planering</p>
            </div>

            <div className="mb-6">
              {billingCycle === 'monthly' ? (
                <div>
                  <span className="text-5xl font-bold text-white">79 kr</span>
                  <span className="text-[#A4E6E0] ml-2">/månad</span>
                </div>
              ) : (
                <div>
                  <span className="text-5xl font-bold text-white">64 kr</span>
                  <span className="text-[#A4E6E0] ml-2">/månad</span>
                  <div className="text-sm text-[#A4E6E0] mt-1">
                    (768 kr/år - spara 180 kr)
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGetStarted}
              className="w-full py-3 px-6 bg-white hover:bg-[#A4E6E0] text-[#1B2A63] rounded-sm font-semibold transition-colors mb-8 shadow-lg"
            >
              Kom igång nu
            </button>

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white font-semibold">AI-assistent för planering</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white font-semibold">Google Integration (Calendar & Sheets)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white">Obegränsade årshjul</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white">Obegränsade team och medlemmar</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileImage className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white">Alla exportformat (PNG, SVG, PDF, JPG)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <History className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white">Versionshistorik</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Share2 className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white">Dela hjul och samarbeta i realtid</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-[#00A4A6]" />
                </div>
                <span className="text-white">Prioriterad support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Säkra betalningar via Stripe</p>
          <p className="text-sm text-gray-500">Ingen bindningstid • Avsluta när du vill • 30 dagars pengarna-tillbaka-garanti</p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Vanliga frågor
          </h2>
          
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Kan jag prova Premium utan kostnad?
              </h3>
              <p className="text-gray-600">
                Ja! Skapa ett gratis konto och börja använda basversionen. Du kan uppgradera till Premium när du vill.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Vad händer med mina data om jag avslutar Premium?
              </h3>
              <p className="text-gray-600">
                Dina hjul och data förblir intakta. Du kan fortsätta använda gratisversionen med begränsade funktioner.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Hur fungerar AI-assistenten? <span className="text-xs px-2 py-0.5 bg-[#9FCB3E]/20 text-[#336B3E] rounded-full font-bold ml-2">PREMIUM</span>
              </h3>
              <p className="text-gray-600 mb-2">
                AI-assistenten använder avancerad språkförståelse för att hjälpa dig planera snabbare. 
                Beskriv bara vad du vill åstadkomma i naturligt språk, t.ex:
              </p>
              <ul className="text-gray-600 list-disc list-inside ml-4 space-y-1">
                <li>"Skapa en kampanj i mars och kopiera den till september"</li>
                <li>"Förläng produktlansering till halva april"</li>
                <li>"Lägg till 10 möten jämnt fördelade över första kvartalet"</li>
              </ul>
              <p className="text-gray-600 mt-2">
                AI:n skapar automatiskt aktiviteter, upptäcker konflikter och föreslår förbättringar.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Vad är Google Integration? <span className="text-xs px-2 py-0.5 bg-[#9FCB3E]/20 text-[#336B3E] rounded-full font-bold ml-2">PREMIUM</span>
              </h3>
              <p className="text-gray-600 mb-2">
                Med Premium får du tillgång till automatisk synkronisering från:
              </p>
              <ul className="text-gray-600 list-disc list-inside ml-4 space-y-1">
                <li><strong>Google Calendar:</strong> Importera händelser direkt till ditt årshjul</li>
                <li><strong>Google Sheets:</strong> Synka aktiviteter från dina kalkylark</li>
              </ul>
              <p className="text-gray-600 mt-2">
                Systemet distribuerar automatiskt aktiviteter över flera år baserat på datum, 
                och uppdaterar i realtid när du ändrar i Google.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Kan jag byta mellan månads- och årsbetalning?
              </h3>
              <p className="text-gray-600">
                Ja, du kan när som helst byta mellan månads- och årsbetalning i dina prenumerationsinställningar.
              </p>
            </div>

            <div className="pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Är mina betalningar säkra?
              </h3>
              <p className="text-gray-600">
                Absolut! Vi använder Stripe för alla betalningar - en av världens mest betrodda betalningsplattformar. Vi lagrar aldrig dina kortuppgifter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#1B2A63] via-[#2D4EC8] to-[#2E9E97] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Redo att börja planera?
          </h2>
          <p className="text-xl text-[#A4E6E0] mb-8">
            Skapa ditt gratis konto idag och upptäck hur enkelt planering kan vara
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-8 py-4 bg-white hover:bg-[#A4E6E0] text-[#1B2A63] rounded-sm font-bold text-lg transition-colors shadow-xl inline-flex items-center gap-2"
          >
            Kom igång gratis
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-6 w-auto mb-2" />
            <p className="text-sm text-gray-600 text-center">
              YearWheel Planner är en SaaS-tjänst skapad och driven av <a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-[#00A4A6] hover:text-[#2E9E97] font-medium transition-colors">CommunitasLabs Inc</a>
            </p>
            {/* <p className="text-sm text-gray-500">© 2025 YearWheel. Alla rättigheter reserverade.</p> */}
          </div>
        </div>
      </footer>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal 
          onClose={() => setShowSubscriptionModal(false)}
          currentPlan="free"
        />
      )}
    </div>
  );
}

export default PricingPage;
