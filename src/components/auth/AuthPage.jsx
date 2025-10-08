import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

function AuthPage() {
  // Check if coming from an invite link and whether it's a new user
  const hasInviteToken = sessionStorage.getItem('pendingInviteToken');
  const inviteIsNewUser = sessionStorage.getItem('inviteIsNewUser');
  
  // Default logic:
  // - If invite for NEW user → signup
  // - If invite for EXISTING user → login
  // - No invite → login
  const getDefaultMode = () => {
    if (hasInviteToken && inviteIsNewUser === 'true') {
      return 'signup';
    }
    return 'login';
  };
  
  const [mode, setMode] = useState(getDefaultMode());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        {/* Large Logo Above Everything */}
        <div className="text-center mb-8">
          <img 
            src="/year_wheel_logo.svg" 
            alt="YearWheel Logo" 
            className="w-32 h-32 mx-auto mb-4"
          />
          <p className="text-xl text-gray-700 font-light">
            Visualisera ditt år i ett cirkulärt format
          </p>
        </div>

        <div className="bg-white rounded-sm shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Column - Marketing Content */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-12 text-white flex flex-col justify-center">
              <div className="space-y-8">
                {/* Main Description */}
                <div>
                  <h2 className="text-3xl font-bold mb-4">
                    Din årsplanering i ett ögonkast
                  </h2>
                  <p className="text-lg text-blue-100 leading-relaxed">
                    YearWheel är ett visuellt verktyg som hjälper dig och ditt team att planera, 
                    organisera och följa upp hela årets aktiviteter i ett intuitivt cirkelformat. 
                    Från projektmilstolpar till kampanjer och events - allt på ett ställe.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-sm p-3 backdrop-blur-sm flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Cirkulär tidsvisualisering</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Se hela året i ett enda hjul där varje månad, vecka och dag är tydligt markerad. 
                        Upptäck mönster och samband som är svåra att se i traditionella kalendrar.
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
                      <h3 className="text-lg font-semibold mb-2">Teamsamarbete i realtid</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Skapa team, dela hjul och samarbeta med kollegor. Bjud in teammedlemmar med 
                        en enkel länk och ge alla tillgång till samma översikt.
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
                      <h3 className="text-lg font-semibold mb-2">Flexibla ringar & kategorier</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Organisera aktiviteter i anpassade ringar - exempelvis inre ringar för strategiska 
                        mål och yttre för operativa aktiviteter. Färgkoda med aktivitetsgrupper för bättre överblick.
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
                      <h3 className="text-lg font-semibold mb-2">Exportera & presentera</h3>
                      <p className="text-blue-100 text-sm leading-relaxed">
                        Ladda ner ditt årshjul som högupplöst PNG eller SVG. Perfekt för presentationer, 
                        styrelsemöten eller att skriva ut och sätta på väggen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/20">
                  <p className="text-sm text-blue-100 font-medium">
                    ✨ Perfekt för strategisk planering, projektledning, marknadsföring, event och mycket mer
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Login/Signup Form */}
            <div className="p-12 flex items-center justify-center bg-gray-50">
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
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            © 2025 CommunitasLabs Inc. <a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">communitaslabs.io</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
