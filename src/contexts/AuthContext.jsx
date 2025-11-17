import { useState, useEffect, createContext } from 'react';
import { supabase } from '../lib/supabase';
import { trackSignup } from '../utils/gtm';
import { trackAffiliateSignup } from '../utils/affiliateTracking';

export const AuthContext = createContext({});

const TEST_AUTH_EVENT = 'yearwheel:test-auth';

function getInjectedTestUser(win) {
  if (!win || !win.Cypress) return null;
  return win.__YEARWHEEL_TEST_USER__ || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasTrackedSignup, setHasTrackedSignup] = useState(false);

  useEffect(() => {
    const win = typeof window !== 'undefined' ? window : undefined;
    const injectedUser = getInjectedTestUser(win);

    const handleTestAuth = (event) => {
      const nextUser = event?.detail?.user || null;
      setUser(nextUser);
      setLoading(false);
    };

    // If __YEARWHEEL_TEST_USER__ exists (even if null), use it and set loading to false
    if (win && '__YEARWHEEL_TEST_USER__' in win) {
      setUser(injectedUser);
      setLoading(false);
    }

    if (win && win.addEventListener) {
      win.addEventListener(TEST_AUTH_EVENT, handleTestAuth);
    }

    return () => {
      if (win && win.removeEventListener) {
        win.removeEventListener(TEST_AUTH_EVENT, handleTestAuth);
      }
    };
  }, []);

  useEffect(() => {
    const win = typeof window !== 'undefined' ? window : undefined;
    if (win?.Cypress || win?.__YEARWHEEL_TEST_USER__ !== undefined) {
      // Skip real Supabase auth calls when in Cypress test mode
      // The first useEffect handles test user injection
      return;
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Track Google OAuth signup when user signs in for the first time
      // This handles OAuth signup tracking since we can't track it immediately in signUp()
      if (event === 'SIGNED_IN' && session?.user && !hasTrackedSignup) {
        // Check if this is a new user (created recently - within last 5 seconds)
        const userCreatedAt = new Date(session.user.created_at).getTime();
        const now = Date.now();
        const isNewUser = (now - userCreatedAt) < 5000; // 5 seconds threshold
        
        if (isNewUser) {
          try {
            // Determine provider from user metadata
            const provider = session.user.app_metadata?.provider || 'email';
            
            trackSignup({
              method: provider === 'google' ? 'google' : 'email',
              userId: session.user.id,
              plan: 'free'
            });
            
            // Track affiliate signup if applicable (non-blocking)
            trackAffiliateSignup(session.user.id, supabase).catch(err => 
              console.error('Affiliate tracking error on OAuth signup:', err)
            );
            
            setHasTrackedSignup(true);
          } catch (trackError) {
            console.error('GTM tracking error on OAuth signup:', trackError);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [hasTrackedSignup]);

  // Sign up with email and password OR OAuth provider
  const signUp = async (email, password, provider = null) => {
    if (provider === 'google') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      
      // Note: For OAuth, we track sign_up in the callback handler
      // because the user object is not immediately available here
      return data;
    }
    
    // Email/password signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    
    // Track successful signup (after backend confirmation)
    if (data.user) {
      try {
        trackSignup({
          method: 'email',
          userId: data.user.id,
          plan: 'free'
        });
        
        // Track affiliate signup if applicable
        await trackAffiliateSignup(data.user.id, supabase);
      } catch (trackError) {
        console.error('GTM tracking error:', trackError);
        // Don't throw - tracking failure shouldn't block signup
      }
    }
    
    return data;
  };

  // Sign in with email and password OR OAuth provider
  const signIn = async (email, password, provider = null) => {
    if (provider === 'google') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      return data;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Sign out
  const signOut = async (onSuccess) => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Call success callback if provided (for navigation and toast)
    if (onSuccess) onSuccess();
  };

  const value = {
    signUp,
    signIn,
    signOut,
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
