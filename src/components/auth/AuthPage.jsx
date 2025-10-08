import { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

function AuthPage() {
  // Check if coming from an invite link and whether it's a new user
  const hasInviteToken = sessionStorage.getItem('pendingInviteToken');
  const inviteIsNewUser = sessionStorage.getItem('inviteIsNewUser');
  
  // Default logic:
  // - If invite for NEW user → signup
  // - If invite for EXISTING user → login
  // - No invite → signup (default)
  const getDefaultMode = () => {
    if (hasInviteToken && inviteIsNewUser === 'false') {
      return 'login';
    }
    return 'signup';
  };
  
  const [mode, setMode] = useState(getDefaultMode());

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Hero Section with Logo */}
      <div className="pt-12 pb-6 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <img 
            src="/year_wheel_logo.svg" 
            alt="YearWheel" 
            className="w-80 h-auto md:w-96 md:h-auto mx-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="mt-6">
            <p className="text-base md:text-lg text-gray-600 font-medium">
              Gratis att testa • Uppgradera för fler funktioner
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="bg-white rounded-sm shadow-2xl overflow-hidden border border-gray-100">
          <div className="grid lg:grid-cols-5 gap-0">
            {/* Left Column - Marketing Content (3/5 width) */}
            <div className="lg:col-span-3 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 md:p-16 text-white flex flex-col justify-center">
              <div className="space-y-8">
                {/* Main Headline */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                    Året i en bild – fatta beslut snabbare
                  </h1>
                  <p className="text-base md:text-lg text-blue-50 leading-relaxed">
                    YearWheel gör din årsplanering tydlig, samlad och lätt att agera på. Du ser hela året på en gång, 
                    hittar luckor och krockar direkt och får ett gemensamt språk för planering i teamet.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Cirkulär överblick som avslöjar mönster</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Se månader, veckor och dagar i ett intuitivt hjul. Upptäck säsongstoppar, kampanjfönster 
                        och resurstoppar som lätt försvinner i traditionella kalendrar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Samarbete som håller farten uppe</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Skapa team, dela hjul och arbeta i realtid. Bjud in med länk och ge alla samma uppdaterade 
                        översikt – inga fler utdaterade filer eller parallella planer.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Smarta ringar som speglar din strategi</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Ordna aktiviteter i egna ringar. Lägg mål och initiativ i de inre ringarna och dagliga 
                        aktiviteter i de yttre. Färgkoda kategorier så att fokus och ansvar blir tydligt på en sekund.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Klart att dela och presentera</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Exportera som PNG eller SVG i hög upplösning. Använd direkt i presentationer, styrgrupper 
                        och månadsmöten eller skriv ut och sätt på väggen.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Use Cases */}
                <div className="bg-white/10 rounded-sm p-5 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-3">Passar perfekt för</h3>
                  <ul className="space-y-2 text-sm text-blue-100">
                    <li className="flex items-center gap-2">
                      <span className="text-white">•</span>
                      Strategisk planering och kvartalsmål
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-white">•</span>
                      Projektledning och resurssättning
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-white">•</span>
                      Marknadsplaner och kampanjkalendrar
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-white">•</span>
                      Event, lanseringar och utbildningar
                    </li>
                  </ul>
                </div>

                {/* CTA */}
                <div className="pt-4 border-t border-white/20">
                  <p className="text-base font-semibold">
                    Kom igång på några minuter
                  </p>
                  <p className="text-sm text-blue-100 mt-2">
                    Skapa ditt första hjul, bjud in teamet och få en gemensam bild av året som alla förstår – och vill följa.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Login/Signup Form (2/5 width) */}
            <div className="lg:col-span-2 p-8 md:p-12 bg-gradient-to-br from-gray-50 to-white">
              <div className="w-full max-w-md">
                {mode === 'login' ? (
                  <LoginForm onToggleMode={() => setMode('signup')} />
                ) : (
                  <SignupForm onToggleMode={() => setMode('login')} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            YearWheel Planner is a SaaS service created and operated by CommunitasLabs Inc. • <a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">communitaslabs.io</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
