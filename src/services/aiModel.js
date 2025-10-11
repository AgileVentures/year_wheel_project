/**
 * Centralized AI Model Configuration
 * 
 * Provides OpenAI model instances with API key for browser environment.
 * The API key is loaded from Vite environment variables (VITE_OPENAI_API_KEY).
 */

import { openai as createOpenAIModel } from '@ai-sdk/openai';

// Get API key from environment
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ VITE_OPENAI_API_KEY is not configured in environment variables');
  throw new Error('OpenAI API key is required');
}

console.log('✅ OpenAI API key loaded:', apiKey.substring(0, 10) + '...');

// Export pre-configured model (gpt-4.1-2025-04-14) with explicit API key
// This uses the openai() function directly with apiKey in the options
export const gpt4o = createOpenAIModel('gpt-4.1-2025-04-14', {
  apiKey: apiKey,
});
