import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import YearWheel from "./YearWheel";
import OrganizationPanel from "./components/OrganizationPanel";
import Header from "./components/Header";
import PageNavigator from "./components/PageNavigator";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import CookieConsent from "./components/CookieConsent";
import VersionHistoryModal from "./components/VersionHistoryModal";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth.jsx";
import { useSubscription } from "./hooks/useSubscription.jsx";
import { showConfirmDialog, showToast } from "./utils/dialogs";
import { CHANGE_TYPES, getHistoryLabel, detectOrganizationChange } from "./constants/historyChangeTypes";
import AffiliateTracker from "./components/AffiliateTracker";

// Lazy load route components for better code splitting
const LandingPage = lazy(() => import("./components/LandingPage"));
const AuthPage = lazy(() => import("./components/auth/AuthPage"));
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const InviteAcceptPage = lazy(() => import("./components/InviteAcceptPage"));
const PreviewWheelPage = lazy(() => import("./components/PreviewWheelPage"));
const PricingPage = lazy(() => import("./components/PricingPage"));
const LegalPage = lazy(() => import("./components/LegalPage"));
const SupportPage = lazy(() => import("./components/SupportPage"));
const AdminPanel = lazy(() => import("./components/admin/AdminPanel"));
const RevenueForecast = lazy(() => import("./components/admin/RevenueForecast"));
const EmbedWheel = lazy(() => import("./components/EmbedWheel"));
const CastReceiverPage = lazy(() => import("./pages/CastReceiverPage"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const AffiliateApplicationForm = lazy(() => import("./pages/AffiliateApplicationForm"));

// Keyword-optimized landing pages
const HRPlanering = lazy(() => import("./pages/landing/HRPlanering"));
const Marknadsplanering = lazy(() => import("./pages/landing/Marknadsplanering"));
const SkolaUtbildning = lazy(() => import("./pages/landing/SkolaUtbildning"));
const Projektplanering = lazy(() => import("./pages/landing/Projektplanering"));
const QuickStartGuide = lazy(() => import("./components/QuickStartGuide"));

// Lazy load heavy editor components with retry logic (only needed in editor route)
const lazyWithRetry = (componentImport) => 
  lazy(() => 
    componentImport().catch(() => {
      // If import fails, force reload the page (clears Vite cache)
      window.location.reload();
      // Return a never-resolving promise to prevent error boundary
      return new Promise(() => {});
    })
  );
const AddPageModal = lazyWithRetry(() => import("./components/AddPageModal"));
const ExportDataModal = lazyWithRetry(() => import("./components/ExportDataModal"));
const AIAssistant = lazyWithRetry(() => import("./components/AIAssistant"));
const EditorOnboarding = lazyWithRetry(() => import("./components/EditorOnboarding"));
const AIAssistantOnboarding = lazyWithRetry(() => import("./components/AIAssistantOnboarding"));
import { fetchWheel, fetchPageData, saveWheelSnapshot, updateWheel, createVersion, fetchPages, createPage, updatePage, deletePage, duplicatePage, toggleTemplateStatus, checkIsAdmin } from "./services/wheelService";
import { supabase } from "./lib/supabase";
import { useRealtimeWheel } from "./hooks/useRealtimeWheel";
import { useWheelPresence, useWheelActivity } from "./hooks/useWheelPresence";
import { useWheelOperations } from "./hooks/useWheelOperations";
import { useThrottledCallback, useDebouncedCallback } from "./hooks/useCallbackUtils";
import { useMultiStateUndoRedo } from "./hooks/useUndoRedo";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toYearNumber = (value) => {
  if (value instanceof Date) {
    return value.getFullYear();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

function WheelEditor({ wheelId, reloadTrigger, onBackToDashboard }) {
  const { t } = useTranslation(['common']);
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  
  // Helper: Filter items to only those belonging to a specific year
  // CRITICAL for maintaining page isolation in organization_data JSONB
  const filterItemsByYear = useCallback((items, yearNum) => {
    return (items || []).filter(item => {
      const itemStartYear = new Date(item.startDate).getFullYear();
      const itemEndYear = new Date(item.endDate).getFullYear();
      // Include item if it overlaps with the year
      return itemStartYear <= yearNum && itemEndYear >= yearNum;
    });
  }, []);
  
  // Flag to prevent history during data load operations
  const isLoadingData = useRef(false);
  const broadcastOperationRef = useRef(null);

  const [yearWheelRef, setYearWheelRef] = useState(null);

  const handleUndoRedoStateRestored = useCallback((restoredState) => {
    if (yearWheelRef && typeof yearWheelRef.clearPendingItemUpdates === 'function') {
      yearWheelRef.clearPendingItemUpdates();
    }
    const broadcastFn = broadcastOperationRef.current;
    if (broadcastFn && restoredState?.organizationData) {
      broadcastFn('restore', null, {
        organizationData: restoredState.organizationData,
      });
    }
  }, [yearWheelRef]);
  
  // Undo/Redo for main editable states
  const {
    states: undoableStates,
    setStates: setUndoableStates,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    clear: clearHistory,
    markSaved,
    undoToSave,
    hasUnsavedChanges,
    unsavedChangesCount,
    startBatch,
    endBatch,
    cancelBatch,
    history,
    currentIndex,
    jumpToIndex
  } = useMultiStateUndoRedo({
    title: "Nytt hjul",
    year: "2025",
    colors: ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"], // Pastell palette
    organizationData: {
      rings: [
        {
          id: "ring-1",
          name: "Ring 1",
          type: "inner",
          visible: true
        }
      ],
      activityGroups: [
        {
          id: "ag-1",
          name: "Planering",
          color: "#3B82F6",
          visible: true
        }
      ],
      labels: [],
      items: []
    }
  }, {
    limit: 10, // Keep last 10 undo steps
    enableKeyboard: true,
    shouldSkipHistory: isLoadingData, // Skip history during data load
    onStateRestored: handleUndoRedoStateRestored
  });

  // Extract states from undo-managed object
  const title = undoableStates?.title || "Nytt hjul";
  const year = undoableStates?.year || "2025";
  const colors = undoableStates?.colors || ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"];
  // Memoize organizationData to prevent unnecessary re-renders of YearWheel
  // Only create new object reference when actual data changes (using JSON comparison)
  const organizationData = useMemo(() => {
    const data = undoableStates?.organizationData || {
      rings: [],
      activityGroups: [],
      labels: [],
      items: []
    };
    return data;
  }, [
    // Use JSON.stringify to create stable dependency for deep comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(undoableStates?.organizationData)
  ]);
  const [zoomedQuarter, setZoomedQuarter] = useState(null);
  
  // Keep ringsData for backward compatibility when loading old files
  const [ringsData, setRingsData] = useState([
    {
      data: Array.from({ length: 12 }, () => [""]),
      orientation: "vertical"
    }
  ]);
  const [showYearEvents, setShowYearEvents] = useState(false);
  const [showSeasonRing, setShowSeasonRing] = useState(true);
  const [yearEventsCollection, setYearEventsCollection] = useState([]);
  // Start with sidebar closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [showWeekRing, setShowWeekRing] = useState(true);
  const [showMonthRing, setShowMonthRing] = useState(true);
  const [showRingNames, setShowRingNames] = useState(true);
  const [showLabels, setShowLabels] = useState(false); // Default to false - labels shown on hover
  const [weekRingDisplayMode, setWeekRingDisplayMode] = useState('week-numbers'); // 'week-numbers' or 'dates'
  const [downloadFormat, setDownloadFormat] = useState(isPremium ? "png" : "png-white");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // For UI feedback in Header
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isPublic, setIsPublic] = useState(false); // Public sharing toggle
  const [isTemplate, setIsTemplate] = useState(false); // Template status (admin only)
  const [isAdmin, setIsAdmin] = useState(false); // Admin status
  const [showVersionHistory, setShowVersionHistory] = useState(false); // Version history modal
  const [showExportModal, setShowExportModal] = useState(false); // Export data modal
  
  // Multi-page state
  const [pages, setPages] = useState([]);
  const pagesRef = useRef(pages);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [wheelData, setWheelData] = useState(null); // Store full wheel object including team_id

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  
  // AI Assistant state
  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAIOnboarding, setShowAIOnboarding] = useState(false);
  
  // Disable autosave when guides are running
  useEffect(() => {
    if (showOnboarding || showAIOnboarding) {
      setAutoSaveEnabled(false);
    } else {
      setAutoSaveEnabled(true);
    }
  }, [showOnboarding, showAIOnboarding]);
  
  // Handler to enforce free user restrictions on export formats
  const handleDownloadFormatChange = (format) => {
    // Free users can only use 'png-white' and 'svg'
    const allowedFormatsForFree = ['png-white', 'svg'];
    const premiumFormats = ['png', 'jpeg', 'pdf'];
    
    if (!isPremium && premiumFormats.includes(format)) {
      // Show toast to inform user
      const event = new CustomEvent('showToast', {
        detail: { 
          message: t('subscription:upgradePrompt.defaultTitle'), 
          type: 'info' 
        }
      });
      window.dispatchEvent(event);
      return; // Don't change the format
    }
    
    setDownloadFormat(format);
  };
  
  // Track if this is the initial load to prevent auto-save on mount
  const isInitialLoad = useRef(true);
  // Track if data came from realtime update to prevent save loop
  const isRealtimeUpdate = useRef(false);
  const isRestoringVersion = useRef(false); // NEW: Block realtime during version restore
  // Track recent save timestamp to ignore own broadcasts (within 3 seconds)
  const lastSaveTimestamp = useRef(0);
  // Track if we're currently saving to prevent realtime reload during save (ref for logic, state for UI)
  const isSavingRef = useRef(false);
  // Track if we're currently dragging an item (for batch undo/redo)
  const isDraggingRef = useRef(false);
  // Track unsaved changes for safe reload decisions
  const hasUnsavedChangesRef = useRef(false);
  // Remember deferred reload requests when local edits are pending
  const pendingRefreshRef = useRef({ needed: false, reason: null, source: null, scope: null, options: null });
  // Avoid triggering multiple auto-saves for the same pending refresh
  const autoSaveInFlightRef = useRef(false);
  // Expose handleSave for code paths defined above its declaration
  const handleSaveRef = useRef(null);
  // Queue item persistence operations to avoid race conditions

  // Load wheel data function (memoized to avoid recreating)
  const loadWheelData = useCallback(async (rawOptions) => {
    const options = rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)
      ? rawOptions
      : {};
    const {
      force = false,
      reason = 'manual',
      source = 'unknown',
      scope = null,
      silent = false,
    } = options;

    if (!wheelId) return;
    
    let reloadStatus = 'loaded';

    if (!force) {
      const hasLocalChanges =
        hasUnsavedChangesRef.current ||
        isSavingRef.current ||
        isDraggingRef.current;

      if (hasLocalChanges) {
        const alreadyPending = pendingRefreshRef.current?.needed;
        console.log(`[loadWheelData] Skip reload (${reason}) from ${source} - local changes pending.`);

        pendingRefreshRef.current = {
          needed: true,
          reason,
          source,
          scope,
          options: { ...options, force: true },
        };

        if (source === 'ai-assistant' && handleSaveRef.current && !autoSaveInFlightRef.current) {
          autoSaveInFlightRef.current = true;
          handleSaveRef.current({ silent: true, reason: 'ai-assistant-refresh' })
            .catch((autoSaveError) => {
              console.error('[loadWheelData] Auto-save before AI refresh failed:', autoSaveError);
              const event = new CustomEvent('showToast', {
                detail: {
                  message: 'Kunde inte spara lokala ändringar innan AI-uppdatering.',
                  type: 'error',
                },
              });
              window.dispatchEvent(event);
            })
            .finally(() => {
              autoSaveInFlightRef.current = false;
            });
        }

        if (!alreadyPending && !silent) {
          const event = new CustomEvent('showToast', {
            detail: {
              message: 'Spara dina ändringar så laddas AI-uppdateringarna in.',
              type: 'info',
            },
          });
          window.dispatchEvent(event);
        }
        return { status: 'deferred', reason, source, scope };
      }
    }

    pendingRefreshRef.current = { needed: false, reason: null, source: null, scope: null, options: null };

    isLoadingData.current = true; // Prevent auto-save during load
    
    try {
      const wheelData = await fetchWheel(wheelId);
      
      if (wheelData) {
        setWheelData(wheelData); // Store full wheel object
        setIsPublic(wheelData.is_public || false);
        setIsTemplate(wheelData.is_template || false);
        
        // Load pages for this wheel
        const pagesData = await fetchPages(wheelId);
        setPages(pagesData);
        
        // Prepare data to update
        let orgDataToSet = null;
        let yearToLoad = null; // Will be set from page data or wheel data
        
        // If we have pages, load data from first page (or current page if set)
        if (pagesData.length > 0) {
          // Use ref to get the CURRENT pageId, not stale closure value
          const activePageId = latestValuesRef.current?.currentPageId;
          const pageToLoad = activePageId 
            ? pagesData.find(p => p.id === activePageId) || pagesData[0]
            : pagesData[0];
          
          setCurrentPageId(pageToLoad.id);
          // IMPORTANT: Year will be set via setUndoableStates() to avoid creating history entry
          yearToLoad = String(pageToLoad.year || new Date().getFullYear());
          
          // Fetch items for this specific page AND multi-year items that overlap
          const pageItems = await fetchPageData(pageToLoad.id, pageToLoad.year, wheelId);
          console.log(`[loadWheelData] Fetched ${pageItems.length} items for page ${pageToLoad.id} (year: ${pageToLoad.year})`);
          
          // Fetch rings, activity groups, and labels from database tables
          // CRITICAL: Use wheel_id - rings are SHARED across all pages!
          const { data: dbRings } = await supabase
            .from('wheel_rings')
            .select('*')
            .eq('wheel_id', wheelId)
            .order('ring_order');
          
          const { data: dbActivityGroups } = await supabase
            .from('activity_groups')
            .select('*')
            .eq('wheel_id', wheelId);
          
          const { data: dbLabels } = await supabase
            .from('labels')
            .select('*')
            .eq('wheel_id', wheelId);
          
          
          // CRITICAL: Build organization data from DATABASE, not JSONB
          // JSONB is just a backup - database tables are the source of truth
          const orgData = {
            rings: [],
            activityGroups: [],
            labels: [],
            items: pageItems // Items ALWAYS come from database
          };
          
          // Rings from database (shared across all pages)
          orgData.rings = (dbRings || []).map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            visible: r.visible,
            orientation: r.orientation || 'vertical',
            color: r.color || '#408cfb',
            data: r.data || [[""]]
          }));
          
          // Activity groups from database (shared across all pages)
          orgData.activityGroups = (dbActivityGroups || []).map(g => ({
            id: g.id,
            name: g.name,
            color: g.color || '#8B5CF6',
            visible: g.visible
          }));
          
          // Labels from database (shared across all pages)
          orgData.labels = (dbLabels || []).map(l => ({
            id: l.id,
            name: l.name,
            color: l.color,
            visible: l.visible
          }));
          
          // Backward compatibility: convert old 'activities' to 'activityGroups'
          if (orgData.activities && !orgData.activityGroups) {
            orgData.activityGroups = orgData.activities;
            delete orgData.activities;
          }
          
          // Ensure at least one activity group exists
          if (!orgData.activityGroups || orgData.activityGroups.length === 0) {
            orgData.activityGroups = [{
              id: "group-1",
              name: "Aktivitetsgrupp 1",
              color: wheelData.colors?.[0] || "#F5E6D3",
              visible: true
            }];
          }
          
          // Apply color fallback for outer rings (use wheel colors if ring has no color)
          if (orgData.rings && orgData.rings.length > 0) {
            orgData.rings = orgData.rings.map((ring, index) => {
              if (ring.type === 'outer' && !ring.color) {
                const outerRingIndex = orgData.rings.filter((r, i) => i < index && r.type === 'outer').length;
                const fallbackColor = wheelData.colors[outerRingIndex % wheelData.colors.length];
                return {
                  ...ring,
                  color: fallbackColor
                };
              }
              return ring;
            });
          }
          
          // Filter items to only include current year
          const beforeFilter = orgData.items.length;
          orgData.items = filterItemsByYear(orgData.items, parseInt(yearToLoad));
          const afterFilter = orgData.items.length;
          console.log(`[loadWheelData] Year filter: ${beforeFilter} items → ${afterFilter} items for year ${yearToLoad}`);
          
          orgDataToSet = orgData;
        } else {
          // Fallback: Load from wheel's organization data (legacy support)
          yearToLoad = String(wheelData.year || new Date().getFullYear());
          
          // Load organization data
          if (wheelData.organizationData) {
            const orgData = wheelData.organizationData;
            
            // Backward compatibility: convert old 'activities' to 'activityGroups'
            if (orgData.activities && !orgData.activityGroups) {
              orgData.activityGroups = orgData.activities;
              delete orgData.activities;
            }
            
            // Ensure at least one activity group exists
            if (!orgData.activityGroups || orgData.activityGroups.length === 0) {
              orgData.activityGroups = [{
                id: "group-1",
                name: "Aktivitetsgrupp 1",
                color: wheelData.colors?.[0] || "#F5E6D3",
                visible: true
              }];
            }
            
            // Apply color fallback for outer rings (use wheel colors if ring has no color)
            if (orgData.rings && orgData.rings.length > 0) {
              orgData.rings = orgData.rings.map((ring, index) => {
                if (ring.type === 'outer' && !ring.color) {
                  const outerRingIndex = orgData.rings.filter((r, i) => i < index && r.type === 'outer').length;
                  const fallbackColor = wheelData.colors[outerRingIndex % wheelData.colors.length];
                  return {
                    ...ring,
                    color: fallbackColor
                  };
                }
                return ring;
              });
            }
            
            // Filter items to only include current year (legacy path)
            orgData.items = filterItemsByYear(orgData.items, parseInt(yearToLoad));
            
            orgDataToSet = orgData;
          }
        }
        
        // CRITICAL: Update title, colors, year AND organizationData together in ONE call to prevent race condition
        const updates = {};
        if (wheelData.title !== undefined) {
          updates.title = wheelData.title || 'Nytt hjul';
        }
        if (wheelData.colors) {
          updates.colors = wheelData.colors;
        }
        if (yearToLoad) {
          updates.year = yearToLoad;
        }
        if (orgDataToSet) {
          updates.organizationData = orgDataToSet;
        }
        
        if (Object.keys(updates).length > 0) {
          const previousLoadingFlag = isLoadingData.current;
          const shouldResetHistoryAfterLoad = reason === 'manual' && isInitialLoad.current;
          const historyLabel = reason === 'realtime'
            ? { type: 'legacyString', text: 'Synkroniserad från servern' }
            : 'Ladda hjul';

          // Temporarily allow undo stack to capture the refreshed state
          isLoadingData.current = false;
          setUndoableStates(updates, historyLabel);
          // Restore loading guard immediately after state update
          isLoadingData.current = previousLoadingFlag;
          
          if (shouldResetHistoryAfterLoad) {
            // On true initial load we still seed a clean history baseline
            setTimeout(() => {
              clearHistory();
            }, 100); // Short delay to ensure state is fully updated
          }
        }
        
        // Load other settings
        if (wheelData.settings) {
          if (wheelData.settings.showWeekRing !== undefined) setShowWeekRing(wheelData.settings.showWeekRing);
          if (wheelData.settings.showMonthRing !== undefined) setShowMonthRing(wheelData.settings.showMonthRing);
          if (wheelData.settings.showYearEvents !== undefined) setShowYearEvents(wheelData.settings.showYearEvents);
          if (wheelData.settings.showSeasonRing !== undefined) setShowSeasonRing(wheelData.settings.showSeasonRing);
          if (wheelData.settings.showRingNames !== undefined) setShowRingNames(wheelData.settings.showRingNames);
        }
        // Load showLabels and weekRingDisplayMode from wheel data (stored at wheel level, not in settings)
        if (wheelData.showLabels !== undefined) setShowLabels(wheelData.showLabels);
        if (wheelData.weekRingDisplayMode !== undefined) setWeekRingDisplayMode(wheelData.weekRingDisplayMode);
      }
    } catch (error) {
      console.error('Error loading wheel:', error);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte ladda hjul', type: 'error' } 
      });
      window.dispatchEvent(event);
      reloadStatus = 'error';
    } finally {
      // CRITICAL: Keep isLoadingData true for a bit longer to prevent
      // realtime subscriptions and other effects from adding to history
      // Reset after a delay to allow everything to settle (match isInitialLoad timeout)
      setTimeout(() => {
        isLoadingData.current = false;
        isRealtimeUpdate.current = false;
        // Mark as saved once everything has settled
        markSaved();
      }, 550); // Slightly longer than isInitialLoad (500ms) to ensure all effects settle
    }

    return { status: reloadStatus, reason, source, scope };
  }, [wheelId, markSaved]); // Only depend on wheelId - NOT on currentPageId

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;

    if (!hasUnsavedChanges) {
      const pending = pendingRefreshRef.current;
      if (pending?.needed) {
        console.log(`[loadWheelData] Applying deferred reload (${pending.reason || 'deferred'})`);
        const options = pending.options || {
          force: true,
          reason: pending.reason || 'deferred',
          source: pending.source || 'deferred',
          scope: pending.scope,
        };
        pendingRefreshRef.current = { needed: false, reason: null, source: null, scope: null, options: null };
        loadWheelData(options);
      }
    }
  }, [hasUnsavedChanges, loadWheelData]);

  // Throttled reload for realtime updates (max once per second)
  const throttledReload = useThrottledCallback(() => {
    loadWheelData({ reason: 'realtime', source: 'realtime', silent: true });
    
    // NO TOAST - too many notifications annoy users
    // Users will see the changes appear on the wheel directly
  }, 1000);

  // Handle realtime data changes from other users
  const handleRealtimeChange = useCallback((eventType, tableName, payload) => {
    // CRITICAL: Block ALL realtime updates during version restore
    if (isRestoringVersion.current) {
      console.log('[Realtime] Ignoring update during version restore');
      return;
    }
    
    // COMPLETELY IGNORE all events if we're in the middle of saving
    if (isSavingRef.current) {
      console.log('[Realtime] Ignoring update - save in progress');
      return;
    }

    // Ignore realtime churn while user is dragging to prevent visual snapbacks
    if (isDraggingRef.current) {
      console.log('[Realtime] Ignoring update - drag in progress');
      return;
    }
    
    // Ignore broadcasts from our own recent saves (within 5 seconds - increased to allow auto-save to complete)
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 5000) {
      console.log('[Realtime] Ignoring update - recent save (<5s)');
      return;
    }
    
    // CRITICAL: Check if we have unsaved changes - don't overwrite local work!
    if (hasUnsavedChanges) {
      console.log('[Realtime] Ignoring update - unsaved local changes exist');
      return;
    }
    
    // Don't reload during active save operation
    if (isSavingRef.current) {
      return;
    }
    
    // Mark as realtime update to prevent auto-save loop
    // This flag will be reset in loadWheelData's finally block
    isRealtimeUpdate.current = true;
    
    // NOTE: We do NOT clear history here anymore!
    // Realtime updates should not wipe local undo history
    // History is only cleared on initial load (in loadWheelData)
    
    // Reload the wheel data when any change occurs
    // Throttled to prevent too many reloads
    throttledReload();
  }, [throttledReload]);

  // Enable realtime sync for this page (not wheel!)
  // CRITICAL: Pass currentPageId to filter by page, not wheel
  useRealtimeWheel(wheelId, currentPageId, handleRealtimeChange);

  // Handle realtime page changes
  const handlePageRealtimeChange = useCallback((eventType, payload) => {
    // COMPLETELY IGNORE all page updates if we're in the middle of saving
    // This prevents the database's slightly-stale data from overwriting our local changes
    if (isSavingRef.current) {
      return;
    }
    
    // Ignore our own recent changes (within 5 seconds - increased to allow auto-save to complete)
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 5000) {
      return;
    }
    
    if (eventType === 'INSERT') {
      // New page added by another user
      setPages(prevPages => {
        const exists = prevPages.some(p => p.id === payload.new.id);
        if (!exists) {
          return [...prevPages, payload.new].sort((a, b) => a.page_order - b.page_order);
        }
        return prevPages;
      });
    } else if (eventType === 'UPDATE') {
      // Page updated by another user
      setPages(prevPages => 
        prevPages.map(p => p.id === payload.new.id ? payload.new : p)
          .sort((a, b) => a.page_order - b.page_order)
      );
      
      // DO NOT reload current page data from realtime!
      // The page's organization_data doesn't contain wheel-level settings like colors and title
      // Those are in year_wheels table, and reloading from page would use stale data
      // User's local state is the source of truth
    } else if (eventType === 'DELETE') {
      // Page deleted by another user
      setPages(prevPages => {
        const filtered = prevPages.filter(p => p.id !== payload.old.id);
        
        // If deleted current page, switch to first remaining page
        if (payload.old.id === currentPageId && filtered.length > 0) {
          const newCurrentPage = filtered[0];
          setCurrentPageId(newCurrentPage.id);
          // CRITICAL: Filter items to only those belonging to this page's year
          const cleanedOrgData = {
            ...newCurrentPage.organization_data,
            items: filterItemsByYear(newCurrentPage.organization_data.items, newCurrentPage.year)
          };
          setOrganizationData(cleanedOrgData);
          setYear(String(newCurrentPage.year));
        }
        
        return filtered;
      });
    }
  }, [currentPageId, lastSaveTimestamp]);

  // Subscribe to wheel_pages changes
  useEffect(() => {
    if (!wheelId) return;

    const channel = supabase
      .channel(`wheel_pages:${wheelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wheel_pages',
          filter: `wheel_id=eq.${wheelId}`
        },
        (payload) => {
          handlePageRealtimeChange(payload.eventType, payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wheelId, handlePageRealtimeChange]);

  // Track active users viewing this wheel
  const activeUsers = useWheelPresence(wheelId);

  // Track active editing activity (who's editing which items)
  const { broadcastActivity, activeEditors } = useWheelActivity(wheelId);

  // Track recent operations for showing avatars (who just edited what)
  const recentOperationsRef = useRef(new Map()); // itemId -> { editor, timestamp }

  // Handle incoming operations from other users
  const handleIncomingOperation = useCallback((operation) => {
    // Track this operation for avatar display (show for 3 seconds)
    if (operation.type === 'drag' || operation.type === 'resize' || operation.type === 'edit') {
      const editorInfo = {
        user_id: operation.userId,
        email: operation.userEmail,
        activity: 'editing',
        itemId: operation.itemId,
        timestamp: operation.timestamp,
      };
      
      // Store in ref
      recentOperationsRef.current.set(operation.itemId, editorInfo);
      
      // Remove after 3 seconds
      setTimeout(() => {
        recentOperationsRef.current.delete(operation.itemId);
        // Trigger a redraw to remove the avatar
        setOrganizationData(prev => ({ ...prev }));
      }, 3000);
    }
    
    // Apply the operation optimistically to local state
    if (operation.type === 'drag' || operation.type === 'resize') {
      // Update the item in organizationData
      setOrganizationData(prev => {
        const items = prev.items.map(item => {
          if (item.id === operation.itemId) {
            return {
              ...item,
              ...operation.data, // Apply the changes (startDate, endDate, ringId, etc.)
              _remoteUpdate: true, // Flag to indicate this came from another user
              _remoteUser: operation.userEmail,
              _remoteTimestamp: operation.timestamp,
            };
          }
          return item;
        });
        
        return { ...prev, items };
      });
    } else if (operation.type === 'edit') {
      // Item properties changed (name, description, etc.)
      setOrganizationData(prev => {
        const items = prev.items.map(item => {
          if (item.id === operation.itemId) {
            return {
              ...item,
              ...operation.data,
              _remoteUpdate: true,
              _remoteUser: operation.userEmail,
              _remoteTimestamp: operation.timestamp,
            };
          }
          return item;
        });
        return { ...prev, items };
      });
    } else if (operation.type === 'delete') {
      setOrganizationData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== operation.itemId)
      }));
    } else if (operation.type === 'create') {
      setOrganizationData(prev => ({
        ...prev,
        items: [...prev.items, { ...operation.data, _remoteUpdate: true }]
      }));
    } else if (operation.type === 'restore') {
      const incomingOrgData = operation.data?.organizationData;
      if (!incomingOrgData) {
        return;
      }

      isRealtimeUpdate.current = true;

      setOrganizationData(() => ({
        ...incomingOrgData,
        items: (incomingOrgData.items || []).map(item => ({
          ...item,
          _remoteUpdate: true,
          _remoteUser: operation.userEmail,
          _remoteTimestamp: operation.timestamp,
        })),
      }), { type: 'remoteRestore' });

      setTimeout(() => {
        isRealtimeUpdate.current = false;
      }, 0);
    }
  }, [setOrganizationData]);

  // Real-time operations broadcasting
  const { broadcastOperation } = useWheelOperations(wheelId, currentPageId, handleIncomingOperation);

  useEffect(() => {
    broadcastOperationRef.current = broadcastOperation;
  }, [broadcastOperation]);

  // Combine activeEditors from presence channel + recent operations for avatar display
  const combinedActiveEditors = [
    ...activeEditors,
    ...Array.from(recentOperationsRef.current.values())
  ];

  // Store latest values in refs so autoSave always reads current state
  const latestValuesRef = useRef({});
  latestValuesRef.current = {
    title,
    colors,
    showWeekRing,
    showMonthRing,
    showRingNames,
    showLabels,
    weekRingDisplayMode,
    organizationData,
    year,
    currentPageId,
    hasUnsavedChanges,
    pages,
  };
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  


  const fullSaveQueueRef = useRef(Promise.resolve());

  const buildWheelSnapshot = useCallback(() => {
    if (!wheelId) {
      return null;
    }

    const latest = latestValuesRef.current;
    if (!latest) {
      return null;
    }

    const stripRemoteFields = (entry) => {
      if (!entry) {
        return entry;
      }
      const { _remoteUpdate, _remoteUser, _remoteTimestamp, ...clean } = entry;
      return { ...clean };
    };

    const globalOrg = latest.organizationData || {
      rings: [],
      activityGroups: [],
      labels: [],
      items: [],
    };

    const normalizedGlobal = {
      rings: (globalOrg.rings || []).map(stripRemoteFields),
      activityGroups: (globalOrg.activityGroups || []).map(stripRemoteFields),
      labels: (globalOrg.labels || []).map(stripRemoteFields),
    };

    const allPages = pagesRef.current || [];

    const pagesSnapshot = allPages
      .map((page) => {
        if (!page) {
          return null;
        }

        const pageYear = toYearNumber(page.year);
        const baseOrgSource = page.id === latest.currentPageId
          ? globalOrg
          : page.organization_data || null;

        if (!baseOrgSource) {
          return { id: page.id, year: pageYear, organizationData: null };
        }

        const rawItems = Array.isArray(baseOrgSource.items) ? baseOrgSource.items : [];
        const itemsSource = page.id === latest.currentPageId || Array.isArray(baseOrgSource.items)
          ? rawItems
          : null;

        if (!itemsSource) {
          return { id: page.id, year: pageYear, organizationData: null };
        }

        const pageItems = itemsSource
          .filter((item) => {
            if (!item) {
              return false;
            }

            if (item.pageId && item.pageId !== page.id) {
              return false;
            }

            if (pageYear == null) {
              return true;
            }

            const startYear = item.startDate ? new Date(item.startDate).getFullYear() : null;
            const endYear = item.endDate ? new Date(item.endDate).getFullYear() : startYear;

            if (startYear == null || endYear == null) {
              return false;
            }

            return startYear <= pageYear && endYear >= pageYear;
          })
          .map((item) => {
            const cleanItem = stripRemoteFields(item);
            const ensureId =
              cleanItem.id ||
              (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? `item-${crypto.randomUUID()}`
                : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`);

            return {
              ...cleanItem,
              id: ensureId,
              pageId: cleanItem.pageId || page.id,
            };
          });

        return {
          id: page.id,
          year: pageYear,
          organizationData: {
            rings: normalizedGlobal.rings,
            activityGroups: normalizedGlobal.activityGroups,
            labels: normalizedGlobal.labels,
            items: pageItems,
          },
        };
      })
      .filter(Boolean);

    return {
      metadata: {
        title: latest.title,
        colors: latest.colors,
        showWeekRing: latest.showWeekRing,
        showMonthRing: latest.showMonthRing,
        showRingNames: latest.showRingNames,
        showLabels: latest.showLabels,
        weekRingDisplayMode: latest.weekRingDisplayMode,
        year: latest.year,
      },
      globalOrganizationData: normalizedGlobal,
      pages: pagesSnapshot,
    };
  }, [wheelId]);

  const executeFullSave = useCallback(async (reason = 'auto') => {
    if (!wheelId) {
      return null;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      let snapshot = buildWheelSnapshot();
      if (!snapshot) {
        return null;
      }

      let latest = latestValuesRef.current;

      if (!snapshot.pages || snapshot.pages.length === 0) {
        const fallbackYear = toYearNumber(latest?.year) ?? new Date().getFullYear();

        try {
          const newPagePayload = {
            year: fallbackYear,
            title: latest?.title || String(fallbackYear),
            organizationData: {
              rings: snapshot.globalOrganizationData?.rings || [],
              activityGroups: snapshot.globalOrganizationData?.activityGroups || [],
              labels: snapshot.globalOrganizationData?.labels || [],
              items: filterItemsByYear(latest?.organizationData?.items || [], fallbackYear),
            },
          };

          const createdPage = await createPage(wheelId, newPagePayload);

          if (createdPage) {
            pagesRef.current = [...(pagesRef.current || []), createdPage];
            setPages(pagesRef.current);
            setCurrentPageId((prev) => prev || createdPage.id);

            latestValuesRef.current = {
              ...latestValuesRef.current,
              currentPageId: createdPage.id,
            };

            snapshot = buildWheelSnapshot();
            if (!snapshot) {
              return null;
            }

            latest = latestValuesRef.current;
          }
        } catch (pageError) {
          console.error('[FullSave] Failed to ensure default page before saving:', pageError);
          throw pageError;
        }
      }

      const result = await saveWheelSnapshot(wheelId, snapshot);
      const { ringIdMap, activityIdMap, labelIdMap, itemsByPage } = result || {};

      const remapCollection = (collection, mapRef) =>
        (collection || []).map((entry) => ({
          ...entry,
          id: mapRef?.get(entry.id) || entry.id,
        }));

      const normalizedRings = remapCollection(snapshot.globalOrganizationData.rings, ringIdMap);
      const normalizedActivityGroups = remapCollection(snapshot.globalOrganizationData.activityGroups, activityIdMap);
      const normalizedLabels = remapCollection(snapshot.globalOrganizationData.labels, labelIdMap);

      setOrganizationData((prev) => {
        const currentPageItems =
          (itemsByPage && latest.currentPageId && itemsByPage[latest.currentPageId]) || prev.items || [];

        const next = {
          ...prev,
          rings: normalizedRings,
          activityGroups: normalizedActivityGroups,
          labels: normalizedLabels,
          items: currentPageItems,
        };

        latestValuesRef.current = {
          ...latestValuesRef.current,
          organizationData: next,
        };

        return next;
      }, { type: 'syncFromSnapshot' });

      if (itemsByPage) {
        setPages((prevPages) => {
          if (!Array.isArray(prevPages)) {
            return prevPages;
          }

          return prevPages.map((page) => {
            const pageItems = itemsByPage[page.id];
            if (!pageItems) {
              return page;
            }

            return {
              ...page,
              organization_data: {
                rings: normalizedRings,
                activityGroups: normalizedActivityGroups,
                labels: normalizedLabels,
                items: pageItems,
              },
            };
          });
        });
      }

      lastSaveTimestamp.current = Date.now();
      markSaved();

      if (reason === 'manual') {
        try {
          await createVersion(
            wheelId,
            {
              ...snapshot.metadata,
              organizationData: {
                rings: normalizedRings,
                activityGroups: normalizedActivityGroups,
                labels: normalizedLabels,
                items:
                  (itemsByPage && latest.currentPageId && itemsByPage[latest.currentPageId]) ||
                  [],
              },
            },
            null,
            false
          );
        } catch (versionError) {
          console.error('[FullSave] Failed to create version snapshot:', versionError);
        }
      }

      return result;
    } catch (error) {
      console.error('[FullSave] Failed to persist snapshot:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte spara ändringarna', type: 'error' },
      });
      window.dispatchEvent(event);
      throw error;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [wheelId, buildWheelSnapshot, markSaved, filterItemsByYear]);

  const enqueueFullSave = useCallback((reason = 'auto') => {
    fullSaveQueueRef.current = fullSaveQueueRef.current.then(
      () => executeFullSave(reason),
      () => executeFullSave(reason)
    );
    return fullSaveQueueRef.current;
  }, [executeFullSave]);

  const scheduleFullSave = useDebouncedCallback((reason = 'auto') => {
    enqueueFullSave(reason);
  }, 1200);

  const queueFullSave = useCallback((reason = 'auto') => {
    if (!wheelId || !autoSaveEnabled) {
      return;
    }

    if (isInitialLoad.current || isLoadingData.current || isRealtimeUpdate.current) {
      return;
    }

    scheduleFullSave(reason);
  }, [wheelId, autoSaveEnabled, scheduleFullSave]);

  useEffect(() => {
    if (!wheelId) {
      return;
    }

    if (isInitialLoad.current || isLoadingData.current || isRealtimeUpdate.current || isDraggingRef.current) {
      return;
    }

    queueFullSave('metadata-change');
  }, [wheelId, title, colors, showWeekRing, showMonthRing, showRingNames, showLabels, weekRingDisplayMode, queueFullSave]);

  useEffect(() => {
    if (!wheelId) {
      return;
    }

    if (isInitialLoad.current || isLoadingData.current || isSavingRef.current || isRealtimeUpdate.current || !autoSaveEnabled) {
      return;
    }

    queueFullSave('organization-change');
  }, [wheelId, organizationData, queueFullSave, autoSaveEnabled]);

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
    };
    checkAdmin();
  }, []);

  // Reset download format to free option if user loses premium access
  useEffect(() => {
    const premiumFormats = ['png', 'jpeg', 'pdf'];
    if (!isPremium && premiumFormats.includes(downloadFormat)) {
      setDownloadFormat('png-white'); // Reset to free option
    }
  }, [isPremium, downloadFormat]);

  // Initial load on mount AND reload when reloadTrigger changes
  useEffect(() => {
    if (!wheelId) {
      setIsLoading(false);
      isInitialLoad.current = false; // Not initial load anymore
      return;
    }

    // IMPORTANT: Set initial load flag BEFORE loading data
    isInitialLoad.current = true;
    setIsLoading(true);
    
    // Load wheel data and pages in parallel
    Promise.all([
      loadWheelData(),
      loadPages()
    ]).finally(() => {
      setIsLoading(false);
      // After initial load completes, enable auto-save
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
      
      // Check if this is a first-time user (no onboarding completed flag)
      const hasCompletedOnboarding = localStorage.getItem('yearwheel_onboarding_completed');
      if (!hasCompletedOnboarding) {
        // Show onboarding for all first-time users (database wheels)
        setTimeout(() => setShowOnboarding(true), 1500); // Delay to let UI render (1.5s after load)
      }
    });
    
    // NO CLEANUP - we don't want to reset state on reload
    // State will be overwritten by loadWheelData
  }, [wheelId, reloadTrigger]); // Depend on wheelId AND reloadTrigger
  
  // Separate cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      // console.log('[WheelEditor] UNMOUNT CLEANUP - Component unmounting');
      // This only runs when component is truly removed from DOM
      // Not when reloadTrigger changes
    };
  }, []); // Empty deps = only on mount/unmount

  // Warn user before closing/reloading page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers show this message
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Fallback: Load from localStorage if no wheelId (backward compatibility)
  useEffect(() => {
    if (wheelId) return; // Skip if we have a wheelId
    
    const data = JSON.parse(localStorage.getItem("yearWheelData"));
    if (data) {
      setRingsData(data.ringsData);
      setTitle(data.title);
      setYear(data.year);
      if (data.colors) setColors(data.colors);
      if (data.organizationData) {
        // Backward compatibility: convert old 'activities' to 'activityGroups'
        const orgData = data.organizationData;
        if (orgData.activities && !orgData.activityGroups) {
          orgData.activityGroups = orgData.activities;
          delete orgData.activities;
        }
        // Ensure at least one activity group exists
        if (!orgData.activityGroups || orgData.activityGroups.length === 0) {
          orgData.activityGroups = [{
            id: "group-1",
            name: "Aktivitetsgrupp 1",
            color: data.colors?.[0] || "#F5E6D3",
            visible: true
          }];
        }
        setOrganizationData(orgData);
      }
      if (data.showWeekRing !== undefined) setShowWeekRing(data.showWeekRing);
      if (data.showMonthRing !== undefined) setShowMonthRing(data.showMonthRing);
      if (data.showYearEvents !== undefined) setShowYearEvents(data.showYearEvents);
      if (data.showSeasonRing !== undefined) setShowSeasonRing(data.showSeasonRing);
    }
    
    setIsLoading(false);
    
    // Check if this is a first-time user (no onboarding completed flag)
    const hasCompletedOnboarding = localStorage.getItem('yearwheel_onboarding_completed');
    if (!hasCompletedOnboarding) {
      // Show onboarding for all first-time users (both local and database wheels)
      setTimeout(() => setShowOnboarding(true), 1000); // Delay to let UI render
    }
  }, [wheelId]);

  // NOTE: Color template application is handled by OrganizationPanel when user clicks a palette
  // DO NOT automatically apply colors here - it causes unwanted data overwrites and save loops

  

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const handleTogglePublic = async () => {
    if (!wheelId) return;
    
    try {
      const newIsPublic = !isPublic;
      setIsPublic(newIsPublic);
      
      // Update in database
      await updateWheel(wheelId, { is_public: newIsPublic });
      
      const message = newIsPublic 
        ? 'Hjulet är nu publikt delat!' 
        : 'Hjulet är nu privat';
      
      const event = new CustomEvent('showToast', { 
        detail: { message, type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error toggling public status:', error);
      setIsPublic(!isPublic); // Revert on error
      
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte uppdatera delningsinställning', type: 'error' } 
      });
      window.dispatchEvent(event);
    }
  };

  const handleSave = useCallback(async (options = {}) => {
    const { silent = false, reason = 'manual' } = options;

    if (wheelId) {
      const wasAutoSaveEnabled = autoSaveEnabled;
      setAutoSaveEnabled(false);

      try {
        await enqueueFullSave(reason === 'manual' ? 'manual' : reason);

        if (!silent) {
          showToast('Data har sparats!', 'success');
        }
      } catch (error) {
        console.error('[ManualSave] Error saving wheel:', error);
        showToast('Kunde inte spara', 'error');
      } finally {
        setAutoSaveEnabled(wasAutoSaveEnabled);
      }

      return;
    }

    const dataToSave = {
      title,
      year,
      colors,
      ringsData,
      organizationData,
      showWeekRing,
      showMonthRing,
      showRingNames,
      showWeekNumbers,
      showLabels,
      showQuarterHighlights,
    };

    localStorage.setItem('yearWheelData', JSON.stringify(dataToSave));
    markSaved();

    if (!silent) {
      showToast('Data har sparats lokalt!', 'success');
    }
  }, [wheelId, autoSaveEnabled, enqueueFullSave, showToast, title, year, colors, ringsData, organizationData, showWeekRing, showMonthRing, showRingNames, showWeekNumbers, showLabels, showQuarterHighlights, markSaved]);

  const handleToggleTemplate = async () => {
    if (!wheelId || !isAdmin) return;
    
    try {
      const newIsTemplate = !isTemplate;
      setIsTemplate(newIsTemplate);
      
      // Update in database
      await toggleTemplateStatus(wheelId, newIsTemplate);
      
      const message = newIsTemplate 
        ? 'Hjulet är nu markerat som template!' 
        : 'Template-markering borttagen';
      
      const event = new CustomEvent('showToast', { 
        detail: { message, type: 'success' } 
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error toggling template status:', error);
      setIsTemplate(!isTemplate); // Revert on error
      
      const event = new CustomEvent('showToast', { 
        detail: { message: error.message || 'Kunde inte uppdatera template-status', type: 'error' } 
      });
      window.dispatchEvent(event);
    }
  };

  // ========== PAGE MANAGEMENT FUNCTIONS ==========
  
  // Load all pages for current wheel
  const loadPages = useCallback(async () => {
    if (!wheelId) return;
    
    try {
      const pagesData = await fetchPages(wheelId);
      // Sort pages by year
      let sortedPages = pagesData.sort((a, b) => a.year - b.year);
      
      // If no pages exist (legacy wheel), create the first page automatically
      if (sortedPages.length === 0) {
        try {
          // Get current state for creating first page
          const currentYear = parseInt(year) || 2025;
          const currentOrgData = organizationData;
          
          const firstPage = await createPage(wheelId, {
            year: currentYear,
            organizationData: currentOrgData
          });
          sortedPages = [firstPage];
        } catch (createError) {
          // If duplicate key error (React StrictMode double-execution), fetch pages again
          if (createError?.code === '23505') {
            console.warn('⚠️ [LoadPages] Duplicate page creation detected (likely React StrictMode), refetching pages...');
            const refetchedPages = await fetchPages(wheelId);
            sortedPages = refetchedPages.sort((a, b) => a.year - b.year);
          } else {
            throw createError;
          }
        }
      }
      
      setPages(sortedPages);
      
      // Set current page to first page if none selected
      if (sortedPages.length > 0 && !currentPageId) {
        setCurrentPageId(sortedPages[0].id);
        // Load first page's data (with user's saved colors)
        if (sortedPages[0].organization_data) {
          // CRITICAL: Filter items to only those belonging to this page's year
          const pageYear = sortedPages[0].year;
          const cleanedOrgData = {
            ...sortedPages[0].organization_data,
            items: filterItemsByYear(sortedPages[0].organization_data.items, pageYear)
          };
          setOrganizationData(cleanedOrgData);
        }
        if (sortedPages[0].year) {
          setYear(String(sortedPages[0].year));
        }
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte ladda sidor', type: 'error' }
      });
      window.dispatchEvent(event);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelId, currentPageId]);

  // Switch to a different page
  const handlePageChange = async (pageId) => {
    if (pageId === currentPageId) return;
    
    try {
      // NOTE: We DO NOT save organization_data.items here anymore!
      // Items are stored in the `items` table only.
      // JSONB organization_data only contains rings, activityGroups, labels (wheel-level data)
      
      // Load new page data
      const newPage = pages.find(p => p.id === pageId);
      if (newPage) {
        // CRITICAL: Clear ALL data immediately to prevent any data leakage
        setOrganizationData({
          rings: [],
          activityGroups: [],
          labels: [],
          items: []
        });
        
        setCurrentPageId(pageId);
        
        // Fetch fresh data for the new page AND multi-year items that overlap
        const newPageYear = newPage.year || new Date().getFullYear();
        const pageItems = await fetchPageData(pageId, newPageYear, wheelId);
        
        // Fetch rings, activity groups, and labels from database (wheel-level, shared)
        const { data: dbRings } = await supabase
          .from('wheel_rings')
          .select('*')
          .eq('wheel_id', wheelId)
          .order('ring_order');
        
        const { data: dbActivityGroups } = await supabase
          .from('activity_groups')
          .select('*')
          .eq('wheel_id', wheelId);
        
        const { data: dbLabels } = await supabase
          .from('labels')
          .select('*')
          .eq('wheel_id', wheelId);
        
        // Build fresh organization data from database
        setOrganizationData({
          rings: (dbRings || []).map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            visible: r.visible,
            orientation: r.orientation || 'vertical',
            color: r.color || '#408cfb',
            data: r.data || [[""]]
          })),
          activityGroups: (dbActivityGroups || []).map(g => ({
            id: g.id,
            name: g.name,
            color: g.color || '#8B5CF6',
            visible: g.visible
          })),
          labels: (dbLabels || []).map(l => ({
            id: l.id,
            name: l.name,
            color: l.color,
            visible: l.visible
          })),
          items: pageItems
        });
        
        if (newPage.year) {
          setYear(String(newPage.year));
        }
        
        // Clear undo history when switching pages
        clearHistory();
      }
    } catch (error) {
      console.error('Error changing page:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte byta sida', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  // Show add page modal
  const handleAddPage = () => {
    setShowAddPageModal(true);
  };

  // Create a blank page
  const handleCreateBlankPage = async () => {
    if (!wheelId) return;
    
    try {
      // Find highest year from existing pages and add 1
      const maxYear = pages.length > 0 
        ? Math.max(...pages.map(p => p.year))
        : parseInt(year);
      const newYear = maxYear + 1;
      
      const newPage = await createPage(wheelId, {
        year: newYear,
        title: `${newYear}`,
        organization_data: {
          rings: [],
          activityGroups: [{
            id: "group-1",
            name: "Aktivitetsgrupp 1",
            color: colors[0] || "#F5E6D3",
            visible: true
          }],
          labels: [],
          items: []
        }
      });
      
      // Sort pages by year after adding
      const updatedPages = [...pages, newPage].sort((a, b) => a.year - b.year);
      setPages(updatedPages);
      setShowAddPageModal(false);
      
      const event = new CustomEvent('showToast', {
        detail: { message: `Ny sida för ${newYear} skapad!`, type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error creating blank page:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte skapa sida', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  // Create a page for next year
  const handleCreateNextYear = async () => {
    if (!wheelId) return;
    
    try {
      // First, save the current page to ensure we have the latest data
      if (currentPageId) {
        // CRITICAL: Filter items to only those belonging to this page's year
        const currentYearNum = parseInt(year);
        const pageSpecificItems = (organizationData.items || []).filter(item => {
          const itemStartYear = new Date(item.startDate).getFullYear();
          const itemEndYear = new Date(item.endDate).getFullYear();
          // Include item if it overlaps with current year
          return itemStartYear <= currentYearNum && itemEndYear >= currentYearNum;
        });
        
        await updatePage(currentPageId, {
          organization_data: {
            ...organizationData,
            items: pageSpecificItems
          },
          year: currentYearNum
        });
      }
      
      // Find highest year from existing pages and add 1
      const maxYear = pages.length > 0 
        ? Math.max(...pages.map(p => p.year))
        : parseInt(year);
      const nextYear = maxYear + 1;
      
      // Create blank page for next year
      // NOTE: Rings/groups are shared across wheel, so they'll automatically appear!
      const newPage = await createPage(wheelId, {
        year: nextYear,
        title: `${nextYear}`,
        organizationData: {  // NOTE: camelCase for service function!
          rings: [], // Don't copy - rings are shared at wheel level
          activityGroups: [], // Don't copy - groups are shared at wheel level
          labels: [], // Don't copy - labels are shared at wheel level
          items: [] // Empty items - start fresh
        }
      });
      
      // Sort pages by year after adding
      const updatedPages = [...pages, newPage].sort((a, b) => a.year - b.year);
      setPages(updatedPages);
      setShowAddPageModal(false);
      
      const event = new CustomEvent('showToast', {
        detail: { message: `Ny sida för ${nextYear} skapad med samma struktur!`, type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error creating next year page:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte skapa nästa års sida', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  // SmartCopy: Create next year page with ALL activities copied and dates adjusted
  const handleSmartCopy = async () => {
    if (!wheelId) return;
    
    try {
      // First, save the current page to ensure we have the latest data
      if (currentPageId) {
        // CRITICAL: Filter items to only those belonging to this page's year
        const currentYearNum = parseInt(year);
        const pageSpecificItems = (organizationData.items || []).filter(item => {
          const itemStartYear = new Date(item.startDate).getFullYear();
          const itemEndYear = new Date(item.endDate).getFullYear();
          // Include item if it overlaps with current year
          return itemStartYear <= currentYearNum && itemEndYear >= currentYearNum;
        });
        
        await updatePage(currentPageId, {
          organization_data: {
            ...organizationData,
            items: pageSpecificItems
          },
          year: currentYearNum
        });
      }
      
      // Find highest year from existing pages and add 1
      const maxYear = pages.length > 0 
        ? Math.max(...pages.map(p => p.year))
        : parseInt(year);
      const nextYear = maxYear + 1;
      const currentYear = parseInt(year);
      
      // Helper function to adjust date to new year
      const adjustDateToNewYear = (dateString, yearOffset) => {
        const date = new Date(dateString);
        date.setFullYear(date.getFullYear() + yearOffset);
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      };
      
      // Copy ALL items with new IDs and adjusted dates
      // Keep original references to rings, activityGroups, and labels (shared at wheel level)
      const copiedItems = organizationData.items.map(item => ({
        ...item,
        id: `item-copy-${nextYear}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique temporary ID
        startDate: adjustDateToNewYear(item.startDate, nextYear - currentYear),
        endDate: adjustDateToNewYear(item.endDate, nextYear - currentYear),
        pageId: null // Will be set when saving
        // ringId, activityId, labelId remain unchanged - they reference wheel-level structures
      }));
      
      
      // Create new page (empty organization_data initially)
      const newPage = await createPage(wheelId, {
        year: nextYear,
        title: `${nextYear}`,
        organizationData: {
          rings: [],
          activityGroups: [],
          labels: [],
          items: []
        }
      });
      
      
      const itemsToSave = copiedItems.map(item => ({
        ...item,
        pageId: newPage.id
      }));

      const hydratedPage = {
        ...newPage,
        organization_data: {
          rings: [...(organizationData.rings || [])],
          activityGroups: [...(organizationData.activityGroups || [])],
          labels: [...(organizationData.labels || [])],
          items: itemsToSave,
        },
      };

      setPages(prevPages => {
        const nextPages = Array.isArray(prevPages) ? [...prevPages, hydratedPage] : [hydratedPage];
        return nextPages.sort((a, b) => a.year - b.year);
      });
      setShowAddPageModal(false);

      setCurrentPageId(hydratedPage.id);
      setYear(String(nextYear));

      setOrganizationData(prevData => ({
        ...prevData,
        items: itemsToSave,
      }), { type: 'smartCopy', params: { year: nextYear } });

      await enqueueFullSave('smart-copy');

      showToast(`SmartCopy: ${itemsToSave.length} aktiviteter kopierade till ${nextYear}!`, 'success');
    } catch (error) {
      const event = new CustomEvent('showToast', {
        detail: { message: `SmartCopy misslyckades: ${error.message}`, type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const ensurePageForYear = useCallback(
    async (targetYear, options = {}) => {
      if (!wheelId) return null;

      const normalizedTargetYear = toYearNumber(targetYear);
      if (normalizedTargetYear === null) {
        console.warn('[MultiYear] Ignoring invalid target year:', targetYear);
        return null;
      }

      const findByYear = (pageList) =>
        (pageList || []).find((page) => toYearNumber(page.year) === normalizedTargetYear);

      const existingLocal = findByYear(pages);
      if (existingLocal) {
        return { page: existingLocal, created: false };
      }

      let existingRemote = null;
      try {
        const { data, error } = await supabase
          .from('wheel_pages')
          .select('*')
          .eq('wheel_id', wheelId)
          .eq('year', normalizedTargetYear)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        existingRemote = data || null;
      } catch (lookupError) {
        console.error('[MultiYear] Failed to verify page existence:', lookupError);
        showToast('Kunde inte kontrollera befintlig sida för året.', 'error');
        return null;
      }

      if (existingRemote) {
        setPages((prevPages) => {
          if (prevPages.some((page) => page.id === existingRemote.id)) {
            return prevPages;
          }

          const merged = [...prevPages, existingRemote];
          merged.sort((a, b) => toYearNumber(a.year) - toYearNumber(b.year));
          return merged;
        });

        return { page: existingRemote, created: false };
      }

      const templateOrganizationData = options?.templateOrganizationData || {
        rings: [],
        activityGroups: [],
        labels: [],
        items: [],
      };

      try {
        const newPage = await createPage(wheelId, {
          year: normalizedTargetYear,
          title: `${normalizedTargetYear}`,
          organizationData: templateOrganizationData,
          overrideColors: options?.overrideColors || null,
          overrideShowWeekRing: options?.overrideShowWeekRing || null,
          overrideShowMonthRing: options?.overrideShowMonthRing || null,
          overrideShowRingNames: options?.overrideShowRingNames || null,
        });

        setPages((prevPages) => {
          const merged = [...prevPages, newPage];
          merged.sort((a, b) => toYearNumber(a.year) - toYearNumber(b.year));
          return merged;
        });

        return { page: newPage, created: true };
      } catch (error) {
        // 23505 indicates duplicate page (likely due to concurrent creation)
        if (error?.code === '23505') {
          try {
            const refreshedPages = await fetchPages(wheelId);
            const sortedPages = refreshedPages.sort(
              (a, b) => toYearNumber(a.year) - toYearNumber(b.year)
            );
            setPages(sortedPages);
            const match = sortedPages.find(
              (p) => toYearNumber(p.year) === normalizedTargetYear
            );
            if (match) {
              return { page: match, created: false };
            }
          } catch (fetchError) {
            console.error(
              '[MultiYear] Failed to refresh pages after duplicate page error:',
              fetchError
            );
          }
        }

        console.error('[MultiYear] Failed to ensure page for year', normalizedTargetYear, error);
        showToast('Kunde inte skapa sida för nytt år.', 'error');
        return null;
      }
    },
    [wheelId, pages, showToast]
  );

  // Duplicate a page
  const handleDuplicatePage = async (pageId) => {
    if (!wheelId) return;
    
    try {
      const duplicatedPage = await duplicatePage(pageId);
      // Sort pages by year after adding
      const updatedPages = [...pages, duplicatedPage].sort((a, b) => a.year - b.year);
      setPages(updatedPages);
      
      const event = new CustomEvent('showToast', {
        detail: { message: 'Sida duplicerad!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error duplicating page:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte duplicera sida', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  // Delete a page
  const handleDeletePage = async (pageId) => {
    if (pages.length <= 1) {
      showToast('Kan inte radera sista sidan', 'error');
      return;
    }
    
    const confirmed = await showConfirmDialog({
      title: 'Radera sida',
      message: 'Är du säker på att du vill radera denna sida?',
      confirmText: 'Radera',
      cancelText: 'Avbryt',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (!confirmed) return;
    
    try {
      await deletePage(pageId);
      const updatedPages = pages.filter(p => p.id !== pageId);
      setPages(updatedPages);
      
      // If deleted current page, switch to another
      if (pageId === currentPageId && updatedPages.length > 0) {
        const newCurrentPage = updatedPages[0];
        setCurrentPageId(newCurrentPage.id);
        if (newCurrentPage.organization_data) {
          setOrganizationData(newCurrentPage.organization_data);
        }
        if (newCurrentPage.year) {
          setYear(String(newCurrentPage.year));
        }
        
        // Clear undo history when switching pages
        clearHistory();
      }
      
      const event = new CustomEvent('showToast', {
        detail: { message: 'Sida raderad', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error deleting page:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte radera sida', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  // ========== END PAGE MANAGEMENT ==========

  const handleRestoreVersion = async (versionData) => {
    try {
      // CRITICAL: Block ALL updates during version restore
      isRestoringVersion.current = true;
      isLoadingData.current = true;
      isSavingRef.current = true; // Also block saves
      
      // Block realtime updates during version restore to prevent race condition
      lastSaveTimestamp.current = Date.now() + 20000; // Block for 20 seconds
      
      // Create a version snapshot of current state before restoring
      if (wheelId) {
        await createVersion(
          wheelId,
          {
            title,
            year,
            colors,
            showWeekRing,
            showMonthRing,
            showRingNames,
            organizationData
          },
          'Före återställning',
          false
        );
      }

      const cloneOrgData = (data) => {
        if (!data) {
          return null;
        }

        return {
          rings: [...(data.rings || [])],
          activityGroups: [...(data.activityGroups || [])],
          labels: [...(data.labels || [])],
          items: [...(data.items || [])],
        };
      };

      const restoredOrgData = cloneOrgData(versionData.organizationData);

      if (currentPageId && restoredOrgData) {
        setPages((prevPages) => {
          if (!Array.isArray(prevPages)) {
            return prevPages;
          }

          return prevPages.map((page) => {
            if (page.id !== currentPageId) {
              return page;
            }

            return {
              ...page,
              organization_data: {
                ...(page.organization_data || {}),
                ...restoredOrgData,
              },
            };
          });
        });
      }

      const versionUpdates = {};
      if (versionData.title) {
        versionUpdates.title = versionData.title;
      }
      if (versionData.colors) {
        versionUpdates.colors = versionData.colors;
      }
      if (restoredOrgData) {
        versionUpdates.organizationData = restoredOrgData;
      }

      if (Object.keys(versionUpdates).length > 0) {
        setUndoableStates(versionUpdates);
      }

      latestValuesRef.current = {
        ...latestValuesRef.current,
        title: versionData.title ?? latestValuesRef.current?.title,
        colors: versionData.colors ?? latestValuesRef.current?.colors,
        showWeekRing: versionData.showWeekRing ?? latestValuesRef.current?.showWeekRing,
        showMonthRing: versionData.showMonthRing ?? latestValuesRef.current?.showMonthRing,
        showRingNames: versionData.showRingNames ?? latestValuesRef.current?.showRingNames,
        organizationData: restoredOrgData ?? latestValuesRef.current?.organizationData,
        year: versionData.year ?? latestValuesRef.current?.year,
      };

      clearHistory();

      if (versionData.year) setYear(versionData.year.toString());
      if (typeof versionData.showWeekRing === 'boolean') setShowWeekRing(versionData.showWeekRing);
      if (typeof versionData.showMonthRing === 'boolean') setShowMonthRing(versionData.showMonthRing);
      if (typeof versionData.showRingNames === 'boolean') setShowRingNames(versionData.showRingNames);

      await enqueueFullSave('restore-version');

      lastSaveTimestamp.current = Date.now();
      isSavingRef.current = false;
      isLoadingData.current = false;
      isRestoringVersion.current = false;

      showToast('Version återställd!', 'success');
      setShowVersionHistory(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      // Reset flags on error
      lastSaveTimestamp.current = Date.now();
      isSavingRef.current = false;
      isLoadingData.current = false;
      isRestoringVersion.current = false;
      
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte återställa version', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const handleReset = async () => {
    const confirmed = await showConfirmDialog({
      title: 'Återställ hjul',
      message: 'Är du säker på att du vill återställa allt? All data kommer att raderas.',
      confirmText: 'Återställ',
      cancelText: 'Avbryt',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
    });
    
    if (!confirmed) return;
    
    // Reset to clean state with one initial inner ring
    setTitle("Nytt hjul");
    setYear("2025");
    const defaultColors = ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"];
    setColors(defaultColors);
    
    // Reset with one initial inner ring and default activity group for planning
    setOrganizationData({
      rings: [
        {
          id: "ring-1",
          name: "Ring 1",
          type: "inner",
          visible: true,
          data: Array.from({ length: 12 }, () => [""]),
          orientation: "vertical"
        }
      ],
      activityGroups: [
        {
          id: "group-1",
          name: "Aktivitetsgrupp 1",
          color: defaultColors[0],
          visible: true
        }
      ],
      labels: [],
      items: []
    });
    
    // Keep backward compatibility
    setRingsData([
      {
        data: Array.from({ length: 12 }, () => [""]),
        orientation: "vertical"
      }
    ]);
    
    setShowYearEvents(false);
    setShowWeekRing(true);
    setShowMonthRing(true);
    setShowSeasonRing(true);
    localStorage.removeItem("yearWheelData");
    
    // Show success feedback
    const event = new CustomEvent('showToast', { 
      detail: { message: 'Allt har återställts!', type: 'success' } 
    });
    window.dispatchEvent(event);
  };

  const handleTemplateSelect = async (templateId) => {
    const confirmed = await showConfirmDialog({
      title: 'Använd mall',
      message: 'Detta kommer att ersätta det nuvarande hjulet med den valda mallen. Alla ändringar som inte är sparade går förlorade. Fortsätt?',
      confirmText: 'Fortsätt',
      cancelText: 'Avbryt',
      confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    });
    
    if (!confirmed) return;

    try {
      setIsSaving(true);
      
      // Fetch template data
      const templateData = await fetchWheel(templateId);
      const templatePages = await fetchPages(templateId);
      
      if (!templateData || !templatePages || templatePages.length === 0) {
        throw new Error('Template data not found');
      }

      console.log('[Editor] Loading template:', templateData.title, 'Pages:', templatePages.length);

      // Set wheel-level data from template
      setTitle(`${templateData.title} (Kopia)`);
      setYear(String(templateData.year));
      setColors(templateData.colors || ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"]);
      setShowWeekRing(templateData.show_week_ring);
      setShowMonthRing(templateData.show_month_ring);
      setShowRingNames(templateData.show_ring_names);
      setShowLabels(templateData.show_labels);
      setWeekRingDisplayMode(templateData.week_ring_display_mode || 'week-numbers');

      // Helper function to convert template data to new client IDs
      const convertTemplateData = (templateOrgData) => {
        // Deep copy to avoid read-only property issues
        const orgData = JSON.parse(JSON.stringify(templateOrgData));
        
        // Create ID mapping for consistent references
        const ringIdMap = new Map();
        const groupIdMap = new Map();
        const labelIdMap = new Map();
        
        // CRITICAL: Clear all IDs and create new client-side IDs
        if (orgData.rings) {
          orgData.rings = orgData.rings.map((ring, index) => {
            const newId = `ring-${index + 1}`;
            ringIdMap.set(ring.id, newId);
            return { ...ring, id: newId };
          });
        }
        
        if (orgData.activityGroups) {
          orgData.activityGroups = orgData.activityGroups.map((group, index) => {
            const newId = `group-${index + 1}`;
            groupIdMap.set(group.id, newId);
            return { ...group, id: newId };
          });
        }
        
        if (orgData.labels) {
          orgData.labels = orgData.labels.map((label, index) => {
            const newId = `label-${index + 1}`;
            labelIdMap.set(label.id, newId);
            return { ...label, id: newId };
          });
        }
        
        if (orgData.items) {
          orgData.items = orgData.items.map((item, index) => ({
            ...item,
            id: `item-${index + 1}`, // Use client-side ID
            pageId: null, // Clear page reference
            // Update references using the mapping
            ringId: ringIdMap.get(item.ringId) || item.ringId,
            activityId: groupIdMap.get(item.activityId) || item.activityId,
            labelId: item.labelId ? (labelIdMap.get(item.labelId) || item.labelId) : null
          }));
        }
        
        return orgData;
      };

      // For multi-page wheels, load the first page
      if (templatePages.length > 1) {
        const firstPage = templatePages[0];
        const orgData = convertTemplateData(firstPage.organization_data);
        
        setOrganizationData(orgData);
        setCurrentPageId(null); // Will create new pages when saved
        
        // Store template pages for reference but clear current page ID
        setPages(templatePages);
      } else {
        // Single page template - load organization data from first page
        const templateOrgData = templatePages[0].organization_data;
        const orgData = convertTemplateData(templateOrgData);
        
        setOrganizationData(orgData);
        setPages([]);
        setCurrentPageId(null);
      }

      // Update rings data for backward compatibility
      const rings = templatePages[0].organization_data.rings || [];
      const newRingsData = rings.map(ring => ({
        data: ring.data || Array.from({ length: 12 }, () => [""]),
        orientation: ring.orientation || "vertical"
      }));
      setRingsData(newRingsData);

      // Clear history and mark as saved
      clearHistory();
      markSaved();

      const successMessage = `Mall "${templateData.title}" har laddats!`;
      const event = new CustomEvent('showToast', {
        detail: { message: successMessage, type: 'success' }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Error loading template:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte ladda mallen. Försök igen.', type: 'error' }
      });
      window.dispatchEvent(event);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToFile = () => {
    const dataToSave = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      title,
      year,
      colors,
      ringsData,
      organizationData,
      showWeekRing,
      showMonthRing,
      showRingNames,
    };

    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = title.trim() ? title.replace(/\s+/g, '_') : 'Untitled';
    link.download = `${fileName}_${year}.yrw`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success feedback
    const event = new CustomEvent('showToast', { 
      detail: { message: 'Fil sparad!', type: 'success' } 
    });
    window.dispatchEvent(event);
  };

  const persistItemToDatabase = useCallback((item, options = {}) => {
    if (!wheelId || !item) {
      return Promise.resolve(null);
    }

    const { reason = 'item-update', delay = 0 } = options;

    const run = () => enqueueFullSave(reason);

    if (delay > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          run().then(resolve).catch(reject);
        }, delay);
      });
    }

    return run();
  }, [wheelId, enqueueFullSave]);

  const persistMultipleItems = useCallback((items, options = {}) => {
    if (!wheelId) {
      return Promise.resolve(Array.isArray(items) ? items : items ? [items] : []);
    }

    const { reason = 'item-batch', delay = 0 } = options;

    const run = () => enqueueFullSave(reason).then(() => items);

    if (delay > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          run().then(resolve).catch(reject);
        }, delay);
      });
    }

    return run();
  }, [wheelId, enqueueFullSave]);

  const persistItemDeletion = useCallback((itemId, options = {}) => {
    if (!wheelId) {
      return Promise.resolve();
    }

    const { reason = 'item-delete', delay = 0 } = options;

    const run = () => enqueueFullSave(reason);

    if (delay > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          run().then(resolve).catch(reject);
        }, delay);
      });
    }

    return run();
  }, [wheelId, enqueueFullSave]);

  const handlePersistNewItems = useCallback((items) => {
    return persistMultipleItems(items, { reason: 'item-create' });
  }, [persistMultipleItems]);

  const handlePersistItemUpdate = useCallback((item) => {
    return persistItemToDatabase(item, { reason: 'item-update' });
  }, [persistItemToDatabase]);

  const handlePersistItemRemove = useCallback((itemId) => {
    return persistItemDeletion(itemId, { reason: 'item-delete' });
  }, [persistItemDeletion]);

  const handleExtendActivityBeyondYear = useCallback(async ({ item, overflowEndDate, currentYearEnd }) => {
    if (!wheelId || !item || !overflowEndDate || !currentYearEnd) {
      return;
    }

    const overflowDate = new Date(overflowEndDate);
    const currentYearEndDate = new Date(currentYearEnd);

    if (!(overflowDate instanceof Date) || Number.isNaN(overflowDate.getTime())) {
      return;
    }

    if (overflowDate <= currentYearEndDate) {
      return;
    }

    const segments = [];
    const nextDay = new Date(currentYearEndDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let segmentStart = nextDay;

    while (segmentStart <= overflowDate) {
      const segmentYear = segmentStart.getFullYear();
      const segmentYearEnd = new Date(segmentYear, 11, 31);
      const segmentEnd = overflowDate <= segmentYearEnd ? overflowDate : segmentYearEnd;

      segments.push({
        year: segmentYear,
        startDate: formatDateOnly(segmentStart),
        endDate: formatDateOnly(segmentEnd),
      });

      if (segmentEnd >= overflowDate) {
        break;
      }

      segmentStart = new Date(segmentYear + 1, 0, 1);
    }

    if (segments.length === 0) {
      return;
    }

    const firstContinuationYear = segments[0].year;
    const lastContinuationYear = segments[segments.length - 1].year;

    const confirmed = await showConfirmDialog({
      title: 'Fortsätt över årsskiftet?',
      message: segments.length === 1
        ? `Aktiviteten "${item.name}" fortsätter in i ${firstContinuationYear}. Vill du skapa en fortsättning på nästa års sida?`
        : `Aktiviteten "${item.name}" sträcker sig ända till ${lastContinuationYear}. Vill du skapa fortsättningar för varje år?`,
      confirmText: 'Skapa fortsättning',
      cancelText: 'Endast detta år',
      confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    });

    if (!confirmed) {
      return;
    }

    const createdSegments = [];

    const ensureArray = (value) => (Array.isArray(value) ? value : []);

    const generateItemId = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `item-${crypto.randomUUID()}`;
      }
      return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const isMatchingContinuation = (candidate, startDate, endDate) =>
      candidate &&
      candidate.name === item.name &&
      candidate.ringId === item.ringId &&
      candidate.activityId === item.activityId &&
      (candidate.labelId || null) === (item.labelId || null) &&
      candidate.startDate === startDate &&
      candidate.endDate === endDate;

    for (const segment of segments) {
      try {
        const ensured = await ensurePageForYear(segment.year);
        const targetPage = ensured?.page;
        if (!targetPage) {
          continue;
        }

        const pageId = targetPage.id;

        const latestPages = pagesRef.current || [];
        const pageEntry = latestPages.find((page) => page.id === pageId);
        const existingItems = ensureArray(pageEntry?.organization_data?.items);
        const existingMatch = existingItems.find((candidate) =>
          isMatchingContinuation(candidate, segment.startDate, segment.endDate)
        );

        if (existingMatch) {
          createdSegments.push({ year: segment.year, item: existingMatch, alreadyExisted: true });
          continue;
        }

        const newItem = {
          id: generateItemId(),
          ringId: item.ringId,
          activityId: item.activityId,
          labelId: item.labelId || null,
          name: item.name,
          startDate: segment.startDate,
          endDate: segment.endDate,
          time: item.time || null,
          description: item.description || null,
          pageId,
          linkedWheelId: item.linkedWheelId || null,
          linkType: item.linkType || null,
        };

        setPages((prevPages) => {
          if (!Array.isArray(prevPages)) {
            return prevPages;
          }

          return prevPages.map((page) => {
            if (page.id !== pageId) {
              return page;
            }

            const nextOrgData = {
              ...(page.organization_data || {}),
              items: [...ensureArray(page.organization_data?.items), newItem],
            };

            return {
              ...page,
              organization_data: nextOrgData,
            };
          });
        });

        if ((latestValuesRef.current?.currentPageId || currentPageId) === pageId) {
          setOrganizationData((prev) => ({
            ...prev,
            items: [...ensureArray(prev.items), newItem],
          }), { type: 'appendContinuation' });
        }

        createdSegments.push({ year: segment.year, item: newItem, alreadyExisted: false });

        if (broadcastOperation) {
          broadcastOperation('create', newItem.id, newItem);
        }
      } catch (segmentError) {
        console.error('[MultiYear] Failed to queue continuation segment:', segmentError);
        showToast('Kunde inte skapa fortsättning för aktiviteten.', 'error');
        break;
      }
    }

    if (createdSegments.length > 0) {
      enqueueFullSave('multi-year-continuation').catch((error) => {
        console.error('[MultiYear] Snapshot save failed:', error);
        showToast('Kunde inte spara fortsättningen.', 'error');
      });

      const continuationYears = createdSegments.map((segment) => segment.year);
      const minYear = Math.min(...continuationYears);
      const maxYear = Math.max(...continuationYears);

      const successMessage = minYear === maxYear
        ? `Aktiviteten fortsätter nu i ${minYear}.`
        : `Aktiviteten fortsätter nu i ${minYear}–${maxYear}.`;

      showToast(successMessage, 'success');
    }
  }, [wheelId, ensurePageForYear, pagesRef, currentPageId, setPages, setOrganizationData, enqueueFullSave, broadcastOperation, showToast, showConfirmDialog]);

  // Handle drag start - begin batch mode for undo/redo
  const handleDragStart = useCallback((item) => {
    isDraggingRef.current = true;
    const label = item 
      ? { type: 'dragItem', params: { name: item.name } }
      : { type: 'dragActivity' };
    startBatch(label);
  }, [startBatch]);

  // Memoize callbacks to prevent infinite loops
  const handleUpdateAktivitet = useCallback((updatedItem) => {
    const wasDragging = isDraggingRef.current;

    let calculatedLabel = wasDragging ? undefined : { type: 'changeActivity' };
    let actuallyChanged = false;

    setOrganizationData((prevData) => {
      const oldItem = prevData.items.find((item) => item.id === updatedItem.id);

      if (oldItem) {
        const ringChanged = oldItem.ringId !== updatedItem.ringId;
        const datesChanged = oldItem.startDate !== updatedItem.startDate || oldItem.endDate !== updatedItem.endDate;
        const activityChanged = oldItem.activityId !== updatedItem.activityId;
        const labelChanged = (oldItem.labelId || null) !== (updatedItem.labelId || null);
        const nameChanged = oldItem.name !== updatedItem.name;
        const timeChanged = (oldItem.time || null) !== (updatedItem.time || null);
        const descriptionChanged = (oldItem.description || null) !== (updatedItem.description || null);
        const linkChanged =
          (oldItem.linkType || null) !== (updatedItem.linkType || null) ||
          (oldItem.linkedWheelId || null) !== (updatedItem.linkedWheelId || null);

        actuallyChanged =
          ringChanged ||
          datesChanged ||
          activityChanged ||
          labelChanged ||
          nameChanged ||
          timeChanged ||
          descriptionChanged ||
          linkChanged;

        if (!wasDragging) {
          if (ringChanged && datesChanged) {
            calculatedLabel = { type: 'moveAndChange', params: { name: updatedItem.name } };
          } else if (ringChanged) {
            const newRing = prevData.rings.find((r) => r.id === updatedItem.ringId);
            if (newRing) {
              calculatedLabel = {
                type: 'moveToRing',
                params: { name: updatedItem.name, ring: newRing.name },
              };
            } else {
              calculatedLabel = { type: 'moveItem', params: { name: updatedItem.name } };
            }
          } else if (datesChanged) {
            calculatedLabel = { type: 'changeDates', params: { name: updatedItem.name } };
          } else {
            calculatedLabel = { type: 'editItem', params: { name: updatedItem.name } };
          }
        }
      } else {
        actuallyChanged = true;
      }

      return {
        ...prevData,
        items: prevData.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      };
    }, calculatedLabel);

    if (wasDragging) {
      isDraggingRef.current = false;
      if (actuallyChanged) {
        endBatch();
      } else {
        cancelBatch();
      }
    }

    if (actuallyChanged) {
      persistItemToDatabase(updatedItem, {
        reason: wasDragging ? 'drag-update' : 'edit-update',
        delay: wasDragging ? 120 : 0,
      }).catch(() => {});
    }
  }, [setOrganizationData, endBatch, cancelBatch, persistItemToDatabase]);

  const handleDeleteAktivitet = useCallback((itemId) => {
    let calculatedLabel = { type: 'removeActivity' };

    setOrganizationData((prevData) => {
      const itemToDelete = prevData.items.find((item) => item.id === itemId);
      if (itemToDelete) {
        calculatedLabel = { type: 'removeItem', params: { name: itemToDelete.name } };
      }

      return {
        ...prevData,
        items: prevData.items.filter((item) => item.id !== itemId),
      };
    }, calculatedLabel);

    persistItemDeletion(itemId, { reason: 'delete-item' }).catch(() => {});
  }, [setOrganizationData, persistItemDeletion]);

  const handleLoadFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yrw,.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (readerEvent) => {
        try {
          const data = JSON.parse(readerEvent.target.result);
          
          // Validate the data structure (allow empty title)
          // Support both old format (ringsData) and new format (organizationData)
          if (data.title === undefined || !data.year || (!data.ringsData && !data.organizationData)) {
            throw new Error('Invalid file format');
          }

          // console.log('[FileImport] Starting file import...');
          
          // CRITICAL: Mark as loading to prevent realtime from overwriting
          isLoadingData.current = true;
          isRealtimeUpdate.current = true;

          // Process organization data BEFORE setting state
          let processedOrgData;
          if (data.organizationData) {
            processedOrgData = { ...data.organizationData };
            
            // Backward compatibility: convert old 'activities' to 'activityGroups'
            if (processedOrgData.activities && !processedOrgData.activityGroups) {
              processedOrgData.activityGroups = processedOrgData.activities;
              delete processedOrgData.activities;
            }
            
            // Ensure required arrays exist
            processedOrgData.rings = processedOrgData.rings || [];
            processedOrgData.activityGroups = processedOrgData.activityGroups || [];
            processedOrgData.labels = processedOrgData.labels || [];
            processedOrgData.items = processedOrgData.items || [];
            
            // CRITICAL FIX: Generate new UUIDs to prevent cross-wheel conflicts
            // When importing, we must NOT reuse IDs from the source wheel
            const idMapping = {
              rings: {},
              activityGroups: {},
              labels: {}
            };
            
            // Regenerate ring IDs
            processedOrgData.rings = processedOrgData.rings.map(ring => {
              const oldId = ring.id;
              const newId = crypto.randomUUID();
              idMapping.rings[oldId] = newId;
              return { ...ring, id: newId };
            });
            
            // Regenerate activity group IDs
            processedOrgData.activityGroups = processedOrgData.activityGroups.map(group => {
              const oldId = group.id;
              const newId = crypto.randomUUID();
              idMapping.activityGroups[oldId] = newId;
              return { ...group, id: newId };
            });
            
            // Regenerate label IDs
            processedOrgData.labels = processedOrgData.labels.map(label => {
              const oldId = label.id;
              const newId = crypto.randomUUID();
              idMapping.labels[oldId] = newId;
              return { ...label, id: newId };
            });
            
            // Regenerate item IDs and update foreign key references
            processedOrgData.items = processedOrgData.items.map(item => {
              return {
                ...item,
                id: crypto.randomUUID(),
                ringId: idMapping.rings[item.ringId] || item.ringId,
                activityId: idMapping.activityGroups[item.activityId] || item.activityId,
                labelId: item.labelId ? (idMapping.labels[item.labelId] || item.labelId) : null
              };
            });
            
          } else {
            // Use default structure if not present in file
            processedOrgData = { 
              rings: [], 
              activityGroups: [], 
              labels: [], 
              items: [] 
            };
          }

          // If wheelId exists, save IMMEDIATELY (before setting state)
          let saveFailed = false;
          if (wheelId) {
            try {
              // console.log('[FileImport] Saving imported data to database...');
              
              // Save immediately to prevent realtime from overwriting
              await updateWheel(wheelId, {
                title: data.title,
                year: parseInt(data.year),
                colors: data.colors || colors,
                showWeekRing: data.showWeekRing ?? showWeekRing,
                showMonthRing: data.showMonthRing ?? showMonthRing,
                showRingNames: data.showRingNames ?? showRingNames,
              });
              
              // MULTI-YEAR IMPORT: Group items by year from startDate
              const itemsByYear = {};
              const itemsWithoutDate = []; // Items without startDate go to main year
              
              processedOrgData.items.forEach(item => {
                if (item.startDate) {
                  const itemYear = new Date(item.startDate).getFullYear();
                  if (!itemsByYear[itemYear]) {
                    itemsByYear[itemYear] = [];
                  }
                  itemsByYear[itemYear].push(item);
                } else {
                  // Items without dates go to the file's main year
                  itemsWithoutDate.push(item);
                }
              });
              
              // Add items without dates to the file's main year
              const mainYear = parseInt(data.year);
              if (itemsWithoutDate.length > 0) {
                if (!itemsByYear[mainYear]) {
                  itemsByYear[mainYear] = [];
                }
                itemsByYear[mainYear].push(...itemsWithoutDate);
              }
              
              const years = Object.keys(itemsByYear).sort();
              
              const preparedPages = [];

              for (const yearStr of years) {
                const year = Number.parseInt(yearStr, 10);
                if (!Number.isFinite(year)) {
                  continue;
                }

                const ensured = await ensurePageForYear(year);
                const targetPage = ensured?.page;
                if (!targetPage) {
                  continue;
                }

                preparedPages.push({
                  ...targetPage,
                  organization_data: {
                    rings: [...processedOrgData.rings],
                    activityGroups: [...processedOrgData.activityGroups],
                    labels: [...processedOrgData.labels],
                    items: [...(itemsByYear[yearStr] || [])],
                  },
                });
              }

              if (preparedPages.length === 0) {
                throw new Error('Kunde inte skapa sidor för importerat innehåll.');
              }

              const sortedPreparedPages = [...preparedPages].sort((a, b) => a.year - b.year);

              setPages(sortedPreparedPages);
              pagesRef.current = sortedPreparedPages;

              const fileYear = Number.parseInt(data.year, 10);
              const pageForFileYear = sortedPreparedPages.find((page) => page.year === fileYear) || sortedPreparedPages[0];

              if (pageForFileYear) {
                setCurrentPageId(pageForFileYear.id);
                setYear(String(pageForFileYear.year || fileYear));

                const pageOrgData = pageForFileYear.organization_data || {
                  rings: [],
                  activityGroups: [],
                  labels: [],
                  items: [],
                };

                setOrganizationData(() => ({
                  rings: [...pageOrgData.rings],
                  activityGroups: [...pageOrgData.activityGroups],
                  labels: [...pageOrgData.labels],
                  items: [...pageOrgData.items],
                }), { type: 'importFile', params: { year: pageForFileYear.year } });

                latestValuesRef.current = {
                  ...latestValuesRef.current,
                  title: data.title,
                  colors: data.colors || colors,
                  showWeekRing: data.showWeekRing ?? showWeekRing,
                  showMonthRing: data.showMonthRing ?? showMonthRing,
                  showRingNames: data.showRingNames ?? showRingNames,
                  showLabels: data.showLabels ?? showLabels,
                  weekRingDisplayMode: data.weekRingDisplayMode ?? weekRingDisplayMode,
                  currentPageId: pageForFileYear.id,
                  organizationData: {
                    rings: [...pageOrgData.rings],
                    activityGroups: [...pageOrgData.activityGroups],
                    labels: [...pageOrgData.labels],
                    items: [...pageOrgData.items],
                  },
                  pages: sortedPreparedPages,
                  year: String(pageForFileYear.year || fileYear),
                };
              }

              await enqueueFullSave('import-file');

              showToast(`Fil laddad! ${sortedPreparedPages.length} år importerade`, 'success');
            } catch (saveError) {
              saveFailed = true;
              const errorEvent = new CustomEvent('showToast', { 
                detail: { message: 'Fil laddad men kunde inte sparas', type: 'error' } 
              });
              window.dispatchEvent(errorEvent);
              // Continue to update state even if save failed (user can see data, try to save manually)
            }
          }

          // Update state AFTER save attempt (always update so user can see the data)
          // BATCH title, colors, and organizationData together to prevent race condition
          const fileUpdates = {};
          if (data.title) fileUpdates.title = data.title;
          if (data.colors) fileUpdates.colors = data.colors;
          fileUpdates.organizationData = processedOrgData;
          setUndoableStates(fileUpdates);
          
          // Clear undo history after file import (new data context)
          clearHistory();
          
          // Set non-undoable states separately
          setYear(data.year);
          // Set ringsData first (for backward compatibility with old format)
          if (data.ringsData) setRingsData(data.ringsData);
          
          if (data.showWeekRing !== undefined) setShowWeekRing(data.showWeekRing);
          if (data.showMonthRing !== undefined) setShowMonthRing(data.showMonthRing);
          if (data.showYearEvents !== undefined) setShowYearEvents(data.showYearEvents);
          if (data.showSeasonRing !== undefined) setShowSeasonRing(data.showSeasonRing);
          if (data.showRingNames !== undefined) setShowRingNames(data.showRingNames);
          if (data.showLabels !== undefined) setShowLabels(data.showLabels);
          if (data.weekRingDisplayMode) setWeekRingDisplayMode(data.weekRingDisplayMode);

          if (!wheelId) {
            // localStorage mode - show success after state update
            const toastEvent = new CustomEvent('showToast', { 
              detail: { message: 'Fil laddad!', type: 'success' } 
            });
            window.dispatchEvent(toastEvent);
          }
          
          // Re-enable realtime and auto-save after a short delay
          setTimeout(() => {
            isLoadingData.current = false;
            isRealtimeUpdate.current = false;
            // console.log('[FileImport] Import complete, realtime re-enabled');
          }, 1000);
        } catch (error) {
          console.error('Error loading file:', error);
          
          // Make sure to reset flags on error
          isLoadingData.current = false;
          isRealtimeUpdate.current = false;
          
          const toastEvent = new CustomEvent('showToast', { 
            detail: { message: 'Fel vid laddning av fil', type: 'error' } 
          });
          window.dispatchEvent(toastEvent);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // Combined handler for palette changes - updates BOTH colors AND organizationData in ONE state update
  const handlePaletteChange = useCallback(async (newColors, newOrganizationData) => {
    // Update BOTH colors and organizationData in a SINGLE setUndoableStates call
    setUndoableStates({ 
      colors: newColors,
      organizationData: newOrganizationData
    });
    
    // CRITICAL: Update refs IMMEDIATELY before save so handleSave reads the new data
    // Normally refs update on next render, but we need them NOW for immediate save
    latestValuesRef.current = {
      ...latestValuesRef.current,
      colors: newColors,
      organizationData: newOrganizationData
    };
    
    // Update timestamp to ignore realtime events
    lastSaveTimestamp.current = Date.now();
    
    // CRITICAL: Palette changes update activity group colors, which need to be saved to database
    // Auto-save only handles wheel metadata, so we need to explicitly call handleSave here
    await handleSave();
  }, [setUndoableStates, handleSave]);

  // Wrapped color change handler that updates timestamp to prevent realtime overwrites
  const handleColorsChange = useCallback((newColors) => {
    // console.log('[App] handleColorsChange called with:', newColors);
    setColors(newColors);
    // CRITICAL: Update ref immediately so auto-save uses new colors
    latestValuesRef.current.colors = newColors;
    // console.log('[App] Updated latestValuesRef.current.colors to:', newColors);
    // Update timestamp so realtime ignores events for next 5 seconds
    lastSaveTimestamp.current = Date.now();
    // console.log('[App] Updated lastSaveTimestamp to prevent realtime overwrites');
  }, [setColors]);

  // Wrapper for back to dashboard that checks for unsaved changes
  const handleBackToDashboard = useCallback(() => {
    if (hasUnsavedChanges) {
      // Show custom confirm dialog
      const event = new CustomEvent('showConfirmDialog', {
        detail: {
          title: t('common:confirmLeave.title', { defaultValue: 'Osparade ändringar' }),
          message: t('common:confirmLeave.message', { 
            defaultValue: 'Du har osparade ändringar. Är du säker på att du vill lämna utan att spara?' 
          }),
          confirmText: t('common:confirmLeave.confirm', { defaultValue: 'Lämna ändå' }),
          cancelText: t('common:confirmLeave.cancel', { defaultValue: 'Avbryt' }),
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
          onConfirm: () => {
            // User confirmed - proceed to dashboard
            if (onBackToDashboard) {
              onBackToDashboard();
            }
          },
          onCancel: () => {
            // User cancelled - do nothing
          }
        }
      });
      window.dispatchEvent(event);
    } else {
      // No unsaved changes - go directly to dashboard
      if (onBackToDashboard) {
        onBackToDashboard();
      }
    }
  }, [hasUnsavedChanges, onBackToDashboard, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">{t('common:loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onSave={handleSave}
        isSaving={isSaving}
        onBackToDashboard={wheelId ? handleBackToDashboard : null}
        onSaveToFile={handleSaveToFile}
        onLoadFromFile={handleLoadFromFile}
        onExportData={() => setShowExportModal(true)}
        onReset={handleReset}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        year={year}
        onYearChange={setYear}
        onDownloadImage={(toClipboard = false) => yearWheelRef && yearWheelRef.downloadImage(downloadFormat, toClipboard)}
        downloadFormat={downloadFormat}
        onDownloadFormatChange={handleDownloadFormatChange}
        activeUsers={activeUsers}
        isPublic={isPublic}
        isTemplate={isTemplate}
        isAdmin={isAdmin}
        wheelId={wheelId}
        onTogglePublic={handleTogglePublic}
        onToggleTemplate={handleToggleTemplate}
        onVersionHistory={wheelId ? () => setShowVersionHistory(true) : null}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        undoLabel={undoLabel}
        redoLabel={redoLabel}
        undoHistory={history}
        currentHistoryIndex={currentIndex}
        onJumpToHistory={jumpToIndex}
        undoToSave={undoToSave}
        unsavedChangesCount={unsavedChangesCount}
        isPremium={isPremium}
        // Page navigation props
        pages={pages}
        currentPageId={currentPageId}
        onPageChange={handlePageChange}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        // Template functionality
        onTemplateSelect={handleTemplateSelect}
        // AI Assistant
        onToggleAI={wheelId ? () => {
          if (!isPremium) {
            // Show upgrade prompt for non-premium users
            const event = new CustomEvent('showToast', {
              detail: { 
                message: t('subscription:upgradePrompt.aiAssistant'), 
                type: 'info' 
              }
            });
            window.dispatchEvent(event);
            return;
          }
          setIsAIOpen(!isAIOpen);
        } : null}
        // Onboarding
        onStartOnboarding={() => setShowOnboarding(true)}
        onStartAIOnboarding={() => {
          if (!isPremium) {
            // Show upgrade prompt for non-premium users
            const event = new CustomEvent('showToast', {
              detail: { 
                message: t('subscription:upgradePrompt.aiAssistant'), 
                type: 'info' 
              }
            });
            window.dispatchEvent(event);
            return;
          }
          // Ensure AI window is open before starting guide
          if (!isAIOpen) setIsAIOpen(true);
          // Small delay to let AI window render
          setTimeout(() => setShowAIOnboarding(true), 300);
        }}
        // Wheel comments props
        wheelData={wheelData}
        organizationData={organizationData}
        onNavigateToItem={(itemId) => {
          // Open item tooltip using yearWheelRef
          if (yearWheelRef && yearWheelRef.openItemTooltip) {
            yearWheelRef.openItemTooltip(itemId);
          } else {
            console.warn('yearWheelRef.openItemTooltip not available');
          }
        }}
      />
      
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Organization Sidebar */}
        <div className={`
          ${isSidebarOpen ? 'w-80' : 'w-0'}
          transition-all duration-300 ease-in-out
          border-r border-gray-200 overflow-hidden
        `}>
          <OrganizationPanel
            organizationData={organizationData}
            onOrganizationChange={setOrganizationData}
            title={title}
            onTitleChange={setTitle}
            colors={colors}
            onColorsChange={handleColorsChange}
            onPaletteChange={handlePaletteChange}
            year={year}
            zoomedMonth={zoomedMonth}
            zoomedQuarter={zoomedQuarter}
            onZoomToMonth={setZoomedMonth}
            onZoomToQuarter={setZoomedQuarter}
            showRingNames={showRingNames}
            onShowRingNamesChange={setShowRingNames}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            weekRingDisplayMode={weekRingDisplayMode}
            onWeekRingDisplayModeChange={setWeekRingDisplayMode}
            onSaveToDatabase={handleSave}
            onReloadData={loadWheelData}
            currentWheelId={wheelId}
            broadcastActivity={broadcastActivity}
            activeEditors={combinedActiveEditors}
            broadcastOperation={broadcastOperation}
            onPersistItems={handlePersistNewItems}
            onPersistItem={handlePersistItemUpdate}
            onPersistItemDelete={handlePersistItemRemove}
          />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
          <div className="w-full h-full flex items-center justify-center">
            <YearWheel
              key={currentPageId} // Force remount when page changes to clear cached data
              wheelId={wheelId}
              wheelData={wheelData}
              title={title}
              year={year}
              colors={colors}
              ringsData={ringsData}
              organizationData={organizationData}
              showYearEvents={showYearEvents}
              showSeasonRing={showSeasonRing}
              yearEventsCollection={yearEventsCollection}
              showWeekRing={showWeekRing}
              showMonthRing={showMonthRing}
              showRingNames={showRingNames}
              showLabels={showLabels}
              weekRingDisplayMode={weekRingDisplayMode}
              zoomedMonth={zoomedMonth}
              zoomedQuarter={zoomedQuarter}
              onSetZoomedMonth={setZoomedMonth}
              onSetZoomedQuarter={setZoomedQuarter}
              onWheelReady={setYearWheelRef}
              onDragStart={handleDragStart}
              onUpdateAktivitet={handleUpdateAktivitet}
              onDeleteAktivitet={handleDeleteAktivitet}
              onExtendActivityBeyondYear={handleExtendActivityBeyondYear}
              broadcastActivity={broadcastActivity}
              activeEditors={combinedActiveEditors}
              broadcastOperation={broadcastOperation}
            />
          </div>
        </div>

      </div>
      
      <Toast />
      
      {/* Version History Modal */}
      {showVersionHistory && wheelId && (
        <VersionHistoryModal
          wheelId={wheelId}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* Add Page Modal */}
      {showAddPageModal && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <AddPageModal
            currentPage={pages.find(p => p.id === currentPageId)}
            onClose={() => setShowAddPageModal(false)}
            onCreateBlank={handleCreateBlankPage}
            onDuplicate={() => handleDuplicatePage(currentPageId)}
            onCreateNextYear={handleCreateNextYear}
            onSmartCopy={handleSmartCopy}
            isPremium={isPremium}
          />
        </Suspense>
      )}

      {/* Export Data Modal */}
      {showExportModal && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <ExportDataModal
            organizationData={organizationData}
            year={year}
            title={title}
            onClose={() => setShowExportModal(false)}
            isPremium={isPremium}
          />
        </Suspense>
      )}

      {/* AI Assistant (only for database wheels) */}
      {wheelId && (
        <Suspense fallback={null}>
          <AIAssistant
          wheelId={wheelId}
          currentPageId={currentPageId}
          onWheelUpdate={loadWheelData}
          onPageChange={(pageId) => {
            // Update currentPageId and trigger a reload
            // Use React's state callback to ensure we reload after state is set
            setCurrentPageId(pageId);
            // Force a fresh load by incrementing a counter or similar
            // Better: directly load the specific page
            (async () => {
              try {
                const pagesData = await fetchPages(wheelId);
                const pageToLoad = pagesData.find(p => p.id === pageId);
                if (pageToLoad && pageToLoad.organization_data) {
                  setYear(String(pageToLoad.year || new Date().getFullYear()));
                  
                  const orgData = pageToLoad.organization_data;
                  // Handle backward compatibility
                  if (orgData.activities && !orgData.activityGroups) {
                    orgData.activityGroups = orgData.activities;
                    delete orgData.activities;
                  }
                  
                  setOrganizationData(orgData);
                }
              } catch (error) {
                console.error('❌ [App] Error loading page:', error);
              }
            })();
          }}
          isOpen={isAIOpen}
          onToggle={() => setIsAIOpen(!isAIOpen)}
          isPremium={isPremium}
        />
        </Suspense>
      )}

      {/* Editor Onboarding Tour */}
      <Suspense fallback={null}>
        <EditorOnboarding
          shouldStart={showOnboarding}
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('yearwheel_onboarding_completed', 'true');
          }}
          onSkip={() => {
            setShowOnboarding(false);
            localStorage.setItem('yearwheel_onboarding_completed', 'true');
          }}
        />
      </Suspense>

      {/* AI Assistant Onboarding Tour - Only for database wheels */}
      {wheelId && (
        <Suspense fallback={null}>
          <AIAssistantOnboarding
            shouldStart={showAIOnboarding && isAIOpen}
            onComplete={() => {
              setShowAIOnboarding(false);
              localStorage.setItem('yearwheel_ai_onboarding_completed', 'true');
            }}
            onSkip={() => {
              setShowAIOnboarding(false);
              localStorage.setItem('yearwheel_ai_onboarding_completed', 'true');
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Laddar...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

// Wheel Editor Route Wrapper
function WheelEditorRoute() {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect mobile devices - redirect to presentation mode
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 768;
    
    if (isMobile || isSmallScreen) {
      // Redirect to preview with presentation mode enabled
      navigate(`/preview-wheel/${wheelId}?presentation=true`, { replace: true });
    }
  }, [wheelId, navigate]);

  // Use location.key as a reloadTrigger without forcing full remount
  return (
    <WheelEditor 
      wheelId={wheelId}
      reloadTrigger={location.key} // Trigger reload without remounting
      onBackToDashboard={() => navigate('/dashboard')} 
    />
  );
}

// Dashboard Route Wrapper
function DashboardRoute() {
  const navigate = useNavigate();

  return (
    <>
      <Dashboard onSelectWheel={(wheelId) => navigate(`/wheel/${wheelId}`)} />
      <Toast />
    </>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Laddar...</div>
      </div>
    );
  }

  // Check where to redirect authenticated users on /auth
  const getAuthRedirect = () => {
    const pendingToken = sessionStorage.getItem('pendingInviteToken');
    // console.log('getAuthRedirect - pendingToken:', pendingToken);
    if (pendingToken) {
      // console.log('Redirecting to invite page:', `/invite/${pendingToken}`);
      return `/invite/${pendingToken}`;
    }
    
    // Check for pending template copy
    const pendingCopy = localStorage.getItem('pendingTemplateCopy');
    if (pendingCopy) {
      try {
        const intent = JSON.parse(pendingCopy);
        return `/preview-wheel/${intent.wheelId}`;
      } catch (error) {
        console.error('[App] Error parsing pending template copy:', error);
        localStorage.removeItem('pendingTemplateCopy');
      }
    }
    
    return '/dashboard';
  };

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AffiliateTracker />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to={getAuthRedirect()} replace /> : <AuthPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/guide/quick-start" element={<QuickStartGuide />} />
        <Route path="/legal/:document" element={<LegalPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/preview-wheel/:wheelId" element={<PreviewWheelPage />} />
        <Route path="/embed/:wheelId" element={<EmbedWheel />} />
        <Route path="/cast-receiver" element={<CastReceiverPage />} />

        {/* Keyword-optimized landing pages */}
        <Route path="/hr-planering" element={<HRPlanering />} />
        <Route path="/marknadsplanering" element={<Marknadsplanering />} />
        <Route path="/skola-och-utbildning" element={<SkolaUtbildning />} />
        <Route path="/projektplanering" element={<Projektplanering />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRoute />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="/forecasts" element={
          <ProtectedRoute>
            <RevenueForecast />
          </ProtectedRoute>
        } />
        <Route path="/affiliate" element={
          <ProtectedRoute>
            <AffiliateDashboard />
          </ProtectedRoute>
        } />
        <Route path="/affiliate/apply" element={
          <ProtectedRoute>
            <AffiliateApplicationForm />
          </ProtectedRoute>
        } />
        <Route path="/wheel/:wheelId" element={
          <ProtectedRoute>
            <WheelEditorRoute />
          </ProtectedRoute>
        } />
        
        {/* 404 redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <CookieConsent />
        <ConfirmDialog />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
