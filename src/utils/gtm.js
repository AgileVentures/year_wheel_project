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
