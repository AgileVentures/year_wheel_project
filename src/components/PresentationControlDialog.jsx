import { useState, useRef, useEffect } from 'react';
import { X, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * PresentationControlDialog - Movable dialog for controlling visibility in presentation mode
 * Allows toggling rings, activity groups, and labels while embedded in presentations
 */
function PresentationControlDialog({ 
  organizationData,
  onOrganizationChange,
  onClose 
}) {
  const { t } = useTranslation(['editor', 'common']);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef(null);
  
  const [expandedSections, setExpandedSections] = useState({
    innerRings: true,
    outerRings: true,
    activityGroups: true,
    labels: true
  });

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

  return (
    <div
      ref={dialogRef}
      className="fixed bg-white rounded-lg shadow-2xl border-2 border-gray-300 z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        maxHeight: '80vh',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Draggable Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical size={18} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900">
            {t('editor:organizationPanel.presentationControls')}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="no-drag p-1 hover:bg-gray-200 rounded transition-colors"
          title={t('common:actions.close')}
        >
          <X size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
        <div className="p-3 space-y-3">
          {/* Inner Rings Section */}
          {innerRings.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('innerRings')}
                className="no-drag w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.innerRings ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  <span className="font-medium text-sm">{t('editor:organizationPanel.innerRings')}</span>
                  <span className="text-xs text-gray-500">({innerRings.length})</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', true); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', false); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={14} />
                  </button>
                </div>
              </button>
              
              {expandedSections.innerRings && (
                <div className="border-t border-gray-200 p-2 space-y-1">
                  {innerRings.map(ring => (
                    <div
                      key={ring.id}
                      className="no-drag flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={ring.visible}
                          onChange={() => toggleRing(ring.id)}
                          className="no-drag"
                        />
                        <span className="text-sm truncate">{ring.name}</span>
                        <span className="text-xs text-gray-400">({countRingItems(ring.id)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Outer Rings Section */}
          {outerRings.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('outerRings')}
                className="no-drag w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.outerRings ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  <span className="font-medium text-sm">{t('editor:organizationPanel.outerRings')}</span>
                  <span className="text-xs text-gray-500">({outerRings.length})</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', true); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('rings', false); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={14} />
                  </button>
                </div>
              </button>
              
              {expandedSections.outerRings && (
                <div className="border-t border-gray-200 p-2 space-y-1">
                  {outerRings.map(ring => (
                    <div
                      key={ring.id}
                      className="no-drag flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={ring.visible}
                          onChange={() => toggleRing(ring.id)}
                          className="no-drag"
                        />
                        <span className="text-sm truncate">{ring.name}</span>
                        <span className="text-xs text-gray-400">({countRingItems(ring.id)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Groups Section */}
          {organizationData.activityGroups && organizationData.activityGroups.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('activityGroups')}
                className="no-drag w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.activityGroups ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  <span className="font-medium text-sm">{t('editor:organizationPanel.activityGroups')}</span>
                  <span className="text-xs text-gray-500">({organizationData.activityGroups.length})</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('activityGroups', true); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('activityGroups', false); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={14} />
                  </button>
                </div>
              </button>
              
              {expandedSections.activityGroups && (
                <div className="border-t border-gray-200 p-2 space-y-1">
                  {organizationData.activityGroups.map(group => (
                    <div
                      key={group.id}
                      className="no-drag flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={group.visible}
                          onChange={() => toggleActivityGroup(group.id)}
                          className="no-drag"
                        />
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm truncate">{group.name}</span>
                        <span className="text-xs text-gray-400">({countActivityGroupItems(group.id)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Labels Section */}
          {organizationData.labels && organizationData.labels.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('labels')}
                className="no-drag w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.labels ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  <span className="font-medium text-sm">{t('editor:organizationPanel.labels')}</span>
                  <span className="text-xs text-gray-500">({organizationData.labels.length})</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('labels', true); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.showAll')}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInSection('labels', false); }}
                    className="no-drag p-1 hover:bg-gray-200 rounded text-xs"
                    title={t('common:actions.hideAll')}
                  >
                    <EyeOff size={14} />
                  </button>
                </div>
              </button>
              
              {expandedSections.labels && (
                <div className="border-t border-gray-200 p-2 space-y-1">
                  {organizationData.labels.map(label => (
                    <div
                      key={label.id}
                      className="no-drag flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={label.visible}
                          onChange={() => toggleLabel(label.id)}
                          className="no-drag"
                        />
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-sm truncate">{label.name}</span>
                        <span className="text-xs text-gray-400">({countLabelItems(label.id)})</span>
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
