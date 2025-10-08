import { Save, RotateCcw, Menu, X, Download, Upload, Calendar, Image } from 'lucide-react';

function Header({ 
  onSave, 
  onSaveToFile, 
  onLoadFromFile, 
  onReset, 
  isSidebarOpen, 
  onToggleSidebar, 
  year = "2025", 
  onYearChange,
  onDownloadImage,
  downloadFormat = "png",
  onDownloadFormatChange
}) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
          aria-label={isSidebarOpen ? "Close panel" : "Open panel"}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-gray-900">
            YearWheel
          </div>
          
          {/* Year selector */}
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="number"
              value={year || "2025"}
              onChange={(e) => onYearChange(e.target.value)}
              min="1900"
              max="2100"
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="År"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
        >
          <RotateCcw size={16} />
          <span>Återställ</span>
        </button>
        
        <div className="w-px h-6 bg-gray-300"></div>
        
        <button
          onClick={onLoadFromFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
          title="Ladda från fil (.yrw)"
        >
          <Upload size={16} />
          <span>Importera</span>
        </button>
        
        <button
          onClick={onSaveToFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
          title="Spara till fil (.yrw)"
        >
          <Download size={16} />
          <span>Exportera</span>
        </button>
        
        <div className="w-px h-6 bg-gray-300"></div>
        
        {/* Download Image Controls */}
        <select
          value={downloadFormat}
          onChange={(e) => onDownloadFormatChange && onDownloadFormatChange(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-sm text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          title="Bildformat"
        >
          <option value="png">PNG (Transparent)</option>
          <option value="png-white">PNG (Vit bakgrund)</option>
          <option value="jpeg">JPEG</option>
          <option value="svg">SVG</option>
        </select>
        
        <button
          onClick={onDownloadImage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
          title="Ladda ner bild"
        >
          <Image size={16} />
          <span>Ladda ner bild</span>
        </button>
        
        <div className="w-px h-6 bg-gray-300"></div>
        
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-sm transition-colors"
          title="Spara till webbläsarlagring"
        >
          <Save size={16} />
          <span>Spara</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
