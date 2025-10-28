import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import YearWheel from "./YearWheel";
import OrganizationPanel from "./components/OrganizationPanel";
import Header from "./components/Header";
import PageNavigator from "./components/PageNavigator";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import CookieConsent from "./components/CookieConsent";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth.jsx";
import { useSubscription } from "./hooks/useSubscription.jsx";
import { showConfirmDialog, showToast } from "./utils/dialogs";
import { CHANGE_TYPES, getHistoryLabel, detectOrganizationChange } from "./constants/historyChangeTypes";

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

// Keyword-optimized landing pages
const HRPlanering = lazy(() => import("./pages/landing/HRPlanering"));
const Marknadsplanering = lazy(() => import("./pages/landing/Marknadsplanering"));
const SkolaUtbildning = lazy(() => import("./pages/landing/SkolaUtbildning"));
const Projektplanering = lazy(() => import("./pages/landing/Projektplanering"));

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

const VersionHistoryModal = lazyWithRetry(() => import("./components/VersionHistoryModal"));
const AddPageModal = lazyWithRetry(() => import("./components/AddPageModal"));
const ExportDataModal = lazyWithRetry(() => import("./components/ExportDataModal"));
const AIAssistant = lazyWithRetry(() => import("./components/AIAssistant"));
const EditorOnboarding = lazyWithRetry(() => import("./components/EditorOnboarding"));
const AIAssistantOnboarding = lazyWithRetry(() => import("./components/AIAssistantOnboarding"));
import { fetchWheel, fetchPageData, saveWheelData, updateWheel, createVersion, fetchPages, createPage, updatePage, deletePage, duplicatePage, toggleTemplateStatus, checkIsAdmin, updateSingleItem } from "./services/wheelService";
import { supabase } from "./lib/supabase";
import { useRealtimeWheel } from "./hooks/useRealtimeWheel";
import { useWheelPresence } from "./hooks/useWheelPresence";
import { useThrottledCallback, useDebouncedCallback } from "./hooks/useCallbackUtils";
import { useMultiStateUndoRedo } from "./hooks/useUndoRedo";

