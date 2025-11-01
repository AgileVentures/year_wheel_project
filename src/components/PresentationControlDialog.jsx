import { useState, useRef, useEffect } from 'react';
import { X, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MonthNavigator from './MonthNavigator';
import QuarterNavigator from './QuarterNavigator';

/**
 * PresentationControlDialog - Movable dialog for controlling visibility in presentation mode
 * Allows toggling rings, activity groups, and labels while embedded in presentations
 */
function PresentationControlDialog({ 
  organizationData,
  onOrganizationChange,
  onClose,
  // View control props
  year,
  zoomedMonth,
  onZoomedMonthChange,
  zoomedQuarter,
  onZoomedQuarterChange
}) {
  const { t } = useTranslation(['editor', 'common']);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef(null);
  const isMobile = window.innerWidth < 768;
  
  const [expandedSections, setExpandedSections] = useState({
    innerRings: true,
    outerRings: true,
    activityGroups: true,
    labels: true,
    months: true,
    quarters: true
  });

  // Drag-and-drop state for reordering
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) {
      return; // Don't start drag if clicking on interactive elements
    }
    
    const rect = dialogRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep dialog within viewport bounds
      const maxX = window.innerWidth - (dialogRef.current?.offsetWidth || 300);
      const maxY = window.innerHeight - (dialogRef.current?.offsetHeight || 400);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleRing = (ringId) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, visible: !ring.visible } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const toggleActivityGroup = (groupId) => {
    const updatedGroups = (organizationData.activityGroups || []).map(group =>
      group.id === groupId ? { ...group, visible: !group.visible } : group
    );
    onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
  };

  const toggleLabel = (labelId) => {
    const updatedLabels = organizationData.labels.map(label =>
      label.id === labelId ? { ...label, visible: !label.visible } : label
    );
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  const toggleAllInSection = (type, show) => {
    if (type === 'rings') {
      const updatedRings = organizationData.rings.map(ring => ({
        ...ring,
        visible: show
      }));
      onOrganizationChange({ ...organizationData, rings: updatedRings });
    } else if (type === 'activityGroups') {
      const updatedGroups = (organizationData.activityGroups || []).map(group => ({
        ...group,
        visible: show
      }));
      onOrganizationChange({ ...organizationData, activityGroups: updatedGroups });
    } else if (type === 'labels') {
      const updatedLabels = organizationData.labels.map(label => ({
        ...label,
        visible: show
      }));
      onOrganizationChange({ ...organizationData, labels: updatedLabels });
    }
  };

  const innerRings = organizationData.rings.filter(ring => ring.type === 'inner');
  const outerRings = organizationData.rings.filter(ring => ring.type === 'outer');

  const countRingItems = (ringId) => {
    return organizationData.items?.filter(item => item.ringId === ringId).length || 0;
  };

  const countActivityGroupItems = (groupId) => {
    return organizationData.items?.filter(item => item.activityId === groupId).length || 0;
  };

  const countLabelItems = (labelId) => {
    return organizationData.items?.filter(item => item.labelId === labelId).length || 0;
  };

  // Handle drag start for reordering
  const handleDragStart = (e, item, type) => {
    setDraggedItem({ item, type });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, item, type) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Allow drag over if both are rings (inner or outer)
    if (draggedItem && 
        (draggedItem.type === 'innerRing' || draggedItem.type === 'outerRing') &&
        (type === 'innerRing' || type === 'outerRing')) {
      setDragOverItem({ item, type });
    }
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverItem) {
      const draggedType = draggedItem.type;
      const targetType = dragOverItem.type;
      
      // Allow dragging between inner and outer rings
      if ((draggedType === 'innerRing' || draggedType === 'outerRing') && 
          (targetType === 'innerRing' || targetType === 'outerRing')) {
        
        const rings = [...organizationData.rings];
        const draggedRing = rings.find(r => r.id === draggedItem.item.id);
        const targetRing = rings.find(r => r.id === dragOverItem.item.id);
        
        if (draggedRing && targetRing) {
          // If dragging to opposite section, change the ring type
          if (draggedType !== targetType) {
            const newType = targetType === 'innerRing' ? 'inner' : 'outer';
            draggedRing.type = newType;
          }
          
          // Reorder within the rings array
          const draggedIndex = rings.findIndex(r => r.id === draggedItem.item.id);
          const targetIndex = rings.findIndex(r => r.id === dragOverItem.item.id);
          
          if (draggedIndex !== -1 && targetIndex !== -1) {
            const [removed] = rings.splice(draggedIndex, 1);
            rings.splice(targetIndex, 0, removed);
            onOrganizationChange({ ...organizationData, rings });
          }
        }
      }
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  // Handle dropping on empty section zones
  const handleDropOnEmptyZone = (e, targetType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem || (!draggedItem.type.includes('Ring'))) {
      return;
    }

    const rings = [...organizationData.rings];
    const draggedRing = rings.find(r => r.id === draggedItem.item.id);
    
    if (draggedRing) {
      // Change the ring type
      draggedRing.type = targetType;
      
      // When converting to outer ring, ensure it has a color
      if (targetType === 'outer' && !draggedRing.color) {
        draggedRing.color = '#' + Math.floor(Math.random()*16777215).toString(16);
      }
      
      // When converting to inner ring, ensure it has data and orientation
      if (targetType === 'inner') {
        if (!draggedRing.data) {
          draggedRing.data = Array.from({ length: 12 }, () => [""]);
        }
        if (!draggedRing.orientation) {
          draggedRing.orientation = 'vertical';
        }
      }
      
      onOrganizationChange({ ...organizationData, rings });
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Handle drag over empty zone
  const handleDragOverEmptyZone = (e, targetType) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  // Mobile: Full-screen panel
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#00A4A6] to-[#2E9E97] text-white shadow-md">
          <h3 className="font-semibold text-lg">
            {t('editor:organizationPanel.presentationControls')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-sm transition-colors"
            title={t('common:actions.close')}
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Inner Rings Section */}
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <button
                onClick={() => toggleSection('innerRings')}
                className="no-drag w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.innerRings ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  <span className="font-semibold text-base">{t('editor:organizationPanel.innerRings')}</span>
                  <span className="text-sm text-gray-500">({innerRings.length})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', true); }}
                    className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', false); }}
                    className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={18} />
                  </button>
                </div>
              </button>
              
              {expandedSections.innerRings && (
                <div className="border-t border-gray-200 bg-white p-3 space-y-2">
                  {innerRings.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      {t('editor:rings.noInnerRings')}
                    </div>
                  ) : (
                    innerRings.map(ring => (
                      <label
                        key={ring.id}
                        className="no-drag flex items-center gap-3 p-3 hover:bg-gray-50 rounded-sm transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={ring.visible}
                          onChange={() => toggleRing(ring.id)}
                          className="no-drag w-5 h-5 rounded border-gray-300"
                        />
                        <span className="text-base flex-1">{ring.name}</span>
                        <span className="text-sm text-gray-400">({countRingItems(ring.id)})</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Outer Rings Section */}
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <button
                onClick={() => toggleSection('outerRings')}
                className="no-drag w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.outerRings ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  <span className="font-semibold text-base">{t('editor:organizationPanel.outerRings')}</span>
                  <span className="text-sm text-gray-500">({outerRings.length})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', true); }}
                    className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', false); }}
                    className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={18} />
                  </button>
                </div>
              </button>
              
              {expandedSections.outerRings && (
                <div className="border-t border-gray-200 bg-white p-3 space-y-2">
                  {outerRings.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      {t('editor:rings.noOuterRings')}
                    </div>
                  ) : (
                    outerRings.map(ring => (
                      <label
                        key={ring.id}
                        className="no-drag flex items-center gap-3 p-3 hover:bg-gray-50 rounded-sm transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={ring.visible}
                          onChange={() => toggleRing(ring.id)}
                          className="no-drag w-5 h-5 rounded border-gray-300"
                        />
                        <span className="text-base flex-1">{ring.name}</span>
                        <span className="text-sm text-gray-400">({countRingItems(ring.id)})</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Activity Groups Section */}
            {organizationData.activityGroups && organizationData.activityGroups.length > 0 && (
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <button
                  onClick={() => toggleSection('activityGroups')}
                  className="no-drag w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.activityGroups ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    <span className="font-semibold text-base">{t('editor:organizationPanel.activityGroups')}</span>
                    <span className="text-sm text-gray-500">({organizationData.activityGroups.length})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAllInSection('activityGroups', true); }}
                      className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                      title={t('common:actions.showAll')}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAllInSection('activityGroups', false); }}
                      className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                      title={t('common:actions.hideAll')}
                    >
                      <EyeOff size={18} />
                    </button>
                  </div>
                </button>
                
                {expandedSections.activityGroups && (
                  <div className="border-t border-gray-200 bg-white p-3 space-y-2">
                    {organizationData.activityGroups.map(group => (
                      <label
                        key={group.id}
                        className="no-drag flex items-center gap-3 p-3 hover:bg-gray-50 rounded-sm transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={group.visible}
                          onChange={() => toggleActivityGroup(group.id)}
                          className="no-drag w-5 h-5 rounded border-gray-300"
                        />
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-base flex-1">{group.name}</span>
                        <span className="text-sm text-gray-400">({countActivityGroupItems(group.id)})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Labels Section */}
            {organizationData.labels && organizationData.labels.length > 0 && (
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <button
                  onClick={() => toggleSection('labels')}
                  className="no-drag w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.labels ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    <span className="font-semibold text-base">{t('editor:organizationPanel.labels')}</span>
                    <span className="text-sm text-gray-500">({organizationData.labels.length})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAllInSection('labels', true); }}
                      className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                      title={t('common:actions.showAll')}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAllInSection('labels', false); }}
                      className="no-drag p-2 hover:bg-gray-200 rounded-sm"
                      title={t('common:actions.hideAll')}
                    >
                      <EyeOff size={18} />
                    </button>
                  </div>
                </button>
                
                {expandedSections.labels && (
                  <div className="border-t border-gray-200 bg-white p-3 space-y-2">
                    {organizationData.labels.map(label => (
                      <label
                        key={label.id}
                        className="no-drag flex items-center gap-3 p-3 hover:bg-gray-50 rounded-sm transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={label.visible}
                          onChange={() => toggleLabel(label.id)}
                          className="no-drag w-5 h-5 rounded border-gray-300"
                        />
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-base flex-1">{label.name}</span>
                        <span className="text-sm text-gray-400">({countLabelItems(label.id)})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Zoom Section - Months */}
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <button
                onClick={() => toggleSection('months')}
                className="no-drag w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.months ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  <span className="font-semibold text-base">{t('zoom:months.title', 'Månader')}</span>
                </div>
              </button>
              
              {expandedSections.months && (
                <div className="border-t border-gray-200 bg-white p-4">
                  <MonthNavigator
                    year={year}
                    currentMonth={zoomedMonth}
                    currentQuarter={zoomedQuarter}
                    organizationData={organizationData}
                    onMonthSelect={onZoomedMonthChange}
                    onQuarterSelect={onZoomedQuarterChange}
                    onResetZoom={() => {
                      if (onZoomedMonthChange) onZoomedMonthChange(null);
                      if (onZoomedQuarterChange) onZoomedQuarterChange(null);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Zoom Section - Quarters */}
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <button
                onClick={() => toggleSection('quarters')}
                className="no-drag w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.quarters ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  <span className="font-semibold text-base">{t('zoom:quarters.title', 'Kvartal')}</span>
                </div>
              </button>
              
              {expandedSections.quarters && (
                <div className="border-t border-gray-200 bg-white p-4">
                  <QuarterNavigator
                    year={year}
                    currentQuarter={zoomedQuarter}
                    currentMonth={zoomedMonth}
                    organizationData={organizationData}
                    onQuarterSelect={onZoomedQuarterChange}
                    onMonthSelect={onZoomedMonthChange}
                    onResetZoom={() => {
                      if (onZoomedMonthChange) onZoomedMonthChange(null);
                      if (onZoomedQuarterChange) onZoomedQuarterChange(null);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Draggable dialog
  return (
    <div
      ref={dialogRef}
      className="fixed bg-white rounded-sm shadow-2xl border-2 border-gray-300 z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '280px',
        maxHeight: '80vh',
        cursor: isDragging ? 'grabbing' : 'default',
        fontSize: '13px'
      }}
    >
      {/* Draggable Header */}
      <div
        className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1.5">
          <GripVertical size={16} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">
            {t('editor:organizationPanel.presentationControls')}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="no-drag p-0.5 hover:bg-gray-200 rounded transition-colors"
          title={t('common:actions.close')}
        >
          <X size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 45px)' }}>
        <div className="p-2 space-y-2">
          {/* Inner Rings Section */}
          <div className="border border-gray-200 rounded">
            <button
              onClick={() => toggleSection('innerRings')}
              className="no-drag w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {expandedSections.innerRings ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                <span className="font-medium text-xs">{t('editor:organizationPanel.innerRings')}</span>
                <span className="text-xs text-gray-500">({innerRings.length})</span>
              </div>
              <div className="flex gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', true); }}
                  className="no-drag p-0.5 hover:bg-gray-200 rounded"
                  title={t('common:actions.showAll')}
                >
                  <Eye size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', false); }}
                  className="no-drag p-0.5 hover:bg-gray-200 rounded"
                  title={t('common:actions.hideAll')}
                >
                  <EyeOff size={12} />
                </button>
              </div>
            </button>
            
            {expandedSections.innerRings && (
              <div className="border-t border-gray-200 p-1 space-y-0.5">
                {innerRings.length === 0 ? (
                  <div 
                    className="px-2 py-3 text-center border-2 border-dashed border-gray-200 rounded-sm bg-gray-50 transition-colors"
                    onDragOver={(e) => handleDragOverEmptyZone(e, 'inner')}
                    onDrop={(e) => handleDropOnEmptyZone(e, 'inner')}
                    style={{
                      backgroundColor: draggedItem?.type.includes('Ring') ? '#EFF6FF' : undefined,
                      borderColor: draggedItem?.type.includes('Ring') ? '#93C5FD' : undefined
                    }}
                  >
                    <p className="text-xs text-gray-500 mb-0.5">
                      {t('editor:rings.noInnerRings')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('editor:rings.dragHereOrAdd')}
                    </p>
                  </div>
                ) : (
                  innerRings.map(ring => {
                    const isDraggedOver = dragOverItem?.item.id === ring.id && 
                                         (dragOverItem?.type === 'innerRing' || dragOverItem?.type === 'outerRing');
                    return (
                      <div
                        key={ring.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ring, 'innerRing')}
                        onDragOver={(e) => handleDragOver(e, ring, 'innerRing')}
                        onDragEnd={handleDragEnd}
                        onDragLeave={handleDragLeave}
                        className={`no-drag flex items-center justify-between p-1.5 hover:bg-gray-50 rounded transition-colors cursor-move ${
                          isDraggedOver ? 'bg-blue-50 border-2 border-blue-300' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <GripVertical size={12} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="checkbox"
                            checked={ring.visible}
                            onChange={() => toggleRing(ring.id)}
                            className="no-drag flex-shrink-0"
                            style={{ width: '14px', height: '14px' }}
                          />
                          <span className="text-xs truncate">{ring.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">({countRingItems(ring.id)})</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Outer Rings Section */}
          <div className="border border-gray-200 rounded">
            <button
              onClick={() => toggleSection('outerRings')}
              className="no-drag w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {expandedSections.outerRings ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                <span className="font-medium text-xs">{t('editor:organizationPanel.outerRings')}</span>
                <span className="text-xs text-gray-500">({outerRings.length})</span>
              </div>
              <div className="flex gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', true); }}
                  className="no-drag p-0.5 hover:bg-gray-200 rounded"
                  title={t('common:actions.showAll')}
                >
                  <Eye size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', false); }}
                  className="no-drag p-0.5 hover:bg-gray-200 rounded"
                  title={t('common:actions.hideAll')}
                >
                  <EyeOff size={12} />
                </button>
              </div>
            </button>
            
            {expandedSections.outerRings && (
              <div className="border-t border-gray-200 p-1 space-y-0.5">
                {outerRings.length === 0 ? (
                  <div 
                    className="px-2 py-3 text-center border-2 border-dashed border-gray-200 rounded-sm bg-gray-50 transition-colors"
                    onDragOver={(e) => handleDragOverEmptyZone(e, 'outer')}
                    onDrop={(e) => handleDropOnEmptyZone(e, 'outer')}
                    style={{
                      backgroundColor: draggedItem?.type.includes('Ring') ? '#EFF6FF' : undefined,
                      borderColor: draggedItem?.type.includes('Ring') ? '#93C5FD' : undefined
                    }}
                  >
                    <p className="text-xs text-gray-500 mb-0.5">
                      {t('editor:rings.noOuterRings')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('editor:rings.dragHereOrAdd')}
                    </p>
                  </div>
                ) : (
                  outerRings.map(ring => {
                    const isDraggedOver = dragOverItem?.item.id === ring.id && 
                                         (dragOverItem?.type === 'innerRing' || dragOverItem?.type === 'outerRing');
                    return (
                      <div
                        key={ring.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ring, 'outerRing')}
                        onDragOver={(e) => handleDragOver(e, ring, 'outerRing')}
                        onDragEnd={handleDragEnd}
                        onDragLeave={handleDragLeave}
                        className={`no-drag flex items-center justify-between p-1.5 hover:bg-gray-50 rounded transition-colors cursor-move ${
                          isDraggedOver ? 'bg-blue-50 border-2 border-blue-300' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <GripVertical size={12} className="text-gray-400 flex-shrink-0" />
                          <input
                            type="checkbox"
                            checked={ring.visible}
                            onChange={() => toggleRing(ring.id)}
                            className="no-drag flex-shrink-0"
                            style={{ width: '14px', height: '14px' }}
                          />
                          <span className="text-xs truncate">{ring.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">({countRingItems(ring.id)})</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Activity Groups Section */}
          {organizationData.activityGroups && organizationData.activityGroups.length > 0 && (
            <div className="border border-gray-200 rounded">
              <button
                onClick={() => toggleSection('activityGroups')}
                className="no-drag w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {expandedSections.activityGroups ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span className="font-medium text-xs">{t('editor:organizationPanel.activityGroups')}</span>
                  <span className="text-xs text-gray-500">({organizationData.activityGroups.length})</span>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('activityGroups', true); }}
                    className="no-drag p-0.5 hover:bg-gray-200 rounded"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('activityGroups', false); }}
                    className="no-drag p-0.5 hover:bg-gray-200 rounded"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={12} />
                  </button>
                </div>
              </button>
              
              {expandedSections.activityGroups && (
                <div className="border-t border-gray-200 p-1 space-y-0.5">
                  {organizationData.activityGroups.map(group => (
                    <div
                      key={group.id}
                      className="no-drag flex items-center justify-between p-1.5 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={group.visible}
                          onChange={() => toggleActivityGroup(group.id)}
                          className="no-drag flex-shrink-0"
                          style={{ width: '14px', height: '14px' }}
                        />
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-xs truncate">{group.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">({countActivityGroupItems(group.id)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Labels Section */}
          {organizationData.labels && organizationData.labels.length > 0 && (
            <div className="border border-gray-200 rounded">
              <button
                onClick={() => toggleSection('labels')}
                className="no-drag w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {expandedSections.labels ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span className="font-medium text-xs">{t('editor:organizationPanel.labels')}</span>
                  <span className="text-xs text-gray-500">({organizationData.labels.length})</span>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('labels', true); }}
                    className="no-drag p-0.5 hover:bg-gray-200 rounded"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('labels', false); }}
                    className="no-drag p-0.5 hover:bg-gray-200 rounded"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={12} />
                  </button>
                </div>
              </button>
              
              {expandedSections.labels && (
                <div className="border-t border-gray-200 p-1 space-y-0.5">
                  {organizationData.labels.map(label => (
                    <div
                      key={label.id}
                      className="no-drag flex items-center justify-between p-1.5 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={label.visible}
                          onChange={() => toggleLabel(label.id)}
                          className="no-drag flex-shrink-0"
                          style={{ width: '14px', height: '14px' }}
                        />
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-xs truncate">{label.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">({countLabelItems(label.id)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PresentationControlDialog;
