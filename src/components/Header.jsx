import { Save, RotateCcw, Menu, X } from 'lucide-react';

function Header({ onSave, onReset, isSidebarOpen, onToggleSidebar }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-sm transition-colors duration-200"
          aria-label={isSidebarOpen ? "Stäng panelen" : "Öppna panelen"}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-sm flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">Å</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Årshjul</h1>
            <p className="text-xs text-gray-500">Planera ditt år visuellt</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors duration-200 font-medium"
        >
          <RotateCcw size={18} />
          <span>Återställ</span>
        </button>
        
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-sm transition-colors duration-200 font-medium shadow-sm"
        >
          <Save size={18} />
          <span>Spara</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
