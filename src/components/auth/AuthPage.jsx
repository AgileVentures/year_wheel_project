import { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Column - Marketing Content */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-12 text-white flex flex-col justify-center">
              <div className="space-y-8">
                <div>
                  <h1 className="text-5xl font-bold mb-4">
                    YearWheel
                  </h1>
                  <p className="text-xl text-blue-100">
                    Visualisera ditt år i ett cirkulärt format
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Planera hela året</h3>
                      <p className="text-blue-100 text-sm">
                        Se alla aktiviteter, projekt och händelser på en interaktiv cirkelkalender.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Anpassa efter dina behov</h3>
                      <p className="text-blue-100 text-sm">
                        Skapa anpassade ringar, aktivitetsgrupper och färgkodning för perfekt överblick.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Exportera & dela</h3>
                      <p className="text-blue-100 text-sm">
                        Ladda ner som bild eller dela med ditt team. Allt sparas säkert i molnet.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/20">
                  <p className="text-sm text-blue-100">
                    ✨ Perfekt för projekt, verksamhetsplanering, events och mer
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
