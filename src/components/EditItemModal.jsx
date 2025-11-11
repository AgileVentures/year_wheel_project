import { X, Trash2, Link2, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAccessibleWheels, fetchLinkedWheelInfo } from '../services/wheelService';
import { wouldCreateCircularDependency, getDependencyChain, calculateDependentDates } from '../services/dependencyService';

function EditItemModal({ item, wheelStructure, onUpdateItem, onDeleteItem, onClose, currentWheelId }) {
  const { t } = useTranslation(['editor']);
  const [formData, setFormData] = useState({
    name: item.name,
    ringId: item.ringId || '',
    activityId: item.activityId || '',
    labelId: item.labelId || '',
    startDate: item.startDate,
    endDate: item.endDate,
    description: item.description || '',
    linkedWheelId: item.linkedWheelId || '',
    linkType: item.linkType || 'reference',
    dependsOn: item.dependsOn || '',
    dependencyType: item.dependencyType || 'finish_to_start',
    lagDays: item.lagDays !== undefined ? item.lagDays : 0
  });

  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accessibleWheels, setAccessibleWheels] = useState([]);
  const [loadingWheels, setLoadingWheels] = useState(false);
  const [selectedWheelPreview, setSelectedWheelPreview] = useState(null);
  const [showDescription, setShowDescription] = useState(!!item.description);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(!!item.description || !!item.dependsOn);
  const isRecurringInstance = item.isRecurringInstance || false;

  // Fetch accessible wheels on mount
  useEffect(() => {
    const loadWheels = async () => {
      try {
        setLoadingWheels(true);
        const wheels = await fetchAccessibleWheels();
        // Filter out current wheel (can't link to itself)
        const filteredWheels = wheels.filter(w => w.id !== currentWheelId);
        setAccessibleWheels(filteredWheels);
      } catch (error) {
        console.error('Error loading accessible wheels:', error);
      } finally {
        setLoadingWheels(false);
      }
    };
    loadWheels();
  }, [currentWheelId]);

  // Load preview when wheel is selected
  useEffect(() => {
    const loadPreview = async () => {
      if (formData.linkedWheelId) {
        try {
          const wheelInfo = await fetchLinkedWheelInfo(formData.linkedWheelId);
          setSelectedWheelPreview(wheelInfo);
        } catch (error) {
          console.error('Error loading wheel preview:', error);
          setSelectedWheelPreview(null);
        }
      } else {
        setSelectedWheelPreview(null);
      }
    };
    loadPreview();
  }, [formData.linkedWheelId]);

  // Auto-calculate dates when dependency settings change
  useEffect(() => {
    if (formData.dependsOn && formData.dependencyType) {
      const predecessor = wheelStructure.items.find(i => i.id === formData.dependsOn);
      if (predecessor) {
        // Calculate what the startDate should be based on dependency
        const calculatedDates = calculateDependentDates(predecessor, {
          startDate: formData.startDate,
          endDate: formData.endDate,
          dependencyType: formData.dependencyType,
          lagDays: formData.lagDays
        });
        
        // Only update startDate if it changed, preserve user's endDate choice
        // This allows manual duration adjustment
        if (calculatedDates.startDate !== formData.startDate) {
          // Calculate current duration to preserve it
          const currentDuration = Math.floor(
            (new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24)
          );
          
          // Apply new startDate with preserved duration
          const newStart = new Date(calculatedDates.startDate);
          const newEnd = new Date(newStart);
          newEnd.setDate(newEnd.getDate() + currentDuration);
          
          setFormData(prev => ({
            ...prev,
            startDate: calculatedDates.startDate,
            endDate: newEnd.toISOString().split('T')[0]
          }));
        }
      }
    }
  }, [formData.dependsOn, formData.dependencyType, formData.lagDays, wheelStructure.items]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('editor:editItemModal.itemNameRequired');
    }
    if (!formData.startDate) {
      newErrors.startDate = t('editor:editItemModal.startDateRequired');
    }
    if (!formData.endDate) {
      newErrors.endDate = t('editor:editItemModal.endDateRequired');
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = t('editor:editItemModal.endDateInvalid');
    }
    
    // Validate circular dependency
    if (formData.dependsOn) {
      const wouldCreateCycle = wouldCreateCircularDependency(
        wheelStructure.items,
        item.id,
        formData.dependsOn
      );
      if (wouldCreateCycle) {
        newErrors.dependsOn = 'Circular dependency detected - this would create an infinite loop';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Update item
    const updatedItem = {
      ...item,
      name: formData.name,
      ringId: formData.ringId,
      activityId: formData.activityId,
      labelId: formData.labelId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      ...(formData.description ? { description: formData.description } : {}),
      linkedWheelId: formData.linkedWheelId || null,
      linkType: formData.linkedWheelId ? formData.linkType : null,
      dependsOn: formData.dependsOn || null,
      dependencyType: formData.dependsOn ? formData.dependencyType : 'finish_to_start',
      lagDays: formData.dependsOn ? parseInt(formData.lagDays) : 0
    };

    onUpdateItem(updatedItem);
    onClose();
  };

  const handleDelete = () => {
    onDeleteItem(item.id);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-update end date when start date changes
      if (field === 'startDate' && value) {
        const startDate = new Date(value);
        const currentEndDate = new Date(prev.endDate);
        
        // If end date is before new start date, update it to match start date
        if (currentEndDate < startDate) {
          updated.endDate = value;
        }
      }
      
      return updated;
    });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-sm z-10">
          <h2 className="text-lg font-semibold text-gray-900">{t('editor:editItemModal.title')}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Recurring instance notice */}
          {isRecurringInstance && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-sm">
              <p className="text-sm text-blue-900">
                <span className="font-medium">ℹ️ {t('editor:editItemModal.recurringNotice', 'Återkommande aktivitet')}</span>
                <br />
                <span className="text-xs text-blue-700">
                  {t('editor:editItemModal.recurringNoticeText', 'Detta är en del av en återkommande aktivitetsserie. Ändringar påverkar endast denna instans.')}
                </span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Left column - Basic Info & Dates */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Grundläggande information
              </h3>
            
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('editor:editItemModal.itemNameLabel')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('editor:editItemModal.itemNamePlaceholder')}
                  autoFocus
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('editor:editItemModal.startDateLabel')}
                  {formData.dependsOn && <span className="text-xs text-blue-600 ml-2">(auto-beräknat)</span>}
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  disabled={!!formData.dependsOn}
                  className={`w-full px-3 py-2.5 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  } ${formData.dependsOn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('editor:editItemModal.endDateLabel')}
                  {formData.dependsOn && <span className="text-xs text-blue-600 ml-2">(varaktighet beräknas)</span>}
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  min={formData.startDate}
                  className={`w-full px-3 py-2.5 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Right column - Categorization */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Kategorisering
              </h3>

              <div className="space-y-4">
                {/* Ring */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('editor:editItemModal.ringLabel')}
                  </label>
                  <select
                    value={formData.ringId}
                    onChange={(e) => handleChange('ringId', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {wheelStructure.rings.map((ring) => (
                      <option key={ring.id} value={ring.id}>
                        {ring.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Activity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('editor:editItemModal.activityLabel')}
                  </label>
                  <select
                    value={formData.activityId}
                    onChange={(e) => handleChange('activityId', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {wheelStructure.activityGroups.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('editor:editItemModal.labelLabel')} <span className="text-gray-400 font-normal">(valfritt)</span>
                  </label>
                  <select
                    value={formData.labelId}
                    onChange={(e) => handleChange('labelId', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {wheelStructure.labels.map((label) => (
                      <option key={label.id} value={label.id}>
                        {label.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings - Full Width Below Columns */}
          <div className="pt-6 border-t border-gray-200 mt-6">
            {!showAdvancedSettings ? (
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                + Avancerade inställningar
              </button>
            ) : (
              <div className="border border-gray-200 rounded-sm p-4 bg-gray-50 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Avancerade inställningar
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Dölj
                  </button>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Beskrivning <span className="text-gray-400 font-normal">(valfritt)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none bg-white"
                    placeholder="Lägg till detaljer om denna aktivitet..."
                  />
                </div>

                {/* 2-column grid for Dependencies and Wheel Linking */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-300">
                  {/* Dependency Section - Left Column */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <LinkIcon size={14} className="text-gray-600" />
                      <label className="text-sm font-medium text-gray-700">
                        Aktivitetsberoende
                      </label>
                    </div>
                      
                      <div className="space-y-3">
                        {/* Predecessor Item */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1.5">
                            Beror på aktivitet
                          </label>
                          <select
                            value={formData.dependsOn}
                            onChange={(e) => handleChange('dependsOn', e.target.value)}
                            disabled={isRecurringInstance}
                            className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                              isRecurringInstance ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
                            } ${errors.dependsOn ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <option value="">Ingen (oberoende aktivitet)</option>
                            {wheelStructure.items
                              .filter(i => i.id !== item.id && i.pageId === item.pageId)
                              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                              .map((otherItem) => (
                                <option key={otherItem.id} value={otherItem.id}>
                                  {otherItem.name} ({otherItem.startDate})
                                </option>
                              ))}
                          </select>
                          {isRecurringInstance && (
                            <p className="mt-1 text-xs text-gray-500">Återkommande aktiviteter kan inte ha beroenden</p>
                          )}
                          {errors.dependsOn && (
                            <p className="mt-1 text-xs text-red-600">{errors.dependsOn}</p>
                          )}
                        </div>

                        {/* Dependency Type - only show if predecessor selected */}
                        {formData.dependsOn && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1.5">
                                Beroendetyp
                              </label>
                              <select
                                value={formData.dependencyType}
                                onChange={(e) => handleChange('dependencyType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                              >
                                <option value="finish_to_start">Slut → Start (vanligast)</option>
                                <option value="start_to_start">Start → Start (parallell)</option>
                                <option value="finish_to_finish">Slut → Slut (synkroniserad)</option>
                              </select>
                              <p className="mt-1 text-xs text-gray-500">
                                {formData.dependencyType === 'finish_to_start' && 'Denna aktivitet startar när föregående avslutas'}
                                {formData.dependencyType === 'start_to_start' && 'Denna aktivitet startar samtidigt med föregående'}
                                {formData.dependencyType === 'finish_to_finish' && 'Denna aktivitet avslutas samtidigt med föregående'}
                              </p>
                            </div>

                            {/* Lag Days */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1.5">
                                Fördröjning (dagar)
                              </label>
                              <input
                                type="number"
                                value={formData.lagDays}
                                onChange={(e) => handleChange('lagDays', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                placeholder="0"
                                min="0"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Antal dagar att vänta efter föregående aktivitet (0 = ingen fördröjning)
                              </p>
                            </div>

                            {/* Visual indicator of dependency chain */}
                            {(() => {
                              const chain = getDependencyChain(wheelStructure.items, item.id);
                              return chain.length > 0 ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-2">
                                  <p className="text-xs text-blue-900 font-medium mb-1">
                                    🔗 Beroendekedja:
                                  </p>
                                  <div className="text-xs text-blue-700 space-y-0.5">
                                    {chain.map((chainItem, idx) => (
                                      <div key={chainItem.id}>
                                        {'  '.repeat(idx)}→ {chainItem.name}
                                      </div>
                                    ))}
                                    <div>
                                      {'  '.repeat(chain.length)}→ <strong>{item.name}</strong> (denna)
                                    </div>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>
                    </div>

                      {/* Wheel Linking Section - Right Column */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Link2 size={14} className="text-gray-600" />
                          <label className="text-sm font-medium text-gray-700">
                            Länka till annat hjul
                          </label>
                        </div>

                        <div className="space-y-3">
                          {loadingWheels ? (
                            <p className="text-sm text-gray-500">Laddar hjul...</p>
                          ) : accessibleWheels.length > 0 ? (
                            <>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1.5">
                                  Välj hjul
                                </label>
                                <select
                                  value={formData.linkedWheelId}
                                  onChange={(e) => handleChange('linkedWheelId', e.target.value)}
                                  disabled={isRecurringInstance}
                                  className={`w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                    isRecurringInstance ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
                                  }`}
                                >
                                  <option value="">Ingen länk</option>
                                  {accessibleWheels.map((wheel) => (
                                    <option key={wheel.id} value={wheel.id}>
                                      {wheel.title} ({wheel.year})
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                  {isRecurringInstance
                                    ? 'Återkommande aktiviteter kan inte länkas till andra hjul'
                                    : 'Länka denna händelse till ett annat hjul för referens eller detaljer'
                                  }
                                </p>
                              </div>

                              {/* Show preview when wheel is selected */}
                              {selectedWheelPreview && (
                                <div className="bg-blue-50 border border-blue-200 rounded-sm p-2">
                                  <p className="text-xs text-blue-900 font-medium">
                                    Länkad till: {selectedWheelPreview.title} ({selectedWheelPreview.year})
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-500">Inga hjul tillgängliga för länkning</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 border border-red-300 text-red-600 rounded-sm hover:bg-red-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Trash2 size={16} />
              <span>{t('editor:editItemModal.deleteButton')}</span>
            </button>
            <div className="flex-1 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {t('editor:editItemModal.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t('editor:editItemModal.save')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-sm shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('editor:editItemModal.deleteConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('editor:editItemModal.deleteConfirmMessage', { itemName: item.name })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {t('editor:editItemModal.deleteConfirmCancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors text-sm font-medium"
              >
                {t('editor:editItemModal.deleteConfirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditItemModal;
