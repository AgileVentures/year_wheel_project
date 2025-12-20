import { useState, Fragment } from 'react';
import { Search, ChevronLeft, ChevronRight, Crown, Chrome, Github, Mail, Shield, Gift, X, CheckSquare, Square, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { grantPremiumAccess, sendPremiumGiftEmail } from '../../services/adminService';
import { UserActivityToggle, UserActivityContent, useUserActivity } from './UserActivityRow';

// Wrapper component to handle user activity state for each row
function UserRow({ user, hasPremium, isSelected, toggleUserSelection, openGrantModal }) {
  const activityState = useUserActivity(user.id);

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
    
    if (sub.plan_type === 'free') {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">Free</span>;
    }
    
    if (sub.status !== 'active') {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full capitalize">{sub.status}</span>;
    }
    
    if (sub.plan_type === 'gift') {
      const expiresAt = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('sv-SE') : '';
      return (
        <span className="px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 bg-green-100 text-green-700" title={`Expires: ${expiresAt}`}>
          <Gift size={12} />
          <span>Gift</span>
        </span>
      );
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
    <Fragment>
      <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''} ${activityState.isExpanded ? 'border-b-0' : ''}`}>
        <td className="px-4 py-4">
          {!hasPremium && (
            <button
              onClick={() => toggleUserSelection(user.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isSelected ? (
                <CheckSquare size={18} className="text-green-600" />
              ) : (
                <Square size={18} />
              )}
            </button>
          )}
        </td>
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
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <UserActivityToggle
              isExpanded={activityState.isExpanded}
              onToggle={activityState.toggle}
              loading={activityState.loading}
            />
            {!hasPremium && (
              <button
                onClick={() => openGrantModal(user)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                title="Ge premium-åtkomst"
              >
                <Gift size={14} />
                Ge Premium
              </button>
            )}
          </div>
        </td>
      </tr>
      {activityState.isExpanded && (
        <UserActivityContent
          activity={activityState.activity}
          error={activityState.error}
          colSpan={7}
        />
      )}
    </Fragment>
  );
}

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
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]); // For bulk selection
  const [grantDuration, setGrantDuration] = useState('1'); // months
  const [customDate, setCustomDate] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState('');
  const [grantProgress, setGrantProgress] = useState({ current: 0, total: 0 });

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
    
    // Gift subscription (admin granted)
    if (sub.plan_type === 'gift') {
      const expiresAt = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('sv-SE') : '';
      return (
        <span className="px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 bg-green-100 text-green-700" title={`Expires: ${expiresAt}`}>
          <Gift size={12} />
          <span>Gift</span>
        </span>
      );
    }
    
    const planColor = sub.plan_type === 'yearly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
    return (
      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${planColor}`}>
        <Crown size={12} />
        <span className="capitalize">{sub.plan_type}</span>
      </span>
    );
  };

  // Check if user has active premium (not free)
  const hasActivePremium = (user) => {
    if (!user.subscriptions || user.subscriptions.length === 0) return false;
    const sub = user.subscriptions[0];
    return sub.status === 'active' && ['monthly', 'yearly', 'gift'].includes(sub.plan_type);
  };

  // Get eligible users (no active premium)
  const eligibleUsers = users.filter(u => !hasActivePremium(u));

  // Toggle single user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle all eligible users
  const toggleAllUsers = () => {
    if (selectedUsers.length === eligibleUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(eligibleUsers.map(u => u.id));
    }
  };

  const openGrantModal = (user) => {
    setSelectedUser(user);
    setSelectedUsers([]);
    setShowGrantModal(true);
    setGrantDuration('1');
    setCustomDate('');
    setGrantReason('');
    setCustomMessage('');
    setSendEmail(true);
    setGrantError('');
    setGrantProgress({ current: 0, total: 0 });
  };

  const openBulkGrantModal = () => {
    setSelectedUser(null);
    setShowGrantModal(true);
    setGrantDuration('1');
    setCustomDate('');
    setGrantReason('');
    setCustomMessage('');
    setSendEmail(true);
    setGrantError('');
    setGrantProgress({ current: 0, total: 0 });
  };

  const handleGrantPremium = async () => {
    const usersToGrant = selectedUser ? [selectedUser] : users.filter(u => selectedUsers.includes(u.id));
    if (usersToGrant.length === 0) return;
    
    setIsGranting(true);
    setGrantError('');
    setGrantProgress({ current: 0, total: usersToGrant.length });
    
    try {
      let expiresAt;
      if (customDate) {
        expiresAt = new Date(customDate).toISOString();
      } else {
        const date = new Date();
        date.setMonth(date.getMonth() + parseInt(grantDuration));
        expiresAt = date.toISOString();
      }
      
      let successCount = 0;
      let errors = [];
      
      for (let i = 0; i < usersToGrant.length; i++) {
        const user = usersToGrant[i];
        setGrantProgress({ current: i + 1, total: usersToGrant.length });
        
        try {
          await grantPremiumAccess(user.id, expiresAt, grantReason);
          
          // Send email if enabled
          if (sendEmail) {
            try {
              await sendPremiumGiftEmail(
                user.email,
                user.full_name || user.email.split('@')[0],
                expiresAt,
                customMessage || undefined
              );
            } catch (emailError) {
              console.error(`Failed to send email to ${user.email}:`, emailError);
              // Don't fail the whole operation if email fails
            }
          }
          
          successCount++;
        } catch (error) {
          errors.push(`${user.email}: ${error.message}`);
        }
      }
      
      if (errors.length > 0) {
        setGrantError(`${successCount} av ${usersToGrant.length} lyckades. Fel: ${errors.join(', ')}`);
      } else {
        setShowGrantModal(false);
        setSelectedUsers([]);
      }
      
      onRefresh(); // Refresh the user list
    } catch (error) {
      setGrantError(error.message || 'Failed to grant premium access');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Grant Premium Modal */}
      {showGrantModal && (selectedUser || selectedUsers.length > 0) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedUser ? 'Ge Premium-åtkomst' : `Ge Premium till ${selectedUsers.length} användare`}
              </h3>
              <button 
                onClick={() => setShowGrantModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* User info */}
              {selectedUser ? (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Användare:</p>
                  <p className="font-medium text-gray-900">{selectedUser.full_name || 'Inget namn'}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              ) : (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                    <Users size={16} />
                    {selectedUsers.length} användare valda
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {users.filter(u => selectedUsers.includes(u.id)).map(u => u.email).slice(0, 3).join(', ')}
                    {selectedUsers.length > 3 && ` +${selectedUsers.length - 3} till`}
                  </p>
                </div>
              )}
              
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Varaktighet
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { value: '1', label: '1 månad' },
                    { value: '2', label: '2 månader' },
                    { value: '3', label: '3 månader' },
                    { value: '6', label: '6 månader' },
                    { value: '12', label: '1 år' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setGrantDuration(opt.value); setCustomDate(''); }}
                      className={`px-3 py-2 text-sm rounded border transition-colors ${
                        grantDuration === opt.value && !customDate
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">eller välj datum:</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
              </div>
              
              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anledning (valfritt)
                </label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="T.ex. Beta-testare, Julklapp, Samarbetspartner..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
              
              {/* Send email toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <button
                  type="button"
                  onClick={() => setSendEmail(!sendEmail)}
                  className="text-gray-700"
                >
                  {sendEmail ? <CheckSquare size={20} className="text-green-600" /> : <Square size={20} />}
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-700">Skicka mail till mottagaren</p>
                  <p className="text-xs text-gray-500">Informera användaren om sin premium-gåva</p>
                </div>
              </div>
              
              {/* Custom message (shown when send email is enabled) */}
              {sendEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personligt meddelande (valfritt)
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="T.ex. God Jul! 🎄 Vi vill tacka dig för att du använder YearWheel genom att ge dig Premium i julklapp!"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Detta meddelande visas i mailet till mottagaren
                  </p>
                </div>
              )}
              
              {/* Progress indicator for bulk */}
              {isGranting && grantProgress.total > 1 && (
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-blue-700">
                    Bearbetar {grantProgress.current} av {grantProgress.total}...
                  </p>
                  <div className="mt-2 h-2 bg-blue-200 rounded overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${(grantProgress.current / grantProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {grantError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {grantError}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Avbryt
              </button>
              <button
                onClick={handleGrantPremium}
                disabled={isGranting}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGranting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Bearbetar...
                  </>
                ) : (
                  <>
                    <Gift size={16} />
                    {selectedUser ? 'Ge Premium' : `Ge Premium (${selectedUsers.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-sm shadow-sm p-3 sm:p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
          <div className="flex gap-2">
            {selectedUsers.length > 0 && (
              <button
                onClick={openBulkGrantModal}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Gift size={18} />
                <span className="hidden sm:inline">Ge Premium</span> ({selectedUsers.length})
              </button>
            )}
            <button
              onClick={onRefresh}
              className="px-3 sm:px-4 py-2 bg-gray-900 text-white text-sm rounded-sm hover:bg-gray-800 transition-colors"
            >
              {t('refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {users.map((user) => {
          const hasPremium = hasActivePremium(user);
          const isSelected = selectedUsers.includes(user.id);
          
          return (
            <div key={user.id} className={`bg-white rounded-sm shadow p-4 ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!hasPremium && (
                      <button
                        onClick={() => toggleUserSelection(user.id)}
                        className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-green-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    )}
                    <div className="font-medium text-gray-900 truncate">
                      {user.full_name || 'No name'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-0.5">{user.email}</div>
                </div>
                {getSubscriptionBadge(user.subscriptions)}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {getProviderDisplay(user)}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                <div className="flex gap-3">
                  <span>Skapad: {formatDate(user.created_at)}</span>
                  <span>Senast: {formatLastSeen(user.last_sign_in_at)}</span>
                </div>
              </div>
              
              {!hasPremium && (
                <button
                  onClick={() => openGrantModal(user)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                >
                  <Gift size={14} />
                  Ge Premium
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={toggleAllUsers}
                    className="text-gray-500 hover:text-gray-700"
                    title={eligibleUsers.length > 0 ? `Välj alla ${eligibleUsers.length} utan premium` : 'Inga valbara användare'}
                  >
                    {selectedUsers.length > 0 && selectedUsers.length === eligibleUsers.length ? (
                      <CheckSquare size={18} className="text-green-600" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const hasPremium = hasActivePremium(user);
                const isSelected = selectedUsers.includes(user.id);
                
                return (
                  <UserRow
                    key={user.id}
                    user={user}
                    hasPremium={hasPremium}
                    isSelected={isSelected}
                    toggleUserSelection={toggleUserSelection}
                    openGrantModal={openGrantModal}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
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

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="sm:hidden flex items-center justify-between p-3 bg-white rounded-sm shadow">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Föreg.
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Nästa
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
