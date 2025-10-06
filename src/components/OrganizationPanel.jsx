import { Search, Settings, RefreshCw, ChevronLeft, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AddItemModal from './AddItemModal';

function OrganizationPanel({ 
  organizationData,
  onOrganizationChange
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('disc'); // disc, liste, kalender
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    rings: true,
    activities: true,
    labels: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter visibility toggles
  const handleShowRings = (show) => {
    const updatedRings = organizationData.rings.map(ring => ({
      ...ring,
      visible: show
    }));
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleShowActivities = (show) => {
    const updatedActivities = organizationData.activities.map(activity => ({
      ...activity,
      visible: show
    }));
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  const handleShowLabels = (show) => {
    const updatedLabels = organizationData.labels.map(label => ({
      ...label,
      visible: show
    }));
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  // Toggle individual items
  const toggleRing = (ringId) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, visible: !ring.visible } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const toggleActivity = (activityId) => {
    const updatedActivities = organizationData.activities.map(activity =>
      activity.id === activityId ? { ...activity, visible: !activity.visible } : activity
    );
    onOrganizationChange({ ...organizationData, activities: updatedActivities });
  };

  const toggleLabel = (labelId) => {
    const updatedLabels = organizationData.labels.map(label =>
      label.id === labelId ? { ...label, visible: !label.visible } : label
    );
    onOrganizationChange({ ...organizationData, labels: updatedLabels });
  };

  // Count items
  const countRingItems = (ringId) => {
    return organizationData.items?.filter(item => item.ringId === ringId).length || 0;
  };

  const countActivityItems = (activityId) => {
    return organizationData.items?.filter(item => item.activityId === activityId).length || 0;
  };

  const countLabelItems = (labelId) => {
    return organizationData.items?.filter(item => item.labelId === labelId).length || 0;
  };

  // Add new item
  const handleAddItem = (newItem) => {
    const updatedItems = [...(organizationData.items || []), newItem];
    onOrganizationChange({ ...organizationData, items: updatedItems });
  };

  // Ring management
  const handleAddRing = () => {
    const newRing = {
      id: `ring-${Date.now()}`,
      name: `Ring ${organizationData.rings.length + 1}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      visible: true
    };
    const updatedRings = [...organizationData.rings, newRing];
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleRemoveRing = (ringId) => {
    if (organizationData.rings.length <= 1) return;
    const updatedRings = organizationData.rings.filter(r => r.id !== ringId);
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleRingNameChange = (ringId, newName) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, name: newName } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  const handleRingColorChange = (ringId, newColor) => {
    const updatedRings = organizationData.rings.map(ring =>
      ring.id === ringId ? { ...ring, color: newColor } : ring
    );
    onOrganizationChange({ ...organizationData, rings: updatedRings });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <h1 className="text-base font-normal text-gray-900">Marketing department</h1>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <RefreshCw size={16} className="text-gray-600" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <Settings size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-6 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveView('disc')}
            className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
              activeView === 'disc'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Disc
            {activeView === 'disc' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveView('liste')}
            className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
              activeView === 'liste'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Liste
            {activeView === 'liste' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveView('kalender')}
            className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
              activeView === 'kalender'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Kalender
            {activeView === 'kalender' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sök"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
          />
        </div>

        {/* Filter Visning & Add Button */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-700">Filtrera Visning</div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Content Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* RINGE Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('rings')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              RINGAR
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.rings ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.rings && (
            <>
              <div className="space-y-1 mb-2">
                {organizationData.rings.map((ring) => (
                  <div
                    key={ring.id}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={ring.visible}
                      onChange={() => toggleRing(ring.id)}
                      className="w-3 h-3 rounded"
                    />
                    <input
                      type="color"
                      value={ring.color}
                      onChange={(e) => handleRingColorChange(ring.id, e.target.value)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={ring.name}
                      onChange={(e) => handleRingNameChange(ring.id, e.target.value)}
                      className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:px-1"
                    />
                    {organizationData.rings.length > 1 && (
                      <button
                        onClick={() => handleRemoveRing(ring.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:bg-red-50 rounded transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Visa:</span>
                  <button
                    onClick={() => handleShowRings(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Alla
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => handleShowRings(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Ingen
                  </button>
                </div>
                <button
                  onClick={handleAddRing}
                  className="flex items-center gap-1 px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>Lägg till</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* AKTIVITETER Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('activities')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              AKTIVITETER
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.activities ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.activities && (
            <>
              <div className="space-y-1 mb-2">
                {organizationData.activities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => toggleActivity(activity.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors ${
                      activity.visible ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: activity.color }}
                    />
                    <span className="flex-1 text-left text-xs text-gray-700">
                      {activity.name}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countActivityItems(activity.id)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Visa:</span>
                <button
                  onClick={() => handleShowActivities(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Alla
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => handleShowActivities(false)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Ingen
                </button>
              </div>
            </>
          )}
        </div>

        {/* LABELS Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => toggleSection('labels')}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              LABELS
            </h2>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${expandedSections.labels ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.labels && (
            <>
              <div className="space-y-1 mb-2">
                {organizationData.labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors ${
                      label.visible ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-left text-xs text-gray-700">
                      {label.name}
                    </span>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {countLabelItems(label.id)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Visa:</span>
                <button
                  onClick={() => handleShowLabels(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Alla
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => handleShowLabels(false)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Ingen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>
          YearWheel
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <AddItemModal
          organizationData={organizationData}
          onAddItem={handleAddItem}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
}

export default OrganizationPanel;
