import { Save, RotateCcw, Menu, X, Download, Upload, Calendar, Image, ArrowLeft, ChevronDown, FileDown, FolderOpen, History, Undo, Redo, Check, Sparkles, FileSpreadsheet, Eye, Link2, MessageSquare, Clipboard, Presentation, MoreVertical, Globe, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { useState, useEffect } from 'react';

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
  const navigate = useNavigate();
  const [showImageExportMenu, setShowImageExportMenu] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  
  useEffect(() => {
    if (!showMobileMenu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMobileMenu]);

  useEffect(() => {
    if (showMobileMenu) {
      setShowImageExportMenu(false);
    }
  }, [showMobileMenu]);

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

  const handleOpenPresentationMode = () => {
    if (wheelId) {
      navigate(`/preview-wheel/${wheelId}?presentation=true`);
    }
  };

  const handleExport = async (format) => {
    onDownloadFormatChange && onDownloadFormatChange(format);
    onDownloadImage && onDownloadImage(false);
  };

  const closeMobileMenu = () => setShowMobileMenu(false);

  const runMobileAction = (callback) => async () => {
    closeMobileMenu();
    if (typeof callback === 'function') {
      await callback();
    }
  };

  const mobileActionClass = 'w-full flex items-center justify-between px-4 py-3 rounded-sm bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50';
  const mobileDangerClass = 'w-full flex items-center justify-between px-4 py-3 rounded-sm bg-red-50 hover:bg-red-100 text-sm font-medium text-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50';

  const handleOpenCommentsPanel = () => {
    if (!wheelData) {
      console.warn('wheelData is missing');
      return;
    }
    setShowCommentsPanel(true);
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
              aria-label={t('common:header.fileOperations')}
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
                icon={Presentation}
                label={t('common:header.presentationMode')}
                onClick={handleOpenPresentationMode}
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
            aria-label={t('common:header.imageExport')}
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
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-sm shadow-xl z-50 w-80">
                {/* PNG Transparent */}
                <div className={`border-b border-gray-200 ${!isPremium ? 'bg-gray-50 opacity-50' : ''}`}>
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileDown className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {t('common:header.pngTransparent')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('common:header.pngTransparentDesc')}
                        </div>
                      </div>
                    </div>
                    {!isPremium && (
                      <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded ml-2">
                        {t('subscription:premium')}
                      </span>
                    )}
                  </div>
                  <div className="flex border-t border-gray-200">
                    <button
                      onClick={() => { handleExport('png'); setShowImageExportMenu(false); }}
                      disabled={!isPremium}
                      className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${
                        !isPremium ? 'cursor-not-allowed' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Download size={14} />
                      {t('common:actions.download')}
                    </button>
                    <div className="w-px bg-gray-200"></div>
                    <button
                      onClick={() => { handleCopyToClipboard('png'); setShowImageExportMenu(false); }}
                      disabled={!isPremium}
                      className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${
                        !isPremium ? 'cursor-not-allowed' : 'hover:bg-gray-100'
                      }`}
                    >
                      {copiedFormat === 'png' ? <Check size={14} className="text-green-600" /> : <Clipboard size={14} />}
                      {copiedFormat === 'png' ? t('common:actions.copied') : t('common:actions.copy')}
                    </button>
                  </div>
                </div>

                {/* PNG White Background */}
                <div className="border-b border-gray-200">
                  <div className="px-4 py-2 flex items-center gap-3">
                    <FileDown className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {t('common:header.pngWhite')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('common:header.pngWhiteDesc')}
                      </div>
                    </div>
                  </div>
                  <div className="flex border-t border-gray-200">
                    <button
                      onClick={() => { handleExport('png-white'); setShowImageExportMenu(false); }}
                      className="flex-1 px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={14} />
                      {t('common:actions.download')}
                    </button>
                    <div className="w-px bg-gray-200"></div>
                    <button
                      onClick={() => { handleCopyToClipboard('png-white'); setShowImageExportMenu(false); }}
                      className="flex-1 px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
                    >
                      {copiedFormat === 'png-white' ? <Check size={14} className="text-green-600" /> : <Clipboard size={14} />}
                      {copiedFormat === 'png-white' ? t('common:actions.copied') : t('common:actions.copy')}
                    </button>
                  </div>
                </div>

                {/* JPEG */}
                <div className={`border-b border-gray-200 ${!isPremium ? 'bg-gray-50 opacity-50' : ''}`}>
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileDown className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">JPEG</div>
                        <div className="text-xs text-gray-500">
                          {t('common:header.jpegDesc')}
                        </div>
                      </div>
                    </div>
                    {!isPremium && (
                      <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded ml-2">
                        {t('subscription:premium')}
                      </span>
                    )}
                  </div>
                  <div className="flex border-t border-gray-200">
                    <button
                      onClick={() => { handleExport('jpeg'); setShowImageExportMenu(false); }}
                      disabled={!isPremium}
                      className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${
                        !isPremium ? 'cursor-not-allowed' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Download size={14} />
                      {t('common:actions.download')}
                    </button>
                    <div className="w-px bg-gray-200"></div>
                    <button
                      onClick={() => { handleCopyToClipboard('jpeg'); setShowImageExportMenu(false); }}
                      disabled={!isPremium}
                      className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${
                        !isPremium ? 'cursor-not-allowed' : 'hover:bg-gray-100'
                      }`}
                    >
                      {copiedFormat === 'jpeg' ? <Check size={14} className="text-green-600" /> : <Clipboard size={14} />}
                      {copiedFormat === 'jpeg' ? t('common:actions.copied') : t('common:actions.copy')}
                    </button>
                  </div>
                </div>

                {/* SVG */}
                <div className="border-b border-gray-200">
                  <div className="px-4 py-2 flex items-center gap-3">
                    <FileDown className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">SVG</div>
                      <div className="text-xs text-gray-500">
                        {t('common:header.svgDesc')}
                      </div>
                    </div>
                  </div>
                  <div className="flex border-t border-gray-200">
                    <button
                      onClick={() => { handleExport('svg'); setShowImageExportMenu(false); }}
                      className="flex-1 px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download size={14} />
                      {t('common:actions.download')}
                    </button>
                    <div className="w-px bg-gray-200"></div>
                    <button
                      onClick={() => { handleCopyToClipboard('svg'); setShowImageExportMenu(false); }}
                      className="flex-1 px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
                    >
                      {copiedFormat === 'svg' ? <Check size={14} className="text-green-600" /> : <Clipboard size={14} />}
                      {copiedFormat === 'svg' ? t('common:actions.copied') : t('common:actions.copy')}
                    </button>
                  </div>
                </div>

                {/* PDF */}
                <div className={`${!isPremium ? 'bg-gray-50 opacity-50' : ''}`}>
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileDown className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">PDF</div>
                        <div className="text-xs text-gray-500">
                          {t('common:header.pdfDesc')}
                        </div>
                      </div>
                    </div>
                    {!isPremium && (
                      <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded ml-2">
                        {t('subscription:premium')}
                      </span>
                    )}
                  </div>
                  <div className="flex border-t border-gray-200">
                    <button
                      onClick={() => { handleExport('pdf'); setShowImageExportMenu(false); }}
                      disabled={!isPremium}
                      className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${
                        !isPremium ? 'cursor-not-allowed' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Download size={14} />
                      {t('common:actions.download')}
                    </button>
                  </div>
                </div>
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
              aria-label={t('common:header.aiAssistant')}
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
              onClick={handleOpenCommentsPanel}
              className="relative flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              title={t('notifications:wheelComments.allComments')}
              aria-label={t('notifications:wheelComments.allComments')}
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

        {/* Mobile "More" Menu - Shows hidden features on small screens */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileMenu(true)}
            className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-sm transition-colors relative"
            aria-label={t('common:header.moreOptions')}
            aria-expanded={showMobileMenu}
            aria-controls="mobile-header-drawer"
          >
            <MoreVertical size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9' : unreadCount}
              </span>
            )}
          </button>
        </div>
        
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

      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div
            id="mobile-header-drawer"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">{t('common:header.moreOptions')}</h2>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
                aria-label={t('common:actions.close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {(onUndo && onRedo) || onVersionHistory ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">{t('common:header.history')}</p>
                  <div className="space-y-2">
                    {onUndo && onRedo && (
                      <>
                        <button
                          type="button"
                          onClick={runMobileAction(onUndo)}
                          disabled={!canUndo}
                          className={mobileActionClass}
                        >
                          <span className="flex items-center gap-3">
                            <Undo size={16} aria-hidden="true" />
                            {t('common:header.undo')}
                          </span>
                          {undoLabel ? (
                            <span className="text-xs text-gray-500 truncate max-w-[120px]">{undoLabel}</span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={runMobileAction(onRedo)}
                          disabled={!canRedo}
                          className={mobileActionClass}
                        >
                          <span className="flex items-center gap-3">
                            <Redo size={16} aria-hidden="true" />
                            {t('common:header.redo')}
                          </span>
                          {redoLabel ? (
                            <span className="text-xs text-gray-500 truncate max-w-[120px]">{redoLabel}</span>
                          ) : null}
                        </button>
                      </>
                    )}
                    {onVersionHistory && (
                      <button
                        type="button"
                        onClick={runMobileAction(onVersionHistory)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <History size={16} aria-hidden="true" />
                          {t('common:header.versionHistory')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {(onLoadFromFile || onSaveToFile || onExportData || onTemplateSelect || onReset) && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">{t('common:header.fileOperations')}</p>
                  <div className="space-y-2">
                    {onLoadFromFile && (
                      <button
                        type="button"
                        onClick={runMobileAction(onLoadFromFile)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <Upload size={16} aria-hidden="true" />
                          {t('common:header.importFile')}
                        </span>
                      </button>
                    )}
                    {onSaveToFile && (
                      <button
                        type="button"
                        onClick={runMobileAction(onSaveToFile)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <Download size={16} aria-hidden="true" />
                          {t('common:header.exportFile')}
                        </span>
                      </button>
                    )}
                    {onExportData && (
                      <button
                        type="button"
                        onClick={runMobileAction(onExportData)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <FileSpreadsheet size={16} aria-hidden="true" />
                          <span className="flex items-center gap-2">
                            {t('common:header.exportData')}
                            <span className="text-xs font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">BETA</span>
                          </span>
                        </span>
                      </button>
                    )}
                    {onTemplateSelect && (
                      <button
                        type="button"
                        onClick={runMobileAction(() => setShowTemplateModal(true))}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <Sparkles size={16} aria-hidden="true" />
                          {t('common:header.useTemplate')}
                        </span>
                      </button>
                    )}
                    {onReset && (
                      <button
                        type="button"
                        onClick={runMobileAction(onReset)}
                        className={mobileDangerClass}
                      >
                        <span className="flex items-center gap-3">
                          <RotateCcw size={16} aria-hidden="true" />
                          {t('common:header.resetAll')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">{t('common:header.imageExport')}</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={runMobileAction(() => handleExport('png-white'))}
                    className={mobileActionClass}
                  >
                    <span className="flex items-center gap-3">
                      <Download size={16} aria-hidden="true" />
                      {t('common:actions.download')}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 truncate max-w-[120px]">
                      {t('common:header.pngWhite')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={runMobileAction(() => handleCopyToClipboard('png-white'))}
                    className={mobileActionClass}
                  >
                    <span className="flex items-center gap-3">
                      <Clipboard size={16} aria-hidden="true" />
                      {t('common:header.copyToClipboard')}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 truncate max-w-[120px]">
                      {t('common:header.pngWhite')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={runMobileAction(() => handleExport('svg'))}
                    className={mobileActionClass}
                  >
                    <span className="flex items-center gap-3">
                      <Download size={16} aria-hidden="true" />
                      {t('common:actions.download')}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={runMobileAction(() => handleExport('png'))}
                    disabled={!isPremium}
                    className={mobileActionClass}
                  >
                    <span className="flex items-center gap-3">
                      <Download size={16} aria-hidden="true" />
                      {t('common:actions.download')}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 truncate max-w-[120px]">
                      {t('common:header.pngTransparent')}
                      {!isPremium && (
                        <span className="text-amber-600">{t('subscription:premium')}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={runMobileAction(() => handleCopyToClipboard('png'))}
                    disabled={!isPremium}
                    className={mobileActionClass}
                  >
                    <span className="flex items-center gap-3">
                      <Clipboard size={16} aria-hidden="true" />
                      {t('common:header.copyToClipboard')}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 truncate max-w-[120px]">
                      {t('common:header.pngTransparent')}
                      {!isPremium && (
                        <span className="text-amber-600">{t('subscription:premium')}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={runMobileAction(() => handleExport('jpeg'))}
                    disabled={!isPremium}
                    className={mobileActionClass}
                  >
                    <span className="flex items-center gap-3">
                      <Download size={16} aria-hidden="true" />
                      {t('common:actions.download')}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      JPEG
                      {!isPremium && (
                        <span className="text-amber-600">{t('subscription:premium')}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={runMobileAction(() => handleExport('pdf'))}
                    disabled={!isPremium}
                    className={mobileActionClass}
                  >
                    <span className="flex items-center gap-3">
                      <Download size={16} aria-hidden="true" />
                      {t('common:actions.download')}
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      PDF
                      {!isPremium && (
                        <span className="text-amber-600">{t('subscription:premium')}</span>
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {wheelId && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">{t('common:actions.share')}</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={runMobileAction(handleOpenCommentsPanel)}
                      disabled={!wheelData}
                      className={mobileActionClass}
                    >
                      <span className="flex items-center gap-3">
                        <MessageSquare size={16} aria-hidden="true" />
                        {t('notifications:wheelComments.allComments')}
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {isPublic && (
                      <>
                        <button
                          type="button"
                          onClick={runMobileAction(handleCopyPreviewLink)}
                          className={mobileActionClass}
                        >
                          <span className="flex items-center gap-3">
                            <Eye size={16} aria-hidden="true" />
                            {copiedLink === 'preview' ? t('common:actions.linkCopied') : t('common:header.copyPreviewLink')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={runMobileAction(handleOpenPresentationMode)}
                          className={mobileActionClass}
                        >
                          <span className="flex items-center gap-3">
                            <Presentation size={16} aria-hidden="true" />
                            {t('common:header.presentationMode')}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={runMobileAction(handleCopyEmbedLink)}
                          className={mobileActionClass}
                        >
                          <span className="flex items-center gap-3">
                            <Link2 size={16} aria-hidden="true" />
                            {copiedLink === 'embed' ? t('common:actions.linkCopied') : t('common:header.copyEmbedLink')}
                          </span>
                          <span className="text-xs font-semibold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            BETA
                          </span>
                        </button>
                      </>
                    )}

                    {onTogglePublic && (
                      <button
                        type="button"
                        onClick={runMobileAction(onTogglePublic)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          {isPublic ? <Globe size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
                          {isPublic ? t('subscription:publicShare.public') : t('subscription:publicShare.private')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {isPublic ? t('subscription:publicShare.isPublic') : t('subscription:publicShare.makePublic')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(onToggleAI || onStartOnboarding || (isAdmin && onToggleTemplate)) && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">{t('common:actions.more')}</p>
                  <div className="space-y-2">
                    {onToggleAI && (
                      <button
                        type="button"
                        onClick={runMobileAction(onToggleAI)}
                        disabled={!isPremium}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <Sparkles size={16} aria-hidden="true" />
                          {t('common:header.aiAssistant')}
                        </span>
                        {!isPremium && (
                          <span className="text-xs text-amber-600 font-semibold">{t('subscription:premium')}</span>
                        )}
                      </button>
                    )}
                    {onStartOnboarding && (
                      <button
                        type="button"
                        onClick={runMobileAction(onStartOnboarding)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <Sparkles size={16} aria-hidden="true" />
                          {t('common:header.startTour')}
                        </span>
                      </button>
                    )}
                    {onStartAIOnboarding && onToggleAI && (
                      <button
                        type="button"
                        onClick={runMobileAction(onStartAIOnboarding)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <Sparkles size={16} aria-hidden="true" />
                          {t('common:header.aiTour')}
                        </span>
                      </button>
                    )}
                    {wheelId && isAdmin && onToggleTemplate && (
                      <button
                        type="button"
                        onClick={runMobileAction(onToggleTemplate)}
                        className={mobileActionClass}
                      >
                        <span className="flex items-center gap-3">
                          <Sparkles size={16} aria-hidden="true" />
                          {isTemplate ? t('common:header.template') : t('common:header.markAsTemplate')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
