import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminMondayUsers from './AdminMondayUsers';
import { getMondayUsers } from '../../services/adminService';

export default function AdminMondayPage() {
  const { t } = useTranslation(['admin', 'common']);
  const [loading, setLoading] = useState(true);
  const [mondayUsers, setMondayUsers] = useState([]);

  useEffect(() => {
    loadMondayUsers();
  }, []);

  const loadMondayUsers = async () => {
    try {
      setLoading(true);
      const data = await getMondayUsers();
      setMondayUsers(data);
    } catch (error) {
      console.error('Error loading Monday users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Monday.com</h2>
        <p className="text-gray-600 text-sm">Användare som anslutit via Monday.com</p>
      </div>
      <AdminMondayUsers 
        mondayUsers={mondayUsers}
        onRefresh={loadMondayUsers}
        loading={loading}
      />
    </div>
  );
}
