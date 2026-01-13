import { supabase } from '../lib/supabase';

/**
 * Check if current user is a monday.com user
 */
export const isMondayUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('monday_users')
      .select('id, subscription_status, current_plan, monday_account_name')
      .eq('profile_id', user.id)
      .single();

    return data ? { 
      isMondayUser: true, 
      ...data 
    } : { 
      isMondayUser: false 
    };
  } catch (error) {
    console.error('Error checking Monday user:', error);
    return { isMondayUser: false };
  }
};

/**
 * Get Monday user details
 */
export const getMondayUserDetails = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('monday_users')
      .select('*')
      .eq('profile_id', user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching Monday user details:', error);
    return null;
  }
};

/**
 * Check if user should see Stripe subscription options
 * Monday users manage subscriptions through Monday, not Stripe
 */
export const shouldShowStripeSubscription = async () => {
  const mondayStatus = await isMondayUser();
  return !mondayStatus.isMondayUser;
};
