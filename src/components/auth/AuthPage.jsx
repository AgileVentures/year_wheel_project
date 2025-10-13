import { useState } from 'react';
import { Link } from 'react-router-dom';
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
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit">
            <img 
              src="/year_wheel_logo.svg" 
              alt="YearWheel" 
              className="h-8 w-auto"
            />
          </Link>
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
              ? 'Kom igång direkt – ingen kreditkort behövs' 
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
              Inget konto ännu? <Link to="/pricing" className="text-[#00A4A6] hover:text-[#2E9E97] font-medium">Se våra planer</Link>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pb-8">
          <p className="text-sm text-gray-500">
            YearWheel Planner är en SaaS-tjänst skapad och driven av <a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-[#00A4A6] hover:text-[#2E9E97] font-medium transition-colors">CommunitasLabs Inc</a>
          </p>
          {/* <p className="text-sm text-gray-400 mt-1">© 2025 YearWheel. Alla rättigheter reserverade.</p> */}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
