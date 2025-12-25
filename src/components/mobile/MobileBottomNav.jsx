import { memo } from 'react';
import { Home, Plus, Settings, Eye, Save, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * MobileBottomNav - Bottom navigation bar for mobile editor
 * 
 * Fixed at bottom of screen with primary actions:
 * - Home: Go back to dashboard
 * - View Wheel: Open wheel viewer overlay
 * - Add: Open add item modal (center, prominent)
 * - Settings: Open settings panel
 * - Save: Save changes
 */
function MobileBottomNav({
  onHome,
  onAdd,
  onSettings,
  onViewWheel,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
}) {
  const { t } = useTranslation(['common']);
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-40 safe-area-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home */}
        <button
          onClick={onHome}
          className="flex flex-col items-center justify-center p-2 min-w-[56px] text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg transition-colors"
          aria-label={t('common:navigation.home', { defaultValue: 'Hem' })}
        >
          <Home size={24} />
          <span className="text-xs mt-1">{t('common:navigation.home', { defaultValue: 'Hem' })}</span>
        </button>
        
        {/* View Wheel */}
        <button
          onClick={onViewWheel}
          className="flex flex-col items-center justify-center p-2 min-w-[56px] text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg transition-colors"
          aria-label={t('common:viewWheel', { defaultValue: 'Visa hjul' })}
        >
          <Eye size={24} />
          <span className="text-xs mt-1">{t('common:wheel', { defaultValue: 'Hjul' })}</span>
        </button>
        
        {/* Add (center, prominent) */}
        <button
          onClick={onAdd}
          className="flex items-center justify-center w-14 h-14 -mt-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white rounded-full shadow-lg transition-colors"
          aria-label={t('common:addActivity', { defaultValue: 'Lägg till aktivitet' })}
        >
          <Plus size={28} />
        </button>
        
        {/* Settings */}
        <button
          onClick={onSettings}
          className="flex flex-col items-center justify-center p-2 min-w-[56px] text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-lg transition-colors"
          aria-label={t('common:settings', { defaultValue: 'Inställningar' })}
        >
          <Settings size={24} />
          <span className="text-xs mt-1">{t('common:settings', { defaultValue: 'Inst.' })}</span>
        </button>
        
        {/* Save */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`flex flex-col items-center justify-center p-2 min-w-[56px] rounded-lg transition-colors relative ${
            hasUnsavedChanges 
              ? 'text-teal-600 hover:text-teal-700' 
              : 'text-gray-600 hover:text-gray-900'
          } ${isSaving ? 'opacity-50' : ''} active:bg-gray-100`}
          aria-label={t('common:save', { defaultValue: 'Spara' })}
        >
          {isSaving ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <>
              <Save size={24} />
              {hasUnsavedChanges && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </>
          )}
          <span className="text-xs mt-1">{t('common:save', { defaultValue: 'Spara' })}</span>
        </button>
      </div>
    </nav>
  );
}

export default memo(MobileBottomNav);
