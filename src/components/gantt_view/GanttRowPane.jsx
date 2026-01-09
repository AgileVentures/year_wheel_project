import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * GanttRowPane Component
 * 
 * Left panel showing grouped rows (rings/labels/activityGroups)
 * Similar to ListView's tree structure
 */
const GanttRowPane = ({
  groupedItems,
  groupBy,
  expandedGroups,
  selectedItemId,
  wheelStructure,
  onToggleGroup,
  onItemClick,
  contentHeight,
}) => {
  const { t } = useTranslation();
  
  const { rings = [], activityGroups = [], labels = [] } = wheelStructure || {};
  
  // Get group metadata
  const getGroupInfo = (groupId) => {
    switch (groupBy) {
      case 'rings':
        return rings.find(r => r.id === groupId) || { name: 'Unknown', color: '#94A3B8' };
      case 'labels':
        return labels.find(l => l.id === groupId) || { name: 'Unlabeled', color: '#94A3B8' };
      case 'activityGroups':
        return activityGroups.find(ag => ag.id === groupId) || { name: 'Unknown', color: '#94A3B8' };
      default:
        return { name: 'Unknown', color: '#94A3B8' };
    }
  };
  
  const renderGroup = (groupId, items) => {
    const groupInfo = getGroupInfo(groupId);
    const isExpanded = expandedGroups[groupId];
    const itemCount = items.length;
    
    return (
      <div key={groupId} className="border-b border-gray-200">
        {/* Group header */}
        <div
          onClick={() => onToggleGroup(groupId)}
          className="flex items-center gap-2 px-3 cursor-pointer hover:bg-gray-50 transition-colors"
          style={{ height: '36px' }}
          data-cy={`gantt-group-${groupId}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: groupInfo.color }}
          />
          
          <span className="font-medium text-sm text-gray-900 flex-1 truncate">
            {groupInfo.name}
          </span>
          
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {itemCount}
          </span>
        </div>
        
        {/* Group items (when expanded) */}
        {isExpanded && (
          <div className="bg-gray-50">
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                className={`flex items-center gap-2 px-3 pl-10 cursor-pointer hover:bg-white transition-colors border-l-2 ${
                  selectedItemId === item.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent'
                }`}
                style={{ height: '40px' }}
                data-cy={`gantt-item-${item.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div 
      className="w-80 bg-white border-r border-gray-200 flex-shrink-0"
      style={{ height: `${contentHeight}px` }}
      data-cy="gantt-row-pane"
    >
      {/* Groups - no header here, it's in parent */}
      <div>
        {Object.keys(groupedItems).length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            {t('gantt.noItems', 'Inga poster att visa')}
          </div>
        ) : (
          Object.entries(groupedItems).map(([groupId, items]) =>
            renderGroup(groupId, items)
          )
        )}
      </div>
    </div>
  );
};

export default GanttRowPane;
