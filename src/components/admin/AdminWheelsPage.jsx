import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminWheelsTable from './AdminWheelsTable';
import { getAdminWheels } from '../../services/adminService';

export default function AdminWheelsPage() {
  const { t } = useTranslation(['admin', 'common']);
  const [loading, setLoading] = useState(true);
  const [wheels, setWheels] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadWheels();
  }, [currentPage, searchQuery, sortBy, sortOrder]);

  const loadWheels = async () => {
    try {
      setLoading(true);
      const wheelsData = await getAdminWheels({
        page: currentPage,
        limit: 50,
        search: searchQuery,
        sortBy,
        sortOrder,
      });
      setWheels(wheelsData.wheels || []);
      setTotalPages(wheelsData.totalPages || 1);
      setTotal(wheelsData.total || 0);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (column, order) => {
    setSortBy(column);
    setSortOrder(order);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Hjul</h2>
        <p className="text-gray-600 text-sm">Alla årshjul på plattformen</p>
      </div>
      <AdminWheelsTable
        wheels={wheels}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onSort={handleSort}
        onPageChange={setCurrentPage}
        loading={loading}
      />
    </div>
  );
}
