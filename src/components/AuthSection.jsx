import { memo, useCallback } from 'react';
import LoginForm from './auth/LoginForm';
import SignupForm from './auth/SignupForm';

function AuthSection({ authMode, setAuthMode }) {
  const handleToggleToSignup = useCallback(() => {
    setAuthMode('signup');
  }, [setAuthMode]);

  const handleToggleToLogin = useCallback(() => {
    setAuthMode('login');
  }, [setAuthMode]);

  return (
    <section id="auth-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 scroll-mt-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-sm shadow-xl p-8 border border-gray-200">
          {authMode === 'login' ? (
            <LoginForm onToggleMode={handleToggleToSignup} />
          ) : (
            <SignupForm onToggleMode={handleToggleToLogin} />
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(AuthSection);