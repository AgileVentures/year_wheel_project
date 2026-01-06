/**
 * ConflictResolutionModal
 * 
 * Displays when remote changes from collaborators conflict with local changes.
 * Allows user to choose how to resolve: keep local, accept remote, or view details.
 * 
 * This is part of the optimistic update system for real-time collaboration.
 */

import { useState } from 'react';
import { X, AlertTriangle, Users, Clock, ArrowRight, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Format a conflict for display
 */
function formatConflict(conflict, t) {
  const tableNames = {
    wheel_rings: t('conflict:tables.rings', 'Ringar'),
    activity_groups: t('conflict:tables.activityGroups', 'Aktivitetsgrupper'),
    labels: t('conflict:tables.labels', 'Etiketter'),
    items: t('conflict:tables.items', 'Aktiviteter')
  };
  
  const actionNames = {
    add: t('conflict:actions.add', 'lade till'),
    modify: t('conflict:actions.modify', 'ändrade'),
    delete: t('conflict:actions.delete', 'tog bort'),
    insert: t('conflict:actions.add', 'lade till'),
    update: t('conflict:actions.modify', 'ändrade')
  };
  
  return {
    tableName: tableNames[conflict.table] || conflict.table,
    localAction: actionNames[conflict.localAction] || conflict.localAction,
    remoteAction: actionNames[conflict.remoteAction] || conflict.remoteAction,
    entityName: conflict.localData?.name || conflict.remoteData?.name || conflict.entityId?.substring(0, 8)
  };
}

/**
 * ConflictDetailRow - Shows one conflicting change
 */
function ConflictDetailRow({ conflict, isExpanded, onToggle, t }) {
  const formatted = formatConflict(conflict, t);
  
  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-sm overflow-hidden">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
            {formatted.tableName}
          </span>
          <span className="text-gray-700 dark:text-gray-300">
            "{formatted.entityName}"
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <EyeOff className="w-4 h-4 text-gray-500" />
          ) : (
            <Eye className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="p-3 bg-white dark:bg-gray-800 space-y-3">
          {/* Local change */}
          <div className="flex items-start gap-3">
            <div className="w-20 flex-shrink-0">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                {t('conflict:yourChange', 'Du')}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {formatted.localAction} "{formatted.entityName}"
              </p>
              {conflict.localData && (
                <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                  {JSON.stringify(conflict.localData, null, 2)}
                </pre>
              )}
            </div>
          </div>
          
          {/* Remote change */}
          <div className="flex items-start gap-3">
            <div className="w-20 flex-shrink-0">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">
                {t('conflict:theirChange', 'Annan')}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {formatted.remoteAction} "{formatted.entityName}"
              </p>
              {conflict.remoteData && (
                <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                  {JSON.stringify(conflict.remoteData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main ConflictResolutionModal component
 */
function ConflictResolutionModal({
  conflicts = [],
  onResolve,
  onClose
}) {
  const { t } = useTranslation(['common', 'conflict']);
  const [expandedConflicts, setExpandedConflicts] = useState(new Set());
  const [isResolving, setIsResolving] = useState(false);
  
  const toggleConflict = (index) => {
    setExpandedConflicts(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  
  const handleResolve = async (resolution) => {
    setIsResolving(true);
    try {
      await onResolve(resolution);
      onClose();
    } catch (error) {
      console.error('[ConflictResolution] Failed to resolve:', error);
    } finally {
      setIsResolving(false);
    }
  };
  
  if (conflicts.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-sm shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('conflict:title', 'Ändringar i konflikt')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('conflict:subtitle', 'Andra har gjort ändringar medan du redigerade')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-sm">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">
                {t('conflict:info.title', 'Samarbetskonflikt upptäckt')}
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                {t('conflict:info.description', 
                  'Dina ändringar har sparats, men en teammedlem har gjort ändringar på samma objekt. Välj hur du vill hantera detta.'
                )}
              </p>
            </div>
          </div>
          
          {/* Conflict list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('conflict:conflictCount', { count: conflicts.length }, `${conflicts.length} konflikt(er)`)}
            </h3>
            
            {conflicts.map((conflict, index) => (
              <ConflictDetailRow
                key={`${conflict.table}-${conflict.entityId}`}
                conflict={conflict}
                isExpanded={expandedConflicts.has(index)}
                onToggle={() => toggleConflict(index)}
                t={t}
              />
            ))}
          </div>
        </div>
        
        {/* Footer with resolution options */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Keep local (your changes) */}
            <button
              onClick={() => handleResolve('local')}
              disabled={isResolving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              {t('conflict:keepMine', 'Behåll mina ändringar')}
            </button>
            
            {/* Accept remote (their changes) */}
            <button
              onClick={() => handleResolve('remote')}
              disabled={isResolving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('conflict:acceptTheirs', 'Ladda om med deras ändringar')}
            </button>
          </div>
          
          <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
            {t('conflict:hint', 
              '"Behåll mina" bevarar dina ändringar. "Ladda om" hämtar den senaste versionen från servern.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionModal;
