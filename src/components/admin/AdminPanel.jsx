import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import AdminStats from './AdminStats';
import AdminUsersTable from './AdminUsersTable';
import AdminWheelsTable from './AdminWheelsTable';
import AdminAffiliates from './AdminAffiliates';
import AdminEmailStats from './AdminEmailStats';
import AdminMondayUsers from './AdminMondayUsers';
import WheelLoader from '../WheelLoader';
import {
  Activity,
  Shield,
  Users,
  DollarSign,
  Mail,
  Calendar,
  Circle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getAdminStats,
  getUsers,
  getAdminWheels,
  getUserGrowthData,
  getWheelGrowthData,
  getSubscriptionStats,
  getQuizLeadsStats,
  getNewsletterStats,
  getMondayUsers,
} from '../../services/adminService';
import { checkIsAdmin } from '../../services/wheelService';

export default function AdminPanel() {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [wheelGrowth, setWheelGrowth] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [quizLeadsStats, setQuizLeadsStats] = useState(null);
  const [newsletterStats, setNewsletterStats] = useState(null);
  const [mondayUsers, setMondayUsers] = useState([]);
  const [wheels, setWheels] = useState([]);
  const [wheelsLoading, setWheelsLoading] = useState(false);
  
  // Pagination & filters for users
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination & filters for wheels
  const [wheelsPage, setWheelsPage] = useState(1);
  const [wheelsTotalPages, setWheelsTotalPages] = useState(1);
  const [wheelsSearch, setWheelsSearch] = useState('');
  const [wheelsSortBy, setWheelsSortBy] = useState('created_at');
  const [wheelsSortOrder, setWheelsSortOrder] = useState('desc');
  
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, currentPage, searchQuery, sortBy, sortOrder]);

  // Load wheels when on wheels tab or when wheel filters change
  useEffect(() => {
    if (isAdmin && activeTab === 'wheels') {
      loadWheels();
    }
  }, [isAdmin, activeTab, wheelsPage, wheelsSearch, wheelsSortBy, wheelsSortOrder]);

  const checkAdminAccess = async () => {
    try {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    }
  };

  const loadWheels = async () => {
    try {
      setWheelsLoading(true);
      const wheelsData = await getAdminWheels({
        page: wheelsPage,
        limit: 50,
        search: wheelsSearch,
        sortBy: wheelsSortBy,
        sortOrder: wheelsSortOrder,
      });
      setWheels(wheelsData.wheels || []);
      setWheelsTotalPages(wheelsData.totalPages || 1);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setWheelsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const [
        statsData,
        usersData,
        userGrowthData,
        wheelGrowthData,
        subStats,
        quizStats,
        emailStats,
        mondayData,
      ] = await Promise.all([
        getAdminStats(),
        getUsers({ page: currentPage, limit: 50, search: searchQuery, sortBy, sortOrder }),
        getUserGrowthData(30),
        getWheelGrowthData(30),
        getSubscriptionStats(),
        getQuizLeadsStats(),
        getNewsletterStats(),
        getMondayUsers(),
      ]);
      
      setStats(statsData);
      setUsers(usersData.users);
      setTotalPages(usersData.totalPages);
      setUserGrowth(userGrowthData);
      setWheelGrowth(wheelGrowthData);
      setSubscriptionStats(subStats);
      setQuizLeadsStats(quizStats);
      setNewsletterStats(emailStats);
      setMondayUsers(mondayData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
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

  const handleWheelsSearch = (e) => {
    setWheelsSearch(e.target.value);
    setWheelsPage(1);
  };

  const handleWheelsSort = (column, order) => {
    setWheelsSortBy(column);
    setWheelsSortOrder(order);
    setWheelsPage(1);
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <WheelLoader size="sm" className="mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="text-gray-900 hidden sm:block" size={32} />
              <Shield className="text-gray-900 sm:hidden" size={24} />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              >
                {t('backToDashboard')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 sm:gap-6 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'overview'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity size={16} className="inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('overview')}</span>
              <span className="sm:hidden">Översikt</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'users'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={16} className="inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('users')}</span>
              <span className="sm:hidden">Användare</span>
            </button>
            <button
              onClick={() => setActiveTab('wheels')}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'wheels'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Circle size={16} className="inline mr-1 sm:mr-2" />
              Hjul
            </button>
            <button
              onClick={() => setActiveTab('affiliates')}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'affiliates'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign size={16} className="inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('affiliates')}</span>
              <span className="sm:hidden">Affiliates</span>
            </button>
            <button
              onClick={() => setActiveTab('monday')}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'monday'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar size={16} className="inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Monday.com</span>
              <span className="sm:hidden">Monday</span>
            </button>
            <button
              onClick={() => navigate('/newsletter')}
              className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Mail size={16} className="inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('newsletter')}</span>
              <span className="sm:hidden">Nyhetsbrev</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <AdminStats stats={stats} subscriptionStats={subscriptionStats} />
            <AdminEmailStats quizLeadsStats={quizLeadsStats} newsletterStats={newsletterStats} />
          </div>
        )}

        {activeTab === 'users' && (
          <AdminUsersTable
            users={users}
            currentPage={currentPage}
            totalPages={totalPages}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onSort={handleSort}
            onPageChange={setCurrentPage}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'wheels' && (
          <AdminWheelsTable
            wheels={wheels}
            currentPage={wheelsPage}
            totalPages={wheelsTotalPages}
            searchQuery={wheelsSearch}
            onSearch={handleWheelsSearch}
            onSort={handleWheelsSort}
            onPageChange={setWheelsPage}
            loading={wheelsLoading}
          />
        )}

        {activeTab === 'affiliates' && (
          <AdminAffiliates />
        )}

        {activeTab === 'monday' && (
          <AdminMondayUsers 
            mondayUsers={mondayUsers}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
}
