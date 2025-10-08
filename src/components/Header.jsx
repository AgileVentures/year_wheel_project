import { Save, RotateCcw, Menu, X, Download, Upload, Calendar, Image, ArrowLeft, ChevronDown, FileDown, FileUp, FolderOpen } from 'lucide-react';
import Dropdown, { DropdownItem, DropdownDivider } from './Dropdown';
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
  isSaving = false
}) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onBackToDashboard ? (
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-sm transition-colors text-gray-700"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Mina hjul</span>
          </button>
        ) : (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-sm transition-colors"
            aria-label={isSidebarOpen ? "Close panel" : "Open panel"}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        
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
        {/* File Operations Dropdown */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors">
              <FolderOpen size={16} />
              <span>Fil</span>
              <ChevronDown size={14} />
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
        
        <div className="w-px h-6 bg-gray-300"></div>
        
        {/* Download Image Dropdown */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors">
              <Image size={16} />
              <span>Ladda ner bild</span>
              <ChevronDown size={14} />
            </button>
          }
        >
          <DropdownItem
            icon={FileDown}
            label="PNG (Transparent)"
            onClick={() => {
              onDownloadFormatChange && onDownloadFormatChange('png');
              onDownloadImage && onDownloadImage();
            }}
          />
          <DropdownItem
            icon={FileDown}
            label="PNG (Vit bakgrund)"
            onClick={() => {
              onDownloadFormatChange && onDownloadFormatChange('png-white');
              onDownloadImage && onDownloadImage();
            }}
          />
          <DropdownItem
            icon={FileDown}
            label="JPEG"
            onClick={() => {
              onDownloadFormatChange && onDownloadFormatChange('jpeg');
              onDownloadImage && onDownloadImage();
            }}
          />
          <DropdownItem
            icon={FileDown}
            label="SVG"
            onClick={() => {
              onDownloadFormatChange && onDownloadFormatChange('svg');
              onDownloadImage && onDownloadImage();
            }}
          />
        </Dropdown>
        
        <div className="w-px h-6 bg-gray-300"></div>
        
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={onBackToDashboard ? "Spara till databas" : "Spara till webbläsarlagring"}
        >
          <Save size={16} />
          <span>{isSaving ? 'Sparar...' : 'Spara'}</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
