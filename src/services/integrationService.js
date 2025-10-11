/**
 * Integration Service
 * Handles Google Calendar and Google Sheets integrations
 */

import { supabase } from '../lib/supabase';

/**
 * Get all user integrations
 * @returns {Promise<Array>} List of user integrations
 */
export async function getUserIntegrations() {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific user integration by provider
 * @param {string} provider - Provider name ('google', 'google_calendar', 'google_sheets')
 * @returns {Promise<Object|null>} Integration object or null
 */
export async function getUserIntegrationByProvider(provider) {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('provider', provider)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data || null;
}

/**
 * Check if user has connected a specific provider
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>}
 */
export async function isProviderConnected(provider) {
  const integration = await getUserIntegrationByProvider(provider);
  return integration !== null;
}

/**
 * Delete a user integration
 * @param {string} integrationId - UUID of integration to delete
 * @returns {Promise<void>}
 */
export async function deleteUserIntegration(integrationId) {
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('id', integrationId);

  if (error) throw error;
}

/**
 * Delete user integration by provider
 * @param {string} provider - Provider name
 * @returns {Promise<void>}
 */
export async function disconnectProvider(provider) {
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('provider', provider);

  if (error) throw error;
}

/**
 * Initiate Google OAuth flow
 * Opens popup window for Google authentication
 * @param {string} provider - 'google', 'google_calendar', or 'google_sheets'
 * @param {Array<string>} scopes - OAuth scopes to request
 * @returns {Promise<Object>} Integration data after successful auth
 */
export async function initiateGoogleOAuth(provider = 'google', scopes = []) {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Du måste vara inloggad för att ansluta Google-konto');
    }

    // Call Edge Function to get OAuth URL with explicit auth header
    const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-init', {
      body: { provider, scopes },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (urlError) {
      console.error('OAuth init error:', urlError);
      throw urlError;
    }

    const { authUrl, state } = urlData;

    // Open OAuth popup
    const popup = window.open(
      authUrl,
      'Google OAuth',
      'width=600,height=700,left=100,top=100'
    );

    // Wait for OAuth callback via message
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        popup?.close();
        reject(new Error('OAuth timeout - ingen respons från Google'));
      }, 5 * 60 * 1000); // 5 minutes timeout

      // Listen for message from OAuth callback
      const messageHandler = async (event) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'google-oauth-success' && event.data.state === state) {
          clearTimeout(timeout);
          window.removeEventListener('message', messageHandler);
          popup?.close();
          
          // Fetch the newly created integration
          const integration = await getUserIntegrationByProvider(provider);
          resolve(integration);
        } else if (event.data.type === 'google-oauth-error') {
          clearTimeout(timeout);
          window.removeEventListener('message', messageHandler);
          popup?.close();
          reject(new Error(event.data.error || 'OAuth-auktorisering misslyckades'));
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was blocked
      if (!popup || popup.closed) {
        clearTimeout(timeout);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Popup blockerades - tillåt popups för denna sida'));
      }
    });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    throw error;
  }
}

/**
 * Get ring integrations for a specific ring
 * @param {string} ringId - Ring UUID
 * @returns {Promise<Array>} List of ring integrations
 */
export async function getRingIntegrations(ringId) {
  const { data, error } = await supabase
    .from('ring_integrations')
    .select(`
      *,
      user_integration:user_integrations(*)
    `)
    .eq('ring_id', ringId);

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific ring integration by type
 * @param {string} ringId - Ring UUID
 * @param {string} integrationType - 'calendar' or 'sheet'
 * @returns {Promise<Object|null>}
 */
export async function getRingIntegrationByType(ringId, integrationType) {
  const { data, error } = await supabase
    .from('ring_integrations')
    .select(`
      *,
      user_integration:user_integrations(*)
    `)
    .eq('ring_id', ringId)
    .eq('integration_type', integrationType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Create or update a ring integration
 * @param {Object} integration - Integration configuration
 * @returns {Promise<Object>} Created/updated integration
 */
export async function upsertRingIntegration(integration) {
  const { data, error } = await supabase
    .from('ring_integrations')
    .upsert(integration, {
      onConflict: 'ring_id,integration_type'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a ring integration
 * @param {string} integrationId - Integration UUID
 * @returns {Promise<void>}
 */
export async function deleteRingIntegration(integrationId) {
  const { error } = await supabase
    .from('ring_integrations')
    .delete()
    .eq('id', integrationId);

  if (error) throw error;
}

/**
 * Trigger manual sync for a ring integration
 * @param {string} ringIntegrationId - Ring integration UUID
 * @returns {Promise<Object>} Sync result
 */
export async function syncRingData(ringIntegrationId) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('sync-ring-data', {
    body: { ringIntegrationId },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
  });

  if (error) throw error;
  return data;
}

/**
 * List available Google Calendars for the user
 * @returns {Promise<Array>} List of calendars
 */
export async function listGoogleCalendars() {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('google-calendar-list', {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
  });

  if (error) throw error;
  return data.calendars || [];
}

/**
 * Validate access to a Google Sheet
 * @param {string} spreadsheetId - Google Spreadsheet ID
 * @returns {Promise<Object>} Sheet metadata and validation result
 */
export async function validateGoogleSheet(spreadsheetId) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('google-sheets-validate', {
    body: { spreadsheetId },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
  });

  if (error) throw error;
  return data;
}

/**
 * Get available sheets within a spreadsheet
 * @param {string} spreadsheetId - Google Spreadsheet ID
 * @returns {Promise<Array>} List of sheet names
 */
export async function listGoogleSheets(spreadsheetId) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('google-sheets-list', {
    body: { spreadsheetId },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
  });

  if (error) throw error;
  return data.sheets || [];
}

/**
 * Subscribe to ring integration changes
 * @param {string} ringId - Ring UUID
 * @param {Function} callback - Called when integration changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToRingIntegrations(ringId, callback) {
  const channel = supabase
    .channel(`ring-integrations:${ringId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ring_integrations',
        filter: `ring_id=eq.${ringId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