function WheelEditor({ wheelId, reloadTrigger, onBackToDashboard }) {
  const { t } = useTranslation(['common']);
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  
  // Flag to prevent history during data load operations
  const isLoadingData = useRef(false);
  
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
    shouldSkipHistory: isLoadingData // Skip history during data load
  });

  // Extract states from undo-managed object
  const title = undoableStates?.title || "Nytt hjul";
  const year = undoableStates?.year || "2025";
  const colors = undoableStates?.colors || ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"];
  const organizationData = undoableStates?.organizationData || {
    rings: [],
    activityGroups: [],
    labels: [],
    items: []
  };
  
  // Wrapper functions for setting undo-tracked state
  const setTitle = useCallback((value) => {
    setUndoableStates(prevStates => ({
      ...prevStates,
      title: typeof value === 'function' ? value(prevStates.title) : value
    }), { type: CHANGE_TYPES.CHANGE_TITLE });
  }, [setUndoableStates]);

  const setYear = useCallback((value) => {
    setUndoableStates(prevStates => ({
      ...prevStates,
      year: typeof value === 'function' ? value(prevStates.year) : value
    }), { type: CHANGE_TYPES.CHANGE_YEAR });
  }, [setUndoableStates]);
  
  const setColors = useCallback((value) => {
    setUndoableStates(prevStates => ({
      ...prevStates,
      colors: typeof value === 'function' ? value(prevStates.colors) : value
    }), { type: CHANGE_TYPES.CHANGE_COLORS });
  }, [setUndoableStates]);  const setOrganizationData = useCallback((value, explicitLabel) => {
    // Pre-calculate the new data and detect changes for auto-labeling
    let finalLabel = explicitLabel;
    
    if (!finalLabel) {
      const currentOrgData = undoableStates?.organizationData;
      const newOrgData = typeof value === 'function' ? value(currentOrgData) : value;
      
      // Use the detection helper to determine change type
      const changeType = detectOrganizationChange(currentOrgData, newOrgData);
      finalLabel = { type: changeType };
    }
    
    // Now update state with the calculated label
    setUndoableStates(prevStates => {
      const currentOrgData = prevStates.organizationData;
      const newOrgData = typeof value === 'function' ? value(currentOrgData) : value;
      
      // CRITICAL: Update ref immediately so auto-save gets the latest data
      latestValuesRef.current = {
        ...latestValuesRef.current,
        organizationData: newOrgData
      };
      
      // CRITICAL: Spread previous states to preserve all fields
      return { 
        ...prevStates,
        organizationData: newOrgData 
      };
    }, finalLabel);
  }, [setUndoableStates, undoableStates]);
  
  // Other non-undoable states
  const [zoomedMonth, setZoomedMonth] = useState(null);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showWeekRing, setShowWeekRing] = useState(true);
  const [showMonthRing, setShowMonthRing] = useState(true);
  const [showRingNames, setShowRingNames] = useState(true);
  const [showLabels, setShowLabels] = useState(false); // Default to false - labels shown on hover
  const [weekRingDisplayMode, setWeekRingDisplayMode] = useState('week-numbers'); // 'week-numbers' or 'dates'
  const [downloadFormat, setDownloadFormat] = useState(isPremium ? "png" : "png-white");
  const [yearWheelRef, setYearWheelRef] = useState(null);
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
  const [currentPageId, setCurrentPageId] = useState(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [wheelData, setWheelData] = useState(null); // Store full wheel object including team_id
  
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
  // Track recent save timestamp to ignore own broadcasts (within 3 seconds)
  const lastSaveTimestamp = useRef(0);
  // Track if we're currently saving to prevent realtime reload during save (ref for logic, state for UI)
  const isSavingRef = useRef(false);
  // Track if we're currently dragging an item (for batch undo/redo)
  const isDraggingRef = useRef(false);

  // Load wheel data function (memoized to avoid recreating)
  const loadWheelData = useCallback(async () => {
    if (!wheelId) return;
    
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
          
          // Fetch items for this specific page only
          const pageItems = await fetchPageData(pageToLoad.id);
          
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
          
          
          if (pageToLoad.organization_data) {
            const orgData = pageToLoad.organization_data;
            
            // Replace items with page-specific items from database
            orgData.items = pageItems;
            
            // Replace rings, activityGroups, labels with database versions (using UUIDs)
            // Keep any client-ID entities from JSONB for backward compatibility
            const jsonbRings = orgData.rings || [];
            const jsonbGroups = orgData.activityGroups || orgData.activities || [];
            const jsonbLabels = orgData.labels || [];
            
            // Merge: Use DB entities (UUID-based) + keep client-ID entities from JSONB
            orgData.rings = [
              ...(dbRings || []).map(r => ({
                id: r.id,
                name: r.name,
                type: r.type,  // ✅ FIXED: Database column is 'type' not 'ring_type'
                visible: r.visible,
                orientation: r.orientation || 'vertical',
                color: r.color || '#408cfb',  // Fallback to blue if null
                data: r.data || [[""]]
              })),
              ...jsonbRings.filter(r => !r.id.match(/^[0-9a-f-]{36}$/i)) // Keep client IDs like "ring-123"
            ];
            
            orgData.activityGroups = [
              ...(dbActivityGroups || []).map(g => ({
                id: g.id,
                name: g.name,
                color: g.color || '#8B5CF6',  // Fallback to purple if null
                visible: g.visible
              })),
              ...jsonbGroups.filter(g => !g.id.match(/^[0-9a-f-]{36}$/i)) // Keep client IDs like "group-123"
            ];
            
            orgData.labels = [
              ...(dbLabels || []).map(l => ({
                id: l.id,
                name: l.name,
                color: l.color,
                visible: l.visible
              })),
              ...jsonbLabels.filter(l => !l.id.match(/^[0-9a-f-]{36}$/i)) // Keep client IDs like "label-123"
            ];
                        
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
            
            orgDataToSet = orgData;
          }
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
          // Allow loaded data to be added to history
          isLoadingData.current = false;
          setUndoableStates(updates, 'Ladda hjul');
          // Immediately block again to prevent other effects
          isLoadingData.current = true;
          
          // CRITICAL: Clear history after load to ensure we start with a clean slate
          // This prevents undoing to an empty initial state
          setTimeout(() => {
            clearHistory();
          }, 100); // Short delay to ensure state is fully updated
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
  }, [wheelId, markSaved]); // Only depend on wheelId - NOT on currentPageId

  // Throttled reload for realtime updates (max once per second)
  const throttledReload = useThrottledCallback(() => {
    loadWheelData();
    
    // NO TOAST - too many notifications annoy users
    // Users will see the changes appear on the wheel directly
  }, 1000);

  // Handle realtime data changes from other users
  const handleRealtimeChange = useCallback((eventType, tableName, payload) => {
    // COMPLETELY IGNORE all events if we're in the middle of saving
    if (isSavingRef.current) {
      return;
    }
    
    // Ignore broadcasts from our own recent saves (within 5 seconds - increased to allow auto-save to complete)
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 5000) {
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
          setOrganizationData(newCurrentPage.organization_data);
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
    currentPageId
  };
  


  // Lightweight auto-save ONLY for wheel metadata (title, colors, settings)
  // organizationData changes are handled by realtime, so we don't auto-save those
  const autoSave = useDebouncedCallback(async () => {
    // Don't auto-save if:
    // 1. No wheelId (localStorage mode)
    // 2. Currently loading data
    // 3. This is the initial load
    // 4. Data came from realtime update
    // 5. Auto-save is disabled
    if (!wheelId || isLoadingData.current || isInitialLoad.current || isRealtimeUpdate.current || !autoSaveEnabled) {
      return;
    }

    // Get latest values from ref (not from closure)
    const {
      title: currentTitle,
      colors: currentColors,
      showWeekRing: currentShowWeekRing,
      showMonthRing: currentShowMonthRing,
      showRingNames: currentShowRingNames,
      showLabels: currentShowLabels,
      weekRingDisplayMode: currentWeekRingDisplayMode,
    } = latestValuesRef.current;

    try {
      // Mark as saving to prevent realtime interference
      isSavingRef.current = true;
      
      // LIGHTWEIGHT: Only update wheel metadata (no heavy database table syncing)
      await updateWheel(wheelId, {
        title: currentTitle,
        colors: currentColors,
        showWeekRing: currentShowWeekRing,
        showMonthRing: currentShowMonthRing,
        showRingNames: currentShowRingNames,
        showLabels: currentShowLabels,
        weekRingDisplayMode: currentWeekRingDisplayMode,
      });
      
      // Mark the save timestamp to ignore our own broadcasts
      lastSaveTimestamp.current = Date.now();
      
    } catch (error) {
      // Show error toast only on failure
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Auto-sparning misslyckades', type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      isSavingRef.current = false;
    }
  }, 10000); // Wait 10 seconds after last metadata change (much less aggressive)

  // REMOVED: Auto-save on organizationData changes
  // Realtime handles syncing organization data across users
  // Manual save button does the full sync when needed

  // Auto-save ONLY on metadata changes (title, colors, settings)
  useEffect(() => {
    // Skip if initial load, loading data, or data came from realtime
    if (isInitialLoad.current || isLoadingData.current || isRealtimeUpdate.current) {
      return;
    }
    autoSave();
  }, [title, colors, showWeekRing, showMonthRing, showRingNames, showLabels, weekRingDisplayMode, autoSave]);

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

  const handleSave = useCallback(async () => {
    // If we have a wheelId, save to database
    if (wheelId) {
      // Temporarily disable auto-save during manual save
      const wasAutoSaveEnabled = autoSaveEnabled;
      setAutoSaveEnabled(false);
      isSavingRef.current = true;
      isLoadingData.current = true; // Prevent auto-save during reload
      setIsSaving(true); // Update UI
      
      try {
        // Get latest values from ref (not from closure) - CRITICAL for immediate saves after state changes
        const {
          title: currentTitle,
          colors: currentColors,
          showWeekRing: currentShowWeekRing,
          showMonthRing: currentShowMonthRing,
          showRingNames: currentShowRingNames,
          showLabels: currentShowLabels,
          weekRingDisplayMode: currentWeekRingDisplayMode,
          organizationData: currentOrganizationData,
          year: currentYear,
          currentPageId: currentCurrentPageId
        } = latestValuesRef.current;
        
        // First, update wheel metadata (title, colors, settings)
        await updateWheel(wheelId, {
          title: currentTitle,
          colors: currentColors,
          showWeekRing: currentShowWeekRing,
          showMonthRing: currentShowMonthRing,
          showRingNames: currentShowRingNames,
          showLabels: currentShowLabels,
          weekRingDisplayMode: currentWeekRingDisplayMode,
        });
        
        // CRITICAL: Always call saveWheelData to sync to database tables
        // This syncs rings, activity groups, labels, and items to their respective tables
        
        // If no currentPageId exists (single-page wheel or after template load), find or create a page
        let pageIdToUse = currentCurrentPageId;
        if (!pageIdToUse && wheelId) {
          console.log('[handleSave] No currentPageId, checking for existing pages...');
          
          // First, get current pages to check if one exists for this year
          const existingPages = await fetchPages(wheelId);
          const pageForYear = existingPages.find(p => p.year === parseInt(currentYear));
          
          if (pageForYear) {
            console.log('[handleSave] Found existing page for year', currentYear, ':', pageForYear.id);
            pageIdToUse = pageForYear.id;
            
            // Update local state to use existing page
            setCurrentPageId(pageForYear.id);
            setPages(existingPages);
          } else {
            console.log('[handleSave] No page found for year', currentYear, ', creating new page...');
            const defaultPage = await createPage(wheelId, {
              year: parseInt(currentYear),
              title: currentYear,
              organizationData: currentOrganizationData
            });
            pageIdToUse = defaultPage.id;
            
            // Update local state to reflect the new page
            setCurrentPageId(defaultPage.id);
            setPages([...existingPages, defaultPage]);
            
            console.log('[handleSave] Created new page:', defaultPage.id);
          }
        }
        
        const { ringIdMap, activityIdMap, labelIdMap } = await saveWheelData(wheelId, currentOrganizationData, pageIdToUse);
        
        // Update local state with new database UUIDs (replace temporary IDs)
        const updatedOrgData = {
          ...currentOrganizationData,
          rings: currentOrganizationData.rings.map(ring => ({
            ...ring,
            id: ringIdMap.get(ring.id) || ring.id
          })),
          activityGroups: currentOrganizationData.activityGroups.map(group => ({
            ...group,
            id: activityIdMap.get(group.id) || group.id
          })),
          labels: currentOrganizationData.labels.map(label => ({
            ...label,
            id: labelIdMap.get(label.id) || label.id
          })),
          items: currentOrganizationData.items.map(item => ({
            ...item,
            ringId: ringIdMap.get(item.ringId) || item.ringId,
            activityId: activityIdMap.get(item.activityId) || item.activityId,
            labelId: labelIdMap.get(item.labelId) || item.labelId
          }))
        };
        
        // Update React state with UUIDs
        setOrganizationData(updatedOrgData);
        
        // Also update the page's JSONB organization_data and year
        if (currentCurrentPageId) {
          await updatePage(currentCurrentPageId, {
            organization_data: updatedOrgData,
            year: parseInt(currentYear)
          });
        }
        
        // Mark the save timestamp to ignore our own broadcasts
        lastSaveTimestamp.current = Date.now();
        
        // Create version snapshot after successful save
        try {
          await createVersion(
            wheelId,
            {
              title: currentTitle,
              year: currentYear,
              colors: currentColors,
              showWeekRing: currentShowWeekRing,
              showMonthRing: currentShowMonthRing,
              showRingNames: currentShowRingNames,
              showLabels: currentShowLabels,
              weekRingDisplayMode: currentWeekRingDisplayMode,
              organizationData: updatedOrgData
            },
            null, // No description for auto-save
            false // Manual save, not auto-save
          );
        } catch (versionError) {
          console.error('[ManualSave] Failed to create version snapshot:', versionError);
          // Don't fail the entire save if version creation fails
        }
        
        // Mark current undo position as a save point
        markSaved();
        
        // console.log('[ManualSave] Wheel data saved successfully');
        
        // Show success feedback
        const event = new CustomEvent('showToast', { 
          detail: { message: 'Data har sparats!', type: 'success' } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('[ManualSave] Error saving wheel:', error);
        const event = new CustomEvent('showToast', { 
          detail: { message: 'Kunde inte spara', type: 'error' } 
        });
        window.dispatchEvent(event);
      } finally {
        isSavingRef.current = false;
        isLoadingData.current = false; // Re-enable auto-save
        setIsSaving(false); // Update UI
        // Re-enable auto-save
        setAutoSaveEnabled(wasAutoSaveEnabled);
      }
    } else {
      // Fallback to localStorage for backward compatibility
      const dataToSave = {
        title,
        year,
        colors,
        ringsData,
        organizationData,
        showWeekRing,
        showMonthRing,
        showRingNames,
      };
      localStorage.setItem("yearWheelData", JSON.stringify(dataToSave));
      
      // Mark current undo position as a save point
      markSaved();
      
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Data har sparats!', type: 'success' } 
      });
      window.dispatchEvent(event);
    }
  }, [wheelId, autoSaveEnabled, setOrganizationData, markSaved, title, year, colors, ringsData, organizationData, showWeekRing, showMonthRing, showRingNames]);

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
          // console.log('[LoadPages] Loading page data from database');
          setOrganizationData(sortedPages[0].organization_data);
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
      // Save current page data before switching
      if (currentPageId) {
        await updatePage(currentPageId, {
          organization_data: organizationData,
          year: parseInt(year)
        });
      }
      
      // Load new page data
      const newPage = pages.find(p => p.id === pageId);
      if (newPage) {
        setCurrentPageId(pageId);
        
        // Fetch page-specific items from database
        const pageItems = await fetchPageData(pageId);
        
        // CRITICAL: Keep wheel-level data (rings, groups, labels) unchanged
        // Only update page-specific data (items, year)
        setOrganizationData(prevData => ({
          ...prevData,
          items: pageItems  // Update only items - rings/groups/labels are shared!
        }));
        
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
        await updatePage(currentPageId, {
          organization_data: organizationData,
          year: parseInt(year)
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
        await updatePage(currentPageId, {
          organization_data: organizationData,
          year: parseInt(year)
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
      
      
      // Now save the items to the database using saveWheelData
      // This will insert items into the 'items' table (not just JSONB)
      const itemsToSave = copiedItems.map(item => ({
        ...item,
        pageId: newPage.id // Set the page ID
      }));
      
      
      await saveWheelData(wheelId, {
        rings: organizationData.rings || [],
        activityGroups: organizationData.activityGroups || [],
        labels: organizationData.labels || [],
        items: itemsToSave
      }, newPage.id);
      
      
      // Sort pages by year after adding
      const updatedPages = [...pages, newPage].sort((a, b) => a.year - b.year);
      setPages(updatedPages);
      setShowAddPageModal(false);
      
      // Switch to the new page
      setCurrentPageId(newPage.id);
      setYear(String(nextYear));
      
      // Fetch items from database to get the real UUIDs
      const savedItems = await fetchPageData(newPage.id);
      
      // Update organizationData with saved items (keep wheel-level structures)
      setOrganizationData(prevData => ({
        ...prevData,  // Keep rings, activityGroups, labels from wheel level
        items: savedItems  // Use items from database with real UUIDs
      }));
      
      
      const event = new CustomEvent('showToast', {
        detail: { 
          message: `SmartCopy: ${savedItems.length} aktiviteter kopierade till ${nextYear}!`, 
          type: 'success' 
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      const event = new CustomEvent('showToast', {
        detail: { message: `SmartCopy misslyckades: ${error.message}`, type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

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
      // CRITICAL: Block realtime updates during version restore to prevent race condition
      // Set timestamp to far future to prevent realtime from overwriting restored data
      lastSaveTimestamp.current = Date.now() + 10000; // Block for 10 seconds
      
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

      // Apply the restored data
      // BATCH title, colors, and organizationData together to prevent race condition
      const versionUpdates = {};
      if (versionData.title) versionUpdates.title = versionData.title;
      if (versionData.colors) versionUpdates.colors = versionData.colors;
      if (versionData.organizationData) versionUpdates.organizationData = versionData.organizationData;
      setUndoableStates(versionUpdates);
      
      // Clear undo history after version restore (new data context)
      clearHistory();
      
      // Set non-undoable states separately
      if (versionData.year) setYear(versionData.year.toString());
      if (typeof versionData.showWeekRing === 'boolean') setShowWeekRing(versionData.showWeekRing);
      if (typeof versionData.showMonthRing === 'boolean') setShowMonthRing(versionData.showMonthRing);
      if (typeof versionData.showRingNames === 'boolean') setShowRingNames(versionData.showRingNames);

      // Save the restored state
      await handleSave();
      
      // Reset the lastSaveTimestamp after save completes
      lastSaveTimestamp.current = Date.now();
      
      setShowVersionHistory(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      // Reset timestamp on error
      lastSaveTimestamp.current = Date.now();
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
    // If we're in drag mode, we need to check if dates actually changed
    const wasDragging = isDraggingRef.current;
    
    // Calculate label inside functional update to avoid stale closure
    // BUT: Don't use label if we're in batch mode (drag) - the batch label will be used instead
    let calculatedLabel = wasDragging ? undefined : { type: 'changeActivity' };
    let actuallyChanged = false;
    
    setOrganizationData(prevData => {
      const oldItem = prevData.items.find(item => item.id === updatedItem.id);
      
      if (oldItem) {
        // Determine what type of change occurred
        const ringChanged = oldItem.ringId !== updatedItem.ringId;
        const datesChanged = oldItem.startDate !== updatedItem.startDate || 
                            oldItem.endDate !== updatedItem.endDate;
        
        // Track if anything actually changed
        actuallyChanged = ringChanged || datesChanged || oldItem.name !== updatedItem.name;
        
        // Create descriptive label based on what changed (only if NOT dragging)
        if (!wasDragging) {
          if (ringChanged && datesChanged) {
            calculatedLabel = { type: 'moveAndChange', params: { name: updatedItem.name } };
          } else if (ringChanged) {
            // Find ring names for more context
            const newRing = prevData.rings.find(r => r.id === updatedItem.ringId);
            if (newRing) {
              calculatedLabel = { 
                type: 'moveToRing', 
                params: { name: updatedItem.name, ring: newRing.name }
              };
            } else {
              calculatedLabel = { type: 'moveItem', params: { name: updatedItem.name } };
            }
          } else if (datesChanged) {
            calculatedLabel = { type: 'changeDates', params: { name: updatedItem.name } };
          } else {
            // Fallback for other changes (name, color, etc.)
            calculatedLabel = { type: 'editItem', params: { name: updatedItem.name } };
          }
        }
      }
      
      return {
        ...prevData,
        items: prevData.items.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        )
      };
    }, calculatedLabel);
    
    
    // If this was a drag operation, end the batch
    // But only if something actually changed
    if (wasDragging) {
      isDraggingRef.current = false;
      
      if (actuallyChanged) {
        console.log('[UPDATE] Drag resulted in changes, ending batch mode');
        endBatch();
        // Optimized auto-save: only update the changed item instead of full wheel save
        setTimeout(async () => {
          if (wheelId && currentPageId) {
            try {
              // Create empty ID maps since we're only updating one item with existing UUIDs
              await updateSingleItem(wheelId, currentPageId, updatedItem, new Map(), new Map(), new Map());
              
              // Update the save timestamp to prevent realtime overwrites
              lastSaveTimestamp.current = Date.now();
              
              // Mark as saved in undo/redo history
              markSaved();
            } catch (error) {
              showToast('Kunde inte spara ändringen', 'error');
            }
          }
        }, 100); // Small delay to ensure state is fully updated
      } else {
        cancelBatch();
      }
    }
  }, [setOrganizationData, endBatch, cancelBatch, wheelId, currentPageId, markSaved, t]);

  const handleDeleteAktivitet = useCallback((itemId) => {
    // Calculate label inside functional update to avoid stale closure
    let calculatedLabel = { type: 'removeActivity' };
    
    setOrganizationData(prevData => {
      const itemToDelete = prevData.items.find(item => item.id === itemId);
      if (itemToDelete) {
        calculatedLabel = { type: 'removeItem', params: { name: itemToDelete.name } };
      }
      
      return {
        ...prevData,
        items: prevData.items.filter(item => item.id !== itemId)
      };
    }, calculatedLabel);
  }, [setOrganizationData]);

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
              processedOrgData.items.forEach(item => {
                if (item.startDate) {
                  const itemYear = new Date(item.startDate).getFullYear();
                  if (!itemsByYear[itemYear]) {
                    itemsByYear[itemYear] = [];
                  }
                  itemsByYear[itemYear].push(item);
                }
              });
              
              const years = Object.keys(itemsByYear).sort();
              console.log('[FileImport] Found items in years:', years);
              
              // Get or create pages for each year
              const { data: existingPages } = await supabase
                .from('wheel_pages')
                .select('id, year')
                .eq('wheel_id', wheelId)
                .order('year');
              
              const pagesByYear = {};
              existingPages?.forEach(page => {
                pagesByYear[page.year] = page.id;
              });
              
              // Create missing pages
              for (const yearStr of years) {
                const year = parseInt(yearStr);
                if (!pagesByYear[year]) {
                  const { data: newPage } = await supabase
                    .from('wheel_pages')
                    .insert({
                      wheel_id: wheelId,
                      year: year,
                      title: `${data.title} ${year}`,
                      page_order: year - parseInt(data.year),
                      organization_data: { rings: [], activityGroups: [], labels: [], items: [] }
                    })
                    .select()
                    .single();
                  
                  pagesByYear[year] = newPage.id;
                  console.log(`[FileImport] Created new page for year ${year}`);
                }
              }
              
              // Save rings/activityGroups/labels to each page
              // Then save items to their respective pages
              let allRingIdMaps = new Map();
              let allActivityIdMaps = new Map();
              let allLabelIdMaps = new Map();
              
              for (const yearStr of years) {
                const year = parseInt(yearStr);
                const pageId = pagesByYear[year];
                const yearItems = itemsByYear[yearStr];
                
                // Create org data for this year's page
                const yearOrgData = {
                  rings: processedOrgData.rings,
                  activityGroups: processedOrgData.activityGroups,
                  labels: processedOrgData.labels,
                  items: yearItems
                };
                
                // Update page
                await updatePage(pageId, {
                  organization_data: yearOrgData,
                  year: year
                });
                
                // Save wheel data and get ID mappings
                const { ringIdMap, activityIdMap, labelIdMap } = await saveWheelData(wheelId, yearOrgData, pageId);
                
                // Merge ID maps (should be same across pages for rings/activities/labels)
                ringIdMap.forEach((v, k) => allRingIdMaps.set(k, v));
                activityIdMap.forEach((v, k) => allActivityIdMaps.set(k, v));
                labelIdMap.forEach((v, k) => allLabelIdMaps.set(k, v));
              }
              
              // Update processedOrgData with database UUIDs
              processedOrgData.rings = processedOrgData.rings.map(ring => ({
                ...ring,
                id: allRingIdMaps.get(ring.id) || ring.id
              }));
              
              processedOrgData.activityGroups = processedOrgData.activityGroups.map(group => ({
                ...group,
                id: allActivityIdMaps.get(group.id) || group.id
              }));
              
              processedOrgData.labels = processedOrgData.labels.map(label => ({
                ...label,
                id: allLabelIdMaps.get(label.id) || label.id
              }));
              
              processedOrgData.items = processedOrgData.items.map(item => ({
                ...item,
                ringId: allRingIdMaps.get(item.ringId) || item.ringId,
                activityId: allActivityIdMaps.get(item.activityId) || item.activityId,
                labelId: item.labelId ? (allLabelIdMaps.get(item.labelId) || item.labelId) : null
              }));
              
              console.log('[FileImport] Successfully imported multi-year data');
              console.log('[FileImport] Total items:', processedOrgData.items.length, 'across', years.length, 'years');
              
              // Reload pages to reflect new pages created during import
              if (years.length > 1) {
                const { data: refreshedPages } = await supabase
                  .from('wheel_pages')
                  .select('*')
                  .eq('wheel_id', wheelId)
                  .order('page_order');
                
                if (refreshedPages) {
                  setWheelPages(refreshedPages);
                  console.log('[FileImport] Reloaded pages - now have', refreshedPages.length, 'pages');
                }
              }
              
              // Show success feedback
              const toastEvent = new CustomEvent('showToast', { 
                detail: { message: `Fil laddad! ${years.length} år importerade`, type: 'success' } 
              });
              window.dispatchEvent(toastEvent);
            } catch (saveError) {
              console.error('[FileImport] Error saving to database:', saveError);
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
          />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
          <div className="w-full h-full flex items-center justify-center">
            <YearWheel
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
            />
          </div>
        </div>

      </div>
      
      <Toast />
      
      {/* Version History Modal */}
      {showVersionHistory && wheelId && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <VersionHistoryModal
            wheelId={wheelId}
            onRestore={handleRestoreVersion}
            onClose={() => setShowVersionHistory(false)}
          />
        </Suspense>
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
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to={getAuthRedirect()} replace /> : <AuthPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/legal/:document" element={<LegalPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/preview-wheel/:wheelId" element={<PreviewWheelPage />} />
        <Route path="/embed/:wheelId" element={<EmbedWheel />} />

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
