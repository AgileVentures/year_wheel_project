import { supabase } from '../lib/supabase';

/**
 * Admin Service - Functions for admin panel
 */

/**
 * Get dashboard statistics (uses edge function to bypass RLS)
 */
export const getAdminStats = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-get-stats', {
      body: {}
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

/**
 * Get subscription statistics (included in admin-get-stats now)
 */
export const getSubscriptionStats = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-get-stats', {
      body: {}
    });

    if (error) throw error;
    return data?.subscriptionStats || { monthly: 0, yearly: 0, total: 0 };
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return { monthly: 0, yearly: 0, total: 0 };
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
/**
 * Get quiz leads statistics
 */
export const getQuizLeadsStats = async () => {
  try {
    // Use UTC for consistent timezone handling
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    // Total quiz submissions
    const { count: totalLeads } = await supabase
      .from('quiz_leads')
      .select('*', { count: 'exact', head: true });

    // Submissions this month
    const { count: leadsThisMonth } = await supabase
      .from('quiz_leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString());

    // Submissions last 7 days
    const { count: leadsLast7Days } = await supabase
      .from('quiz_leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // High pain score leads (>15)
    const { count: highPainLeads } = await supabase
      .from('quiz_leads')
      .select('*', { count: 'exact', head: true })
      .gt('pain_score', 15);

    // Converted leads (use converted_to_user_id as source of truth)
    const { count: convertedLeads } = await supabase
      .from('quiz_leads')
      .select('*', { count: 'exact', head: true })
      .not('converted_to_user_id', 'is', null);

    // Leads by persona
    const { data: personaBreakdown } = await supabase
      .from('quiz_leads')
      .select('persona')
      .gte('created_at', monthStart.toISOString());

    const personaCounts = {
      marketing: 0,
      project: 0,
      education: 0,
    };

    personaBreakdown?.forEach(lead => {
      if (personaCounts[lead.persona] !== undefined) {
        personaCounts[lead.persona]++;
      }
    });

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 
      ? ((convertedLeads / totalLeads) * 100).toFixed(1)
      : 0;

    return {
      total: totalLeads || 0,
      thisMonth: leadsThisMonth || 0,
      last7Days: leadsLast7Days || 0,
      highPain: highPainLeads || 0,
      converted: convertedLeads || 0,
      conversionRate,
      byPersona: personaCounts,
    };
  } catch (error) {
    console.error('Error fetching quiz leads stats:', error);
    return null;
  }
};

/**
 * Get newsletter send history
 */
export const getNewsletterStats = async () => {
  try {
    // Use UTC for consistent timezone handling
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Total newsletters sent (exclude drafts)
    const { count: totalSends } = await supabase
      .from('newsletter_sends')
      .select('*', { count: 'exact', head: true })
      .eq('is_draft', false);

    // This month (exclude drafts)
    const { count: sendsThisMonth } = await supabase
      .from('newsletter_sends')
      .select('*', { count: 'exact', head: true })
      .eq('is_draft', false)
      .gte('sent_at', monthStart.toISOString());

    // Total recipients (sum of all recipient_count, exclude drafts)
    const { data: allSends } = await supabase
      .from('newsletter_sends')
      .select('recipient_count, success_count')
      .eq('is_draft', false);

    const totalRecipients = allSends?.reduce((sum, send) => sum + (send.recipient_count || 0), 0) || 0;
    const totalSuccess = allSends?.reduce((sum, send) => sum + (send.success_count || 0), 0) || 0;
    const successRate = totalRecipients > 0 
      ? ((totalSuccess / totalRecipients) * 100).toFixed(1)
      : 0;

    return {
      total: totalSends || 0,
      thisMonth: sendsThisMonth || 0,
      totalRecipients,
      successRate,
    };
  } catch (error) {
    console.error('Error fetching newsletter stats:', error);
    return null;
  }
};

/**
 * Get Monday.com users
 */
export const getMondayUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('monday_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching Monday users:', error);
    return [];
  }
};

/**
 * Get Monday.com subscription events
 */
