import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createTeam } from '../../services/teamService';

const CreateTeamModal = ({ onClose, onTeamCreated }) => {
  const { t } = useTranslation(['teams']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(t('teams:createTeamModal.nameRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newTeam = await createTeam(name.trim(), description.trim());
      onTeamCreated(newTeam);
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm max-w-md w-full my-8">
        <div className="flex justify-between items-center p-6 pb-4 sticky top-0 bg-white rounded-t-sm z-10">
          <h3 className="text-xl font-bold text-gray-900">{t('teams:createTeamModal.title')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 pb-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teams:createTeamModal.nameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('teams:createTeamModal.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teams:createTeamModal.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('teams:createTeamModal.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('teams:createTeamModal.characterCount', { count: description.length })}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              {t('teams:createTeamModal.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              disabled={loading || !name.trim()}
            >
              {loading ? t('teams:createTeamModal.creating') : t('teams:createTeamModal.create')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;
