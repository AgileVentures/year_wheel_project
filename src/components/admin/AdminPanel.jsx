import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import AdminStats from './AdminStats';
import AdminUsersTable from './AdminUsersTable';
import AdminActivity from './AdminActivity';
import AdminAffiliates from './AdminAffiliates';
import AdminEmailStats from './AdminEmailStats';
import {
  Activity,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getAdminStats,
  getUsers,
  getUserGrowthData,
  getWheelGrowthData,
  getRecentActivity,
  getSubscriptionStats,
  getQuizLeadsStats,
  getNewsletterStats,
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
  const [recentActivity, setRecentActivity] = useState(null);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [quizLeadsStats, setQuizLeadsStats] = useState(null);
  const [newsletterStats, setNewsletterStats] = useState(null);
  
  // Pagination & filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, currentPage, searchQuery, sortBy, sortOrder]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const [
        statsData,
        usersData,
        userGrowthData,
        wheelGrowthData,
        activityData,
        subStats,
        quizStats,
        emailStats,
      ] = await Promise.all([
        getAdminStats(),
        getUsers({ page: currentPage, limit: 50, search: searchQuery, sortBy, sortOrder }),
        getUserGrowthData(30),
        getWheelGrowthData(30),
        getRecentActivity(10),
        getSubscriptionStats(),
        getQuizLeadsStats(),
        getNewsletterStats(),
      ]);
      
      setStats(statsData);
      setUsers(usersData.users);
      setTotalPages(usersData.totalPages);
      setUserGrowth(userGrowthData);
      setWheelGrowth(wheelGrowthData);
      setRecentActivity(activityData);
      setSubscriptionStats(subStats);
      setQuizLeadsStats(quizStats);
      setNewsletterStats(emailStats);
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

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-gray-900" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
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
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity size={16} className="inline mr-2" />
              {t('overview')}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={16} className="inline mr-2" />
              {t('users')}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp size={16} className="inline mr-2" />
              {t('activity')}
            </button>
            <button
              onClick={() => setActiveTab('affiliates')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'affiliates'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign size={16} className="inline mr-2" />
              Affiliates
            </button>
            <button
              onClick={() => navigate('/newsletter')}
              className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Mail size={16} className="inline mr-2" />
              Newsletter
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {activeTab === 'activity' && (
          <AdminActivity recentActivity={recentActivity} />
        )}

        {activeTab === 'affiliates' && (
          <AdminAffiliates />
        )}
      </div>
    </div>
  );
}
