import { X, Keyboard } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

function KeyboardShortcutsModal({ isOpen, onClose }) {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    {
      category: t('shortcuts.categorySave', 'Spara'),
      items: [
        { keys: [modKey, 'S'], action: t('shortcuts.quickSave', 'Snabbspara') },
        { keys: [modKey, '⇧', 'S'], action: t('shortcuts.checkpoint', 'Skapa checkpoint') },
      ]
    },
    {
      category: t('shortcuts.categoryUndoRedo', 'Ångra / Gör om'),
      items: [
        { keys: [modKey, 'Z'], action: t('shortcuts.undo', 'Ångra') },
        { keys: [modKey, '⇧', 'Z'], action: t('shortcuts.redo', 'Gör om') },
        { keys: [modKey, 'Y'], action: t('shortcuts.redoAlt', 'Gör om (alternativ)') },
      ]
    },
    {
      category: t('shortcuts.categoryNavigation', 'Navigation'),
      items: [
        { keys: ['Esc'], action: t('shortcuts.closePanel', 'Stäng panel / avbryt') },
        { keys: ['?'], action: t('shortcuts.toggleShortcuts', 'Visa / dölj tangentbordsgenvägar') },
      ]
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-900">
              {t('shortcuts.title', 'Tangentbordsgenvägar')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {shortcuts.map(({ category, items }) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
              <div className="space-y-2">
                {items.map(({ keys, action }) => (
                  <div key={action} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700">{action}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600">
                            {key}
                          </kbd>
                          {i < keys.length - 1 && <span className="text-gray-400 mx-0.5">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg text-center">
          <p className="text-xs text-gray-500">
            {t('shortcuts.hint', 'Tryck')} <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">?</kbd> {t('shortcuts.hintToggle', 'för att visa / dölja')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
