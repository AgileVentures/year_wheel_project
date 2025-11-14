import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { getUserTeams } from '../../services/teamService';
import { showToast } from '../../utils/dialogs';

export default function CreateWheelModal({ onClose, onCreate }) {
  const { t } = useTranslation(['dashboard', 'common']);
  const currentYear = new Date().getFullYear();
  const [title, setTitle] = useState(t('dashboard:createWheel'));
  const [yearInput, setYearInput] = useState(String(currentYear));
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoadingTeams(true);
      const data = await getUserTeams();
      setTeams(data);
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleYearChange = (event) => {
    const { value } = event.target;

    if (value === '') {
      setYearInput('');
      return;
    }

    if (!/^\d{0,4}$/.test(value)) {
      return;
    }

    setYearInput(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const parsedYear = Number.parseInt(yearInput, 10);
    const normalizedYear = Number.isNaN(parsedYear)
      ? currentYear
      : Math.min(2100, Math.max(2000, parsedYear));
    
    try {
      await onCreate({
        title: title.trim() || t('dashboard:createWheel'),
        year: normalizedYear,
        team_id: selectedTeam || null,
      });
      setYearInput(String(currentYear));
      onClose();
    } catch (err) {
      console.error('Error creating wheel:', err);
      showToast(t('dashboard:messages.createError') + ': ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm shadow-xl max-w-md w-full my-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-sm z-10">
          <h2 className="text-xl font-semibold text-gray-900">{t('dashboard:createWheel')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('common:labels.title')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('common:labels.title')}
              autoFocus
              data-cy="create-wheel-title-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('common:labels.year')}
            </label>
            <input
              type="number"
              inputMode="numeric"
              pattern="\d*"
              value={yearInput}
              onChange={handleYearChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="2000"
              max="2100"
              data-cy="create-wheel-year-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('common:navigation.teams')} ({t('common:labels.optional')})
            </label>
            {loadingTeams ? (
              <div className="text-sm text-gray-500">{t('common:messages.loading')}</div>
            ) : (
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common:labels.personal', { defaultValue: 'Personal wheel' })}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {t('common:labels.teamWheelInfo', { defaultValue: 'Team wheels can be seen by all team members' })}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              disabled={loading}
              data-cy="create-wheel-cancel-button"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              disabled={loading}
              data-cy="create-wheel-submit-button"
            >
              {loading ? t('common:messages.processing') : t('dashboard:createWheel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
