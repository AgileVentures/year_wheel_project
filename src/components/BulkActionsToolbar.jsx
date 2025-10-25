/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

function BulkActionsToolbar({ 
  selectedCount, 
  rings, 
  activityGroups,
  onMoveToRing, 
  onChangeActivityGroup, 
  onDelete, 
  onClear 
}) {
  const { t } = useTranslation(['common']);
  const [showRingDropdown, setShowRingDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const ringDropdownRef = useRef(null);
  const activityDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ringDropdownRef.current && !ringDropdownRef.current.contains(event.target)) {
        setShowRingDropdown(false);
      }
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(event.target)) {
        setShowActivityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;
  
  const selectedText = selectedCount === 1 
    ? t('common:selection.selectedOne', { count: selectedCount })
    : t('common:selection.selected', { count: selectedCount });

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-sm shadow-2xl border border-blue-400 px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Selected count */}
          <div className="flex items-center gap-2 pr-4 border-r border-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="font-semibold">{selectedText}</span>
          </div>

          {/* Move to ring dropdown */}
          <div className="relative" ref={ringDropdownRef}>
            <button
              onClick={() => {
                setShowRingDropdown(!showRingDropdown);
                setShowActivityDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              {t('common:selection.moveToRing')}
            </button>
            
            {showRingDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-white rounded-sm shadow-xl border border-gray-200 py-1 min-w-[200px] max-h-60 overflow-y-auto">
                {rings.filter(r => r.visible).map(ring => (
                  <button
                    key={ring.id}
                    onClick={() => {
                      onMoveToRing(ring.id);
                      setShowRingDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {ring.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Change activity group dropdown */}
          <div className="relative" ref={activityDropdownRef}>
            <button
              onClick={() => {
                setShowActivityDropdown(!showActivityDropdown);
                setShowRingDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              {t('common:selection.changeActivityGroup')}
            </button>
            
            {showActivityDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-white rounded-sm shadow-xl border border-gray-200 py-1 min-w-[200px] max-h-60 overflow-y-auto">
                {activityGroups.filter(ag => ag.visible).map(activityGroup => (
                  <button
                    key={activityGroup.id}
                    onClick={() => {
                      onChangeActivityGroup(activityGroup.id);
                      setShowActivityDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: activityGroup.color }}
                    />
                    {activityGroup.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('common:selection.deleteAll')}
          </button>

          {/* Clear selection */}
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
            title={t('common:selection.clearSelection')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkActionsToolbar;
