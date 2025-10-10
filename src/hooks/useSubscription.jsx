import { useState, useEffect, useCallback } from 'react';
import { 
  getUserSubscription, 
  isPremiumUser,
  isAdmin,
  canCreateWheel,
  canAddTeamMember,
  getUserWheelCount,
  getTeamMemberCount,
  getUsageLimits
} from '../services/subscriptionService';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing user subscription state and limits
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [wheelCount, setWheelCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState(null);

  // Load subscription data
  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      
      const [subData, premiumStatus, adminStatus, count] = await Promise.all([
        getUserSubscription(),
        isPremiumUser(),
        isAdmin(),
        getUserWheelCount()
      ]);

      setSubscription(subData);
      setIsPremium(premiumStatus);
      setIsAdminUser(adminStatus);
      setWheelCount(count);
      setLimits(getUsageLimits(premiumStatus, adminStatus));
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Subscribe to subscription changes
  useEffect(() => {
    let channel;
    
    const setupRealtimeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.warn('No user found for subscription realtime');
          return;
        }
        
        channel = supabase
          .channel('subscription-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'subscriptions',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              // Reload subscription when it changes
              loadSubscription();
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Error setting up subscription realtime:', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadSubscription]);

  // Check if user can create a wheel
  const checkCanCreateWheel = useCallback(async () => {
    return await canCreateWheel();
  }, []);

  // Check if user can add team member
  const checkCanAddTeamMember = useCallback(async (wheelId) => {
    return await canAddTeamMember(wheelId);
  }, []);

  // Get team member count
  const getTeamCount = useCallback(async (wheelId) => {
    return await getTeamMemberCount(wheelId);
  }, []);

  return {
    subscription,
    isPremium,
    isAdmin: isAdminUser,
    wheelCount,
    limits,
    loading,
    refresh: loadSubscription,
    checkCanCreateWheel,
    checkCanAddTeamMember,
    getTeamCount,
  };
}

/**
 * Hook for checking if user has reached usage limits
 */
export function useUsageLimits() {
  const { isPremium, wheelCount, limits, loading } = useSubscription();

  const hasReachedWheelLimit = !isPremium && wheelCount >= (limits?.maxWheels || 2);
  
  return {
    hasReachedWheelLimit,
    wheelCount,
    maxWheels: limits?.maxWheels || 2,
    isPremium,
    loading,
    canExport: (format) => {
      if (isPremium) return true;
      return limits?.allowedExports.includes(format) || false;
    }
  };
}
