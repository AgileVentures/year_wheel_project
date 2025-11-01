import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { fetchWheel, fetchPages, fetchPageData, createWheel, createPage, saveWheelData } from '../services/wheelService';
import YearWheel from '../YearWheel';
import CastButton from './CastButton';
import { Eye, Lock, ChevronLeft, ChevronRight, Calendar, Copy, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import PresentationControlDialog from './PresentationControlDialog';
import { useCastManager } from '../hooks/useCastManager';
import { useRealtimeCast } from '../hooks/useRealtimeCast';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { CAST_MESSAGE_TYPES, HEARTBEAT_INTERVAL_MS } from '../constants/castMessages';

/**
 * PreviewWheelPage - Public read-only view of a wheel
 * Accessible at /preview-wheel/:wheelId
 * No authentication required for public wheels
 */
function PreviewWheelPage() {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Check if we're in presentation mode
  const isPresentationMode = searchParams.get('presentation') === 'true';
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wheelData, setWheelData] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPageItems, setCurrentPageItems] = useState([]);
  const [zoomedMonth, setZoomedMonth] = useState(null);
  const [zoomedQuarter, setZoomedQuarter] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const pendingCopyProcessedRef = useRef(false);
  const [showControlDialog, setShowControlDialog] = useState(false);
  
  // Local state for organizationData to allow toggling visibility
  const [localOrgData, setLocalOrgData] = useState(null);
  
  // Device detection
  const { isIOS, supportsCast } = useDeviceDetection();
  
  // Cast manager hooks (Chrome Cast for Android, Realtime for iOS)
  const { isCasting, sendCastMessage } = useCastManager();
  const realtimeCast = useRealtimeCast();
  const { 
    isConnected: isRealtimeConnected, 
    sendMessage: sendRealtimeMessage 
  } = realtimeCast;
  
  // Determine which casting method is active
  const isActivelyCasting = isCasting || isRealtimeConnected;
  const activeSendMessage = (isIOS || !supportsCast) ? sendRealtimeMessage : sendCastMessage;

  useEffect(() => {
    const loadWheel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch wheel data (RLS policies will handle access control)
        const data = await fetchWheel(wheelId);
        
        if (!data) {
          setError(t('common:previewWheelPage.wheelNotFound'));
          return;
        }

        console.log('[PreviewWheelPage] Wheel loaded:', { 
          id: data.id, 
          title: data.title, 
          is_public: data.is_public,
          rings: data.organizationData.rings.length,
          activityGroups: data.organizationData.activityGroups.length,
          items: data.organizationData.items.length 
        });
        setWheelData(data);
        setLocalOrgData(data.organizationData); // Initialize local org data
        
        // Fetch all pages for this wheel
        try {
          const pagesData = await fetchPages(wheelId);
          console.log('[PreviewWheelPage] Pages loaded:', pagesData.length);
          const sortedPages = pagesData.sort((a, b) => a.year - b.year);
          setPages(sortedPages);
          
          // If we have pages, load the first page's items
          if (sortedPages.length > 0) {
            console.log('[PreviewWheelPage] Loading items for first page:', sortedPages[0].id);
            setCurrentPageIndex(0);
            const items = await fetchPageData(sortedPages[0].id);
            console.log('[PreviewWheelPage] Items loaded for first page:', items.length);
            setCurrentPageItems(items);
          }
        } catch (pageErr) {
          console.error('Error loading pages:', pageErr);
          // If pages fail to load, just use the main wheel data
          setPages([]);
        }
      } catch (err) {
        console.error('Error loading public wheel:', err);
        
        if (err.code === 'PGRST116') {
          // No rows returned - wheel doesn't exist or isn't public
          setError(t('common:previewWheelPage.wheelNotFound'));
        } else {
          setError(t('common:previewWheelPage.errorLoading'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (wheelId) {
      loadWheel();
    }
  }, [wheelId]);

  // Load items when page changes
  useEffect(() => {
    const loadPageItems = async () => {
      if (pages.length > 0 && pages[currentPageIndex]) {
        try {
          console.log('[PreviewWheelPage] Loading items for page:', pages[currentPageIndex].id);
          const items = await fetchPageData(pages[currentPageIndex].id);
          console.log('[PreviewWheelPage] Loaded items:', items.length);
          setCurrentPageItems(items);
        } catch (err) {
          console.error('[PreviewWheelPage] Error loading page items:', err);
          setCurrentPageItems([]);
        }
      }
    };

    loadPageItems();
  }, [currentPageIndex, pages]);

  // Update localOrgData when currentPageItems change
  useEffect(() => {
    if (wheelData && localOrgData) {
      setLocalOrgData(prev => ({
        ...prev,
        items: currentPageItems
      }));
    }
  }, [currentPageItems, wheelData]);

  // Copy template to user's account
  const handleCopyTemplate = async () => {
    if (!user) {
      // Store template copy intent in localStorage for post-authentication
      const templateIntent = {
        wheelId: wheelId,
        wheelTitle: wheelData.title,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('pendingTemplateCopy', JSON.stringify(templateIntent));
      console.log('[PreviewWheelPage] Stored template copy intent:', templateIntent);
      
      const event = new CustomEvent('showToast', {
        detail: { message: t('common:previewWheelPage.loginToCopy'), type: 'info' }
      });
      window.dispatchEvent(event);
      
      // Redirect to auth page
      navigate('/auth');
      return;
    }

    try {
      setIsCopying(true);
      console.log('[PreviewWheelPage] Starting template copy...');

      // Create new wheel with template data (use template's year, not current year!)
      const templateYear = wheelData.year;
      const newWheelId = await createWheel({
        title: `${wheelData.title} (${t('common:previewWheelPage.copy')})`,
        year: templateYear, // Use template's year, not current year!
        colors: wheelData.colors,
        showWeekRing: wheelData.showWeekRing,
        showMonthRing: wheelData.showMonthRing,
        showRingNames: wheelData.showRingNames,
        showLabels: wheelData.showLabels,
        weekRingDisplayMode: wheelData.weekRingDisplayMode
        // Note: NOT passing organizationData here - will be set via pages
      });

      console.log('[PreviewWheelPage] New wheel created:', newWheelId, 'Year:', templateYear);
      let totalItemsCopied = 0;

      // CRITICAL: Create ID mappings for rings, groups, labels (like file import)
      const idMapping = {
        rings: {},
        activityGroups: {},
        labels: {}
      };

      // Regenerate ring IDs and create mapping
      const newRings = wheelData.organizationData.rings.map(ring => {
        const oldId = ring.id;
        const newId = crypto.randomUUID();
        idMapping.rings[oldId] = newId;
        return { ...ring, id: newId };
      });

      // Regenerate activity group IDs and create mapping
      const newActivityGroups = wheelData.organizationData.activityGroups.map(group => {
        const oldId = group.id;
        const newId = crypto.randomUUID();
        idMapping.activityGroups[oldId] = newId;
        return { ...group, id: newId };
      });

      // Regenerate label IDs and create mapping
      const newLabels = wheelData.organizationData.labels.map(label => {
        const oldId = label.id;
        const newId = crypto.randomUUID();
        idMapping.labels[oldId] = newId;
        return { ...label, id: newId };
      });

      console.log('[PreviewWheelPage] Created ID mappings:', {
        rings: Object.keys(idMapping.rings).length,
        activityGroups: Object.keys(idMapping.activityGroups).length,
        labels: Object.keys(idMapping.labels).length
      });

      // Copy all pages with their items (keep original years!)
      for (const page of pages) {
        console.log('[PreviewWheelPage] Processing page:', page.id, 'Year:', page.year);
        
        // Fetch items for this page
        const pageItems = await fetchPageData(page.id);
        console.log('[PreviewWheelPage] Fetched items for page:', pageItems.length);
        
        // Create new page for the new wheel FIRST (keep original year!)
        const newPage = await createPage(newWheelId, {
          year: page.year, // Keep template's page year!
          title: page.title,
          organizationData: {
            rings: newRings, // Use rings with new IDs
            activityGroups: newActivityGroups, // Use groups with new IDs
            labels: newLabels, // Use labels with new IDs
            items: [] // Will be saved separately
          },
          overrideColors: page.override_colors,
          overrideShowWeekRing: page.override_show_week_ring,
          overrideShowMonthRing: page.override_show_month_ring,
          overrideShowRingNames: page.override_show_ring_names
        });
        
        console.log('[PreviewWheelPage] New page created:', newPage.id, 'Year:', newPage.year);
        
        // Copy items with new IDs, remapped foreign keys, AND new pageId
        const adjustedItems = pageItems.map(item => ({
          ...item,
          id: crypto.randomUUID(), // New ID for new wheel
          pageId: newPage.id, // CRITICAL: Use new page ID, not template's pageId!
          ringId: idMapping.rings[item.ringId] || item.ringId,
          activityId: idMapping.activityGroups[item.activityId] || item.activityId,
          labelId: item.labelId ? (idMapping.labels[item.labelId] || item.labelId) : null
          // startDate and endDate stay the same!
        }));
        
        console.log('[PreviewWheelPage] Sample item with remapped IDs and new pageId:', adjustedItems[0]);

        // Save items to the new page
        if (adjustedItems.length > 0) {
          console.log('[PreviewWheelPage] Saving', adjustedItems.length, 'items to page:', newPage.id);
          await saveWheelData(newWheelId, {
            rings: newRings, // Use rings with new IDs
            activityGroups: newActivityGroups, // Use groups with new IDs
            labels: newLabels, // Use labels with new IDs
            items: adjustedItems
          }, newPage.id);
          console.log('[PreviewWheelPage] Items saved successfully');
          totalItemsCopied += adjustedItems.length;
        } else {
          console.log('[PreviewWheelPage] No items to save for this page');
        }
      }

      console.log('[PreviewWheelPage] Template copy complete. Total items:', totalItemsCopied);

      const successMessage = totalItemsCopied > 0 
        ? `${t('common:previewWheelPage.templateCopied')} (${totalItemsCopied} aktiviteter)`
        : t('common:previewWheelPage.templateCopied');
      
      const event = new CustomEvent('showToast', {
        detail: { message: successMessage, type: 'success' }
      });
      window.dispatchEvent(event);
      
      navigate(`/dashboard/wheel/${newWheelId}`);
    } catch (error) {
      console.error('[PreviewWheelPage] Error copying template:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: t('common:previewWheelPage.copyFailed'), type: 'error' }
      });
      window.dispatchEvent(event);
    } finally {
      setIsCopying(false);
    }
  };

  // Check for pending template copy after authentication
  useEffect(() => {
    const checkPendingCopy = async () => {
      console.log('[PreviewWheelPage] Checking pending copy...', {
        user: !!user,
        wheelData: !!wheelData,
        pagesLength: pages.length,
        wheelId,
        processed: pendingCopyProcessedRef.current
      });

      if (!user || !wheelData || !pages.length || pendingCopyProcessedRef.current) {
        return;
      }

      const pendingCopy = localStorage.getItem('pendingTemplateCopy');
      console.log('[PreviewWheelPage] Pending copy from localStorage:', pendingCopy);
      
      if (!pendingCopy) return;

      try {
        const intent = JSON.parse(pendingCopy);
        console.log('[PreviewWheelPage] Parsed intent:', intent);
        
        // Check if this is the wheel the user wanted to copy
        if (intent.wheelId === wheelId) {
          console.log('[PreviewWheelPage] wheelId matches! Proceeding with copy...');
          
          // Mark as processed to prevent double-execution
          pendingCopyProcessedRef.current = true;
          
          // Clear the pending copy first
          localStorage.removeItem('pendingTemplateCopy');
          
          // Show info toast
          const event = new CustomEvent('showToast', {
            detail: { 
              message: t('common:previewWheelPage.processingTemplate'), 
              type: 'info' 
            }
          });
          window.dispatchEvent(event);
          
          // Small delay to ensure all data is loaded
          setTimeout(() => {
            console.log('[PreviewWheelPage] Triggering handleCopyTemplate...');
            handleCopyTemplate();
          }, 1000);
        } else {
          console.log('[PreviewWheelPage] wheelId mismatch. Intent:', intent.wheelId, 'Current:', wheelId);
        }
      } catch (error) {
        console.error('[PreviewWheelPage] Error processing pending copy:', error);
        localStorage.removeItem('pendingTemplateCopy');
      }
    };

    checkPendingCopy();
  }, [user, wheelData, pages, wheelId, t]);

  // ===== CAST STATE SYNC HOOKS =====
  // Only run when actively casting to avoid affecting normal preview mode
  // Supports both Chrome Cast (Android) and Supabase Realtime (iOS)
  
  // Sync zoom state changes to cast receiver
  useEffect(() => {
    if (!isActivelyCasting || !activeSendMessage) return;
    
    const zoomType = zoomedMonth ? 'month' : zoomedQuarter ? 'quarter' : 'year';
    
    activeSendMessage(CAST_MESSAGE_TYPES.ZOOM, {
      zoom: zoomType,
      month: zoomedMonth,
      quarter: zoomedQuarter
    });
  }, [zoomedMonth, zoomedQuarter, isActivelyCasting, activeSendMessage]);
  
  // Sync organization data changes to cast receiver
  useEffect(() => {
    if (!isActivelyCasting || !activeSendMessage || !localOrgData) return;
    
    // Send the complete displayOrgData structure
    const dataToSync = {
      rings: localOrgData.rings,
      activityGroups: localOrgData.activityGroups,
      labels: localOrgData.labels,
      items: currentPageItems
    };
    
    activeSendMessage(CAST_MESSAGE_TYPES.UPDATE, {
      organizationData: dataToSync
    });
  }, [localOrgData, currentPageItems, isActivelyCasting, activeSendMessage]);
  
  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isActivelyCasting || !activeSendMessage) return;
    
    const heartbeatInterval = setInterval(() => {
      activeSendMessage(CAST_MESSAGE_TYPES.PING, { timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);
    
    return () => clearInterval(heartbeatInterval);
  }, [isActivelyCasting, activeSendMessage]);
  
  // ===== END CAST STATE SYNC =====

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:previewWheelPage.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Lock size={48} className="text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t('common:previewWheelPage.accessDenied')}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            {t('common:previewWheelPage.goToHome')}
          </button>
        </div>
      </div>
    );
  }

  if (!wheelData) {
    return null;
  }

  // Use current page data if available, otherwise fall back to wheel data
  const currentPage = pages[currentPageIndex];
  const displayYear = currentPage?.year || wheelData.year;
  
  // Merge wheel-level data with page-specific items
  const displayOrgData = localOrgData ? {
    ...localOrgData,
    items: currentPageItems, // Use items fetched separately
  } : {
    rings: wheelData.organizationData.rings,
    activityGroups: wheelData.organizationData.activityGroups,
    labels: wheelData.organizationData.labels,
    items: currentPageItems,
  };
  
  const canGoPrev = currentPageIndex > 0;
  const canGoNext = currentPageIndex < pages.length - 1;

  const handleOrgDataChange = (newOrgData) => {
    setLocalOrgData(newOrgData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* YearWheel Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="/year_wheel_logo.svg" 
                alt="YearWheel" 
                className="h-8 w-auto"
              />
            </Link>
            
            {/* Show wheel info only if NOT in presentation mode */}
            {!isPresentationMode && (
              <>
                {/* Separator */}
                <div className="w-px h-8 bg-gray-300" />
                
                {/* Wheel Info */}
                <div className="flex items-center gap-3">
                  <Eye size={20} className="text-gray-500" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {wheelData.title}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {t('common:previewWheelPage.publicShared')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Show controls button in presentation mode */}
            {isPresentationMode ? (
              <>
                <button
                  onClick={() => setShowControlDialog(!showControlDialog)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
                  title={t('common:previewWheelPage.showControls')}
                >
                  <Settings size={16} />
                  <span className="text-sm font-medium">{t('common:previewWheelPage.controls')}</span>
                </button>
                
                {/* Page Navigator in presentation mode */}
                {pages.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                      disabled={!canGoPrev}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={t('common:previewWheelPage.previousYear')}
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm min-w-[120px]">
                      <Calendar size={16} className="text-gray-500" />
                      <span className="font-semibold text-gray-900">{displayYear}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {currentPageIndex + 1}/{pages.length}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                      disabled={!canGoNext}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={t('common:previewWheelPage.nextYear')}
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Copy Template Button (only show for templates) */}
                {wheelData.is_template && (
                  <button
                    onClick={handleCopyTemplate}
                    disabled={isCopying}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('common:previewWheelPage.copyTemplateTooltip')}
                  >
                    {isCopying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm font-medium">{t('common:previewWheelPage.copying')}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span className="text-sm font-medium">
                          {user ? t('common:previewWheelPage.copyTemplate') : t('common:previewWheelPage.useTemplate')}
                        </span>
                      </>
                    )}
                  </button>
                )}
                
                {/* Language Switcher */}
                <LanguageSwitcher />
                
                {/* Page Navigator (only show if multiple pages) */}
                {pages.length > 1 && (
                  <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                    <button
                      onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                      disabled={!canGoPrev}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={t('common:previewWheelPage.previousYear')}
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm min-w-[120px]">
                      <Calendar size={16} className="text-gray-500" />
                      <span className="font-semibold text-gray-900">{displayYear}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {currentPageIndex + 1}/{pages.length}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                      disabled={!canGoNext}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={t('common:previewWheelPage.nextYear')}
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Wheel Display */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          {/* Title overlay for presentation mode */}
          {isPresentationMode && (
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900">{wheelData.title}</h1>
              <p className="text-xl text-gray-600 mt-2">{displayYear}</p>
            </div>
          )}
          
          <YearWheel
            year={String(displayYear)}
            title={wheelData.title}
            colors={wheelData.colors}
            showWeekRing={wheelData.showWeekRing}
            showMonthRing={wheelData.showMonthRing}
            showRingNames={wheelData.showRingNames}
            showLabels={wheelData.showLabels !== undefined ? wheelData.showLabels : false}
            weekRingDisplayMode={wheelData.weekRingDisplayMode || 'week-numbers'}
            organizationData={displayOrgData}
            zoomedMonth={zoomedMonth}
            zoomedQuarter={zoomedQuarter}
            onSetZoomedMonth={setZoomedMonth}
            onSetZoomedQuarter={setZoomedQuarter}
            readonly={true}
          />
        </div>

        {/* Info Footer - hide in presentation mode */}
        {!isPresentationMode && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              {t('common:previewWheelPage.readOnlyInfo')}
              <Link to="/" className="text-blue-600 hover:text-blue-700 ml-1">
                {t('common:previewWheelPage.createYourOwn')}
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Presentation Control Dialog */}
      {isPresentationMode && showControlDialog && localOrgData && (
        <PresentationControlDialog
          organizationData={displayOrgData}
          onOrganizationChange={handleOrgDataChange}
          onClose={() => setShowControlDialog(false)}
        />
      )}

      {/* Cast Button - show only in presentation mode on mobile/tablet */}
      {isPresentationMode && (
        <div className="fixed bottom-6 right-6 z-50">
          <CastButton
            wheelData={{
              wheelId: wheelData.id,
              title: wheelData.title,
              year: displayYear,
              colors: wheelData.colors,
              organizationData: displayOrgData,
              showWeekRing: wheelData.showWeekRing,
              showMonthRing: wheelData.showMonthRing,
              showRingNames: wheelData.showRingNames,
              showLabels: wheelData.showLabels !== undefined ? wheelData.showLabels : false,
              weekRingDisplayMode: wheelData.weekRingDisplayMode || 'week-numbers',
              zoomedMonth,
              zoomedQuarter,
              rotation: 0, // TODO: Get rotation from YearWheel if needed
            }}
            realtimeCast={realtimeCast}
            onCastStart={() => console.log('Cast started')}
            onCastStop={() => console.log('Cast stopped')}
          />
        </div>
      )}
    </div>
  );
}

export default PreviewWheelPage;
