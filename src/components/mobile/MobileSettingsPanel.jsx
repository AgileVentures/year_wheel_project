import { memo, useState, useEffect, useRef } from 'react';
import { X, Presentation, ChevronRight, Eye, EyeOff, Palette, Type, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * MobileSettingsPanel - Slide-up settings panel for mobile editor
 * 
 * Features:
 * - Title editing
 * - Color palette selection
 * - Ring visibility toggles
 * - Display options (week ring, labels, etc.)
 * - Link to presentation mode
 */
function MobileSettingsPanel({
  isOpen,
  onClose,
  title,
  onTitleChange,
  colors,
  onColorsChange,
  showRingNames,
  onShowRingNamesChange,
  showLabels,
  onShowLabelsChange,
  showWeekRing,
  onShowWeekRingChange,
  showMonthRing,
  onShowMonthRingChange,
  weekRingDisplayMode,
  onWeekRingDisplayModeChange,
  wheelStructure,
  onOrganizationChange,
  onOpenPresentation,
}) {
  const { t } = useTranslation(['common', 'editor']);
  const panelRef = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  
  // Predefined color palettes
  const colorPalettes = [
    { name: 'Klassisk', colors: ['#F5E6D3', '#A8DCD1', '#F4A896', '#B8D4E8'] },
    { name: 'Skog', colors: ['#2D5016', '#4A7C23', '#8BC34A', '#C5E1A5'] },
    { name: 'Hav', colors: ['#006064', '#00838F', '#00ACC1', '#80DEEA'] },
    { name: 'Solnedgång', colors: ['#BF360C', '#E64A19', '#FF7043', '#FFAB91'] },
    { name: 'Lavendel', colors: ['#4A148C', '#7B1FA2', '#AB47BC', '#CE93D8'] },
    { name: 'Monokrom', colors: ['#212121', '#616161', '#9E9E9E', '#E0E0E0'] },
  ];
  
  // Update title draft when title prop changes
  useEffect(() => {
    setTitleDraft(title);
  }, [title]);
  
  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Save title and exit edit mode
  const handleSaveTitle = () => {
    onTitleChange && onTitleChange(titleDraft);
    setEditingTitle(false);
  };
  
  // Toggle ring visibility
  const handleToggleRing = (ringId) => {
    if (!wheelStructure || !onOrganizationChange) return;
    
    const updatedRings = wheelStructure.rings.map(ring =>
      ring.id === ringId ? { ...ring, visible: !ring.visible } : ring
    );
    
    onOrganizationChange({
      ...wheelStructure,
      rings: updatedRings,
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={handleBackdropClick}
    >
      <div 
        ref={panelRef}
        className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('common:settings', { defaultValue: 'Inställningar' })}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-full transition-colors"
            aria-label={t('common:close', { defaultValue: 'Stäng' })}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-56px)] pb-safe">
          {/* Title Section */}
          <div className="px-4 py-4 border-b border-gray-100">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {t('common:wheelTitle', { defaultValue: 'Titel' })}
            </label>
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitleDraft(title);
                      setEditingTitle(false);
                    }
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 bg-teal-500 text-white rounded-sm hover:bg-teal-600 active:bg-teal-700 transition-colors"
                >
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-sm transition-colors text-left"
              >
                <span className="text-gray-900">{title || t('common:newWheel', { defaultValue: 'Nytt hjul' })}</span>
                <Type size={18} className="text-gray-400" />
              </button>
            )}
          </div>
          
          {/* Color Palettes */}
          <div className="px-4 py-4 border-b border-gray-100">
            <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
              <Palette size={16} />
              {t('editor:colorPalette', { defaultValue: 'Färgpalett' })}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {colorPalettes.map((palette, idx) => {
                const isSelected = JSON.stringify(colors) === JSON.stringify(palette.colors);
                return (
                  <button
                    key={idx}
                    onClick={() => onColorsChange && onColorsChange(palette.colors)}
                    className={`p-2 rounded-sm border-2 transition-all ${
                      isSelected 
                        ? 'border-teal-500 bg-teal-50' 
                        : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                    }`}
                  >
                    <div className="flex gap-0.5 mb-1">
                      {palette.colors.map((color, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex-1 h-6 first:rounded-l last:rounded-r"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">{palette.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Display Options */}
          <div className="px-4 py-4 border-b border-gray-100">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              {t('editor:displayOptions', { defaultValue: 'Visningsalternativ' })}
            </label>
            <div className="space-y-2">
              <ToggleRow
                label={t('editor:showWeekRing', { defaultValue: 'Visa veckonummer' })}
                checked={showWeekRing}
                onChange={onShowWeekRingChange}
              />
              <ToggleRow
                label={t('editor:showMonthRing', { defaultValue: 'Visa månadsring' })}
                checked={showMonthRing}
                onChange={onShowMonthRingChange}
              />
              <ToggleRow
                label={t('editor:showRingNames', { defaultValue: 'Visa ringnamn' })}
                checked={showRingNames}
                onChange={onShowRingNamesChange}
              />
              <ToggleRow
                label={t('editor:showLabels', { defaultValue: 'Visa etiketter' })}
                checked={showLabels}
                onChange={onShowLabelsChange}
              />
            </div>
          </div>
          
          {/* Ring Visibility */}
          {wheelStructure?.rings?.length > 0 && (
            <div className="px-4 py-4 border-b border-gray-100">
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                {t('editor:rings', { defaultValue: 'Ringar' })}
              </label>
              <div className="space-y-2">
                {wheelStructure.rings.map((ring) => (
                  <button
                    key={ring.id}
                    onClick={() => handleToggleRing(ring.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-sm transition-colors"
                  >
                    <span className={ring.visible ? 'text-gray-900' : 'text-gray-400'}>
                      {ring.name}
                    </span>
                    {ring.visible ? (
                      <Eye size={18} className="text-teal-600" />
                    ) : (
                      <EyeOff size={18} className="text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Presentation Mode Link */}
          <div className="px-4 py-4">
            <button
              onClick={onOpenPresentation}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 active:from-teal-700 active:to-teal-800 text-white rounded-sm transition-colors"
            >
              <div className="flex items-center gap-3">
                <Presentation size={20} />
                <span className="font-medium">
                  {t('common:presentationMode', { defaultValue: 'Presentationsläge' })}
                </span>
              </div>
              <ChevronRight size={20} />
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t('editor:presentationModeDescription', { defaultValue: 'Visa och casta hjulet till en stor skärm' })}
            </p>
          </div>
        </div>
      </div>
      
      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
}

// Toggle Row Component
function ToggleRow({ label, checked, onChange }) {
  return (
    <button
      onClick={() => onChange && onChange(!checked)}
      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-sm transition-colors"
    >
      <span className="text-gray-900">{label}</span>
      <div
        className={`w-11 h-6 rounded-full transition-colors relative ${
          checked ? 'bg-teal-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
    </button>
  );
}

export default memo(MobileSettingsPanel);
