import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import {
  Users,
  Activity,
  TrendingUp,
  Calendar,
  Crown,
  Globe,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Mail,
  Clock,
  Circle,
  Ban,
  CheckCircle,
  AlertCircle,
  Chrome,
  Github,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  getAdminStats,
  getUsers,
  getUserGrowthData,
  getWheelGrowthData,
  getRecentActivity,
  toggleUserAdmin,
  getSubscriptionStats,
} from '../services/adminService';
import { checkIsAdmin } from '../services/wheelService';

export default function AdminPanel() {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Debug: Check if admin namespace is loaded
  useEffect(() => {
    console.log('Admin namespace exists (sv):', i18n.hasResourceBundle('sv', 'admin'));
    console.log('Admin namespace exists (en):', i18n.hasResourceBundle('en', 'admin'));
    console.log('Current language:', i18n.language);
    console.log('Loaded namespaces:', i18n.reportNamespaces?.getUsedNamespaces?.());
    console.log('Test translation:', t('admin:title'), t('title'));
  }, [i18n, t]);
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [wheelGrowth, setWheelGrowth] = useState([]);
  const [recentActivity, setRecentActivity] = useState(null);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  
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
      ] = await Promise.all([
        getAdminStats(),
        getUsers({ page: currentPage, limit: 50, search: searchQuery, sortBy, sortOrder }),
        getUserGrowthData(30),
        getWheelGrowthData(30),
        getRecentActivity(10),
        getSubscriptionStats(),
      ]);
      
      setStats(statsData);
      setUsers(usersData.users);
      setTotalPages(usersData.totalPages);
      setUserGrowth(userGrowthData);
      setWheelGrowth(wheelGrowthData);
      setRecentActivity(activityData);
      setSubscriptionStats(subStats);
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

  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      await toggleUserAdmin(userId, !currentStatus);
      loadData(); // Reload data
    } catch (error) {
      console.error('Error toggling admin status:', error);
      alert('Failed to update admin status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('sv-SE')} ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatLastSeen = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('sv-SE');
  };

  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'google':
        return <Chrome size={14} className="text-blue-600" />;
      case 'github':
        return <Github size={14} className="text-gray-800" />;
      case 'email':
        return <Mail size={14} className="text-gray-600" />;
      default:
        return <Shield size={14} className="text-gray-400" />;
    }
  };

  const getProviderDisplay = (user) => {
    // If user has multiple providers, show all of them
    if (user.providers && user.providers.length > 1) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {user.providers.map((prov, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
              {getProviderIcon(prov)}
              <span className="capitalize">{prov}</span>
            </span>
          ))}
        </div>
      );
    }
    // Single provider
    const provider = user.provider || 'email';
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
        {getProviderIcon(provider)}
        <span className="capitalize">{provider}</span>
      </span>
    );
  };

  const getSubscriptionBadge = (subscriptions) => {
    if (!subscriptions || subscriptions.length === 0) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">Free</span>;
    }
    
    const sub = subscriptions[0];
    
    // Treat 'free' plan_type as no subscription
    if (sub.plan_type === 'free') {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">Free</span>;
    }
    
    if (sub.status !== 'active') {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full capitalize">{sub.status}</span>;
    }
    
    const planColor = sub.plan_type === 'yearly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
    return (
      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${planColor}`}>
        <Crown size={12} />
        <span className="capitalize">{sub.plan_type}</span>
      </span>
    );
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
                <h1 className="text-3xl font-bold text-gray-900">{t('admin.title')}</h1>
                <p className="text-sm text-gray-600 mt-1">{t('admin.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              >
                {t('admin.backToDashboard')}
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
              {t('admin.overview')}
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
              {t('admin.users')}
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
              {t('admin.activity')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users */}
              <div className="bg-white rounded-sm shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Users className="text-blue-600" size={24} />
                  <span className="text-xs text-gray-500">Total</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats?.users.total}</div>
                <div className="text-sm text-gray-600 mt-1">{t('admin.totalUsers')}</div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('admin.today')}: <strong className="text-gray-900">{stats?.users.today}</strong></span>
                    <span>{t('admin.last7Days')}: <strong className="text-gray-900">{stats?.users.last7Days}</strong></span>
                  </div>
                </div>
              </div>

              {/* Total Wheels */}
              <div className="bg-white rounded-sm shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Circle className="text-green-600" size={24} />
                  <span className="text-xs text-gray-500">{t('admin.created')}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats?.wheels.total}</div>
                <div className="text-sm text-gray-600 mt-1">{t('admin.totalWheels')}</div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('admin.today')}: <strong className="text-gray-900">{stats?.wheels.today}</strong></span>
                    <span>{t('admin.thisMonth')}: <strong className="text-gray-900">{stats?.wheels.thisMonth}</strong></span>
                  </div>
                </div>
              </div>

              {/* Premium Users */}
              <div className="bg-white rounded-sm shadow-sm p-6 border border-gray-200 bg-gradient-to-br from-purple-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <Crown className="text-purple-600" size={24} />
                  <span className="text-xs text-gray-500">{t('admin.active')}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats?.premium}</div>
                <div className="text-sm text-gray-600 mt-1">{t('admin.premiumSubscribers')}</div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('admin.monthly')}: <strong className="text-gray-900">{subscriptionStats?.monthly || 0}</strong></span>
                    <span>{t('admin.yearly')}: <strong className="text-gray-900">{subscriptionStats?.yearly || 0}</strong></span>
                  </div>
                </div>
              </div>

              {/* Public Content */}
              <div className="bg-white rounded-sm shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="text-teal-600" size={24} />
                  <span className="text-xs text-gray-500">{t('admin.shared')}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats?.publicWheels}</div>
                <div className="text-sm text-gray-600 mt-1">{t('admin.publicWheels')}</div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('admin.templates')}: <strong className="text-gray-900">{stats?.templates}</strong></span>
                    <span>{t('admin.teams')}: <strong className="text-gray-900">{stats?.teams}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Stats */}
            <div className="bg-white rounded-sm shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.monthOverview')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats?.users.thisMonth}</div>
                  <div className="text-sm text-gray-600">{t('admin.newUsers')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats?.wheels.thisMonth}</div>
                  <div className="text-sm text-gray-600">{t('admin.wheelsCreated')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.users.total > 0 ? ((stats?.premium / stats?.users.total) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.conversionRate')}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-sm shadow-sm p-4 border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder={t('admin.searchUsers')}
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-colors"
                >
                  {t('admin.refresh')}
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('full_name')}
                      >
                        {t('admin.user')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.provider')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.plan')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('created_at')}
                      >
                        {t('admin.createdAt')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.lastSeen')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.full_name || 'No name'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getProviderDisplay(user)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getSubscriptionBadge(user.subscriptions)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatLastSeen(user.last_sign_in_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && recentActivity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={20} />
                Recent Users
              </h3>
              <div className="space-y-4">
                {recentActivity.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{user.full_name || 'No name'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{formatDate(user.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Wheels */}
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Circle size={20} />
                Recent Wheels
              </h3>
              <div className="space-y-4">
                {recentActivity.recentWheels.map((wheel) => (
                  <div key={wheel.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{wheel.title}</div>
                      <div className="text-sm text-gray-500">
                        by {wheel.profiles?.full_name || wheel.profiles?.email || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{formatDate(wheel.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
