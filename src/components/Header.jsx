import { Save, RotateCcw, Menu, X, Download, Upload, Calendar, Image, ArrowLeft, ChevronDown, FileDown, FileUp, FolderOpen, History, Undo, Redo, Copy, Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Dropdown, { DropdownItem, DropdownDivider } from './Dropdown';
import PresenceIndicator from './PresenceIndicator';
import PublicShareButton from './PublicShareButton';
import PageNavigator from './PageNavigator';
import LanguageSwitcher from './LanguageSwitcher';
import OnboardingMenu from './OnboardingMenu';
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
  isTemplate = false,
  wheelId = null,
  onTogglePublic,
  onToggleTemplate,
  isAdmin = false,
  onVersionHistory,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  undoLabel = '',
  redoLabel = '',
  undoToSave,
  unsavedChangesCount = 0,
  // Page navigation props
  pages = [],
  currentPageId,
  onPageChange,
  onAddPage,
  onDeletePage,
  // AI Assistant props
  onToggleAI,
  // Onboarding props
  onStartOnboarding,
  onStartAIOnboarding,
  // Premium status
  isPremium = false
}) {
  const { t } = useTranslation(['common', 'subscription']);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const handleCopyToClipboard = async (format) => {
    onDownloadFormatChange && onDownloadFormatChange(format);
    // Trigger the download which will now copy to clipboard
    onDownloadImage && onDownloadImage(true); // Pass true to indicate clipboard
    
    // Show checkmark feedback
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };
  
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Toggle Menu & Back Button */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Always show toggle button */}
          <button
            onClick={onToggleSidebar}
            className="p-2.5 hover:bg-gray-100 rounded-sm transition-colors text-gray-700"
            aria-label={isSidebarOpen ? t('common:header.closePanel') : t('common:header.openPanel')}
            title={isSidebarOpen ? t('common:header.closePanel') : t('common:header.openPanel')}
          >
            {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
          
          {/* Back to Dashboard Button (if available) */}
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title={t('common:header.backToDashboard')}
              aria-label={t('common:header.backToDashboard')}
            >
              <ArrowLeft size={18} />
            </button>
          )}
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
              placeholder={t('common:header.yearPlaceholder')}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        {/* Undo/Redo Buttons with Keyboard Hints - Hidden on mobile */}
        {onUndo && onRedo && (
          <>
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="flex items-center gap-1.5 px-2.5 py-2 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed group relative"
                title={`${t('common:actions.undo')}${undoLabel ? ': ' + undoLabel : ''} (Ctrl+Z)`}
                aria-label={t('common:actions.undo')}
              >
                <Undo size={14} />
                {/* Show descriptive label if available */}
                {undoLabel && canUndo && (
                  <span className="text-xs max-w-[120px] truncate">
                    {undoLabel}
                  </span>
                )}
                {/* Keyboard hint tooltip */}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Ctrl+Z{undoLabel && ` • ${undoLabel}`}
                </span>
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="flex items-center gap-1.5 px-2.5 py-2 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed group relative"
                title={`${t('common:actions.redo')}${redoLabel ? ': ' + redoLabel : ''} (Ctrl+Shift+Z)`}
                aria-label={t('common:actions.redo')}
              >
                <Redo size={14} />
                {/* Show descriptive label if available */}
                {redoLabel && canRedo && (
                  <span className="text-xs max-w-[120px] truncate">
                    {redoLabel}
                  </span>
                )}
                {/* Keyboard hint tooltip */}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Ctrl+Shift+Z{redoLabel && ` • ${redoLabel}`}
                </span>
              </button>
              {/* "Till sparning" button removed - use Historik feature instead for restoring saved versions */}
            </div>
            <div className="hidden md:block w-px h-8 bg-gray-300"></div>
          </>
        )}
        
        {/* File Operations Dropdown - Hidden on mobile */}
        <div className="hidden md:block">
        <Dropdown
          trigger={
            <button 
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title={t('common:header.fileOperations')}
            >
              <FolderOpen size={14} />
            </button>
          }
        >
          <DropdownItem
            icon={Upload}
            label={t('common:header.importFile')}
            onClick={onLoadFromFile}
          />
          <DropdownItem
            icon={Download}
            label={t('common:header.exportFile')}
            onClick={onSaveToFile}
          />
          <DropdownDivider />
          <DropdownItem
            icon={RotateCcw}
            label={t('common:header.resetAll')}
            onClick={onReset}
            variant="danger"
          />
        </Dropdown>
        </div>
        
        {/* Image Export with Format Selector - Hidden on mobile */}
        <div className="hidden lg:flex relative items-center gap-1" data-onboarding="export-share">
          {/* Format Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFormatDropdown(!showFormatDropdown)}
              className="px-2.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors border border-gray-300 flex items-center gap-1.5"
              title={t('common:header.selectImageFormat')}
            >
              <Image size={14} />
              <span className="uppercase">
                {downloadFormat === 'png-white' ? 'PNG' : (downloadFormat || 'PNG')}
              </span>
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
                    disabled={!isPremium}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                      !isPremium 
                        ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <FileDown size={14} className="text-gray-500" />
                    <span className="flex-1">{t('common:header.pngTransparent')}</span>
                    {!isPremium && (
                      <span className="text-xs text-amber-600 font-medium">
                        {t('subscription:premium')}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onDownloadFormatChange && onDownloadFormatChange('png-white');
                      setShowFormatDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <FileDown size={14} className="text-gray-500" />
                    {t('common:header.pngWhite')}
                  </button>
                  <button
                    onClick={() => {
                      onDownloadFormatChange && onDownloadFormatChange('jpeg');
                      setShowFormatDropdown(false);
                    }}
                    disabled={!isPremium}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                      !isPremium 
                        ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <FileDown size={14} className="text-gray-500" />
                    <span className="flex-1">JPEG</span>
                    {!isPremium && (
                      <span className="text-xs text-amber-600 font-medium">
                        {t('subscription:premium')}
                      </span>
                    )}
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
                  <button
                    onClick={() => {
                      onDownloadFormatChange && onDownloadFormatChange('pdf');
                      setShowFormatDropdown(false);
                    }}
                    disabled={!isPremium}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                      !isPremium 
                        ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <FileDown size={14} className="text-gray-500" />
                    <span className="flex-1">PDF</span>
                    {!isPremium && (
                      <span className="text-xs text-amber-600 font-medium">
                        {t('subscription:premium')}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Copy to Clipboard Button */}
          <button
            onClick={() => handleCopyToClipboard(downloadFormat)}
            className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors relative"
            title={t('common:header.copyToClipboard')}
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
            title={t('common:header.downloadImage')}
          >
            <Download size={14} />
          </button>
        </div>
        
        {/* Presence Indicator - Hidden on small screens */}
        {activeUsers.length > 0 && (
          <>
            <div className="hidden lg:block w-px h-8 bg-gray-300"></div>
            <div className="hidden lg:block">
              <PresenceIndicator activeUsers={activeUsers} />
            </div>
          </>
        )}
        
        {/* Public Share Toggle (only show for database wheels) - Hidden on small screens */}
        {wheelId && onTogglePublic && (
          <>
            <div className="hidden lg:block w-px h-8 bg-gray-300"></div>
            <div className="hidden lg:block">
              <PublicShareButton 
                isPublic={isPublic}
                wheelId={wheelId}
                onTogglePublic={onTogglePublic}
              />
            </div>
          </>
        )}
        
        {/* Template Toggle (only show for admins) - Hidden on small screens */}
        {wheelId && isAdmin && onToggleTemplate && (
          <button
            onClick={onToggleTemplate}
            className={`hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
              isTemplate
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={isTemplate ? t('common:header.templateWheelVisibleOnLanding') : t('common:header.markAsTemplate')}
          >
            <Sparkles size={14} />
            {isTemplate ? t('common:header.template') : t('common:header.markAsTemplate')}
          </button>
        )}
        
        {/* Version History (only show for database wheels) - Hidden on small screens */}
        {wheelId && onVersionHistory && (
          <>
            <div className="hidden lg:block w-px h-8 bg-gray-300"></div>
            <button
              onClick={onVersionHistory}
              className="hidden lg:flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title={t('common:header.versionHistory')}
            >
              <History size={14} />
              <span>{t('common:header.history')}</span>
            </button>
          </>
        )}

        {/* AI Assistant Toggle (only show for database wheels) */}
        {wheelId && onToggleAI && (
          <div className="relative">
            <button
              onClick={onToggleAI}
              disabled={!isPremium}
              className={`p-2.5 rounded-sm transition-colors ${
                isPremium 
                  ? 'text-gray-700 hover:bg-gray-100' 
                  : 'text-gray-400 cursor-not-allowed opacity-50'
              }`}
              title={isPremium ? t('common:header.aiAssistant') : `${t('common:header.aiAssistant')} - ${t('subscription:premium')}`}
            >
              <Sparkles size={14} className={isPremium ? "text-amber-500" : "text-gray-400"} />
            </button>
            {!isPremium && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-sm shadow-sm">
                PRO
              </span>
            )}
          </div>
        )}

        {/* Onboarding Help Menu - Hidden on small screens */}
        {onStartOnboarding && (
          <>
            <div className="hidden lg:block w-px h-8 bg-gray-300"></div>
            <div className="hidden lg:block">
              <OnboardingMenu
                onStartEditorGuide={onStartOnboarding}
                onStartAIGuide={onStartAIOnboarding}
                showAIOption={!!wheelId && !!onToggleAI}
              />
            </div>
          </>
        )}
        
        <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
        
        {/* Language Switcher - Always visible */}
        <LanguageSwitcher />
        
        <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
        
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          title={onBackToDashboard ? t('common:header.saveToDatabase') : t('common:header.saveToBrowser')}
        >
          <Save size={14} />
          <span className="hidden sm:inline">
            {isSaving ? t('common:header.saving') : t('common:actions.save')}
            {!isSaving && unsavedChangesCount > 0 && (
              <span className="ml-1 text-xs opacity-90">({unsavedChangesCount})</span>
            )}
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;
