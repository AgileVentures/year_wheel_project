import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WheelLoader from '../WheelLoader';
import { 
  Calendar, 
  CreditCard, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  Eye,
  Download,
  Share2,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminMondayUsers({ mondayUsers, onRefresh, loading }) {
  const { t } = useTranslation(['admin', 'common']);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      trial: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      cancelling: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
      trial_ended: { bg: 'bg-orange-100', text: 'text-orange-800', icon: XCircle },
      payment_failed: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
      payment_retry: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: RefreshCw },
      uninstalled: { bg: 'bg-gray-200', text: 'text-gray-600', icon: XCircle },
    };

    const badge = badges[status] || badges.active;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    const plans = {
      free: { bg: 'bg-gray-100', text: 'text-gray-800' },
      'pro-monthly': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'pro-annual': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    };

    const badge = plans[plan] || plans.free;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {plan}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActivityIcon = (activityType) => {
    const icons = {
      board_viewed: Eye,
      wheel_created: Edit,
      wheel_updated: Edit,
      wheel_deleted: Trash2,
      export_pdf: Download,
      export_png: Download,
      export_svg: Download,
      export_jpg: Download,
      share_wheel: Share2,
    };
    return icons[activityType] || Activity;
  };

  const getActivityColor = (activityType) => {
    const colors = {
      board_viewed: 'text-blue-600 bg-blue-50',
      wheel_created: 'text-green-600 bg-green-50',
      wheel_updated: 'text-yellow-600 bg-yellow-50',
      wheel_deleted: 'text-red-600 bg-red-50',
      export_pdf: 'text-purple-600 bg-purple-50',
      export_png: 'text-purple-600 bg-purple-50',
      export_svg: 'text-purple-600 bg-purple-50',
      export_jpg: 'text-purple-600 bg-purple-50',
      share_wheel: 'text-indigo-600 bg-indigo-50',
    };
    return colors[activityType] || 'text-gray-600 bg-gray-50';
  };

  const loadUserActivities = async (userId) => {
    if (!userId) return;
    
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('monday_user_activities')
        .select('*')
        .eq('monday_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUserActivities(data || []);
    } catch (error) {
      console.error('Error loading user activities:', error);
      setUserActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      loadUserActivities(selectedUser.id);
      setActiveTab('details');
    } else {
      setUserActivities([]);
    }
  }, [selectedUser]);

  // Calculate stats
  const stats = {
    total: mondayUsers?.length || 0,
    active: mondayUsers?.filter(u => u.subscription_status === 'active').length || 0,
    trial: mondayUsers?.filter(u => u.is_trial).length || 0,
    paying: mondayUsers?.filter(u => u.current_plan !== 'free' && u.subscription_status === 'active').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="text-gray-400" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="text-green-400" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Trial</p>
              <p className="text-2xl font-bold text-blue-600">{stats.trial}</p>
            </div>
            <Clock className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paying</p>
              <p className="text-2xl font-bold text-purple-600">{stats.paying}</p>
            </div>
            <CreditCard className="text-purple-400" size={24} />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">monday.com Users</h3>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mondayUsers?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No monday.com users found
                  </td>
                </tr>
              ) : (
                mondayUsers?.map((user) => (
                  <tr 
                    key={user.id}
                    onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                    className={`cursor-pointer transition-colors ${
                      selectedUser?.id === user.id 
                        ? 'bg-blue-50 hover:bg-blue-100' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">ID: {user.monday_user_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{user.monday_account_name}</div>
                        <div className="text-xs text-gray-500">{user.monday_account_slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPlanBadge(user.current_plan)}
                      {user.is_trial && (
                        <div className="text-xs text-blue-600 mt-1">
                          Trial ends: {formatDate(user.trial_ends_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.subscription_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{user.account_tier}</span>
                      <div className="text-xs text-gray-400">{user.user_cluster}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_active_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded User Details */}
        {selectedUser && (
          <div className="border-t border-gray-200 bg-gray-50">
            {/* User Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        Monday ID: {selectedUser.monday_user_id}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">
                        Account: {selectedUser.monday_account_name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedUser.subscription_status)}
                  {getPlanBadge(selectedUser.current_plan)}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity size={16} />
                Activity Log ({userActivities.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="px-6 py-4">
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Subscription Details</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Billing Period:</dt>
                        <dd className="text-gray-900">{selectedUser.billing_period || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Renewal Date:</dt>
                        <dd className="text-gray-900">{formatDate(selectedUser.renewal_date)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Boards Used:</dt>
                        <dd className="text-gray-900">{selectedUser.boards_used}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Account Info</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Account ID:</dt>
                        <dd className="text-gray-900">{selectedUser.monday_account_id}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Country:</dt>
                        <dd className="text-gray-900">{selectedUser.country_code || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Cluster:</dt>
                        <dd className="text-gray-900">{selectedUser.user_cluster}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Activity</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Created:</dt>
                        <dd className="text-gray-900">{formatDate(selectedUser.created_at)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Updated:</dt>
                        <dd className="text-gray-900">{formatDate(selectedUser.updated_at)}</dd>
                      </div>
                      {selectedUser.uninstalled_at && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Uninstalled:</dt>
                          <dd className="text-red-600">{formatDate(selectedUser.uninstalled_at)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {loadingActivities ? (
                    <div className="text-center py-8">
                      <WheelLoader size="sm" className="mx-auto" />
                    </div>
                  ) : userActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="mx-auto mb-2 text-gray-400" size={32} />
                      <p className="text-sm text-gray-600">No activities recorded yet</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Activity
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Details
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Timestamp
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {userActivities.map((activity) => {
                            const Icon = getActivityIcon(activity.activity_type);
                            const colorClass = getActivityColor(activity.activity_type);
                            
                            return (
                              <tr key={activity.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                    <Icon size={12} />
                                    {activity.activity_type}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-xs text-gray-600 space-y-0.5">
                                    {activity.board_id && (
                                      <div>Board: <span className="font-mono">{activity.board_id}</span></div>
                                    )}
                                    {activity.item_id && (
                                      <div>Item: <span className="font-mono">{activity.item_id}</span></div>
                                    )}
                                    {activity.wheel_id && (
                                      <div>Wheel: <span className="font-mono">{activity.wheel_id}</span></div>
                                    )}
                                    {activity.metadata && (
                                      <div className="text-gray-500">
                                        {JSON.stringify(activity.metadata)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                  {formatDateTime(activity.created_at)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
