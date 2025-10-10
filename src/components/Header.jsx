import { Save, RotateCcw, Menu, X, Download, Upload, Calendar, Image, ArrowLeft, ChevronDown, FileDown, FileUp, FolderOpen, History, Undo, Redo, Copy, Check } from 'lucide-react';
import Dropdown, { DropdownItem, DropdownDivider } from './Dropdown';
import PresenceIndicator from './PresenceIndicator';
import PublicShareButton from './PublicShareButton';
import PageNavigator from './PageNavigator';
import { useState } from 'react';

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
  onDownloadFormatChange,
  onBackToDashboard,
  isSaving = false,
  activeUsers = [],
  isPublic = false,
  wheelId = null,
  onTogglePublic,
  onVersionHistory,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  // Page navigation props
  pages = [],
  currentPageId,
  onPageChange,
  onAddPage,
  onDeletePage
}) {
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(null);
  
  const handleCopyToClipboard = async (format) => {
    onDownloadFormatChange && onDownloadFormatChange(format);
    // Trigger the download which will now copy to clipboard
    onDownloadImage && onDownloadImage(true); // Pass true to indicate clipboard
    
    // Show checkmark feedback
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };
  
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        {/* Symbol & Toggle Menu */}
        <div className="flex items-center gap-4">
          {/* Always show toggle button */}
          <button
            onClick={onToggleSidebar}
            className="p-2.5 hover:bg-gray-100 rounded-sm transition-colors text-gray-700"
            aria-label={isSidebarOpen ? "Close panel" : "Open panel"}
            title={isSidebarOpen ? "Stäng panel" : "Öppna panel"}
          >
            {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
          
          {/* Logo - click to go back to dashboard if available */}
          <img 
            src="/year_wheel_symbol.svg" 
            alt="YearWheel" 
            className={`w-12 h-12 transition-transform ${onBackToDashboard ? 'hover:scale-110 cursor-pointer' : ''}`}
            onClick={onBackToDashboard}
            title={onBackToDashboard ? "Tillbaka till mina hjul" : "YearWheel"}
          />
        </div>
        
        {/* Page Navigator (if multi-page) or Year selector (legacy) */}
        {pages && pages.length > 0 ? (
          <PageNavigator
            pages={pages}
            currentPageId={currentPageId}
            onPageChange={onPageChange}
            onAddPage={onAddPage}
            onDeletePage={onDeletePage}
            disabled={isSaving}
          />
        ) : (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-sm border border-gray-200">
            <Calendar size={14} className="text-gray-600" />
            <input
              type="number"
              value={year || "2025"}
              onChange={(e) => onYearChange(e.target.value)}
              min="1900"
              max="2100"
              className="w-20 px-2 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="År"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Undo/Redo Buttons */}
        {onUndo && onRedo && (
          <>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Ångra (Ctrl+Z)"
              aria-label="Ångra"
            >
              <Undo size={14} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Gör om (Ctrl+Shift+Z)"
              aria-label="Gör om"
            >
              <Redo size={14} />
            </button>
            <div className="w-px h-8 bg-gray-300"></div>
          </>
        )}
        
        {/* File Operations Dropdown */}
        <Dropdown
          trigger={
            <button 
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title="Filoperationer"
            >
              <FolderOpen size={14} />
            </button>
          }
        >
          <DropdownItem
            icon={Upload}
            label="Importera (.yrw)"
            onClick={onLoadFromFile}
          />
          <DropdownItem
            icon={Download}
            label="Exportera (.yrw)"
            onClick={onSaveToFile}
          />
          <DropdownDivider />
          <DropdownItem
            icon={RotateCcw}
            label="Återställ allt"
            onClick={onReset}
            variant="danger"
          />
        </Dropdown>
        
        {/* Image Export with Format Selector */}
        <div className="relative flex items-center gap-1">
          {/* Format Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFormatDropdown(!showFormatDropdown)}
              className="px-2.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors border border-gray-300 flex items-center gap-1.5"
              title="Välj bildformat"
            >
              <Image size={14} />
              <span className="uppercase">{downloadFormat || 'PNG'}</span>
              <ChevronDown size={14} />
            </button>
            
            {showFormatDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowFormatDropdown(false)}
                ></div>
                <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-sm shadow-xl z-50 min-w-[180px]">
                  <button
                    onClick={() => {
                      onDownloadFormatChange && onDownloadFormatChange('png');
                      setShowFormatDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <FileDown size={14} className="text-gray-500" />
                    PNG (Transparent)
                  </button>
                  <button
                    onClick={() => {
                      onDownloadFormatChange && onDownloadFormatChange('png-white');
                      setShowFormatDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <FileDown size={14} className="text-gray-500" />
                    PNG (Vit bakgrund)
                  </button>
                  <button
                    onClick={() => {
                      onDownloadFormatChange && onDownloadFormatChange('jpeg');
                      setShowFormatDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <FileDown size={14} className="text-gray-500" />
                    JPEG
                  </button>
                  <button
                    onClick={() => {
                      onDownloadFormatChange && onDownloadFormatChange('svg');
                      setShowFormatDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <FileDown size={14} className="text-gray-500" />
                    SVG
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Copy to Clipboard Button */}
          <button
            onClick={() => handleCopyToClipboard(downloadFormat)}
            className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors relative"
            title="Kopiera till urklipp"
          >
            {copiedFormat ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy size={14} />
            )}
          </button>
          
          {/* Download Button */}
          <button
            onClick={() => {
              onDownloadImage && onDownloadImage(false);
            }}
            className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
            title="Ladda ner bild"
          >
            <Download size={14} />
          </button>
        </div>
        
        {/* Presence Indicator */}
        {activeUsers.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-300"></div>
            <PresenceIndicator activeUsers={activeUsers} />
          </>
        )}
        
        {/* Public Share Toggle (only show for database wheels) */}
        {wheelId && onTogglePublic && (
          <>
            <div className="w-px h-8 bg-gray-300"></div>
            <PublicShareButton 
              isPublic={isPublic}
              wheelId={wheelId}
              onTogglePublic={onTogglePublic}
            />
          </>
        )}
        
        {/* Version History (only show for database wheels) */}
        {wheelId && onVersionHistory && (
          <>
            <div className="w-px h-8 bg-gray-300"></div>
            <button
              onClick={onVersionHistory}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title="Visa versionshistorik"
            >
              <History size={14} />
              <span>Historik</span>
            </button>
          </>
        )}
        
        <div className="w-px h-8 bg-gray-300"></div>
        
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          title={onBackToDashboard ? "Spara till databas" : "Spara till webbläsarlagring"}
        >
          <Save size={14} />
          <span>{isSaving ? 'Sparar...' : 'Spara'}</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
