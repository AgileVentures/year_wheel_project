import { Calendar, Palette, Layers, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

function EditorPanel({ 
  title, 
  year, 
  colors, 
  ringsData, 
  showYearEvents,
  showSeasonRing,
  showWeekRing,
  showMonthRing,
  onTitleChange,
  onYearChange,
  onColorChange,
  onRingsChange,
  onShowYearEventsChange,
  onShowSeasonRingChange,
  onShowWeekRingChange,
  onShowMonthRingChange
}) {
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    colors: true,
    display: true,
    rings: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleColorChange = (index, newColor) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    onColorChange(newColors);
  };

  const addColor = () => {
    if (colors.length < 8) {
      onColorChange([...colors, "#808080"]);
    }
  };

  const removeColor = (index) => {
    if (colors.length > 1) {
      onColorChange(colors.filter((_, i) => i !== index));
    }
  };

  const addRing = () => {
    onRingsChange([
      ...ringsData,
      {
        data: Array.from({ length: 12 }, () => [""]),
        orientation: "vertical"
      }
    ]);
  };

  const removeRing = (index) => {
    if (ringsData.length > 1) {
      onRingsChange(ringsData.filter((_, i) => i !== index));
    }
  };

  const updateRingData = (ringIndex, monthIndex, value) => {
    const newRingsData = [...ringsData];
    newRingsData[ringIndex].data[monthIndex] = value.split('\n');
    onRingsChange(newRingsData);
  };

  const updateRingOrientation = (ringIndex, orientation) => {
    const newRingsData = [...ringsData];
    newRingsData[ringIndex].orientation = orientation;
    onRingsChange(newRingsData);
  };

  const months = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December"
  ];

  return (
    <div className="p-6 space-y-6">
      {/* General Settings */}
      <section className="card">
        <button
          onClick={() => toggleSection('general')}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Calendar className="text-primary-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Allmänt</h2>
          </div>
          {expandedSections.general ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.general && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Mitt Årshjul"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                År
              </label>
              <select
                value={year}
                onChange={(e) => onYearChange(e.target.value)}
                className="input-field"
              >
                {Array.from({ length: 10 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Display Settings */}
      <section className="card">
        <button
          onClick={() => toggleSection('display')}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <svg className="text-primary-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"/>
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Visningsinställningar</h2>
          </div>
          {expandedSections.display ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.display && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-sm">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Månadsring
                </label>
                <p className="text-xs text-gray-600">
                  Visa yttre ringen med månadsnamn
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMonthRing}
                  onChange={(e) => onShowMonthRingChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-sm">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Veckoring
                </label>
                <p className="text-xs text-gray-600">
                  Visa ringen med veckonummer
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWeekRing}
                  onChange={(e) => onShowWeekRingChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-sm">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Kalenderhändelser
                </label>
                <p className="text-xs text-gray-600">
                  Visa helgdagar från kalendern
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showYearEvents}
                  onChange={(e) => onShowYearEventsChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-sm">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Årstider
                </label>
                <p className="text-xs text-gray-600">
                  Visa separat ring med årstider (vår, sommar, höst, vinter)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSeasonRing}
                  onChange={(e) => onShowSeasonRingChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Colors */}
      <section className="card">
        <button
          onClick={() => toggleSection('colors')}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Palette className="text-primary-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Färger</h2>
          </div>
          {expandedSections.colors ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.colors && (
          <div className="space-y-3">
            {colors.map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="color"
                  value={color || '#CCCCCC'}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  className="w-12 h-12 rounded-sm cursor-pointer border-2 border-gray-200"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="input-field"
                  />
                </div>
                {colors.length > 1 && (
                  <button
                    onClick={() => removeColor(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            {colors.length < 8 && (
              <button
                onClick={addColor}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-sm text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
              >
                <Plus size={18} />
                <span>Lägg till färg</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Rings */}
      <section className="card">
        <button
          onClick={() => toggleSection('rings')}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Layers className="text-primary-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Ringar</h2>
          </div>
          {expandedSections.rings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.rings && (
          <div className="space-y-4">
            {ringsData.map((ring, ringIndex) => (
              <div key={ringIndex} className="p-4 bg-gray-50 rounded-sm border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Ring {ringIndex + 1}</h3>
                  {ringsData.length > 1 && (
                    <button
                      onClick={() => removeRing(ringIndex)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <details className="group mb-3">
                  <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                    <span>⚙️ Avancerade inställningar</span>
                  </summary>
                  <div className="mt-3 pl-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Orientering
                      </label>
                      <select
                        value={ring.orientation}
                        onChange={(e) => updateRingOrientation(ringIndex, e.target.value)}
                        className="input-field text-sm"
                      >
                        <option value="vertical">Vertikal</option>
                        <option value="horizontal">Horisontell</option>
                      </select>
                    </div>
                  </div>
                </details>

                <div className="space-y-2">
                  {months.map((month, monthIndex) => (
                    <details key={monthIndex} className="group">
                      <summary className="cursor-pointer px-3 py-2 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors list-none flex justify-between items-center">
                        <span className="text-sm font-medium">{month}</span>
                        <ChevronDown size={16} className="group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-2 px-3">
                        <textarea
                          value={ring.data[monthIndex]?.join('\n') || ''}
                          onChange={(e) => updateRingData(ringIndex, monthIndex, e.target.value)}
                          placeholder={`Innehåll för ${month.toLowerCase()}...`}
                          rows={3}
                          className="input-field text-sm resize-none"
                        />
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={addRing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-sm text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
            >
              <Plus size={18} />
              <span>Lägg till ring</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default EditorPanel;
