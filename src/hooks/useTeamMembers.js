/**
 * useTeamMembers Hook
 * Fetches team members for mention autocomplete
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to extract team members from a wheel
 * @param {Object} wheel - Wheel object with team_id
 * @param {Object} user - Current user
 * @returns {Object} Object with teamMembers array and loading state
 */
export function useTeamMembers(wheel, user) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTeamMembers() {
      if (!wheel?.team_id) {
        // No team - just include wheel owner and current user
        const members = [];
        if (wheel?.user_id) {
          members.push({
            id: wheel.user_id,
            full_name: 'Wheel Owner',
            email: '',
          });
        }
        if (user?.id && user.id !== wheel?.user_id) {
          members.push({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email,
            email: user.email,
          });
        }
        setTeamMembers(members);
        return;
      }

      setLoading(true);
      try {
        // Fetch team members
        const { data: teamMembersData, error: teamError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', wheel.team_id);

        if (teamError) throw teamError;

        if (!teamMembersData || teamMembersData.length === 0) {
          setTeamMembers([]);
          return;
        }

        // Fetch profiles separately
        const userIds = teamMembersData.map(tm => tm.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        const members = profilesData || [];
        setTeamMembers(members);
      } catch (error) {
        console.error('[useTeamMembers] Error fetching team members:', error);
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTeamMembers();
  }, [wheel?.team_id, wheel?.user_id, user?.id, user?.email, user?.user_metadata?.full_name]);

  return { teamMembers, loading };
}

export default useTeamMembers;
