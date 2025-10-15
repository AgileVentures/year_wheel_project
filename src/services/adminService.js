import { supabase } from '../lib/supabase';

/**
 * Admin Service - Functions for admin panel
 */

/**
 * Get dashboard statistics
 */
export const getAdminStats = async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get new users today
    const { count: usersToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    // Get new users last 7 days
    const { count: usersLast7Days } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get new users this month
    const { count: usersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString());

    // Get total wheels (excluding templates)
    const { count: totalWheels } = await supabase
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false);

    // Get wheels created today (excluding templates)
    const { count: wheelsToday } = await supabase
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false)
      .gte('created_at', todayStart.toISOString());

    // Get wheels created last 7 days (excluding templates)
    const { count: wheelsLast7Days } = await supabase
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get wheels created this month (excluding templates)
    const { count: wheelsThisMonth } = await supabase
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', false)
      .gte('created_at', monthStart.toISOString());

    // Get premium users count via Edge Function (bypasses RLS)
    let premiumUsers = 0;
    try {
      const { data: statsResponse } = await supabase.functions.invoke('admin-get-user-data', {
        body: { userIds: [] } // Empty array to skip user-specific data
      });
      
      if (statsResponse?.subscriptions) {
        premiumUsers = statsResponse.subscriptions.filter(
          sub => sub.status === 'active' && (sub.plan_type === 'monthly' || sub.plan_type === 'yearly')
        ).length;
      }
    } catch (error) {
      console.error('Failed to fetch premium count:', error);
    }

    // Get public wheels count (excluding templates)
    const { count: publicWheels } = await supabase
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)
      .eq('is_template', false);

    // Get template wheels count
    const { count: templateWheels } = await supabase
      .from('year_wheels')
      .select('*', { count: 'exact', head: true })
      .eq('is_template', true);

    // Get active teams
    const { count: activeTeams } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true });

    return {
      users: {
        total: totalUsers || 0,
        today: usersToday || 0,
        last7Days: usersLast7Days || 0,
        thisMonth: usersThisMonth || 0,
      },
      wheels: {
        total: totalWheels || 0,
        today: wheelsToday || 0,
        last7Days: wheelsLast7Days || 0,
        thisMonth: wheelsThisMonth || 0,
      },
      premium: premiumUsers || 0,
      publicWheels: publicWheels || 0,
      templates: templateWheels || 0,
      teams: activeTeams || 0,
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

/**
 * Get paginated users list with detailed information
 */
export const getUsers = async ({ page = 1, limit = 50, search = '', sortBy = 'created_at', sortOrder = 'desc' }) => {
  try {
    const offset = (page - 1) * limit;

    // Build query for profiles
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, created_at, updated_at, is_admin', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Fetch all user data (subscriptions + auth metadata) via single Edge Function
    const userIds = data.map(u => u.id);
    
    let subscriptionMap = {};
    let authDataMap = {};
    
    try {
      const { data: response, error } = await supabase.functions.invoke('admin-get-user-data', {
        body: { userIds }
      });

      if (error) {
        console.error('Error fetching user data:', error);
      } else if (response) {
        // Create subscription map
        if (response.subscriptions) {
          subscriptionMap = response.subscriptions.reduce((acc, sub) => {
            acc[sub.user_id] = sub;
            return acc;
          }, {});
        }
        
        // Create auth data map
        if (response.authData) {
          authDataMap = response.authData.reduce((acc, authData) => {
            acc[authData.id] = authData;
            return acc;
          }, {});
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }

    // Combine data
    const combinedUsers = data.map(user => {
      const authData = authDataMap[user.id] || {};
      const userSubscription = subscriptionMap[user.id];
      return {
        ...user,
        provider: authData.provider || 'email',
        providers: authData.providers || [], // All linked providers
        last_sign_in_at: authData.last_sign_in_at,
        confirmed_at: authData.confirmed_at,
        subscriptions: userSubscription ? [userSubscription] : [],
      };
    });

    return {
      users: combinedUsers,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Get user growth chart data (last 30 days)
 */
export const getUserGrowthData = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const groupedData = data.reduce((acc, user) => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Fill in missing dates with 0
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      chartData.push({
        date: dateStr,
        users: groupedData[dateStr] || 0,
      });
    }

    return chartData;
  } catch (error) {
    console.error('Error fetching user growth data:', error);
    throw error;
  }
};

/**
 * Get wheel creation chart data (last 30 days)
 */
export const getWheelGrowthData = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('year_wheels')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const groupedData = data.reduce((acc, wheel) => {
      const date = new Date(wheel.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Fill in missing dates with 0
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      chartData.push({
        date: dateStr,
        wheels: groupedData[dateStr] || 0,
      });
    }

    return chartData;
  } catch (error) {
    console.error('Error fetching wheel growth data:', error);
    throw error;
  }
};

/**
 * Get recent activity (latest wheels, users, etc.)
 */
export const getRecentActivity = async (limit = 10) => {
  try {
    // Get recent users
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Get recent wheels
    const { data: recentWheels } = await supabase
      .from('year_wheels')
      .select('id, title, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Fetch user profiles for wheels
    if (recentWheels && recentWheels.length > 0) {
      const userIds = [...new Set(recentWheels.map(w => w.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      // Attach profiles to wheels
      recentWheels.forEach(wheel => {
        wheel.profiles = profileMap[wheel.user_id] || null;
      });
    }

    return {
      recentUsers: recentUsers || [],
      recentWheels: recentWheels || [],
    };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

/**
 * Toggle user admin status
 */
export const toggleUserAdmin = async (userId, isAdmin) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error toggling admin status:', error);
    throw error;
  }
};

/**
 * Get user details with all related data
 */
export const getUserDetails = async (userId) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get subscription separately
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_type, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    profile.subscriptions = subscription ? [subscription] : [];

    // Get user's wheels
    const { data: wheels } = await supabase
      .from('year_wheels')
      .select('id, title, created_at, updated_at, is_public, is_template')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Get user's teams
    const { data: teams } = await supabase
      .from('team_members')
      .select(`
        role,
        joined_at,
        teams (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', userId);

    return {
      profile,
      wheels: wheels || [],
      teams: teams || [],
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (userId) => {
  try {
    // This should be done via a Supabase Edge Function for proper cleanup
    // For now, we'll just delete the profile (cascade will handle related data)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Get subscription statistics
 */
export const getSubscriptionStats = async () => {
  try {
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .in('status', ['active', 'trialing']);

    const stats = {
      monthly: 0,
      yearly: 0,
      total: subscriptions?.length || 0,
    };

    subscriptions?.forEach(sub => {
      if (sub.plan_type === 'monthly') stats.monthly++;
      if (sub.plan_type === 'yearly') stats.yearly++;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    throw error;
  }
};
