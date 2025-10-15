/**
 * Lazy loader for Stripe.js
 * Only loads Stripe when actually needed, improving initial page load performance
 */

let stripePromise = null;

/**
 * Lazily load Stripe.js only when needed
 * @returns {Promise} Promise that resolves to Stripe instance
 */
export const getStripe = async () => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js');
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};
