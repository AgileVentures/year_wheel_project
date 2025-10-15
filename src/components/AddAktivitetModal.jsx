import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function AddAktivitetModal({ organizationData, onAddAktivitet, onClose }) {
  const { t } = useTranslation(['editor', 'common']);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ringId: organizationData.rings[0]?.id || '',
    activityId: organizationData.activityGroups[0]?.id || '',
    labelId: organizationData.labels[0]?.id || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    time: ''
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('editor:modal.validation.nameRequired');
    }
    if (!formData.startDate) {
      newErrors.startDate = t('editor:modal.validation.startDateRequired');
    }
    if (!formData.endDate) {
      newErrors.endDate = t('editor:modal.validation.endDateRequired');
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = t('editor:modal.validation.endDateAfterStart');
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
      ...(formData.description && { description: formData.description })
    };

    onAddAktivitet(newItem);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-sm">
          <h2 className="text-lg font-semibold text-gray-900">{t('editor:modal.addActivity')}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('editor:modal.itemName')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('editor:modal.itemNamePlaceholder')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Ring */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('editor:activities.ring')}
            </label>
            <select
              value={formData.ringId}
              onChange={(e) => handleChange('ringId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('editor:activities.activityGroup')}
            </label>
            <select
              value={formData.activityId}
              onChange={(e) => handleChange('activityId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('editor:activities.label')}
            </label>
            <select
              value={formData.labelId}
              onChange={(e) => handleChange('labelId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {organizationData.labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('editor:modal.startDate')} *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('editor:modal.endDate')} *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                min={formData.startDate}
                className={`w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Time (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('editor:modal.time')}
            </label>
            <input
              type="text"
              value={formData.time}
              onChange={(e) => handleChange('time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g., 09:00 - 17:00"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('editor:modal.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder={t('editor:modal.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {t('editor:modal.addButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAktivitetModal;
