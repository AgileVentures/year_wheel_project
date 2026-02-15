import { supabase } from '../lib/supabase';

/**
 * NPS Service - Functions for Net Promoter Score feedback
 */

/**
 * Check if NPS modal should be shown to the current user
 * @returns {Promise<boolean>}
 */
export const shouldShowNPS = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('should_show_nps', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error checking NPS eligibility:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking NPS eligibility:', error);
    return false;
  }
};

/**
 * Submit NPS response
 * @param {number} score - NPS score (0-10)
 * @param {string} comment - Optional comment
 * @param {object} context - Optional context (wheelId, etc.)
 * @returns {Promise<object>}
 */
export const submitNPSResponse = async (score, comment = '', context = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Validate score
    if (score < 0 || score > 10) {
      throw new Error('Score must be between 0 and 10');
    }

    // Insert NPS response
    const { data: npsData, error: npsError } = await supabase
      .from('nps_responses')
      .insert({
        user_id: user.id,
        score,
        comment: comment?.trim() || null,
        context: context || {}
      })
      .select()
      .single();

    if (npsError) throw npsError;

    // Update last_nps_submitted_at in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ last_nps_submitted_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    return npsData;
  } catch (error) {
    console.error('Error submitting NPS response:', error);
    throw error;
  }
};

/**
 * Record that NPS modal was shown (dismissed without submitting)
 * @returns {Promise<void>}
 */
export const recordNPSShown = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ last_nps_shown_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Error recording NPS shown:', error);
    }
  } catch (error) {
    console.error('Error recording NPS shown:', error);
  }
};

/**
 * Get all NPS responses (admin only)
 * @param {object} options - Query options
 * @returns {Promise<object>}
 */
export const getNPSResponses = async ({ 
  page = 1, 
  limit = 50, 
  sortBy = 'created_at', 
  sortOrder = 'desc' 
} = {}) => {
  try {
    const offset = (page - 1) * limit;

    // Get NPS responses with user profiles
    let query = supabase
      .from('nps_responses')
      .select(`
        id,
        user_id,
        score,
        comment,
        context,
        created_at,
        profiles!inner(email, full_name)
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      responses: data || [],
      totalPages: Math.ceil((count || 0) / limit),
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error fetching NPS responses:', error);
    throw error;
  }
};

/**
 * Get NPS statistics (admin only)
 * @returns {Promise<object>}
 */
export const getNPSStats = async () => {
  try {
    const { data, error } = await supabase
      .from('nps_responses')
      .select('score');

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalResponses: 0,
        averageScore: 0,
        npsScore: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        promoterPercentage: 0,
        detractorPercentage: 0
      };
    }

    const totalResponses = data.length;
    const averageScore = data.reduce((sum, r) => sum + r.score, 0) / totalResponses;

    // NPS categorization: 0-6 = detractors, 7-8 = passives, 9-10 = promoters
    const promoters = data.filter(r => r.score >= 9).length;
    const passives = data.filter(r => r.score >= 7 && r.score <= 8).length;
    const detractors = data.filter(r => r.score <= 6).length;

    const promoterPercentage = (promoters / totalResponses) * 100;
    const detractorPercentage = (detractors / totalResponses) * 100;
    const npsScore = promoterPercentage - detractorPercentage;

    return {
      totalResponses,
      averageScore: Math.round(averageScore * 10) / 10,
      npsScore: Math.round(npsScore),
      promoters,
      passives,
      detractors,
      promoterPercentage: Math.round(promoterPercentage),
      detractorPercentage: Math.round(detractorPercentage)
    };
  } catch (error) {
    console.error('Error fetching NPS stats:', error);
    throw error;
  }
};
