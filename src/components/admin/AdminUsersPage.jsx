import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminUsersTable from './AdminUsersTable';
import { getUsers } from '../../services/adminService';

export default function AdminUsersPage() {
  const { t } = useTranslation(['admin', 'common']);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery, sortBy, sortOrder]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getUsers({
        page: currentPage,
        limit: 50,
        search: searchQuery,
        sortBy,
        sortOrder,
      });
      setUsers(usersData.users);
      setTotalPages(usersData.totalPages);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('users')}</h2>
        <p className="text-gray-600 text-sm">Hantera användare och prenumerationer</p>
      </div>
      <AdminUsersTable
        users={users}
        currentPage={currentPage}
        totalPages={totalPages}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onSort={handleSort}
        onPageChange={setCurrentPage}
        onRefresh={loadUsers}
        loading={loading}
      />
    </div>
  );
}
