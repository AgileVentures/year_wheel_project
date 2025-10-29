import React, { useState, useRef, useEffect } from 'react';
import { History, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getHistoryLabel } from '../constants/historyChangeTypes';

/**
 * UndoHistoryMenu Component
 * 
 * Displays a dropdown menu with the last 10 actions
 * Allows clicking to jump to any point in history
 * 
 * @param {Array} history - Full history array from useUndoRedo
 * @param {number} currentIndex - Current position in history
 * @param {Function} jumpToIndex - Function to jump to a specific index
 * @param {Function} undo - Undo function
 * @param {Function} redo - Redo function
 * @param {boolean} canUndo - Whether undo is available
 * @param {boolean} canRedo - Whether redo is available
 */
export default function UndoHistoryMenu({ 
  history, 
  currentIndex, 
  jumpToIndex,
  undo,
  redo,
  canUndo,
  canRedo
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Get the last 10 actions for display
  const getRecentHistory = () => {
    if (!history || history.length === 0) return [];
    
    // Filter out "Start" entries - they're just placeholders
    const filteredHistory = history.filter(entry => entry.label !== 'Start');
    if (filteredHistory.length === 0) return [];
    
    // Find current index in filtered history
    const currentEntry = history[currentIndex];
    const filteredCurrentIndex = filteredHistory.findIndex(e => e === currentEntry);
    
    // Show up to 10 entries centered around current position
    // Show more past items than future items (e.g., 7 past, current, 2 future)
    const pastItems = 7;
    const futureItems = 2;
    
    let startIdx = Math.max(0, filteredCurrentIndex - pastItems);
    let endIdx = Math.min(filteredHistory.length, filteredCurrentIndex + futureItems + 1);
    
    // If we don't have enough future items, show more past items
    if (endIdx - filteredCurrentIndex < futureItems + 1) {
      startIdx = Math.max(0, endIdx - 10);
    }
    
    // If we don't have enough past items, show more future items
    if (filteredCurrentIndex - startIdx < pastItems) {
      endIdx = Math.min(filteredHistory.length, startIdx + 10);
    }
    
    return filteredHistory.slice(startIdx, endIdx).map((entry, idx) => {
      // Find the original index in the full history
      const originalIndex = history.indexOf(entry);
      return {
        ...entry,
        absoluteIndex: originalIndex,
        isCurrent: originalIndex === currentIndex,
        isPast: originalIndex < currentIndex,
        isFuture: originalIndex > currentIndex
      };
    });
  };

  const recentHistory = getRecentHistory();

  const handleJumpTo = (index) => {
    jumpToIndex(index);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* History Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-2 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors group relative"
        title={t('common:actions.history', { defaultValue: 'Historik' })}
      >
        <History size={14} />
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        
        {/* Tooltip */}
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {t('common:actions.viewHistory', { defaultValue: 'Visa historik' })}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-sm shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <p className="text-xs font-medium text-gray-600">
              {t('common:actions.recentActions', { defaultValue: 'Senaste åtgärder' })}
            </p>
          </div>
          
          {recentHistory.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {t('common:actions.noHistory', { defaultValue: 'Ingen historik ännu' })}
            </div>
          ) : (
            <div className="py-1">
              {recentHistory.map((entry) => (
                <button
                  key={entry.absoluteIndex}
                  onClick={() => handleJumpTo(entry.absoluteIndex)}
                  className={`
                    w-full text-left px-3 py-2 text-sm transition-colors
                    ${entry.isCurrent 
                      ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500 cursor-default' 
                      : entry.isPast
                        ? 'text-gray-700 hover:bg-blue-50 cursor-pointer border-l-2 border-transparent hover:border-blue-300'
                        : 'text-gray-400 hover:bg-gray-50 cursor-pointer border-l-2 border-transparent'
                    }
                  `}
                  disabled={entry.isCurrent}
                  title={
                    entry.isCurrent 
                      ? t('common:history.currentPosition', { defaultValue: 'Nuvarande position' })
                      : entry.isPast 
                        ? t('common:history.clickToUndo', { defaultValue: 'Klicka för att ångra till här' })
                        : t('common:history.clickToRedo', { defaultValue: 'Klicka för att gör om till här' })
                  }
                >
                  <div className="flex items-center gap-2">
                    {entry.isPast && <span className="text-gray-400">←</span>}
                    {entry.isFuture && <span className="text-gray-400">→</span>}
                    <span className="truncate flex-1">
                      {getHistoryLabel(t, entry.label) || t('common:actions.unknownAction', { defaultValue: 'Okänd åtgärd' })}
                    </span>
                    {entry.isCurrent && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">
                        ●
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Quick Actions Footer */}
          {recentHistory.length > 0 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50 flex gap-2">
              <button
                onClick={() => { undo(); setIsOpen(false); }}
                disabled={!canUndo}
                className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← {t('common:actions.undo', { defaultValue: 'Ångra' })}
              </button>
              <button
                onClick={() => { redo(); setIsOpen(false); }}
                disabled={!canRedo}
                className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('common:actions.redo', { defaultValue: 'Gör om' })} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
