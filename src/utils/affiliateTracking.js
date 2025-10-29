// Affiliate tracking utilities
// Handles cookie management and conversion tracking

const AFFILIATE_COOKIE_NAME = 'yrw_aff';
const INITIAL_COOKIE_DAYS = 30;
const EXTENDED_COOKIE_DAYS = 90; // 30 + 60 more days

/**
 * Set a cookie with expiration
 */
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie by name
 */
function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Parse affiliate cookie data
 * Format: "conversion_id|org_id|link_id|expires_timestamp"
 */
function parseAffiliateCookie() {
  const cookieValue = getCookie(AFFILIATE_COOKIE_NAME);
  if (!cookieValue) return null;

  const [conversionId, orgId, linkId, expiresAt] = cookieValue.split('|');
  
  // Check if expired
  const now = Date.now();
  const expires = parseInt(expiresAt, 10);
  if (expires < now) {
    deleteCookie(AFFILIATE_COOKIE_NAME);
    return null;
  }

  return {
    conversionId,
    orgId,
    linkId,
    expiresAt: expires,
  };
}

/**
 * Set affiliate cookie after tracking click
 */
function setAffiliateCookie(conversionId, orgId, linkId, days = INITIAL_COOKIE_DAYS) {
  const expires = Date.now() + days * 24 * 60 * 60 * 1000;
  const value = `${conversionId}|${orgId}|${linkId}|${expires}`;
  setCookie(AFFILIATE_COOKIE_NAME, value, days);
}

/**
 * Extend affiliate cookie after signup (add 60 more days from now)
 */
function extendAffiliateCookie() {
  const data = parseAffiliateCookie();
  if (!data) return false;

  // Extend by 60 more days from now (total 90 days from signup)
  setAffiliateCookie(data.conversionId, data.orgId, data.linkId, EXTENDED_COOKIE_DAYS);
  return true;
}

/**
 * Track affiliate click - called when user arrives via affiliate link
 * @param {string} affiliateCode - The affiliate code from URL param (e.g., ?ref=partner123)
 * @param {object} supabase - Supabase client instance
 */
export async function trackAffiliateClick(affiliateCode, supabase) {
  try {
    // Get page metadata
    const landingPage = window.location.pathname;
    const referrer = document.referrer || null;
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');

    // Call Supabase function to track click
    const { data, error } = await supabase.rpc('track_affiliate_click', {
      p_affiliate_code: affiliateCode,
      p_landing_page: landingPage,
      p_referrer: referrer,
      p_utm_source: utmSource,
      p_utm_medium: utmMedium,
      p_utm_campaign: utmCampaign,
      p_user_agent: navigator.userAgent,
    });

    if (error) throw error;

    if (data.success) {
      // Set affiliate cookie
      setAffiliateCookie(data.conversion_id, data.organization_id, data.link_id);
      
      // Send analytics event
      if (window.gtag) {
        window.gtag('event', 'affiliate_click', {
          affiliate_code: affiliateCode,
          organization_id: data.organization_id,
        });
      }

      return data;
    }

    return null;
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    return null;
  }
}

/**
 * Track free signup - called after user creates account
 * @param {string} userId - The new user's ID
 * @param {object} supabase - Supabase client instance
 */
export async function trackAffiliateSignup(userId, supabase) {
  const affiliateData = parseAffiliateCookie();
  if (!affiliateData) return false;

  try {
    const { data, error } = await supabase.rpc('record_affiliate_signup', {
      p_user_id: userId,
      p_conversion_id: affiliateData.conversionId,
    });

    if (error) throw error;

    if (data) {
      // Extend cookie for 90 days total
      extendAffiliateCookie();

      // Send analytics event
      if (window.gtag) {
        window.gtag('event', 'affiliate_signup', {
          organization_id: affiliateData.orgId,
          conversion_id: affiliateData.conversionId,
        });
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error tracking affiliate signup:', error);
    return false;
  }
}

/**
 * Track premium upgrade - called after successful payment
 * @param {string} userId - The user's ID
 * @param {string} subscriptionPlan - 'monthly' or 'yearly'
 * @param {number} amount - The amount charged in EUR
 * @param {object} supabase - Supabase client instance
 */
export async function trackAffiliateUpgrade(userId, subscriptionPlan, amount, supabase) {
  const affiliateData = parseAffiliateCookie();
  if (!affiliateData) return false;

  try {
    const { data, error } = await supabase.rpc('record_affiliate_upgrade', {
      p_user_id: userId,
      p_conversion_id: affiliateData.conversionId,
      p_subscription_plan: subscriptionPlan,
      p_subscription_amount: amount,
    });

    if (error) throw error;

    if (data) {
      // Send analytics event
      if (window.gtag) {
        window.gtag('event', 'affiliate_conversion', {
          organization_id: affiliateData.orgId,
          conversion_id: affiliateData.conversionId,
          value: amount,
          currency: 'EUR',
        });
      }

      // Clear cookie after successful upgrade conversion
      deleteCookie(AFFILIATE_COOKIE_NAME);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error tracking affiliate upgrade:', error);
    return false;
  }
}

/**
 * Check if user has active affiliate tracking
 */
export function hasActiveAffiliateTracking() {
  return parseAffiliateCookie() !== null;
}

/**
 * Get affiliate tracking data (for debugging/display)
 */
export function getAffiliateTrackingData() {
  return parseAffiliateCookie();
}
