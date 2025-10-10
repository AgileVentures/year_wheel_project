import { AlertTriangle, Crown } from 'lucide-react';

export default function UpgradePrompt({ 
  title,
  message, 
  onUpgrade, 
  onCancel,
  currentUsage,
  limit
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4">
          <AlertTriangle className="text-yellow-600" size={32} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {title || 'Uppgradera till Premium'}
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          {message}
        </p>

        {/* Usage Stats */}
        {currentUsage !== undefined && limit !== undefined && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Nuvarande användning
              </span>
              <span className="text-sm font-bold text-gray-900">
                {currentUsage} / {limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Premium Benefits */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-3">
            <Crown className="text-blue-600 mr-2" size={20} />
            <h3 className="font-bold text-gray-900">
              Med Premium får du:
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Obegränsade årshjul</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Obegränsade team och medlemmar</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Alla exportformat</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Prioriterad support</span>
            </li>
          </ul>
        </div>

        {/* Pricing */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600 mb-2">Från bara</p>
          <div className="flex items-center justify-center gap-3">
            <div>
              <span className="text-3xl font-bold text-gray-900">64 kr</span>
              <span className="text-gray-600">/månad</span>
            </div>
            <span className="text-gray-400">eller</span>
            <div>
              <span className="text-2xl font-bold text-gray-900">79 kr</span>
              <span className="text-gray-600">/månad</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            (Årlig betalning ger 19% rabatt)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Inte nu
          </button>
          <button
            onClick={onUpgrade}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-colors"
          >
            Se planer
          </button>
        </div>
      </div>
    </div>
  );
}
