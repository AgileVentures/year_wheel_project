import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminTeams from './AdminTeams';
import { getAllTeams } from '../../services/adminService';

export default function AdminTeamsPage() {
  const { t } = useTranslation(['admin', 'common']);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await getAllTeams();
      setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Team</h2>
        <p className="text-gray-600 text-sm">Översikt över alla team och medlemmar i systemet</p>
      </div>
      <AdminTeams 
        teams={teams}
        onRefresh={loadTeams}
        loading={loading}
      />
    </div>
  );
}
