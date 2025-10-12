import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    preferences: false,
    statistics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allPreferences = {
      necessary: true,
      preferences: true,
      statistics: true,
      marketing: true
    };
    saveConsent(allPreferences);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      preferences: false,
      statistics: false,
      marketing: false
    };
    saveConsent(necessaryOnly);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const saveConsent = (prefs) => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      preferences: prefs,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
    setShowDetails(false);
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return; // Can't disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Cookie className="text-orange-600" size={20} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Cookie-inställningar</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6 leading-relaxed">
            Vi använder cookies för att förbättra din upplevelse på vår webbplats, personalisera innehåll och annonser, 
            tillhandahålla funktioner för sociala medier och analysera vår trafik. Vi delar också information om din 
            användning av vår webbplats med våra partners för sociala medier, annonsering och analys.
          </p>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-orange-600 hover:text-orange-700 font-medium mb-4 flex items-center gap-2"
          >
            {showDetails ? 'Dölj detaljer' : 'Visa detaljer'}
            <span className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* Details Panel */}
          {showDetails && (
            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Nödvändiga cookies</h3>
                  <div className="relative inline-block w-11 h-6">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="opacity-0 w-0 h-0"
                    />
                    <span className="absolute cursor-not-allowed inset-0 bg-gray-400 rounded-full transition-all">
                      <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all transform translate-x-5"></span>
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Dessa cookies är nödvändiga för att webbplatsen ska fungera och kan inte stängas av.
                </p>
              </div>

              {/* Preferences Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Preferens-cookies</h3>
                  <button
                    onClick={() => togglePreference('preferences')}
                    className="relative inline-block w-11 h-6"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.preferences}
                      onChange={() => {}}
                      className="opacity-0 w-0 h-0"
                    />
                    <span className={`absolute cursor-pointer inset-0 rounded-full transition-all ${
                      preferences.preferences ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all transform ${
                        preferences.preferences ? 'translate-x-5' : ''
                      }`}></span>
                    </span>
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Dessa cookies gör det möjligt för webbplatsen att komma ihåg val du gjort och tillhandahålla 
                  förbättrade, mer personliga funktioner.
                </p>
              </div>

              {/* Statistics Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Statistik-cookies</h3>
                  <button
                    onClick={() => togglePreference('statistics')}
                    className="relative inline-block w-11 h-6"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.statistics}
                      onChange={() => {}}
                      className="opacity-0 w-0 h-0"
                    />
                    <span className={`absolute cursor-pointer inset-0 rounded-full transition-all ${
                      preferences.statistics ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all transform ${
                        preferences.statistics ? 'translate-x-5' : ''
                      }`}></span>
                    </span>
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Dessa cookies hjälper oss att förstå hur besökare interagerar med webbplatsen genom att samla in 
                  och rapportera information anonymt.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Marknadsförings-cookies</h3>
                  <button
                    onClick={() => togglePreference('marketing')}
                    className="relative inline-block w-11 h-6"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => {}}
                      className="opacity-0 w-0 h-0"
                    />
                    <span className={`absolute cursor-pointer inset-0 rounded-full transition-all ${
                      preferences.marketing ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all transform ${
                        preferences.marketing ? 'translate-x-5' : ''
                      }`}></span>
                    </span>
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Dessa cookies används för att spåra besökare på olika webbplatser med syfte att visa relevanta annonser.
                </p>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-4 text-sm mb-6">
            <a href="/privacy" className="text-gray-600 hover:text-gray-900 underline">
              Integritetspolicy
            </a>
            <a href="/cookies" className="text-gray-600 hover:text-gray-900 underline">
              Cookie Policy
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          {showDetails ? (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleAcceptNecessary}
                className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold 
                         border border-gray-300 transition-colors"
              >
                Acceptera nödvändiga
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold 
                         transition-colors shadow-lg"
              >
                Spara preferenser
              </button>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleAcceptNecessary}
                className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-semibold 
                         border border-gray-300 transition-colors"
              >
                Acceptera nödvändiga
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold 
                         transition-colors shadow-lg"
              >
                Acceptera alla
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
