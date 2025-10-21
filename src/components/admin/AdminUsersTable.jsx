import { Search, ChevronLeft, ChevronRight, Crown, Chrome, Github, Mail, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminUsersTable({ 
  users, 
  currentPage, 
  totalPages, 
  searchQuery, 
  onSearch, 
  onSort, 
  onPageChange,
  onRefresh 
}) {
  const { t } = useTranslation(['admin']);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE');
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

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-sm shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('searchUsers')}
              value={searchQuery}
              onChange={onSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-colors"
          >
            {t('refresh')}
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
                  onClick={() => onSort('full_name')}
                >
                  {t('user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('provider')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('plan')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('created_at')}
                >
                  {t('createdAt')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('lastSeen')}
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
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
