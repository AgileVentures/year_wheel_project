import { Save, RotateCcw, Menu, X, Download, Upload } from 'lucide-react';

function Header({ onSave, onSaveToFile, onLoadFromFile, onReset, isSidebarOpen, onToggleSidebar }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isSidebarOpen ? "Close panel" : "Open panel"}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-gray-900">
            YearWheel
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw size={16} />
          <span>Återställ</span>
        </button>
        
        <button
          onClick={onLoadFromFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Ladda från fil (.yrw)"
        >
          <Upload size={16} />
          <span>Ladda</span>
        </button>
        
        <button
          onClick={onSaveToFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Spara till fil (.yrw)"
        >
          <Download size={16} />
          <span>Exportera</span>
        </button>
        
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
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
