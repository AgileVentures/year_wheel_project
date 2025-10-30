import { X, Plus, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAccessibleWheels, fetchLinkedWheelInfo } from '../services/wheelService';
import ErrorDisplay from './ErrorDisplay';

function AddItemModal({ organizationData, onAddItem, onClose, currentWheelId }) {
  const { t } = useTranslation(['editor']);
  const [formData, setFormData] = useState({
    name: '',
    ringId: organizationData.rings[0]?.id || '',
    activityId: organizationData.activityGroups[0]?.id || '',
    labelId: organizationData.labels[0]?.id || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    time: '',
    linkedWheelId: '',
    linkType: 'reference'
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [accessibleWheels, setAccessibleWheels] = useState([]);
  const [loadingWheels, setLoadingWheels] = useState(false);
  const [selectedWheelPreview, setSelectedWheelPreview] = useState(null);

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

    // Create new item
    const newItem = {
      id: `item-${Date.now()}`,
      name: formData.name,
      ringId: formData.ringId,
      activityId: formData.activityId,
      labelId: formData.labelId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      ...(formData.time && { time: formData.time }),
      ...(formData.linkedWheelId && { 
        linkedWheelId: formData.linkedWheelId,
        linkType: formData.linkType 
      })
    };

    onAddItem(newItem);
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
      <div className="bg-white rounded-sm shadow-xl w-full max-w-md my-8">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
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

          {/* Basic Info Section */}
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

            {/* Dates - Prominent placement */}
            <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('editor:addItemModal.startDateLabel')}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('editor:addItemModal.endDateLabel')}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    min={formData.startDate}
                    className={`w-full px-3 py-2.5 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>
              {/* Time (optional) - inside date box */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('editor:addItemModal.timeLabel')} <span className="text-gray-400 font-normal">(valfritt)</span>
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder={t('editor:addItemModal.timePlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Categorization Section */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Kategorisering
            </h3>

            <div className="grid grid-cols-1 gap-4">
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
                  {organizationData.rings.map((ring) => (
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
                  {organizationData.activityGroups.map((activity) => (
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
                  {organizationData.labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Wheel Linking Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={16} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                {t('editor:addItemModal.linkToWheelTitle')}
              </h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('editor:addItemModal.selectWheelLabel')} <span className="text-gray-400 font-normal">(valfritt)</span>
              </label>
              <select
                value={formData.linkedWheelId}
                onChange={(e) => handleChange('linkedWheelId', e.target.value)}
                disabled={loadingWheels}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100"
              >
                <option value="">
                  {loadingWheels 
                    ? t('editor:addItemModal.loadingWheels') 
                    : t('editor:addItemModal.noLinkOption')}
                </option>
                {accessibleWheels.map((wheel) => (
                  <option key={wheel.id} value={wheel.id}>
                    {wheel.title} ({wheel.year})
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                {t('editor:addItemModal.linkHelpText')}
              </p>
            </div>

            {/* Show preview when wheel is selected */}
            {selectedWheelPreview && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{t('editor:addItemModal.linkedTo')}:</span>{' '}
                  {selectedWheelPreview.title} ({selectedWheelPreview.year})
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('editor:addItemModal.linkWillOpenInNewTab')}
                </p>
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
