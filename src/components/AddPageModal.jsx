import { X, FileText, Copy, Calendar } from 'lucide-react';

/**
 * AddPageModal Component
 * 
 * Modal for creating new pages with different options
 */
export default function AddPageModal({ 
  currentPage,
  onClose, 
  onCreateBlank, 
  onDuplicate, 
  onCreateNextYear 
}) {
  const currentYear = currentPage?.year || new Date().getFullYear();
  const nextYear = currentYear + 1;

  const options = [
    {
      id: 'next-year',
      icon: Calendar,
      title: `Nästa år (${nextYear})`,
      description: `Skapa en tom sida för ${nextYear} med samma struktur (ringar delas automatiskt)`,
      color: 'green',
      action: onCreateNextYear
    }
  ];

  const handleOptionClick = (option) => {
    option.action();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Lägg till ny sida</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {options.map((option) => {
            const Icon = option.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-400',
              purple: 'bg-purple-100 text-purple-600 hover:bg-purple-50 border-purple-200 hover:border-purple-400',
              green: 'bg-green-100 text-green-600 hover:bg-green-50 border-green-200 hover:border-green-400'
            };

            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className={`
                  w-full flex items-start gap-4 p-4 rounded-sm border-2 transition-all
                  hover:shadow-md group
                  ${colorClasses[option.color]}
                `}
              >
                {/* Icon */}
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-sm flex items-center justify-center
                  bg-white shadow-sm group-hover:scale-110 transition-transform
                `}>
                  <Icon size={24} />
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>

                {/* Arrow indicator */}
                <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all">
                  →
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-sm transition-colors font-medium"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
