import { X, Plus, Link2, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAccessibleWheels, fetchLinkedWheelInfo } from '../services/wheelService';
import { wouldCreateCircularDependency, getDependencyChain, calculateDependentDates } from '../services/dependencyService';
import ErrorDisplay from './ErrorDisplay';

function AddItemModal({ wheelStructure, onAddItem, onClose, currentWheelId, currentPageId, year }) {
  const { t } = useTranslation(['editor']);
  
  // Use page year for default dates (fall back to current year if not provided)
  const defaultYear = year ? parseInt(year) : new Date().getFullYear();
  const defaultDate = `${defaultYear}-01-01`; // Jan 1st of page year
  
  const [formData, setFormData] = useState({
    name: '',
    ringId: wheelStructure.rings[0]?.id || '',
    activityId: wheelStructure.activityGroups[0]?.id || '',
    labelId: wheelStructure.labels[0]?.id || '',
    startDate: defaultDate,
    endDate: defaultDate,
    description: '',
    linkedWheelId: '',
    linkType: 'reference',
    isRecurring: false,
    recurringFrequency: 'weekly',
    recurringDuration: 1, // Duration in days for each instance
    dependsOn: '',
    dependencyType: 'finish_to_start',
    lagDays: 0
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [accessibleWheels, setAccessibleWheels] = useState([]);
  const [loadingWheels, setLoadingWheels] = useState(false);
  const [selectedWheelPreview, setSelectedWheelPreview] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [recurringPreview, setRecurringPreview] = useState([]);

  // Update dates when year prop changes
  useEffect(() => {
    const pageYear = year ? parseInt(year) : new Date().getFullYear();
    const newDefaultDate = `${pageYear}-01-01`; // Jan 1st using direct string format
    setFormData(prev => ({
      ...prev,
      startDate: newDefaultDate,
      endDate: newDefaultDate
    }));
  }, [year]);

  // Fetch accessible wheels on mount
  useEffect(() => {
    const loadWheels = async () => {
      try {
        setLoadingWheels(true);
        setGeneralError(null);
        const wheels = await fetchAccessibleWheels();
        // Filter out current wheel (can't link to itself)
        const filteredWheels = wheels.filter(w => w.id !== currentWheelId);
        setAccessibleWheels(filteredWheels);
      } catch (error) {
        console.error('Error loading accessible wheels:', error);
        setGeneralError(error);
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

  // Calculate recurring dates
  const calculateRecurringDates = (startDate, endDate, frequency, duration) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let current = new Date(start);
    
    while (current <= end) {
      const instanceStart = new Date(current);
      const instanceEnd = new Date(current);
      instanceEnd.setDate(instanceEnd.getDate() + duration - 1);
      
      // Only add if instance end is within the boundary
      if (instanceEnd <= end) {
        dates.push({
          startDate: instanceStart.toISOString().split('T')[0],
          endDate: instanceEnd.toISOString().split('T')[0]
        });
      }
      
      // Move to next occurrence
      if (frequency === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else if (frequency === 'quarterly') {
        current.setMonth(current.getMonth() + 3);
      }
    }
    
    return dates;
  };

  // Update preview when recurring settings change
  useEffect(() => {
    if (formData.isRecurring && formData.startDate && formData.endDate) {
      const dates = calculateRecurringDates(
        formData.startDate,
        formData.endDate,
        formData.recurringFrequency,
        formData.recurringDuration
      );
      setRecurringPreview(dates);
    } else {
      setRecurringPreview([]);
    }
  }, [formData.isRecurring, formData.startDate, formData.endDate, formData.recurringFrequency, formData.recurringDuration]);

  // Auto-calculate dates when dependency settings change
  useEffect(() => {
    if (formData.dependsOn && formData.dependencyType) {
      const predecessor = wheelStructure.items.find(item => item.id === formData.dependsOn);
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
      newErrors.name = t('editor:addItemModal.itemNameRequired');
    }
    if (!formData.startDate) {
      newErrors.startDate = t('editor:addItemModal.startDateRequired');
    }
    if (!formData.endDate) {
      newErrors.endDate = t('editor:addItemModal.endDateRequired');
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = t('editor:addItemModal.endDateInvalid');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Handle recurring activities
    if (formData.isRecurring) {
      const recurringDates = calculateRecurringDates(
        formData.startDate,
        formData.endDate,
        formData.recurringFrequency,
        formData.recurringDuration
      );
      
      // Batch create all recurring items at once (more efficient than forEach)
      const recurringGroupId = `recurring-${Date.now()}`;
      const newItems = recurringDates.map((dates, index) => ({
        id: `item-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        pageId: currentPageId, // CRITICAL: Assign current page ID
        name: formData.name,
        ringId: formData.ringId,
        activityId: formData.activityId,
        labelId: formData.labelId,
        startDate: dates.startDate,
        endDate: dates.endDate,
        ...(formData.description && { description: formData.description }),
        ...(formData.linkedWheelId && { 
          linkedWheelId: formData.linkedWheelId,
          linkType: formData.linkType 
        }),
        isRecurringInstance: true,
        recurringGroup: recurringGroupId
      }));
      
      // Add all items at once
      console.log(`[AddItemModal] Creating ${newItems.length} recurring items with pageId=${currentPageId?.substring(0, 8)}`);
      onAddItem(newItems);
    } else {
      // Create single item
      const newItem = {
        id: `item-${Date.now()}`,
        pageId: currentPageId, // CRITICAL: Assign current page ID
        name: formData.name,
        ringId: formData.ringId,
        activityId: formData.activityId,
        labelId: formData.labelId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        ...(formData.description && { description: formData.description }),
        ...(formData.linkedWheelId && { 
          linkedWheelId: formData.linkedWheelId,
          linkType: formData.linkType 
        }),
        ...(formData.dependsOn && {
          dependsOn: formData.dependsOn,
          dependencyType: formData.dependencyType,
          lagDays: parseInt(formData.lagDays)
        })
      };
      console.log(`[AddItemModal] Creating single item with pageId=${currentPageId?.substring(0, 8)}:`, newItem);
      onAddItem(newItem);
    }
    
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
          <h2 className="text-lg font-semibold text-gray-900">{t('editor:addItemModal.title')}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* General Error Display */}
          {generalError && (
            <ErrorDisplay
              message={t('editor:addItemModal.loadError', 'Det gick inte att ladda data')}
              error={generalError}
              type="error"
              onRetry={() => window.location.reload()}
              onDismiss={() => setGeneralError(null)}
            />
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
                  {t('editor:addItemModal.itemNameLabel')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('editor:addItemModal.itemNamePlaceholder')}
                  autoFocus
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('editor:addItemModal.startDateLabel')}
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
                  {formData.isRecurring 
                    ? t('editor:addItemModal.recurringEndDateLabel', 'Slutdatum (upprepar till)')
                    : t('editor:addItemModal.endDateLabel')
                  }
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
                    {t('editor:addItemModal.ringLabel')}
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
                    {t('editor:addItemModal.activityLabel')}
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
                    {t('editor:addItemModal.labelLabel')} <span className="text-gray-400 font-normal">(valfritt)</span>
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

                {/* Recurring checkbox */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => handleChange('isRecurring', e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    {t('editor:addItemModal.recurringLabel', 'Återkommande aktivitet')}
                  </label>
                </div>

                {/* Recurring options - show when checkbox is checked */}
                {formData.isRecurring && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">
                        {t('editor:addItemModal.recurringFrequencyLabel', 'Frekvens')}
                      </label>
                      <select
                        value={formData.recurringFrequency}
                        onChange={(e) => handleChange('recurringFrequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="weekly">{t('editor:addItemModal.weekly', 'Varje vecka')}</option>
                        <option value="monthly">{t('editor:addItemModal.monthly', 'Varje månad')}</option>
                        <option value="quarterly">{t('editor:addItemModal.quarterly', 'Varje kvartal')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">
                        {t('editor:addItemModal.recurringDurationLabel', 'Varaktighet per tillfälle')}
                      </label>
                      <select
                        value={formData.recurringDuration}
                        onChange={(e) => handleChange('recurringDuration', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="1">{t('editor:addItemModal.duration1day', '1 dag')}</option>
                        <option value="2">{t('editor:addItemModal.duration2days', '2 dagar')}</option>
                        <option value="3">{t('editor:addItemModal.duration3days', '3 dagar')}</option>
                        <option value="7">{t('editor:addItemModal.duration1week', '1 vecka')}</option>
                        <option value="14">{t('editor:addItemModal.duration2weeks', '2 veckor')}</option>
                      </select>
                    </div>

                    {/* Preview of recurring dates */}
                    {recurringPreview.length > 0 && (
                      <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                        <p className="text-xs font-medium text-blue-900 mb-2">
                          {t('editor:addItemModal.recurringPreview', 'Kommer att skapa {{count}} aktiviteter:', { count: recurringPreview.length })}
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {recurringPreview.slice(0, 10).map((date, index) => (
                            <p key={index} className="text-xs text-blue-800">
                              {new Date(date.startDate).toLocaleDateString('sv-SE')} - {new Date(date.endDate).toLocaleDateString('sv-SE')}
                            </p>
                          ))}
                          {recurringPreview.length > 10 && (
                            <p className="text-xs text-blue-700 italic">
                              {t('editor:addItemModal.andMore', '...och {{count}} till', { count: recurringPreview.length - 10 })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="pt-4 border-t border-gray-300">
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
                          disabled={formData.isRecurring}
                          className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            formData.isRecurring ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
                          } ${errors.dependsOn ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Ingen (oberoende aktivitet)</option>
                          {wheelStructure.items
                            .filter(i => i.pageId === currentPageId)
                            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                            .map((otherItem) => (
                              <option key={otherItem.id} value={otherItem.id}>
                                {otherItem.name} ({otherItem.startDate})
                              </option>
                            ))}
                        </select>
                        {formData.isRecurring && (
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
                              disabled={formData.isRecurring}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                formData.isRecurring ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
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
                              {formData.isRecurring 
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
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              {t('editor:addItemModal.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {t('editor:addItemModal.addItem')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddItemModal;
