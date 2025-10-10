import { Save, RotateCcw, Menu, X, Download, Upload, Calendar, Image, ArrowLeft, ChevronDown, FileDown, FileUp, FolderOpen, History, Undo, Redo } from 'lucide-react';
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
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
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
            <Calendar size={20} className="text-gray-600" />
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
              <Undo size={20} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Gör om (Ctrl+Shift+Z)"
              aria-label="Gör om"
            >
              <Redo size={20} />
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
              <FolderOpen size={20} />
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
        
        {/* Download Image Dropdown */}
        <Dropdown
          trigger={
            <button 
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title="Ladda ner bild"
            >
              <Image size={20} />
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
              <History size={18} />
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
          <Save size={18} />
          <span>{isSaving ? 'Sparar...' : 'Spara'}</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
