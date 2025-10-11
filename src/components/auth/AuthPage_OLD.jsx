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
    <div className="min-h-screen bg-gradient-to-br from-[#A4E6E0]/20 via-white to-[#36C2C6]/10">
      {/* Header with Logo */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
            <img 
              src="/year_wheel_logo.svg" 
              alt="YearWheel" 
              className="h-8 w-auto"
            />
          </a>
        </div>
      </header>

      {/* Main Content - Centered Single Column */}
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === 'signup' ? 'Skapa ditt konto' : 'Logga in'}
          </h1>
          <p className="text-gray-600">
            {mode === 'signup' 
              ? 'Kom igång på 30 sekunder – ingen kreditkort behövs' 
              : 'Välkommen tillbaka!'}
          </p>
        </div>

        <div className="bg-white rounded-sm shadow-xl p-8 border border-gray-200">
          {mode === 'login' ? (
            <LoginForm onToggleMode={() => setMode('signup')} />
          ) : (
            <SignupForm onToggleMode={() => setMode('login')} />
          )}
        </div>

        {/* Quick benefits for signup mode */}
        {mode === 'signup' && (
          <div className="mt-8 bg-white rounded-sm border border-gray-200 p-6">
            <p className="text-sm font-semibold text-gray-900 mb-4 text-center">Ingår i den kostnadsfria versionen:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 text-[#00A4A6] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>3 årshjul</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 text-[#00A4A6] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>1 team med upp till 3 medlemmar</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700">
                <svg className="w-5 h-5 text-[#00A4A6] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Export som PNG och SVG</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 text-center mt-4 pt-4 border-t border-gray-200">
              Uppgradera när som helst för AI-assistans, obegränsade hjul och team
            </p>
          </div>
        )}

        {/* Simplified marketing for login mode */}
        {mode === 'login' && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Inget konto ännu? <a href="/pricing" className="text-[#00A4A6] hover:text-[#2E9E97] font-medium">Se våra planer</a>
            </p>
          </div>
        )}

        {/* Footer - kept but moved below */}
        <div className="text-center mt-12 pb-8">
          <div className="lg:col-span-3 bg-gradient-to-br from-[#1B2A63] via-[#2D4EC8] to-[#2E9E97] p-8 md:p-16 text-white flex flex-col justify-center hidden">
              <div className="space-y-8">
                {/* Main Headline */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                    Året i en bild – fatta beslut snabbare
                  </h1>
                  <p className="text-base md:text-lg text-[#A4E6E0] leading-relaxed">
                    YearWheel gör din årsplanering tydlig, samlad och lätt att agera på. Du ser hela året på en gång, 
                    hittar luckor och krockar direkt och får ett gemensamt språk för planering i teamet.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#36C2C6]/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0 border border-[#36C2C6]/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A4E6E0]">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Cirkulär överblick som avslöjar mönster</h3>
                      <p className="text-[#A4E6E0] text-sm leading-relaxed">
                        Se månader, veckor och dagar i ett intuitivt hjul. Upptäck säsongstoppar, kampanjfönster 
                        och resurstoppar som lätt försvinner i traditionella kalendrar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-[#36C2C6]/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0 border border-[#36C2C6]/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A4E6E0]">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Samarbete som håller farten uppe</h3>
                      <p className="text-[#A4E6E0] text-sm leading-relaxed">
                        Skapa team, dela hjul och arbeta i realtid. Bjud in med länk och ge alla samma uppdaterade 
                        översikt – inga fler utdaterade filer eller parallella planer.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-[#36C2C6]/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0 border border-[#36C2C6]/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A4E6E0]">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Smarta ringar som speglar din strategi</h3>
                      <p className="text-[#A4E6E0] text-sm leading-relaxed">
                        Ordna aktiviteter i egna ringar. Lägg mål och initiativ i de inre ringarna och dagliga 
                        aktiviteter i de yttre. Färgkoda kategorier så att fokus och ansvar blir tydligt på en sekund.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-[#36C2C6]/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0 border border-[#36C2C6]/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A4E6E0]">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Klart att dela och presentera</h3>
                      <p className="text-[#A4E6E0] text-sm leading-relaxed">
                        Exportera som PNG eller SVG i hög upplösning. Använd direkt i presentationer, styrgrupper 
                        och månadsmöten eller skriv ut och sätt på väggen.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Use Cases */}
                <div className="bg-[#36C2C6]/10 rounded-sm p-5 backdrop-blur-sm border border-[#36C2C6]/20">
                  <h3 className="text-lg font-semibold mb-3">Passar perfekt för</h3>
                  <ul className="space-y-2 text-sm text-[#A4E6E0]">
                    <li className="flex items-center gap-2">
                      <span className="text-[#9FCB3E]">•</span>
                      Strategisk planering och kvartalsmål
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#9FCB3E]">•</span>
                      Projektledning och resurssättning
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#9FCB3E]">•</span>
                      Marknadsplaner och kampanjkalendrar
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#9FCB3E]">•</span>
                      Event, lanseringar och utbildningar
                    </li>
                  </ul>
                </div>

                {/* CTA */}
                <div className="pt-4 border-t border-[#36C2C6]/20">
                  <p className="text-base font-semibold">
                    Kom igång på några minuter
                  </p>
                  <p className="text-sm text-[#A4E6E0] mt-2">
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
        <div className="text-center mt-12 pb-8">
          <p className="text-sm text-gray-500">
            YearWheel Planner är en SaaS-tjänst skapad och driven av <a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-[#00A4A6] hover:text-[#2E9E97] font-medium transition-colors">CommunitasLabs Inc</a>
          </p>
          <p className="text-sm text-gray-400 mt-1">© 2025 YearWheel. Alla rättigheter reserverade.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
