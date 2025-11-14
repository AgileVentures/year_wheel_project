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

  // Subscribe to subscription changes AND wheel changes
  useEffect(() => {
    let subscriptionChannel;
    let wheelsChannel;
    
    const setupRealtimeSubscriptions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.warn('No user found for subscription realtime');
          return;
        }
        
        // Listen to subscription changes
        subscriptionChannel = supabase
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
        
        // Listen to wheel changes (create/delete) to update count
        wheelsChannel = supabase
          .channel('wheel-count-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'year_wheels',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              // Reload subscription to update wheel count
              loadSubscription();
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Error setting up subscription realtime:', error);
      }
    };

    setupRealtimeSubscriptions();

    return () => {
      if (subscriptionChannel) {
        supabase.removeChannel(subscriptionChannel);
      }
      if (wheelsChannel) {
        supabase.removeChannel(wheelsChannel);
      }
    };
  }, [loadSubscription]);

  // Check if user can create a wheel
  const checkCanCreateWheel = useCallback(async () => {
    return await canCreateWheel();
  }, []);

  // Check if user can add team member
  const checkCanAddTeamMember = useCallback(async (teamId) => {
    return await canAddTeamMember(teamId);
  }, []);

  // Get team member count
  const getTeamCount = useCallback(async (teamId) => {
    return await getTeamMemberCount(teamId);
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
  const { isPremium, wheelCount, limits, loading, refresh } = useSubscription();

  const hasReachedWheelLimit = !isPremium && wheelCount >= (limits?.maxWheels || 2);
  
  return {
    hasReachedWheelLimit,
    wheelCount,
    maxWheels: limits?.maxWheels || 2,
    isPremium,
    loading,
    refresh, // Export the refresh function so it updates this instance
    canExport: (format) => {
      if (isPremium) return true;
      return limits?.allowedExports.includes(format) || false;
    }
  };
}
