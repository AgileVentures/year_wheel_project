import { useTranslation } from 'react-i18next';
import { Target, List, Trello, Clock } from 'lucide-react';

function ViewNavigation({ currentView = 'wheel', onViewChange = null }) {
  const { t } = useTranslation(['landing']);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-gray-100 rounded-sm p-1">
        <button
          onClick={() => onViewChange?.('wheel')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
            currentView === 'wheel' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          {t('landing:views.wheel.title', 'Wheel')}
        </button>
        <button
          onClick={() => onViewChange?.('list')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
            currentView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          {t('landing:views.list.title', 'List')}
        </button>
        <button
          className="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 text-gray-400"
          disabled
        >
          <Trello className="w-3.5 h-3.5" />
          {t('landing:views.kanban.title', 'Kanban')}
        </button>
        <button
          className="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 text-gray-400"
          disabled
        >
          <Clock className="w-3.5 h-3.5" />
          {t('landing:views.timeline.title', 'Timeline')}
        </button>
      </div>
    </div>
  );
}

export default ViewNavigation;
