/**
 * Google Tag Manager Utility
 * GTM is loaded directly in index.html (GTM-MX5D5LSB)
 * This utility provides helper functions to interact with the dataLayer
 */

/**
 * Push custom events to Google Tag Manager
 * @param {string} event - Event name
 * @param {Object} data - Additional event data
 */
export const pushToDataLayer = (event, data = {}) => {
  if (window.dataLayer) {
    window.dataLayer.push({
      event,
      ...data
    });
  } else {
    console.warn('GTM not initialized. Event not pushed:', event);
  }
};

/**
 * Track page views in GTM
 * @param {string} pagePath - Path of the page
 * @param {string} pageTitle - Title of the page
 */
export const trackPageView = (pagePath, pageTitle) => {
  pushToDataLayer('pageview', {
    page_path: pagePath,
    page_title: pageTitle
  });
};

/**
 * Track custom events
 * @param {string} category - Event category
 * @param {string} action - Event action
 * @param {string} label - Event label (optional)
 * @param {number} value - Event value (optional)
 */
export const trackEvent = (category, action, label = '', value = null) => {
  const eventData = {
    event_category: category,
    event_action: action
  };
  
  if (label) eventData.event_label = label;
  if (value !== null) eventData.event_value = value;
  
  pushToDataLayer('custom_event', eventData);
};

/**
 * Track user interactions with the year wheel
 */
export const trackWheelEvent = (action, details = {}) => {
  trackEvent('YearWheel', action, details.label || '', details.value || null);
};

/**
 * Track authentication events
 */
export const trackAuthEvent = (action, method = '') => {
  trackEvent('Authentication', action, method);
};

/**
 * Track subscription events
 */
export const trackSubscriptionEvent = (action, plan = '') => {
  trackEvent('Subscription', action, plan);
};

/**
 * Track sign_up event (GA4 recommended event)
 * Called after successful backend registration
 * @param {Object} params
 * @param {string} params.method - Signup method: 'email' | 'google' | 'github'
 * @param {string} params.userId - Anonymous user UUID from Supabase
 * @param {string} params.plan - Subscription plan: 'free' | 'monthly' | 'yearly'
 */
export const trackSignup = ({ method, userId, plan = 'free' }) => {
  if (!window.dataLayer) {
    console.warn('GTM dataLayer not available');
    return;
  }

  window.dataLayer.push({
    event: 'sign_up',
    method: method,
    user_id: userId,
    plan: plan,
    page_location: window.location.href,
    timestamp: new Date().toISOString()
  });

  console.log('[GTM] sign_up event pushed:', { method, userId, plan });
};

/**
 * Track purchase event (GA4 recommended event for ecommerce)
 * Called after successful subscription payment
 * @param {Object} params
 * @param {string} params.transactionId - Stripe subscription ID
 * @param {string} params.userId - Anonymous user UUID from Supabase
 * @param {string} params.plan - Subscription plan: 'monthly' | 'yearly'
 * @param {number} params.value - Transaction value in SEK
 * @param {string} params.currency - Currency code (default: 'SEK')
 * @param {string} params.coupon - Optional coupon code used
 */
export const trackPurchase = ({ 
  transactionId, 
  userId, 
  plan, 
  value, 
  currency = 'SEK',
  coupon = null 
}) => {
  if (!window.dataLayer) {
    console.warn('GTM dataLayer not available');
    return;
  }

  const eventData = {
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: [
        {
          item_id: `yearwheel_${plan}`,
          item_name: `YearWheel ${plan === 'monthly' ? 'Månadsvis' : 'Årlig'}`,
          item_category: 'subscription',
          price: value,
          quantity: 1
        }
      ]
    },
    user_id: userId,
    plan: plan,
    page_location: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString()
  };

  if (coupon) {
    eventData.ecommerce.coupon = coupon;
  }

  window.dataLayer.push(eventData);

  console.log('[GTM] purchase event pushed:', eventData);
};
