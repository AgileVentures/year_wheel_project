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
    .maybeSingle();

  if (error) throw error;
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
 * Redirects to Google authentication in the same window
 * @param {string} provider - 'google', 'google_calendar', or 'google_sheets'
 * @param {Array<string>} scopes - OAuth scopes to request
 * @returns {Promise<void>} Redirects to Google OAuth
 */
export async function initiateGoogleOAuth(provider = 'google', scopes = []) {
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Du måste vara inloggad för att ansluta Google-konto');
    }

    if (!session.access_token) {
      throw new Error('Ingen access token i session - försök logga in igen');
    }

    // Store current location to return to after OAuth
    sessionStorage.setItem('oauth_return_url', window.location.pathname);
    sessionStorage.setItem('oauth_provider', provider);

    // Call Edge Function to get OAuth URL
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

    const { authUrl } = urlData;

    // Redirect to Google OAuth in same window
    window.location.href = authUrl;
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
    .select('*')
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
    .select('*')
    .eq('ring_id', ringId)
    .eq('integration_type', integrationType)
    .maybeSingle();

  if (error) {
    console.error('Error fetching ring integration:', error);
    throw error;
  }
  return data || null;
}

/**
 * Create or update a ring integration
 * @param {Object} integration - Integration configuration
 * @returns {Promise<Object>} Created/updated integration
 */
export async function upsertRingIntegration(integration) {
  console.log('[integrationService] Upserting ring integration:', integration);
  
  const { data, error } = await supabase
    .from('ring_integrations')
    .upsert(integration, {
      onConflict: 'ring_id,integration_type'
    })
    .select()
    .single();

  if (error) {
    console.error('[integrationService] Upsert error:', error);
    throw error;
  }
  
  console.log('[integrationService] Upsert successful:', data);
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
 * Fetch the first row (headers) from a Google Sheet
 * @param {string} spreadsheetId - Google Spreadsheet ID
 * @param {string} sheetName - Sheet name
 * @returns {Promise<Array<string>>} Array of header values
 */
export async function fetchGoogleSheetHeaders(spreadsheetId, sheetName = 'Sheet1') {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('google-sheets-fetch-headers', {
    body: { spreadsheetId, sheetName },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
  });

  if (error) throw error;
  return data.headers || [];
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
