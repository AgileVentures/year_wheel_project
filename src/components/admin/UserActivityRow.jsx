import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, CheckCircle, XCircle, Activity, Calendar, Layers, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Expandable user activity section
 * Shows toggle button and expanded content when clicked
 */
export function UserActivityToggle({ isExpanded, onToggle, loading }) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
      title="Visa aktivitetsdata"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isExpanded ? (
        <ChevronDown size={14} />
      ) : (
        <ChevronRight size={14} />
      )}
      <Activity size={14} />
    </button>
  );
}

/**
 * Expanded activity content row
 */
export function UserActivityContent({ activity, error, colSpan = 7 }) {
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

  if (error) {
    return (
      <tr className="bg-gray-50">
        <td colSpan={colSpan} className="px-6 py-4">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!activity) return null;

  return (
    <tr className="bg-gray-50 border-b border-gray-200">
      <td colSpan={colSpan} className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Active status */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              {activity.is_active ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-gray-400" />
              )}
              <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
            </div>
            <div className={`text-lg font-bold ${activity.is_active ? 'text-green-600' : 'text-gray-500'}`}>
              {activity.is_active ? 'Aktiv' : 'Ej aktiv'}
            </div>
          </div>
          
          {/* Wheels count */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={16} className="text-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Wheels</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {activity.wheels_count}
              <span className="text-xs font-normal text-gray-500 ml-1">(min 1)</span>
            </div>
          </div>
          
          {/* Items count */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-purple-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Items</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {activity.items_count}
              <span className="text-xs font-normal text-gray-500 ml-1">(min 3)</span>
            </div>
          </div>
          
          {/* Days since signup */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-orange-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Dagar sedan signup</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {activity.days_since_signup}
              <span className="text-xs font-normal text-gray-500 ml-1">dagar</span>
            </div>
          </div>
          
          {/* Multiple logins */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              {activity.has_multiple_logins ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-gray-400" />
              )}
              <span className="text-xs font-medium text-gray-500 uppercase">Återloggat</span>
            </div>
            <div className={`text-lg font-bold ${activity.has_multiple_logins ? 'text-green-600' : 'text-gray-500'}`}>
              {activity.has_multiple_logins ? 'Ja' : 'Nej'}
            </div>
          </div>
          
          {/* Last login */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Senaste login</span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(activity.last_login)}
            </div>
          </div>
        </div>
        
        {/* Affiliate qualification info */}
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          <p className="font-medium text-amber-800 mb-1">Affiliate-kvalificering:</p>
          <ul className="text-amber-700 space-y-0.5">
            <li className="flex items-center gap-2">
              {activity.wheels_count >= 1 ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
              Minst 1 wheel skapad ({activity.wheels_count}/1)
            </li>
            <li className="flex items-center gap-2">
              {activity.items_count >= 3 ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
              Minst 3 items skapade ({activity.items_count}/3)
            </li>
            <li className="flex items-center gap-2">
              {activity.has_multiple_logins ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
              Loggat in mer än en gång
            </li>
            <li className="flex items-center gap-2">
              {activity.days_since_signup >= 14 ? (
                <CheckCircle size={14} className="text-green-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
              14 dagar sedan signup ({activity.days_since_signup}/14)
            </li>
          </ul>
        </div>
      </td>
    </tr>
  );
}

/**
 * Hook to manage user activity state
 */
export function useUserActivity(userId) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);

  const loadActivity = async () => {
    if (activity) return; // Already loaded
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('check_user_activity', {
        p_user_id: userId
      });
      
      if (rpcError) throw rpcError;
      setActivity(data);
    } catch (err) {
      console.error('Error loading user activity:', err);
      setError(err.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && !activity) {
      loadActivity();
    }
  };

  return { isExpanded, loading, activity, error, toggle };
}
