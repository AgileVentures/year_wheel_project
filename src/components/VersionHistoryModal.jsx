import { useState, useEffect, useRef } from 'react';
import { X, History, User, Clock, RotateCcw, Eye, Trash2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listVersions, restoreVersion, deleteVersion, getVersion } from '../services/wheelService';
import { showConfirmDialog, showToast } from '../utils/dialogs';
import YearWheel from '../YearWheel';

/**
 * VersionHistoryModal - Beautiful UI for viewing and restoring wheel versions
 * 
 * Features:
 * - Timeline view of all versions
 * - User avatars and timestamps
 * - Preview version in read-only mode
 * - Restore with confirmation
 * - Delete old versions
 */
export default function VersionHistoryModal({ wheelId, onRestore, onClose }) {
  const { t, i18n } = useTranslation(['editor']);
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadVersions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listVersions(wheelId);
      setVersions(data);
    } catch (err) {
      console.error('Error loading versions:', err);
      setError(t('editor:versionHistory.error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelId]);

  const handleRestore = async (version) => {
    const confirmed = await showConfirmDialog({
      title: t('editor:versionHistory.restoreTitle', { number: version.version_number }),
      message: t('editor:versionHistory.restoreMessage'),
      confirmText: 'OK',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-purple-600 hover:bg-purple-700 text-white'
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsRestoring(true);
      const { data } = await restoreVersion(wheelId, version.id);
      
      // Call parent's restore handler
      await onRestore(data);
      
      // Show success message
      showToast(t('editor:versionHistory.restored', { number: version.version_number }), 'success');
      
      onClose();
    } catch (err) {
      console.error('Error restoring version:', err);
      showToast(t('editor:versionHistory.restoreError'), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePreview = async (version) => {
    try {
      const fullVersion = await getVersion(version.id);
      setPreviewVersion(fullVersion);
    } catch (err) {
      console.error('Error loading version preview:', err);
      showToast(t('editor:versionHistory.previewError'), 'error');
    }
  };

  const handleDelete = async (version) => {
    const confirmed = await showConfirmDialog({
      title: t('editor:versionHistory.deleteTitle'),
      message: t('editor:versionHistory.deleteConfirm', { number: version.version_number }),
      confirmText: t('common:actions.delete'),
      cancelText: t('common:actions.cancel'),
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteVersion(version.id);
      setVersions(versions.filter(v => v.id !== version.id));
      
      showToast(t('editor:versionHistory.deleted'), 'success');
    } catch (err) {
      console.error('Error deleting version:', err);
      showToast(t('editor:versionHistory.deleteError'), 'error');
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('editor:versionHistory.justNow');
    if (diffMins < 60) return t('editor:versionHistory.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('editor:versionHistory.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('editor:versionHistory.daysAgo', { count: diffDays });
    
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserInitials = (user) => {
    if (!user || !user.full_name) return '?';
    const names = user.full_name.split(' ');
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <div 
      data-testid="version-history-modal" 
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-sm">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('editor:versionHistory.title')}</h2>
              <p className="text-sm text-gray-500">
                {t('editor:versionHistory.versionsSaved', { count: versions.length })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-gray-600">{error}</p>
              <button
                onClick={loadVersions}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
              >
                {t('editor:versionHistory.retryButton')}
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-600">{t('editor:versionHistory.noVersions')}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t('editor:versionHistory.noVersionsDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="group relative border border-gray-200 rounded-sm p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Timeline connector */}
                  {index < versions.length - 1 && (
                    <div className="absolute left-8 top-16 bottom-0 w-px bg-gradient-to-b from-gray-300 to-transparent"></div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* User avatar */}
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg">
                        {getUserInitials(version.user)}
                      </div>
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>

                    {/* Version info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {t('editor:versionHistory.version', { number: version.version_number })}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                {t('editor:versionHistory.latest')}
                              </span>
                            )}
                            {version.is_auto_save && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                {t('editor:versionHistory.autoSaved')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {version.user?.full_name || t('editor:versionHistory.unknownUser')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTimestamp(version.created_at)}
                            </span>
                          </div>
                          {version.change_description && (
                            <p className="text-sm text-gray-700 mt-2 italic">
                              "{version.change_description}"
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handlePreview(version)}
                            className="p-2 hover:bg-blue-50 rounded-sm transition-colors"
                            title={t('editor:versionHistory.previewTooltip')}
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          {index !== 0 && (
                            <>
                              <button
                                onClick={() => handleRestore(version)}
                                disabled={isRestoring}
                                className="p-2 hover:bg-green-50 rounded-sm transition-colors disabled:opacity-50"
                                title={t('editor:versionHistory.restoreTooltip')}
                              >
                                <RotateCcw className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(version)}
                                className="p-2 hover:bg-red-50 rounded-sm transition-colors"
                                title={t('editor:versionHistory.deleteTooltip')}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>{t('editor:versionHistory.footerInfo')}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-sm transition-colors font-medium"
            >
              {t('editor:versionHistory.closeButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewVersion && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('editor:versionHistory.previewTitle', { number: previewVersion.version_number })}
              </h3>
              <button
                onClick={() => setPreviewVersion(null)}
                className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50 flex items-center justify-center">
              <div className="bg-white rounded-sm p-4 border border-gray-200 shadow-lg">
                <YearWheel
                  wheelStructure={previewVersion.snapshot_data?.wheelStructure || previewVersion.snapshot_data}
                  year={previewVersion.snapshot_data?.year || new Date().getFullYear()}
                  colors={previewVersion.snapshot_data?.colors || ['#FE6D73', '#17C3B2', '#227C9D', '#FFCB77', '#FEF9EF']}
                  showWeekRing={previewVersion.snapshot_data?.showWeekRing ?? true}
                  showMonthRing={previewVersion.snapshot_data?.showMonthRing ?? true}
                  showRingNames={previewVersion.snapshot_data?.showRingNames ?? true}
                  weekRingDisplayMode={previewVersion.snapshot_data?.weekRingDisplayMode || 'week-numbers'}
                  showLabels={previewVersion.snapshot_data?.showLabels ?? true}
                  size={600}
                  readOnly={true}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setPreviewVersion(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              >
                {t('editor:versionHistory.closeButton')}
              </button>
              <button
                onClick={() => {
                  setPreviewVersion(null);
                  handleRestore(previewVersion);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t('editor:versionHistory.restoreButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRestoring && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm cursor-wait">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-700" aria-live="assertive">
            {t('editor:versionHistory.restoringInProgress')}
          </p>
        </div>
      )}
    </div>
  );
}
