import { Users } from 'lucide-react';
import { useState } from 'react';

/**
 * Shows active users viewing/editing the current wheel
 * Displays user avatars with tooltip on hover
 */
function PresenceIndicator({ activeUsers = [] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div 
      className="relative flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-sm"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Users size={16} className="text-green-600" />
      <span className="text-sm font-medium text-green-700">
        {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'personer'} online
      </span>

      {/* Tooltip with user list */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-sm shadow-lg z-50 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">
              Aktiva användare
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {activeUsers.map((user, index) => {
              const initial = user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
              const displayName = user.name || user.email?.split('@')[0] || 'Anonym';
              const joinedTime = user.joined_at ? new Date(user.joined_at).toLocaleTimeString('sv-SE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : '';

              return (
                <div 
                  key={user.user_id || index} 
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                    {initial}
                  </div>
                  
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {joinedTime && (
                      <span className="text-xs text-gray-500">{joinedTime}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default PresenceIndicator;
