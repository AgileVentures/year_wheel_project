import { X, Edit2, Trash2 } from 'lucide-react';

function ItemTooltip({ item, organizationData, position, onEdit, onDelete, onClose, readonly = false }) {
  if (!item) return null;

  const ring = organizationData.rings.find(r => r.id === item.ringId);
  const activity = organizationData.activityGroups.find(a => a.id === item.activityId);
  const label = organizationData.labels.find(l => l.id === item.labelId);
  const startDate = new Date(item.startDate);
  const endDate = new Date(item.endDate);

  return (
    <div
      className="fixed bg-white rounded-sm shadow-xl border border-gray-200 z-50 w-64"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 border-b border-gray-200">
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: activity?.color || '#D1D5DB' }}
            />
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {item.name}
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        >
          <X size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Ring:</span>
          <span className="text-gray-900 font-medium">{ring?.name || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Aktivitet:</span>
          <span className="text-gray-900 font-medium">{activity?.name || 'N/A'}</span>
        </div>
        {label && label.id !== 'no-label' && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Etikett:</span>
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="text-gray-900 font-medium">{label.name}</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Start:</span>
          <span className="text-gray-900 font-medium">
            {startDate.toLocaleDateString('sv-SE')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Slut:</span>
          <span className="text-gray-900 font-medium">
            {endDate.toLocaleDateString('sv-SE')}
          </span>
        </div>
        {item.time && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Tid:</span>
            <span className="text-gray-900 font-medium">{item.time}</span>
          </div>
        )}
      </div>

      {/* Actions - only show in edit mode */}
      {!readonly && (
        <div className="flex gap-2 p-3 border-t border-gray-200">
          <button
            onClick={() => {
              onEdit(item);
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            <Edit2 size={12} />
            <span>Redigera</span>
          </button>
          <button
            onClick={() => {
              if (confirm(`Radera "${item.name}"?`)) {
                onDelete(item.id);
                onClose();
              }
            }}
            className="px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ItemTooltip;
