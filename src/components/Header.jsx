import { Save, RotateCcw, Menu, X, Download, Upload, Calendar, Image, ArrowLeft, ChevronDown, FileDown, FileUp, FolderOpen, History, Undo, Redo, Copy, Check, Sparkles, FileSpreadsheet, Eye, Link2, Share2, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Dropdown, { DropdownItem, DropdownDivider } from './Dropdown';
import PresenceIndicator from './PresenceIndicator';
import PublicShareButton from './PublicShareButton';
import PageNavigator from './PageNavigator';
import LanguageSwitcher from './LanguageSwitcher';
import OnboardingMenu from './OnboardingMenu';
import UndoHistoryMenu from './UndoHistoryMenu';
import TemplateSelectionModal from './TemplateSelectionModal';
import WheelCommentsPanel from './WheelCommentsPanel';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useState } from 'react';

function Header({ 
  onSave, 
  onSaveToFile, 
  onLoadFromFile,
  onExportData,
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
  undoHistory = [],
  currentHistoryIndex = 0,
  onJumpToHistory,
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
  // Template functionality
  onTemplateSelect,
  // Premium status
  isPremium = false,
  // Wheel comments props
  wheelData = null,
  organizationData = null,
  onNavigateToItem = null
}) {
  const { t } = useTranslation(['common', 'subscription']);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showImageExportMenu, setShowImageExportMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  
  // Get unread notification count for badge
  const { unreadCount } = useRealtimeNotifications({ autoFetch: wheelId ? true : false });
  
  const handleCopyToClipboard = async (format) => {
    onDownloadFormatChange && onDownloadFormatChange(format);
    // Trigger the download which will now copy to clipboard
    onDownloadImage && onDownloadImage(true); // Pass true to indicate clipboard
    
    // Show checkmark feedback
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleCopyPreviewLink = async () => {
    const previewUrl = `${window.location.origin}/preview-wheel/${wheelId}`;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopiedLink('preview');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy preview link:', err);
    }
  };

  const handleCopyEmbedLink = async () => {
    const embedUrl = `${window.location.origin}/embed/${wheelId}`;
    try {
      await navigator.clipboard.writeText(embedUrl);
      setCopiedLink('embed');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy embed link:', err);
    }
  };

  const handleExport = async (format) => {
    onDownloadFormatChange && onDownloadFormatChange(format);
    onDownloadImage && onDownloadImage(false);
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
        {/* History Menu - Hidden on mobile */}
        {onUndo && onRedo && (
          <>
            <div className="hidden md:flex items-center gap-1" data-onboarding="undo-redo">
              <UndoHistoryMenu
                history={undoHistory}
                currentIndex={currentHistoryIndex}
                jumpToIndex={onJumpToHistory}
                undo={onUndo}
                redo={onRedo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
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
          {onExportData && (
            <DropdownItem
              icon={FileSpreadsheet}
              label={
                <span className="flex items-center gap-2">
                  {t('common:header.exportData')}
                  <span className="text-xs font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">BETA</span>
                </span>
              }
              onClick={onExportData}
            />
          )}
          
          {/* Share Links Section */}
          {wheelId && isPublic && (
            <>
              <DropdownDivider />
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                {t('common:header.sharingLinks')}
              </div>
              <DropdownItem
                icon={Eye}
                label={copiedLink === 'preview' ? t('common:actions.linkCopied') : t('common:header.copyPreviewLink')}
                onClick={handleCopyPreviewLink}
              />
              <DropdownItem
                icon={Link2}
                label={
                  <span className="flex items-center gap-2">
                    {copiedLink === 'embed' ? t('common:actions.linkCopied') : t('common:header.copyEmbedLink')}
                    <span className="text-xs font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">BETA</span>
                  </span>
                }
                onClick={handleCopyEmbedLink}
              />
            </>
          )}
          
          <DropdownDivider />
          {onTemplateSelect && (
            <DropdownItem
              icon={Sparkles}
              label={t('common:header.useTemplate')}
              onClick={() => setShowTemplateModal(true)}
            />
          )}
          <DropdownItem
            icon={RotateCcw}
            label={t('common:header.resetAll')}
            onClick={onReset}
            variant="danger"
          />
        </Dropdown>
        </div>
        
        {/* Image Export Menu - Hidden on mobile */}
        <div className="hidden lg:flex relative" data-onboarding="export-share">
          <button
            onClick={() => setShowImageExportMenu(!showImageExportMenu)}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors flex items-center gap-1"
            title={t('common:header.imageExport')}
          >
            <Image size={16} />
            <ChevronDown size={14} />
          </button>

          {showImageExportMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowImageExportMenu(false)}
              ></div>
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-sm shadow-xl z-50 w-72">
                {/* PNG Transparent */}
                <button
                  onClick={() => { handleExport('png'); setShowImageExportMenu(false); }}
                  disabled={!isPremium}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                    !isPremium 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <FileDown className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {t('common:header.pngTransparent')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('common:header.pngTransparentDesc')}
                    </div>
                  </div>
                  {!isPremium && (
                    <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded">
                      {t('subscription:premium')}
                    </span>
                  )}
                </button>

                {/* PNG White Background */}
                <button
                  onClick={() => { handleExport('png-white'); setShowImageExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <FileDown className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {t('common:header.pngWhite')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('common:header.pngWhiteDesc')}
                    </div>
                  </div>
                </button>

                {/* JPEG */}
                <button
                  onClick={() => { handleExport('jpeg'); setShowImageExportMenu(false); }}
                  disabled={!isPremium}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                    !isPremium 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <FileDown className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">JPEG</div>
                    <div className="text-xs text-gray-500">
                      {t('common:header.jpegDesc')}
                    </div>
                  </div>
                  {!isPremium && (
                    <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded">
                      {t('subscription:premium')}
                    </span>
                  )}
                </button>

                {/* SVG */}
                <button
                  onClick={() => { handleExport('svg'); setShowImageExportMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <FileDown className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">SVG</div>
                    <div className="text-xs text-gray-500">
                      {t('common:header.svgDesc')}
                    </div>
                  </div>
                </button>

                {/* PDF */}
                <button
                  onClick={() => { handleExport('pdf'); setShowImageExportMenu(false); }}
                  disabled={!isPremium}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                    !isPremium 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <FileDown className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">PDF</div>
                    <div className="text-xs text-gray-500">
                      {t('common:header.pdfDesc')}
                    </div>
                  </div>
                  {!isPremium && (
                    <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded">
                      {t('subscription:premium')}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
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
              <span className="absolute -top-1 -right-1 text-xs font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
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

        {/* Comments Button with notification badge (only show for database wheels) */}
        {wheelId && (
          <>
            <div className="hidden lg:block w-px h-8 bg-gray-300"></div>
            
            {/* Wheel Comments Button with Badge */}
            <button
              onClick={() => {
                console.log('Comments button clicked', { wheelData, organizationData });
                if (!wheelData) {
                  console.warn('wheelData is missing');
                  return;
                }
                setShowCommentsPanel(true);
              }}
              className="relative flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title={t('notifications:wheelComments.allComments')}
            >
              <MessageSquare size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
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
          data-onboarding="save-button"
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

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onTemplateSelect={onTemplateSelect}
      />

      {/* Wheel Comments Panel */}
      {showCommentsPanel && wheelData && (
        <WheelCommentsPanel
          wheel={wheelData}
          organizationData={organizationData}
          onClose={() => setShowCommentsPanel(false)}
          onNavigateToItem={onNavigateToItem}
        />
      )}
    </header>
  );
}

export default Header;
