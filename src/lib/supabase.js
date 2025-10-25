/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client that will be used
 * throughout the application for authentication and database operations.
 */

import { createClient } from '@supabase/supabase-js';
import { isSSLError, getNetworkErrorMessage } from '../utils/networkErrors';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required variables:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_ANON_KEY'
  );
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: async (url, options = {}) => {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        // Enhance error with network detection
        if (isSSLError(error)) {
          const enhancedError = new Error(
            'Network security software (like Fortinet or Zscaler) is blocking this connection. ' +
            'Please contact your IT administrator or try a different network.'
          );
          enhancedError.originalError = error;
          enhancedError.isSSLError = true;
          throw enhancedError;
        }
        throw error;
      }
    },
  },
});

// Helper to check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
