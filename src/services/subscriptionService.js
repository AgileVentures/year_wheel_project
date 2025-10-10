import { supabase } from '../lib/supabase';

/**
 * Subscription Service
 * Handles all subscription-related API calls
 */

/**
 * Get current user's subscription
 */
export async function getUserSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
}

/**
 * Check if user is premium
 */
export async function isPremiumUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('is_premium_user', {
      user_uuid: user.id
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Get user's wheel count
 */
export async function getUserWheelCount() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('get_user_wheel_count', {
      user_uuid: user.id
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error getting wheel count:', error);
    return 0;
  }
}

/**
 * Check if user can create a new wheel
 */
export async function canCreateWheel() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('can_create_wheel', {
      user_uuid: user.id
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking wheel creation permission:', error);
    return false;
  }
}

/**
 * Get team member count for a wheel
 */
export async function getTeamMemberCount(wheelId) {
  try {
    const { data, error } = await supabase.rpc('get_team_member_count', {
      wheel_uuid: wheelId
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error getting team member count:', error);
    return 0;
  }
}

/**
 * Check if user can add team member to a wheel
 */
export async function canAddTeamMember(wheelId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('can_add_team_member', {
      wheel_uuid: wheelId,
      user_uuid: user.id
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking team member permission:', error);
    return false;
  }
}

/**
 * Create Stripe Checkout Session
 */
export async function createCheckoutSession(priceId, successUrl, cancelUrl) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get or create Stripe customer
    const subscription = await getUserSubscription();
    let customerId = subscription?.stripe_customer_id;

    // Call Supabase Edge Function to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        priceId,
        customerId,
        userId: user.id,
        successUrl,
        cancelUrl,
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create Stripe Customer Portal Session
 */
export async function createPortalSession(returnUrl) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const subscription = await getUserSubscription();
    if (!subscription?.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    // Call Supabase Edge Function to create portal session
    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        customerId: subscription.stripe_customer_id,
        returnUrl,
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const subscription = await getUserSubscription();
    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    // Call Supabase Edge Function to cancel subscription
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: {
        subscriptionId: subscription.stripe_subscription_id,
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Get usage limits for current plan
 */
export function getUsageLimits(isPremium) {
  if (isPremium) {
    return {
      maxWheels: Infinity,
      maxTeamMembers: Infinity,
      allowedExports: ['png', 'svg', 'pdf', 'jpg'],
      features: [
        'Obegränsade årshjul',
        'Obegränsade team och medlemmar',
        'Alla exportformat (PNG, SVG, PDF, JPG)',
        'Prioriterad support',
        'Versionshistorik',
        'Delning och samarbete'
      ]
    };
  }

  return {
    maxWheels: 2,
    maxTeamMembers: 3,
    allowedExports: ['png', 'svg'],
    features: [
      'Upp till 2 årshjul',
      '1 team med upp till 3 medlemmar',
      'Export som PNG och SVG',
      'Grundläggande funktioner'
    ]
  };
}
