import { useState, useCallback, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileSettingsPanel from './MobileSettingsPanel';
import MobileWheelViewer from './MobileWheelViewer';
import ListView from '../list_view/ListView';
import AddItemModal from '../AddItemModal';
import Toast from '../Toast';

/**
 * MobileEditor - Mobile-optimized wheel editor
 * 
 * Features:
 * - List view as default (optimized for narrow screens)
 * - Bottom navigation bar for primary actions
 * - Slide-up panels for settings
 * - Full-screen wheel viewer with cast support
 */
function MobileEditor({
  wheelId,
  wheelData,
  wheelState,
  setWheelState,
  wheelStructure,
  setWheelStructure,
  title,
  setTitle,
  year,
  colors,
  setColors,
  pages,
  currentPageId,
  currentPage,
  onPageChange,
  onAddPage,
  showRingNames,
  setShowRingNames,
  showLabels,
  setShowLabels,
  showWeekRing,
  setShowWeekRing,
  showMonthRing,
  setShowMonthRing,
  weekRingDisplayMode,
  setWeekRingDisplayMode,
  // Item handlers
  onAddItems,
  onUpdateItem,
  onDeleteItem,
  // Save/load handlers
  onSave,
  isSaving,
  hasUnsavedChanges,
  // Navigation
  onBackToDashboard,
  // Premium features
  isPremium,
  // All items for cross-year support
  allItems,
}) {
  const { t, i18n } = useTranslation(['common', 'editor']);
  const navigate = useNavigate();
  
  // UI State
  const [activePanel, setActivePanel] = useState(null); // null, 'settings', 'wheel', 'add'
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemRingId, setAddItemRingId] = useState(null);
  
  // Get visible rings for add item dropdown
  const visibleRings = useMemo(() => {
    return (wheelStructure?.rings || []).filter(r => r.visible);
  }, [wheelStructure?.rings]);
  
  // Default to first ring when opening add modal
  const handleOpenAddItem = useCallback((ringId = null) => {
    const targetRingId = ringId || visibleRings[0]?.id;
    setAddItemRingId(targetRingId);
    setShowAddItemModal(true);
  }, [visibleRings]);
  
  // Handle adding items
  const handleAddItemsFromModal = useCallback((items) => {
    if (onAddItems) {
      onAddItems(items);
    }
    setShowAddItemModal(false);
  }, [onAddItems]);
  
  // Navigate to presentation/cast mode
  const handleOpenPresentation = useCallback(() => {
    if (wheelId) {
      navigate(`/preview-wheel/${wheelId}?presentation=true`);
    }
  }, [wheelId, navigate]);
  
  // Navigate to item on wheel (show wheel viewer)
  const handleNavigateToItemOnWheel = useCallback((itemId) => {
    setActivePanel('wheel');
    // TODO: Could scroll/highlight the item on the wheel
  }, []);
  
  // Build wheel structure for ListView with all items from all pages
  const listViewWheelStructure = useMemo(() => {
    return {
      ...wheelStructure,
      items: allItems || wheelStructure?.items || [],
    };
  }, [wheelStructure, allItems]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile Header */}
      <MobileHeader
        title={title}
        year={currentPage?.year || year}
        onBack={onBackToDashboard}
        hasUnsavedChanges={hasUnsavedChanges}
        pages={pages}
        currentPageId={currentPageId}
        onPageChange={onPageChange}
      />
      
      {/* Main Content Area - List View */}
      <div className="flex-1 overflow-auto pb-20">
        <ListView
          wheelStructure={listViewWheelStructure}
          year={currentPage?.year || year}
          pages={pages}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onAddItems={onAddItems}
          onOrganizationChange={setWheelStructure}
          onNavigateToItemOnWheel={handleNavigateToItemOnWheel}
          currentWheelId={wheelId}
          currentPageId={currentPageId}
        />
      </div>
      
      {/* Bottom Navigation */}
      <MobileBottomNav
        onHome={onBackToDashboard}
        onAdd={handleOpenAddItem}
        onSettings={() => setActivePanel('settings')}
        onViewWheel={() => setActivePanel('wheel')}
        onSave={onSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      
      {/* Settings Panel (slide-up) */}
      <MobileSettingsPanel
        isOpen={activePanel === 'settings'}
        onClose={() => setActivePanel(null)}
        title={title}
        onTitleChange={setTitle}
        colors={colors}
        onColorsChange={setColors}
        showRingNames={showRingNames}
        onShowRingNamesChange={setShowRingNames}
        showLabels={showLabels}
        onShowLabelsChange={setShowLabels}
        showWeekRing={showWeekRing}
        onShowWeekRingChange={setShowWeekRing}
        showMonthRing={showMonthRing}
        onShowMonthRingChange={setShowMonthRing}
        weekRingDisplayMode={weekRingDisplayMode}
        onWeekRingDisplayModeChange={setWeekRingDisplayMode}
        wheelStructure={wheelStructure}
        onOrganizationChange={setWheelStructure}
        onOpenPresentation={handleOpenPresentation}
      />
      
      {/* Wheel Viewer (full-screen overlay) */}
      <MobileWheelViewer
        isOpen={activePanel === 'wheel'}
        onClose={() => setActivePanel(null)}
        wheelId={wheelId}
        wheelData={wheelData}
        title={title}
        year={currentPage?.year || year}
        colors={colors}
        wheelStructure={wheelStructure}
        allItems={allItems}
        showWeekRing={showWeekRing}
        showMonthRing={showMonthRing}
        showRingNames={showRingNames}
        showLabels={showLabels}
        weekRingDisplayMode={weekRingDisplayMode}
        onOpenPresentation={handleOpenPresentation}
      />
      
      {/* Add Item Modal */}
      {showAddItemModal && (
        <AddItemModal
          wheelStructure={wheelStructure}
          onAddItem={handleAddItemsFromModal}
          onClose={() => setShowAddItemModal(false)}
          currentWheelId={wheelId}
          currentPageId={currentPageId}
          pages={pages}
          year={currentPage?.year || year}
          preselectedRingId={addItemRingId}
        />
      )}
      
      <Toast />
    </div>
  );
}

export default MobileEditor;