export const getMondayEvents = async (userId = null, limit = 100) => {
  try {
    let query = supabase
      .from('monday_subscription_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('monday_user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching Monday events:', error);
    return [];
  }
};

/**
 * Grant premium access to a user (admin only)
 * @param {string} targetUserId - The user ID to grant premium to
 * @param {string} expiresAt - ISO date string for when premium expires
 * @param {string} reason - Optional reason for granting premium
 */
export const grantPremiumAccess = async (targetUserId, expiresAt, reason = '') => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-grant-premium', {
      body: {
        targetUserId,
        expiresAt,
        reason
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error granting premium access:', error);
    throw error;
  }
};

/**
 * Revoke premium access from a user (admin only)
 * @param {string} targetUserId - The user ID to revoke premium from
 */
export const revokePremiumAccess = async (targetUserId) => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-grant-premium', {
      body: {
        targetUserId,
        expiresAt: new Date().toISOString(), // Expire immediately
        reason: 'Admin revoked premium access'
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error revoking premium access:', error);
    throw error;
  }
};

/**
 * Send premium gift notification email
 * @param {string} recipientEmail - Email to send to
 * @param {string} recipientName - Name of recipient
 * @param {string} expiresAt - ISO date string for when premium expires
 * @param {string} customMessage - Optional custom message to include in email
 * @param {string} language - Language for email ('sv' or 'en')
 */
export const sendPremiumGiftEmail = async (recipientEmail, recipientName, expiresAt, customMessage = '', language = 'sv') => {
  try {
    const { data, error } = await supabase.functions.invoke('send-premium-gift', {
      body: {
        recipientEmail,
        recipientName,
        expiresAt,
        customMessage,
        language
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending premium gift email:', error);
    throw error;
  }
};

/**
 * Get all wheels (admin only) - bypasses RLS
 * Returns all wheels in the system with owner and team information
 */
export const getAdminWheels = async ({ page = 1, limit = 50, search = '', sortBy = 'created_at', sortOrder = 'desc' }) => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-get-wheels', {
      body: { page, limit, search, sortBy, sortOrder }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching admin wheels:', error);
    throw error;
  }
};

/**
 * Fetch a single wheel as admin (bypasses RLS)
 * Used to preview any wheel in the system
 */
export const fetchWheelAsAdmin = async (wheelId) => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-view-wheel', {
      body: { wheelId }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching wheel as admin:', error);
    throw error;
  }
};

/**
 * Get enhanced admin stats with period selection and comparison data
 * @param {string} period - 'today', 'week', '7d', '30d', '90d', 'mtd', 'ytd', 'all', 'custom'
 * @param {string} customStart - Start date for custom period (YYYY-MM-DD)
 * @param {string} customEnd - End date for custom period (YYYY-MM-DD)
 * @returns {Object} { current: {...stats}, previous: {...stats} }
 */
export const getEnhancedAdminStats = async (period = '30d', customStart = null, customEnd = null) => {
  try {
    const body = { period };
    if (period === 'custom' && customStart && customEnd) {
      body.customStart = customStart;
      body.customEnd = customEnd;
    }
    
    const { data, error } = await supabase.functions.invoke('admin-enhanced-stats', {
      body
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching enhanced admin stats:', error);
    // Return fallback structure
    return {
      current: getEmptyStatsStructure(),
      previous: getEmptyStatsStructure()
    };
  }
};

// Helper to create empty stats structure for fallback
const getEmptyStatsStructure = () => ({
  users: { total: 0, new: 0, active: 0, today: 0 },
  wheels: { total: 0, new: 0, withActivities: 0 },
  premium: { total: 0, monthly: 0, yearly: 0, new: 0 },
  revenue: { mrr: 0, arpu: 0 },
  activities: { total: 0, new: 0 },
  ai: { requests: 0, uniqueUsers: 0 },
  teams: { total: 0, new: 0, members: 0 },
  sharing: { publicWheels: 0, templates: 0, exports: 0, onLanding: 0 },
  retention: { newUsers: 0, returning: 0 },
  churn: { canceled: 0, rate: 0, atRisk: 0 },
  leads: { quizStarts: 0, quizCompleted: 0, signups: 0, newsletter: 0 }
});
