import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import YearWheel from "../../YearWheel";
import WheelCalendarView from "../calendar_view/WheelCalendarView";
import ListView from "../list_view/ListView";
import SidePanel from "../SidePanel";
import Header from "../Header";
import PageNavigator from "../PageNavigator";
import Toast from "../Toast";
import ConfirmDialog from "../ConfirmDialog";
import VersionHistoryModal from "../VersionHistoryModal";
import { useAuth } from "../../hooks/useAuth";
import { useSubscription } from "../../hooks/useSubscription";
import { showConfirmDialog, showToast } from "../../utils/dialogs";
import { CHANGE_TYPES, getHistoryLabel, detectOrganizationChange } from "../../constants/historyChangeTypes";
import { formatDateOnly, toYearNumber } from "../../utils/dateUtils";
import { UUID_REGEX, normalizePageStructure } from "../../utils/wheelUtils";
import { fetchWheel, fetchPageData, saveWheelSnapshot, updateWheel, createVersion, fetchPages, createPage, updatePage, deletePage, duplicatePage, reorderPages, toggleTemplateStatus, checkIsAdmin } from "../../services/wheelService";
import { supabase } from "../../lib/supabase";
import { useRealtimeWheel } from "../../hooks/useRealtimeWheel";
import { useWheelPresence, useWheelActivity } from "../../hooks/useWheelPresence";
import { useWheelOperations } from "../../hooks/useWheelOperations";
import { useThrottledCallback, useDebouncedCallback } from "../../hooks/useCallbackUtils";
import { useMultiStateUndoRedo } from "../../hooks/useUndoRedo";
import { useWheelSaveQueue } from "../../hooks/useWheelSaveQueue";
import { useChangeTracker } from "../../hooks/useChangeTracker";
import { useOptimisticSync } from "../../hooks/useOptimisticSync";

// Lazy load heavy editor components with retry logic
const lazyWithRetry = (componentImport) => 
  lazy(() => 
    componentImport().catch(() => {
      window.location.reload();
      return new Promise(() => {});
    })
  );

const AddPageModal = lazyWithRetry(() => import("../AddPageModal"));
const ExportDataModal = lazyWithRetry(() => import("../ExportDataModal"));
const SmartImportModal = lazyWithRetry(() => import("../SmartImportModal"));
const ReportSelectionModal = lazyWithRetry(() => import("../ReportSelectionModal"));
const AIAssistant = lazyWithRetry(() => import("../AIAssistant"));
const EditorOnboarding = lazyWithRetry(() => import("../EditorOnboarding"));
const AIAssistantOnboarding = lazyWithRetry(() => import("../AIAssistantOnboarding"));
const ConflictResolutionModal = lazyWithRetry(() => import("../ConflictResolutionModal"));
const MobileEditor = lazyWithRetry(() => import("../mobile/MobileEditor"));

function WheelEditor({ wheelId, reloadTrigger, onBackToDashboard }) {
  const { t, i18n } = useTranslation(['common', 'conflict']);
  const { user } = useAuth();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  
  // Helper: Filter items to only those belonging to a specific year
  // CRITICAL for maintaining page isolation in wheel_pages.structure JSONB
  // CROSS-YEAR SUPPORT: Preserves original dates before clamping to year boundaries
  // For LINKED cross-year items (with crossYearGroupId), calculates the FULL range across all linked segments
  const filterItemsByYear = useCallback((items, yearNum, allItemsAcrossPages = []) => {
    const yearStart = new Date(yearNum, 0, 1);
    const yearEnd = new Date(yearNum, 11, 31);
    
    // Build a map of crossYearGroupId -> full range for linked items
    const crossYearGroupRanges = new Map();
    
    // Calculate full range for each cross-year group from ALL items across ALL pages
    (allItemsAcrossPages || items || []).forEach(item => {
      if (!item.crossYearGroupId) return;
      
      const groupId = item.crossYearGroupId;
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);
      
      if (!crossYearGroupRanges.has(groupId)) {
        crossYearGroupRanges.set(groupId, {
          startDate: itemStart,
          endDate: itemEnd,
        });
      } else {
        const range = crossYearGroupRanges.get(groupId);
        if (itemStart < range.startDate) range.startDate = itemStart;
        if (itemEnd > range.endDate) range.endDate = itemEnd;
      }
    });
    
    return (items || [])
      .filter(item => {
        const itemStartYear = new Date(item.startDate).getFullYear();
        const itemEndYear = new Date(item.endDate).getFullYear();
        // Include item if it overlaps with the year
        return itemStartYear <= yearNum && itemEndYear >= yearNum;
      })
      .map(item => {
        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);
        
        // Check if this is a cross-year item (either by dates OR by having a crossYearGroupId)
        const startsBeforeYear = startDate < yearStart;
        const endsAfterYear = endDate > yearEnd;
        const hasLinkedGroup = !!item.crossYearGroupId;
        const isCrossYear = startsBeforeYear || endsAfterYear || hasLinkedGroup;
        
        // If not cross-year, return item as-is (no clamping needed)
        if (!isCrossYear) {
          return item;
        }
        
        // For linked cross-year items, get the FULL range from all linked segments
        let fullRangeStart = startDate;
        let fullRangeEnd = endDate;
        
        if (hasLinkedGroup && crossYearGroupRanges.has(item.crossYearGroupId)) {
          const groupRange = crossYearGroupRanges.get(item.crossYearGroupId);
          fullRangeStart = groupRange.startDate;
          fullRangeEnd = groupRange.endDate;
        }
        
        // Clamp display dates to current year boundaries
        const clampedStartDate = startDate < yearStart ? yearStart : startDate;
        const clampedEndDate = endDate > yearEnd ? yearEnd : endDate;
        
        return {
          ...item,
          startDate: formatDateOnly(clampedStartDate),
          endDate: formatDateOnly(clampedEndDate),
          // Preserve FULL range dates for cross-year resize handling (across ALL linked segments)
          _originalStartDate: formatDateOnly(fullRangeStart),
          _originalEndDate: formatDateOnly(fullRangeEnd),
          _isCrossYear: true,
        };
      });
  }, []);

  const validateSnapshotPages = useCallback((snapshot, latestState) => {
    if (!snapshot || !Array.isArray(snapshot.pages) || snapshot.pages.length === 0) {
      return {
        valid: true,
        details: [],
        problems: [],
      };
    }

    const latestItems = Array.isArray(latestState?.allItems) ? latestState.allItems : [];
    const itemsByPage = latestState?.pageItemsById || {};

    const details = snapshot.pages.map((page) => {
      if (!page) {
        return null;
      }

      const pageId = page.id;
      const pageYear = toYearNumber(page.year);

      let expectedItems = Array.isArray(itemsByPage[pageId]) ? itemsByPage[pageId] : null;

      if ((!expectedItems || expectedItems.length === 0) && pageYear != null && latestItems.length > 0) {
        expectedItems = filterItemsByYear(latestItems, pageYear);
      }

      const normalizedExpected = Array.isArray(expectedItems) ? expectedItems : [];
      const snapshotItems = Array.isArray(page.items) ? page.items : [];

      const expectedIds = new Set(normalizedExpected.map((item) => item?.id).filter(Boolean));
      const snapshotIds = new Set(snapshotItems.map((item) => item?.id).filter(Boolean));

      const missingIds = [];
      expectedIds.forEach((entryId) => {
        if (!snapshotIds.has(entryId)) {
          missingIds.push(entryId);
        }
      });

      const extraIds = [];
      snapshotIds.forEach((entryId) => {
        if (!expectedIds.has(entryId)) {
          extraIds.push(entryId);
        }
      });

      return {
        pageId,
        pageYear,
        expectedCount: normalizedExpected.length,
        snapshotCount: snapshotItems.length,
        missingIds,
        extraIds,
      };
    }).filter(Boolean);

    const problems = details.filter((entry) => entry.missingIds.length > 0 || entry.extraIds.length > 0);

    if (problems.length > 0) {
      console.warn('[validateSnapshotPages] Detected mismatches during validation', {
        problems,
        details,
        snapshotSummary: snapshot.pages.map((page) => ({
          id: page?.id,
          year: page?.year,
          itemIds: Array.isArray(page?.items) ? page.items.map((item) => item?.id) : [],
        })),
        latestSummary: Object.entries(itemsByPage).map(([pageId, items]) => ({
          pageId,
          count: Array.isArray(items) ? items.length : 0,
          itemIds: Array.isArray(items) ? items.map((item) => item?.id) : [],
        })),
      });
    }

    return {
      valid: problems.length === 0,
      details,
      problems,
    };
  }, [filterItemsByYear]);
  
  // Flag to prevent history during data load operations
  const isLoadingData = useRef(false);
  const broadcastOperationRef = useRef(null);

  const [yearWheelRef, setYearWheelRef] = useState(null);

  // Store currentPageId in ref so callback can access it without causing dependency issues
  const currentPageIdRef = useRef(null);
  // Store yearWheelRef in a ref so the undo callback can access it
  const yearWheelRefRef = useRef(null);
  
  // Keep yearWheelRef in sync with ref
  useEffect(() => {
    yearWheelRefRef.current = yearWheelRef;
  }, [yearWheelRef]);
  
  // ==========================================
  // SINGLE SOURCE OF TRUTH: wheelState
  // ==========================================
  const {
    states: wheelState,
    setStates: setWheelState,
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
    metadata: {
      wheelId: null,
      title: "Nytt hjul",
      year: "2025",
      colors: ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"],
      showWeekRing: true,
      showMonthRing: true,
      showRingNames: true,
      showLabels: false,
      weekRingDisplayMode: 'week-numbers'
    },
    structure: {
      rings: [
        {
          id: "ring-1",
          name: "Ring 1",
          type: "inner",
          visible: true,
          orientation: "vertical",
          color: "#408cfb"
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
      labels: []
    },
    pages: [],
    currentPageId: null
  }, {
    limit: 10,
    enableKeyboard: true,
    shouldSkipHistory: isLoadingData,
    onStateRestored: (restoredState, label, operation) => {
      // CRITICAL: Preserve currentPageId - don't let undo/redo navigate away from current page
      const preservedPageId = currentPageIdRef.current;
      
      // Clear pending item updates in YearWheel
      const wheelRef = yearWheelRefRef.current;
      if (wheelRef && typeof wheelRef.clearPendingItemUpdates === 'function') {
        wheelRef.clearPendingItemUpdates();
      }
      
      // CRITICAL: Fix currentPageId after state restoration if needed
      // Can't modify restoredState (it's frozen), so we schedule a fix if needed
      if (preservedPageId && restoredState.currentPageId !== preservedPageId) {
        // Use setTimeout to run AFTER the state restoration completes
        setTimeout(() => {
          setWheelState((prev) => {
            // Only update if still mismatched (prevent unnecessary updates)
            if (prev.currentPageId !== preservedPageId) {
              return {
                ...prev,
                currentPageId: preservedPageId
              };
            }
            return prev;
          });
        }, 0);
      }
      
      // Force canvas redraw after React updates
      if (wheelRef && typeof wheelRef.create === 'function') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            wheelRef.create();
          });
        });
      }
      
      // Broadcast restore operation to collaboration system
      const broadcastFn = broadcastOperationRef.current;
      if (broadcastFn && restoredState?.structure) {
        broadcastFn('restore', null, {
          structure: restoredState.structure,
        });
      }
    }
  });
  
  // Change tracking for delta saves
  const changeTracker = useChangeTracker();
  const prevStateRef = useRef(null);

  // ==========================================
  // OPTIMISTIC SYNC: Manages dirty state, conflict detection, and debounced saves
  // This replaces the old debounced auto-save with proper optimistic update handling
  // ==========================================
  const optimisticSync = useOptimisticSync({
    debounceMs: 500, // Reduced from 1.5s for faster feedback
    conflictWindowMs: 2000,
    onConflictDetected: (conflicts) => {
      console.log('[OptimisticSync] Conflicts detected:', conflicts);
      setConflictDetails(conflicts);
      setShowConflictModal(true);
    }
  });

  // ==========================================
  // SAVE QUEUE: Prevents data loss during rapid changes
  // ==========================================
  const { 
    enqueueSave, 
    isSaving: isSavingToQueue, 
    pendingCount, 
    isIdle: isSaveQueueIdle,
    hasQueuedChanges 
  } = useWheelSaveQueue(wheelId, {
    onSaveSuccess: (changes, metadata) => {
      console.log(`[SaveQueue] Saved batch of ${metadata.batchSize} changes`);
      
      // Mark undo history as saved
      if (history && currentIndex !== null) {
        markSaved(currentIndex);
      }
    },
    onSaveError: (error, changes, metadata) => {
      console.error('[SaveQueue] Save failed:', error);
      showToast('Kunde inte spara ändringar. Försöker igen...', 'error');
    }
  });

  // Computed values from wheelState
  const title = wheelState?.metadata?.title || "Nytt hjul";
  const year = wheelState?.metadata?.year || "2025";
  const colors = wheelState?.metadata?.colors || ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"];
  const showWeekRing = wheelState?.metadata?.showWeekRing ?? true;
  const showMonthRing = wheelState?.metadata?.showMonthRing ?? true;
  const showRingNames = wheelState?.metadata?.showRingNames ?? true;
  const showLabels = wheelState?.metadata?.showLabels ?? false;
  const weekRingDisplayMode = wheelState?.metadata?.weekRingDisplayMode || 'week-numbers';
  
  const structure = wheelState?.structure || { rings: [], activityGroups: [], labels: [] };
  const pages = wheelState?.pages || [];
  const currentPageId = wheelState?.currentPageId || null;
  
  // Keep currentPageId in ref for undo/redo callback
  useEffect(() => {
    currentPageIdRef.current = currentPageId;
  }, [currentPageId]);
  
  const currentPage = useMemo(() => 
    pages.find(p => p.id === currentPageId),
    [pages, currentPageId]
  );
  
  const currentPageItems = useMemo(() => 
    currentPage?.items || [],
    [currentPage]
  );

  // Get all items across all pages for calendar view
  const allItems = useMemo(() => {
    if (!pages || pages.length === 0) return [];
    return pages.flatMap(page => page.items || []);
  }, [pages]);
  
  const wheelStructure = useMemo(() => ({
    ...structure,
    items: currentPageItems
  }), [structure, currentPageItems]);

  // Calendar needs all items across all pages, not just current page
  const calendarWheelStructure = useMemo(() => ({
    ...structure,
    items: allItems
  }), [structure, allItems]);

  // UI-only state (not part of wheelState)
  const [zoomedMonth, setZoomedMonth] = useState(null);
  const [zoomedQuarter, setZoomedQuarter] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0); // Persist wheel rotation angle
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [wheelData, setWheelData] = useState(null);
  const [viewMode, setViewMode] = useState('wheel'); // 'wheel', 'calendar', or 'list'
  const [pendingTooltipItemId, setPendingTooltipItemId] = useState(null); // Item to show tooltip for after view/page switch
  
  // Mobile detection - renders MobileEditor instead of desktop editor
  const [isMobileView, setIsMobileView] = useState(() => {
    const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobileUA || isSmallScreen;
  });
  
  // Update mobile view on resize
  useEffect(() => {
    const handleResize = () => {
      const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobileView(isMobileUA || isSmallScreen);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Legacy refs for compatibility (will be removed later)
  const latestValuesRef = useRef({});
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const setTitle = useCallback((value, historyLabel = { type: CHANGE_TYPES.CHANGE_TITLE }) => {
    const currentTitle = wheelState?.metadata?.title || "Nytt hjul";
    const nextTitle = typeof value === 'function' ? value(currentTitle) : value;

    if (nextTitle === currentTitle) {
      return;
    }

    setWheelState((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        title: nextTitle
      }
    }), historyLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      title: nextTitle,
    };
  }, [setWheelState, wheelState]);

  const setYear = useCallback((value, historyLabel = { type: CHANGE_TYPES.CHANGE_YEAR }) => {
    const currentYear = wheelState?.metadata?.year || "2025";
    const resolved = typeof value === 'function' ? value(currentYear) : value;
    const nextYear = resolved != null ? String(resolved) : currentYear;

    if (nextYear === currentYear) {
      return;
    }

    setWheelState((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        year: nextYear
      }
    }), historyLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      year: nextYear,
    };
  }, [setWheelState, wheelState]);

  const setColors = useCallback((value, historyLabel = { type: CHANGE_TYPES.CHANGE_COLORS }) => {
    const currentColors = wheelState?.metadata?.colors || ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"];
    const nextColors = typeof value === 'function' ? value(currentColors) : value;

    if (!Array.isArray(nextColors) || (nextColors.length === currentColors.length && nextColors.every((color, index) => color === currentColors[index]))) {
      return;
    }

    setWheelState((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        colors: nextColors
      }
    }), historyLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      colors: nextColors,
    };
  }, [setWheelState, wheelState]);

  const setCurrentPageId = useCallback((value, historyLabel) => {
    const currentId = wheelState?.currentPageId || null;
    const nextId = typeof value === 'function' ? value(currentId) : value;

    if (nextId === currentId) {
      return;
    }

    setWheelState((prev) => ({
      ...prev,
      currentPageId: nextId
    }), historyLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      currentPageId: nextId,
    };
  }, [setWheelState, wheelState]);

  // Metadata setters for display preferences
  const setShowWeekRing = useCallback((value) => {
    setWheelState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, showWeekRing: value }
    }));
  }, [setWheelState]);

  const setShowMonthRing = useCallback((value) => {
    setWheelState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, showMonthRing: value }
    }));
  }, [setWheelState]);

  const setShowRingNames = useCallback((value) => {
    setWheelState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, showRingNames: value }
    }));
  }, [setWheelState]);

  const setShowLabels = useCallback((value) => {
    setWheelState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, showLabels: value }
    }));
  }, [setWheelState]);

  const setWeekRingDisplayMode = useCallback((value) => {
    setWheelState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, weekRingDisplayMode: value }
    }));
  }, [setWheelState]);

  const setWheelStructure = useCallback((value, historyLabel) => {
    const defaultStructure = {
      rings: [],
      activityGroups: [],
      labels: [],
    };

    const currentStructure = wheelState?.structure || defaultStructure;
    const currentItems = currentPageItems || [];

    const currentCombined = {
      ...currentStructure,
      items: currentItems,
    };

    const nextRaw = typeof value === 'function' ? value(currentCombined) : value;
    const nextStructure = nextRaw ? {
      rings: Array.isArray(nextRaw.rings) ? nextRaw.rings : [],
      activityGroups: Array.isArray(nextRaw.activityGroups) ? nextRaw.activityGroups : [],
      labels: Array.isArray(nextRaw.labels) ? nextRaw.labels : [],
    } : defaultStructure;

    const nextItems = Array.isArray(nextRaw?.items) ? nextRaw.items : currentItems;

    const nextCombined = {
      ...nextStructure,
      items: nextItems,
    };

    const updatedItemIds = new Set(nextItems.map((item) => item?.id).filter(Boolean));
    const changeType = detectOrganizationChange(currentCombined, nextCombined);
    const structureChanged = JSON.stringify(currentStructure) !== JSON.stringify(nextStructure);
    const itemsChanged = JSON.stringify(currentItems) !== JSON.stringify(nextItems);

    if (!structureChanged && !itemsChanged && !historyLabel) {
      return;
    }

    const finalLabel = historyLabel || { type: changeType };

    // Update both structure and current page items in wheelState
    setWheelState((prev) => ({
      ...prev,
      structure: nextStructure,
      pages: prev.pages.map(page =>
        page.id === currentPageId
          ? { ...page, items: nextItems }
          : page
      )
    }), finalLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      structure: nextStructure,
    };

    // Track changes for delta saves AND optimistic sync
    // CRITICAL: Don't track during initial load or data loading
    if (structureChanged && !isLoadingData.current && !isInitialLoad.current) {
      // Track ring changes
      const currentRingMap = new Map(currentStructure.rings.map(r => [r.id, r]));
      const nextRingMap = new Map(nextStructure.rings.map(r => [r.id, r]));
      
      nextStructure.rings.forEach(ring => {
        const oldRing = currentRingMap.get(ring.id);
        if (!oldRing) {
          changeTracker.trackRingChange(ring.id, 'added', ring);
          // Also track in optimistic sync for conflict detection
          optimisticSync.markChange('structure', 'rings', 'add', ring.id, ring);
        } else if (JSON.stringify(oldRing) !== JSON.stringify(ring)) {
          changeTracker.trackRingChange(ring.id, 'modified', ring);
          optimisticSync.markChange('structure', 'rings', 'modify', ring.id, ring);
        }
      });
      
      currentStructure.rings.forEach(ring => {
        if (!nextRingMap.has(ring.id)) {
          changeTracker.trackRingChange(ring.id, 'deleted', ring);
          optimisticSync.markChange('structure', 'rings', 'delete', ring.id, ring);
        }
      });

      // Track activity group changes
      const currentActivityMap = new Map(currentStructure.activityGroups.map(a => [a.id, a]));
      const nextActivityMap = new Map(nextStructure.activityGroups.map(a => [a.id, a]));
      
      nextStructure.activityGroups.forEach(activity => {
        const oldActivity = currentActivityMap.get(activity.id);
        if (!oldActivity) {
          changeTracker.trackActivityGroupChange(activity.id, 'added', activity);
          optimisticSync.markChange('structure', 'activityGroups', 'add', activity.id, activity);
        } else if (JSON.stringify(oldActivity) !== JSON.stringify(activity)) {
          changeTracker.trackActivityGroupChange(activity.id, 'modified', activity);
          optimisticSync.markChange('structure', 'activityGroups', 'modify', activity.id, activity);
        }
      });
      
      currentStructure.activityGroups.forEach(activity => {
        if (!nextActivityMap.has(activity.id)) {
          changeTracker.trackActivityGroupChange(activity.id, 'deleted', activity);
          optimisticSync.markChange('structure', 'activityGroups', 'delete', activity.id, activity);
        }
      });

      // Track label changes
      const currentLabelMap = new Map(currentStructure.labels.map(l => [l.id, l]));
      const nextLabelMap = new Map(nextStructure.labels.map(l => [l.id, l]));
      
      nextStructure.labels.forEach(label => {
        const oldLabel = currentLabelMap.get(label.id);
        if (!oldLabel) {
          changeTracker.trackLabelChange(label.id, 'added', label);
          optimisticSync.markChange('structure', 'labels', 'add', label.id, label);
        } else if (JSON.stringify(oldLabel) !== JSON.stringify(label)) {
          changeTracker.trackLabelChange(label.id, 'modified', label);
          optimisticSync.markChange('structure', 'labels', 'modify', label.id, label);
        }
      });
      
      currentStructure.labels.forEach(label => {
        if (!nextLabelMap.has(label.id)) {
          changeTracker.trackLabelChange(label.id, 'deleted', label);
          optimisticSync.markChange('structure', 'labels', 'delete', label.id, label);
        }
      });
      
      // Trigger auto-save after structure changes
      if (triggerAutoSaveRef.current) {
        triggerAutoSaveRef.current();
      }
    }
  }, [setWheelState, wheelState, currentPageItems, currentPageId, detectOrganizationChange, changeTracker, optimisticSync]);
  
  // Track changes for delta saves (compare previous state to current)
  // Note: Change tracking happens directly in mutation handlers (handleUpdateAktivitet, handleAddItems, etc.)
  // This is more reliable than useEffect since state updates from useMultiStateUndoRedo may not trigger deps
  
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
  // showWeekRing, showMonthRing, showRingNames, showLabels, weekRingDisplayMode now come from wheelState.metadata
  const [downloadFormat, setDownloadFormat] = useState(isPremium ? "png" : "png-white");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // For UI feedback in Header
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false); // DISABLED: All saves are direct to DB
  const [isPublic, setIsPublic] = useState(false); // Public sharing toggle
  const [isTemplate, setIsTemplate] = useState(false); // Template status (admin only)
  const [isAdmin, setIsAdmin] = useState(false); // Admin status
  const [showVersionHistory, setShowVersionHistory] = useState(false); // Version history modal
  const [showExportModal, setShowExportModal] = useState(false); // Export data modal
  const [showSmartImport, setShowSmartImport] = useState(false); // Smart CSV import modal
  const [showReportModal, setShowReportModal] = useState(false); // PDF Report selection modal
  const [showConflictModal, setShowConflictModal] = useState(false); // Conflict resolution modal
  const [conflictDetails, setConflictDetails] = useState(null); // Details of conflicts to resolve
  
  
  // AI Assistant state
  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAIOnboarding, setShowAIOnboarding] = useState(false);
  
  // Disable autosave when guides are running
  // NOTE: Auto-save is disabled by default now (all saves are direct to DB)
  // Keeping this for backward compatibility if auto-save is re-enabled
  useEffect(() => {
    if (showOnboarding || showAIOnboarding) {
      setAutoSaveEnabled(false);
    }
    // Do NOT re-enable auto-save after guides - it stays disabled
  }, [showOnboarding, showAIOnboarding]);
  
  // Handler to enforce free user restrictions on export formats
  const handleDownloadFormatChange = (format) => {
    // Free users can only use 'png-white' and 'svg'
    const allowedFormatsForFree = ['png-white', 'svg'];
    const premiumFormats = ['png', 'jpeg', 'pdf'];
    
    if (!isPremium && premiumFormats.includes(format)) {
      // Show toast to inform user - using direct t() since key is in subscription namespace
      showToast(t('subscription:upgradePrompt.defaultTitle'), 'info');
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
  // Track if we're navigating between pages (blocks ALL database operations)
  const isNavigatingPagesRef = useRef(false);
  // Track unsaved changes for safe reload decisions
  const hasUnsavedChangesRef = useRef(false);
  // Remember deferred reload requests when local edits are pending
  const pendingRefreshRef = useRef({ needed: false, reason: null, source: null, scope: null, options: null });
  // Avoid triggering multiple auto-saves for the same pending refresh
  const autoSaveInFlightRef = useRef(false);
  // Expose handleSave for code paths defined above its declaration
  const handleSaveRef = useRef(null);
  // Expose triggerAutoSave for code paths defined above its declaration
  const triggerAutoSaveRef = useRef(null);
  // Prevent duplicate version creation on unmount (React StrictMode calls cleanup twice)
  const unmountVersionCreatedRef = useRef(false);
  // Queue item persistence operations to avoid race conditions

  // Complete wheel snapshot in the format: { metadata, structure, pages }
  // This is what YearWheel.jsx should receive for full visibility
  // completeWheelSnapshot now just references wheelState (single source of truth)
  const completeWheelSnapshot = useMemo(() => {
    if (!wheelState) return null;
    return {
      metadata: wheelState.metadata,
      structure: wheelState.structure,
      pages: wheelState.pages.map(page => ({
        ...page,
        isActive: page.id === wheelState.currentPageId,
      })),
    };
  }, [wheelState]);

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

    // CRITICAL: AI assistant writes directly to database, must always reload
    // The AI creates items server-side, so local state has no knowledge of them
    const forceForAI = source === 'ai-assistant';

    if (!force && !forceForAI) {
      // Check multiple sources for local changes
      const hasTrackedChanges = changeTracker.hasChanges();
      const isOptimisticDirty = optimisticSync.isDirty;
      const hasLocalChanges =
        hasUnsavedChangesRef.current ||
        hasTrackedChanges ||
        isOptimisticDirty ||
        isSavingRef.current ||
        isDraggingRef.current;

      if (hasLocalChanges) {
        const alreadyPending = pendingRefreshRef.current?.needed;

        // For AI assistant, save local changes first then reload
        if (source === 'ai-assistant' && handleSaveRef.current && !autoSaveInFlightRef.current) {
          autoSaveInFlightRef.current = true;
          try {
            await handleSaveRef.current({ silent: true, reason: 'ai-assistant-refresh' });
            // After save completes, proceed with reload (recursively call with force)
            autoSaveInFlightRef.current = false;
            return loadWheelData({ ...options, force: true });
          } catch (autoSaveError) {
            console.error('[loadWheelData] Auto-save before AI refresh failed:', autoSaveError);
            showToast('toast:save.localChangesError', 'error');
            autoSaveInFlightRef.current = false;
            return { status: 'error', reason, source, scope };
          }
        }

        pendingRefreshRef.current = {
          needed: true,
          reason,
          source,
          scope,
          options: { ...options, force: true },
        };

        if (!alreadyPending && !silent) {
          showToast('toast:ai.saveToLoad', 'info');
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
        
        // Prepare data to update
        let structureToSet = null;
        let yearToLoad = null; // Will be set from page data or wheel data
        let pagesToSet = null; // Will contain pages with items
        
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
          
          // Fetch all items for the wheel (pagination to bypass PostgREST 1000-row default)
          let allItems = [];
          let fetchedCount = 0;
          const BATCH_SIZE = 1000;
          
          while (true) {
            const { data: batch, error: itemsError } = await supabase
              .from('items')
              .select('*')
              .eq('wheel_id', wheelId)
              .range(fetchedCount, fetchedCount + BATCH_SIZE - 1);

            if (itemsError) throw itemsError;
            if (!batch || batch.length === 0) break;
            
            allItems.push(...batch);
            fetchedCount += batch.length;
            
            if (batch.length < BATCH_SIZE) break;
          }

          // Map database fields (snake_case) to client format (camelCase)
          const normalizedItems = (allItems || []).map(dbItem => ({
            id: dbItem.id,
            ringId: dbItem.ring_id,
            activityId: dbItem.activity_id,
            labelId: dbItem.label_id,
            name: dbItem.name,
            startDate: dbItem.start_date,
            endDate: dbItem.end_date,
            time: dbItem.time,
            description: dbItem.description,
            pageId: dbItem.page_id,
            linkedWheelId: dbItem.linked_wheel_id,
            linkType: dbItem.link_type,
            source: dbItem.source,
            externalId: dbItem.external_id,
            syncMetadata: dbItem.sync_metadata,
            // Dependency fields
            dependsOn: dbItem.depends_on_item_id || null,
            dependencyType: dbItem.dependency_type || 'finish_to_start',
            lagDays: dbItem.dependency_lag_days !== undefined ? dbItem.dependency_lag_days : 0,
          }));
          
          // CRITICAL: Deduplicate items by ID first (safeguard against DB duplicates)
          const uniqueItems = Array.from(
            new Map(normalizedItems.map(item => [item.id, item])).values()
          );
          
          // Build pages array with UNIQUE items attached
          const pagesWithItems = pagesData.map((page) => {
            const pageItems = uniqueItems.filter(item => item.pageId === page.id);
            return {
              id: page.id,
              year: page.year,
              pageOrder: page.page_order,
              title: page.title,
              items: pageItems
            };
          });

          const pageItems = uniqueItems.filter(item => item.pageId === pageToLoad.id);
          
          const pageStructure = normalizePageStructure(pageToLoad);

          const { data: wheelRingsData, error: wheelRingsError } = await supabase
            .from('wheel_rings')
            .select('*')
            .eq('wheel_id', wheelId)
            .order('ring_order');

          if (wheelRingsError) throw wheelRingsError;

          const { data: wheelGroupsData, error: wheelGroupsError } = await supabase
            .from('activity_groups')
            .select('*')
            .eq('wheel_id', wheelId);

          if (wheelGroupsError) throw wheelGroupsError;

          const { data: wheelLabelsData, error: wheelLabelsError } = await supabase
            .from('labels')
            .select('*')
            .eq('wheel_id', wheelId);

          if (wheelLabelsError) throw wheelLabelsError;

          // CRITICAL: ALWAYS use database tables as source of truth, NOT page JSONB
          // Page JSONB may contain stale temp IDs, but database has real UUIDs
          const dbRings = wheelRingsData || [];
          const dbActivityGroups = wheelGroupsData || [];
          const dbLabels = wheelLabelsData || [];

          
          // CRITICAL: Build structure from DATABASE, not JSONB
          // JSONB is just a backup - database tables are the source of truth
          const structureData = {
            rings: [],
            activityGroups: [],
            labels: [],
            items: pageItems
          };
          
          // Rings from database (shared across all pages)
          structureData.rings = (dbRings || []).map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            visible: r.visible,
            orientation: r.orientation || 'vertical',
            color: r.color || '#408cfb',
            data: r.data || [[""]]
          }));
          
          // Activity groups from database (shared across all pages)
          structureData.activityGroups = (dbActivityGroups || []).map(g => ({
            id: g.id,
            name: g.name,
            color: g.color || '#8B5CF6',
            visible: g.visible
          }));
          
          // Labels from database (shared across all pages)
          structureData.labels = (dbLabels || []).map(l => ({
            id: l.id,
            name: l.name,
            color: l.color,
            visible: l.visible
          }));
          
          // Backward compatibility: convert old 'activities' to 'activityGroups'
          if (structureData.activities && !structureData.activityGroups) {
            structureData.activityGroups = structureData.activities;
            delete structureData.activities;
          }
          
          // Ensure at least one activity group exists
          if (!structureData.activityGroups || structureData.activityGroups.length === 0) {
            structureData.activityGroups = [{
              id: "group-1",
              name: "Aktivitetsgrupp 1",
              color: wheelData.colors?.[0] || "#F5E6D3",
              visible: true
            }];
          }
          
          // Apply color fallback for outer rings (use wheel colors if ring has no color)
          if (structureData.rings && structureData.rings.length > 0) {
            structureData.rings = structureData.rings.map((ring, index) => {
              if (ring.type === 'outer' && !ring.color) {
                const outerRingIndex = structureData.rings.filter((r, i) => i < index && r.type === 'outer').length;
                const fallbackColor = wheelData.colors[outerRingIndex % wheelData.colors.length];
                return {
                  ...ring,
                  color: fallbackColor
                };
              }
              return ring;
            });
          }
          
          structureToSet = structureData;

          // Pages with items are already prepared in pagesWithItems above
          pagesToSet = pagesWithItems;
        } else {
          // Fallback: Load from wheel's organization data (legacy support)
          pagesToSet = [];
          const legacyItems = Array.isArray(wheelData.wheelStructure?.items)
            ? wheelData.wheelStructure.items
            : Array.isArray(wheelData.structure?.items)
              ? wheelData.structure.items
              : [];
          // In legacy mode, create a single page with all items
          if (legacyItems.length > 0) {
            pagesToSet = [{
              id: 'legacy-page',
              year: String(wheelData.year || new Date().getFullYear()),
              pageOrder: 0,
              title: wheelData.title || 'Nytt hjul',
              items: legacyItems
            }];
          }
          yearToLoad = String(wheelData.year || new Date().getFullYear());
          
          // Load structure data (legacy support)
          const baseStructure = wheelData.structure || wheelData.wheelStructure;
          if (baseStructure) {
            const structureData = {
              ...baseStructure,
              items: Array.isArray(wheelData.wheelStructure?.items)
                ? wheelData.wheelStructure.items
                : Array.isArray(baseStructure.items)
                  ? baseStructure.items
                  : [],
            };
            
            // Backward compatibility: convert old 'activities' to 'activityGroups'
            if (structureData.activities && !structureData.activityGroups) {
              structureData.activityGroups = structureData.activities;
              delete structureData.activities;
            }
            
            // Ensure at least one activity group exists
            if (!structureData.activityGroups || structureData.activityGroups.length === 0) {
              structureData.activityGroups = [{
                id: "group-1",
                name: "Aktivitetsgrupp 1",
                color: wheelData.colors?.[0] || "#F5E6D3",
                visible: true
              }];
            }
            
            // Apply color fallback for outer rings (use wheel colors if ring has no color)
            if (structureData.rings && structureData.rings.length > 0) {
              structureData.rings = structureData.rings.map((ring, index) => {
                if (ring.type === 'outer' && !ring.color) {
                  const outerRingIndex = structureData.rings.filter((r, i) => i < index && r.type === 'outer').length;
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
            structureData.items = filterItemsByYear(structureData.items, parseInt(yearToLoad));
            
            structureToSet = structureData;
          }
        }
        
        // CRITICAL: Update complete wheelState in ONE call to prevent race conditions
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
        if (wheelData.settings?.showWeekRing !== undefined) {
          updates.showWeekRing = wheelData.settings.showWeekRing;
        }
        if (wheelData.settings?.showMonthRing !== undefined) {
          updates.showMonthRing = wheelData.settings.showMonthRing;
        }
        if (wheelData.settings?.showRingNames !== undefined) {
          updates.showRingNames = wheelData.settings.showRingNames;
        }
        if (wheelData.showLabels !== undefined) {
          updates.showLabels = wheelData.showLabels;
        }
        if (wheelData.weekRingDisplayMode !== undefined) {
          updates.weekRingDisplayMode = wheelData.weekRingDisplayMode;
        }
        
        if (Object.keys(updates).length > 0 || structureToSet || pagesToSet) {
          const previousLoadingFlag = isLoadingData.current;
          const shouldResetHistoryAfterLoad = reason === 'manual' && isInitialLoad.current;
          const historyLabel = reason === 'realtime'
            ? { type: 'legacyString', text: 'Synkroniserad från servern' }
            : 'Ladda hjul';

          // Temporarily allow undo stack to capture the refreshed state
          isLoadingData.current = false;
          
          setWheelState((prev) => {
            const nextState = { ...prev };
            
            // Update metadata
            if (Object.keys(updates).length > 0) {
              nextState.metadata = {
                ...prev.metadata,
                ...updates
              };
            }
            
            // Update structure
            if (structureToSet) {
              nextState.structure = {
                rings: structureToSet.rings || [],
                activityGroups: structureToSet.activityGroups || [],
                labels: structureToSet.labels || []
              };
            }
            
            // Update pages
            if (pagesToSet) {
              nextState.pages = pagesToSet;
              // Set current page if we loaded from pageToLoad
              if (pagesToSet.length > 0 && !nextState.currentPageId) {
                nextState.currentPageId = pagesToSet[0].id;
              }
            }
            
            return nextState;
          }, historyLabel);
          
          // Restore loading guard immediately after state update
          isLoadingData.current = previousLoadingFlag;
          
          if (shouldResetHistoryAfterLoad) {
            // On true initial load, we need to clear and reinitialize history
            // This ensures the "Start" entry contains the LOADED state, not empty state
            setTimeout(() => {
              // Clear history first
              clearHistory();
              
              // Then immediately capture current state as new baseline
              // Use a no-op setState to trigger history save with current state
              setWheelState(prev => prev, { type: 'legacyString', text: 'Laddad' });
            }, 100); // Short delay to ensure state is fully updated
          }
        }
        
        // Other settings already handled above in metadata updates
        if (wheelData.settings?.showYearEvents !== undefined) setShowYearEvents(wheelData.settings.showYearEvents);
        if (wheelData.settings?.showSeasonRing !== undefined) setShowSeasonRing(wheelData.settings.showSeasonRing);
      }
    } catch (error) {
      console.error('Error loading wheel:', error);
      showToast('toast:wheel.loadError', 'error');
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
    // CRITICAL: Block ALL realtime updates during page navigation
    if (isNavigatingPagesRef.current) {
      // console.log('[Realtime] Ignoring update - page navigation in progress');
      return;
    }
    
    // CRITICAL: Block ALL realtime updates during version restore
    if (isRestoringVersion.current) {
      // console.log('[Realtime] Ignoring update during version restore');
      return;
    }
    
    // COMPLETELY IGNORE all events if we're in the middle of saving
    if (isSavingRef.current) {
      // console.log('[Realtime] Ignoring update - save in progress');
      return;
    }

    // Ignore realtime churn while user is dragging to prevent visual snapbacks
    if (isDraggingRef.current) {
      // console.log('[Realtime] Ignoring update - drag in progress');
      return;
    }
    
    // CRITICAL: Check if change tracker has pending changes
    if (changeTracker.hasChanges()) {
      return;
    }
    
    // CRITICAL: Use optimistic sync to check if we should block remote updates
    // This properly tracks dirty state and queues remote updates for conflict checking
    if (optimisticSync.shouldBlockRemoteUpdates()) {
      // Queue the update for potential conflict detection after save
      optimisticSync.queueRemoteUpdate(tableName, eventType, payload);
      return;
    }
    
    // CRITICAL: Check if we have queued changes - don't overwrite optimistic local state!
    if (hasQueuedChanges()) {
      // console.log('[Realtime] Ignoring update - queued changes waiting to save');
      return;
    }
    
    // Ignore broadcasts from our own recent saves (within 5 seconds - increased to allow auto-save to complete)
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 5000) {
      // console.log('[Realtime] Ignoring update - recent save (<5s)');
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
  }, [throttledReload, hasQueuedChanges, hasUnsavedChanges, optimisticSync, changeTracker]);

  // Enable realtime sync for this wheel (ALL pages)
  // Page navigation is frontend-only, so we subscribe to the entire wheel
  useRealtimeWheel(wheelId, null, handleRealtimeChange); // Pass null for pageId - subscribe to entire wheel

  // Handle realtime page changes
  const handlePageRealtimeChange = useCallback((eventType, payload) => {
    // COMPLETELY IGNORE all page updates if we're in the middle of saving
    // This prevents the database's slightly-stale data from overwriting our local changes
    if (isSavingRef.current) {
      return;
    }
    
    // CRITICAL: Check if change tracker has pending changes
    if (changeTracker.hasChanges()) {
      return;
    }
    
    // Ignore our own recent changes (within 5 seconds - increased to allow auto-save to complete)
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 5000) {
      return;
    }

    if (eventType === 'INSERT') {
      setWheelState((prev) => {
        const exists = prev.pages.some((p) => p.id === payload.new.id);
        if (exists) {
          return prev;
        }

        const newPage = {
          id: payload.new.id,
          year: payload.new.year,
          pageOrder: payload.new.page_order,
          title: payload.new.title,
          items: [] // Will be populated by item realtime updates
        };

        const nextPages = [...prev.pages, newPage];
        return {
          ...prev,
          pages: nextPages.sort((a, b) => a.pageOrder - b.pageOrder)
        };
      });
    } else if (eventType === 'UPDATE') {
      setWheelState((prev) => ({
        ...prev,
        pages: prev.pages
          .map((page) => 
            page.id === payload.new.id 
              ? { 
                  ...page,
                  year: payload.new.year,
                  pageOrder: payload.new.page_order,
                  title: payload.new.title,
                  // Preserve existing items
                }
              : page
          )
          .sort((a, b) => a.pageOrder - b.pageOrder)
      }));
    } else if (eventType === 'DELETE') {
      // Page deleted by another user
      setWheelState(prev => {
        const filtered = prev.pages.filter(p => p.id !== payload.old.id);
        
        // If deleted current page, switch to first remaining page
        if (payload.old.id === prev.currentPageId && filtered.length > 0) {
          const newCurrentPage = filtered[0];
          return {
            ...prev,
            pages: filtered,
            currentPageId: newCurrentPage.id,
            metadata: {
              ...prev.metadata,
              year: String(newCurrentPage.year || new Date().getFullYear())
            }
          };
        }
        
        return {
          ...prev,
          pages: filtered
        };
      });
    }
  }, [setWheelState, lastSaveTimestamp]);

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
        setWheelStructure(prev => ({ ...prev }));
      }, 3000);
    }
    
    // Apply the operation optimistically to local state
    if (operation.type === 'drag' || operation.type === 'resize') {
      // Update the item in wheelStructure
      setWheelStructure(prev => {
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
      setWheelStructure(prev => {
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
      setWheelStructure(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== operation.itemId)
      }));
    } else if (operation.type === 'create') {
      setWheelStructure(prev => ({
        ...prev,
        items: [...prev.items, { ...operation.data, _remoteUpdate: true }]
      }));
    } else if (operation.type === 'restore') {
      const incomingOrgData = operation.data?.wheelStructure;
      if (!incomingOrgData) {
        return;
      }

      isRealtimeUpdate.current = true;

      setWheelStructure(() => ({
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
  }, [setWheelStructure]);

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
  latestValuesRef.current = {
    title: wheelState.metadata.title,
    colors: wheelState.metadata.colors,
    showWeekRing: wheelState.metadata.showWeekRing,
    showMonthRing: wheelState.metadata.showMonthRing,
    showRingNames: wheelState.metadata.showRingNames,
    showLabels: wheelState.metadata.showLabels,
    weekRingDisplayMode: wheelState.metadata.weekRingDisplayMode,
    structure: wheelState.structure,
    currentItems: currentPageItems,
    wheelStructure,
    year: wheelState.metadata.year,
    currentPageId: wheelState.currentPageId,
    hasUnsavedChanges,
    pages: wheelState.pages,
    allItems: currentPageItems, // allItems is now just currentPageItems
    pageItemsById: wheelState.pages.reduce((acc, page) => {
      acc[page.id] = page.items;
      return acc;
    }, {}),
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

    const baseStructure = latest.structure || {
      rings: [],
      activityGroups: [],
      labels: [],
    };

    // CLEAN STRUCTURE: Shared rings, activityGroups, labels at wheel level
    const sharedStructure = {
      rings: (baseStructure.rings || []).map(stripRemoteFields),
      activityGroups: (baseStructure.activityGroups || []).map(stripRemoteFields),
      labels: (baseStructure.labels || []).map(stripRemoteFields),
    };

    const allPages = latest.pages || [];

    // CLEAN STRUCTURE: Pages only contain id, year, and items
    const pagesSnapshot = allPages
      .map((page) => {
        if (!page) {
          return null;
        }

        const pageYear = toYearNumber(page.year);
        
        // Get items directly from page.items (single source of truth)
        const rawItems = Array.isArray(page.items) ? page.items : [];

        const pageItems = rawItems
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

            const yearMatch = startYear <= pageYear && endYear >= pageYear;
            return yearMatch;
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

        // CLEAN STRUCTURE: Only id, year, items (no duplicate structure or wheelStructure)
        return {
          id: page.id,
          year: pageYear,
          items: pageItems,
        };
      })
      .filter(Boolean);

    // CLEAN STRUCTURE: metadata + structure (shared) + pages (with items only)
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
      structure: sharedStructure,
      pages: pagesSnapshot,
      activePageId: latest.currentPageId || null,
    };
  }, [wheelId, filterItemsByYear]);

  const executeFullSave = useCallback(async (reason = 'auto') => {
    if (!wheelId) {
      return null;
    }

    // CRITICAL: Block ALL saves during page navigation
    if (isNavigatingPagesRef.current) {
      return null;
    }

    // CRITICAL: Block saves during data loading
    if (isLoadingData.current) {
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
      let validation = null;

      if (!snapshot.pages || snapshot.pages.length === 0) {
        const knownPages = Array.isArray(pagesRef.current) ? pagesRef.current : [];

        if (knownPages.length > 0) {
          showToast('toast:save.pageDataMissing', 'error');
          return null;
        }

        let existingPagesCount = 0;
        try {
          const { count: dbPageCount, error: existingPagesError } = await supabase
            .from('wheel_pages')
            .select('*', { count: 'exact', head: true })
            .eq('wheel_id', wheelId);

          if (existingPagesError) {
            throw existingPagesError;
          }

          existingPagesCount = dbPageCount || 0;
        } catch (pageLookupError) {
          showToast('toast:save.pageVerifyError', 'error');
          return null;
        }

        if (existingPagesCount > 0) {
          showToast('toast:save.snapshotPagesError', 'error');
          return null;
        }

        const fallbackYear = toYearNumber(latest?.year) ?? new Date().getFullYear();

        try {
          // FIXED: Use clean structure format (structure:, not wheelStructure:)
          // Items are NOT saved in structure - they go to items table separately
          const newPagePayload = {
            year: fallbackYear,
            title: latest?.title || String(fallbackYear),
            structure: {
              rings: snapshot.structure?.rings || [],
              activityGroups: snapshot.structure?.activityGroups || [],
              labels: snapshot.structure?.labels || [],
            },
          };

          const createdPage = await createPage(wheelId, newPagePayload);
          
          // CRITICAL: Save items separately after page creation
          if (createdPage) {
            const pageItems = (latest?.pageItemsById?.[latest?.currentPageId] && latest.currentPageId)
              ? filterItemsByYear(latest.pageItemsById[latest.currentPageId], fallbackYear)
              : filterItemsByYear(latest?.allItems || [], fallbackYear);
            
            if (pageItems.length > 0) {
              // Items will be saved via syncItems in saveWheelSnapshot below
            }
          }

          if (createdPage) {
            // Add emergency page to wheelState
            setWheelState((prev) => ({
              ...prev,
              pages: [...prev.pages, {
                id: createdPage.id,
                year: createdPage.year,
                pageOrder: createdPage.page_order,
                title: createdPage.title,
                items: [] // Items will be synced by saveWheelSnapshot
              }].sort((a, b) => a.year - b.year),
              currentPageId: prev.currentPageId || createdPage.id
            }));

            // Update refs for save operation
            pagesRef.current = [...(pagesRef.current || []), createdPage];

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
          throw pageError;
        }
      }

      validation = validateSnapshotPages(snapshot, latest);

      if (!validation?.valid) {
        if (reason === 'manual') {
          showToast('Sparning stoppad: vissa sidor saknar eller duplicerar aktiviteter.', 'error');
          throw new Error('Snapshot validation failed');
        }
      }

      const result = await saveWheelSnapshot(wheelId, snapshot);
      const { ringIdMap, activityIdMap, labelIdMap, itemsByPage } = result || {};

      const remapCollection = (collection, mapRef) =>
        (collection || []).map((entry) => ({
          ...entry,
          id: mapRef?.get(entry.id) || entry.id,
        }));

      // FIXED: Use snapshot.structure instead of snapshot.globalWheelStructure (clean structure format)
      const normalizedRings = remapCollection(snapshot.structure?.rings, ringIdMap);
      const normalizedActivityGroups = remapCollection(snapshot.structure?.activityGroups, activityIdMap);
      const normalizedLabels = remapCollection(snapshot.structure?.labels, labelIdMap);

      // CRITICAL: Skip history for DB sync operation to avoid creating extra undo entry
      const wasSkippingHistory = isLoadingData.current;
      isLoadingData.current = true;

      setWheelStructure((prev) => {
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
          structure: {
            rings: normalizedRings,
            activityGroups: normalizedActivityGroups,
            labels: normalizedLabels,
          },
        };

        return next;
      }, { type: 'syncFromSnapshot' });

      // Restore previous skip history state
      isLoadingData.current = wasSkippingHistory;

      if (itemsByPage) {
        // Update wheelState.pages with items that now have database UUIDs
        setWheelState((prev) => {
          if (!Array.isArray(prev.pages)) {
            return prev;
          }

          let changed = false;

          const nextPages = prev.pages.map((page) => {
            const prevItems = Array.isArray(page.items) ? page.items : [];
            const mappedItems = itemsByPage[page.id];
            const nextItems = Array.isArray(mappedItems) ? mappedItems : prevItems;

            const itemsChanged = prevItems !== nextItems;

            if (!itemsChanged) {
              return page;
            }

            changed = true;
            return {
              ...page,
              items: nextItems,
            };
          });

          return changed ? { ...prev, pages: nextPages } : prev;
        });

        latestValuesRef.current = {
          ...latestValuesRef.current,
          pages: wheelState.pages,
          pageItemsById: { ...itemsByPage },
        };
      }

      lastSaveTimestamp.current = Date.now();

      if (reason === 'manual') {
        try {
          // Version snapshot using CLEAN structure format
          await createVersion(
            wheelId,
            {
              metadata: snapshot.metadata,
              structure: {
                rings: normalizedRings,
                activityGroups: normalizedActivityGroups,
                labels: normalizedLabels,
              },
              pages: snapshot.pages || [],
              activePageId: latest.currentPageId,
            },
            null,
            false
          );
        } catch (versionError) {
          // Silent fail for version creation
        }
      }

      // Mark as saved in undo/redo stack
      markSaved();

      return {
        ...result,
        validation,
      };
    } catch (error) {
      showToast('toast:save.error', 'error');
      throw error;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [wheelId, buildWheelSnapshot, markSaved, filterItemsByYear, validateSnapshotPages, showToast]);

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

  // AUTO-SAVE DISABLED: All operations save directly to database
  // Keeping this code commented for reference in case we need to re-enable
  /*
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
  }, [wheelId, wheelStructure, queueFullSave, autoSaveEnabled]);
  */

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
    
    // Load wheel data
    loadWheelData().finally(() => {
      setIsLoading(false);
      // After initial load completes, enable auto-save and clear any tracked changes from load
      setTimeout(() => {
        isInitialLoad.current = false;
        // Clear any changes that were tracked during initial load
        changeTracker.clearChanges();
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
      // CRITICAL: Check actual tracker state to avoid false positives
      // Also check if save is in progress - if saving, don't block unload
      const actuallyHasChanges = changeTracker.hasChanges();
      const currentlySaving = isSavingRef.current;
      
      if (actuallyHasChanges && !currentlySaving) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers show this message
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [changeTracker]); // Depend on changeTracker to get fresh reference

  // Create version on unmount if there are unsaved changes
  useEffect(() => {
    // Reset the guard when wheelId changes (new wheel loaded)
    unmountVersionCreatedRef.current = false;
    
    return () => {
      // Guard against duplicate unmount calls (React StrictMode)
      if (unmountVersionCreatedRef.current) {
        return;
      }
      
      // Only create version on unmount if we have a wheelId and unsaved changes
      if (wheelId && changeTracker.hasChanges()) {
        unmountVersionCreatedRef.current = true;
        
        const snapshot = buildWheelSnapshot();
        
        // Try to create version - the service handles race conditions with retries
        import('../../services/wheelService').then(({ createVersion }) => {
          createVersion(
            wheelId,
            snapshot,
            'Auto-save på stängning',
            true // is_auto_save
          ).catch(error => {
            // Reset guard on error so retry is possible
            unmountVersionCreatedRef.current = false;
            console.error('[UnmountVersion] Failed to create version on unmount:', error);
          });
        });
      }
    };
  }, [wheelId, changeTracker, buildWheelSnapshot]);

  // Fallback: Load from localStorage if no wheelId (backward compatibility)
  useEffect(() => {
    if (wheelId) return; // Skip if we have a wheelId
    
    const data = JSON.parse(localStorage.getItem("yearWheelData"));
    if (data) {
      setRingsData(data.ringsData);
      setTitle(data.title);
      setYear(data.year);
      if (data.colors) setColors(data.colors);
      if (data.wheelStructure) {
        // Backward compatibility: convert old 'activities' to 'activityGroups'
        const orgData = data.wheelStructure;
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
        setWheelStructure(orgData);
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

  // NOTE: Color template application is handled by SidePanel when user clicks a palette
  // DO NOT automatically apply colors here - it causes unwanted data overwrites and save loops

  // ========== SAVE ARCHITECTURE ==========
  // All user actions save DIRECTLY to the database (no auto-save needed):
  // - Adding/editing/deleting items → updates `items` table immediately
  // - Modifying rings/groups/labels → updates respective tables immediately
  // - Drag & drop → persists to database on drop
  // - Manual "Save" button → triggers enqueueFullSave for version history
  // 
  // Auto-save is DISABLED to prevent:
  // - Save loops (state change → auto-save → state change → ...)
  // - Redundant saves (every action already saves to DB)
  // - Race conditions during page navigation
  // ========================================

  const handleTogglePublic = async () => {
    if (!wheelId) return;
    
    try {
      const newIsPublic = !isPublic;
      setIsPublic(newIsPublic);
      
      // Update in database
      await updateWheel(wheelId, { is_public: newIsPublic });
      
      const message = newIsPublic 
        ? t('common:sharing.publicEnabled') 
        : t('common:sharing.publicDisabled');
      
      showToast(message, 'success');
    } catch (error) {
      console.error('Error toggling public status:', error);
      setIsPublic(!isPublic); // Revert on error
      
      showToast('toast:sharing.updateError', 'error');
    }
  };

  const handleSaveWithVersion = useCallback(async () => {
    // Force a full save with version creation
    try {
      isSavingRef.current = true;
      setIsSaving(true);
      
      // Execute full save with manual reason to trigger version creation
      const result = await enqueueFullSave('manual');
      
      showToast('Data och version har sparats!', 'success');
      markSaved();
      
      return result;
    } catch (error) {
      console.error('[SaveWithVersion] Error:', error);
      showToast('Kunde inte spara version', 'error');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [enqueueFullSave, showToast, markSaved]);

  const handleSave = useCallback(async (options = {}) => {
    const { silent = false, reason = 'manual' } = options;

    if (wheelId) {
      // CRITICAL: Set saving flag BEFORE any async operations
      isSavingRef.current = true;
      setIsSaving(true);
      
      try {
        // Check if we have tracked changes for delta save
        const hasChanges = changeTracker.hasChanges();
        
        if (hasChanges) {
          const changes = changeTracker.getChanges();
          
          // Import wheelService for delta save
          const { applyDeltaChanges, broadcastDeltaChanges } = await import('../../services/wheelService');
          
          // Apply delta changes to database
          const result = await applyDeltaChanges(wheelId, changes);
          
          if (result.success) {
            // Broadcast delta changes for realtime collaboration
            await broadcastDeltaChanges(wheelId, changes, user?.id);
            
            // CRITICAL: Update lastSaveTimestamp to block realtime updates from our own save
            lastSaveTimestamp.current = Date.now();
            
            // Clear tracked changes after successful save
            changeTracker.clearChanges();
            optimisticSync.clearPendingChanges();
            
            // CRITICAL: Immediately update the ref to prevent false positives in navigation guards
            hasUnsavedChangesRef.current = false;
            
            if (!silent) {
              const { items, rings, activityGroups, labels, pages } = result;
              const totalOps = 
                (items?.inserted || 0) + (items?.updated || 0) + (items?.deleted || 0) +
                (rings?.inserted || 0) + (rings?.updated || 0) + (rings?.deleted || 0) +
                (activityGroups?.inserted || 0) + (activityGroups?.updated || 0) + (activityGroups?.deleted || 0) +
                (labels?.inserted || 0) + (labels?.updated || 0) + (labels?.deleted || 0) +
                (pages?.updated || 0);
              
              const message = `Data har sparats! ${totalOps} ändring${totalOps !== 1 ? 'ar' : ''} tillämpade.`;
              showToast(message, 'success');
            }
            
            markSaved();
            return;
          } else {
            console.error('[DeltaSave] Failed:', result.errors);
            // Fall back to full save on error only
            const saveResult = await enqueueFullSave(reason === 'manual' ? 'manual' : reason);

            if (!silent) {
              const validationDetails = saveResult?.validation;

              if (validationDetails?.valid) {
                const validatedPages = validationDetails.details?.length || 0;
                const message = validatedPages > 0
                  ? `Data har sparats! ${validatedPages} sidor verifierades med sina aktiviteter.`
                  : 'Data har sparats!';
                showToast(message, 'success');
              } else {
                showToast('Data har sparats!', 'success');
              }
            }
          }
        } else {
          // No changes to save
          if (!silent && reason === 'manual') {
            showToast('Inga ändringar att spara', 'info');
          }
          return;
        }
      } catch (error) {
        console.error('[ManualSave] Error saving wheel:', error);
        showToast('Kunde inte spara', 'error');
      } finally {
        // CRITICAL: Always reset saving flag
        isSavingRef.current = false;
        setIsSaving(false);
      }

      return;
    }

    const dataToSave = {
      title,
      year,
      colors,
      ringsData,
      wheelStructure,
      showWeekRing,
      showMonthRing,
      showRingNames,
      showLabels,
      weekRingDisplayMode,
    };

    localStorage.setItem('yearWheelData', JSON.stringify(dataToSave));
    markSaved();

    if (!silent) {
      showToast('Data har sparats lokalt!', 'success');
    }
  }, [wheelId, changeTracker, user, enqueueFullSave, showToast, title, year, colors, ringsData, wheelStructure, showWeekRing, showMonthRing, showRingNames, showLabels, weekRingDisplayMode, markSaved]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Keyboard shortcuts for save operations
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+S / Ctrl+S - Quick save
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      
      // Cmd+Shift+S / Ctrl+Shift+S - Save with version
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleSaveWithVersion();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleSaveWithVersion]);

  // ========================================
  // DEBOUNCED AUTO-SAVE (via Optimistic Sync)
  // Automatically saves changes after 500ms of inactivity (reduced from 1.5s)
  // Uses optimistic sync for proper dirty state tracking and conflict detection
  // ========================================
  
  // Register the save callback with optimistic sync
  useEffect(() => {
    optimisticSync.setSaveCallback(async (changes) => {
      // Don't auto-save during initial load, data loading, or realtime updates
      if (!wheelId || isInitialLoad.current || isLoadingData.current || isRealtimeUpdate.current) {
        return;
      }
      
      console.log('[OptimisticSync] Executing save with changes:', changes);
      
      // Use the existing handleSave which does delta saves
      if (handleSaveRef.current) {
        await handleSaveRef.current({ silent: true, reason: 'optimistic-sync' });
      }
    });
  }, [wheelId, optimisticSync]);

  // Legacy debounced auto-save (kept for backward compatibility, redirects to optimistic sync)
  const debouncedAutoSave = useDebouncedCallback(async () => {
    // Don't auto-save during initial load, data loading, or realtime updates
    if (!wheelId || isInitialLoad.current || isLoadingData.current || isRealtimeUpdate.current) {
      return;
    }
    
    // Only save if there are tracked changes
    if (!changeTracker.hasChanges()) {
      return;
    }
    
    if (handleSaveRef.current) {
      await handleSaveRef.current({ silent: true, reason: 'auto-change' });
    }
  }, 500); // Reduced from 1500 to 500ms for faster feedback

  // Trigger auto-save whenever changeTracker has changes
  // This is called from setWheelStructure and other handlers
  const triggerAutoSave = useCallback(() => {
    if (!wheelId || isInitialLoad.current || isLoadingData.current || isRealtimeUpdate.current) {
      return;
    }
    
    // Use optimistic sync's debounced save instead of legacy debounce
    // This ensures proper dirty state tracking
    optimisticSync.scheduleSave();
    
    // Also trigger legacy for backward compatibility during transition
    debouncedAutoSave();
  }, [wheelId, debouncedAutoSave, optimisticSync]);

  // Keep ref updated for early callers
  useEffect(() => {
    triggerAutoSaveRef.current = triggerAutoSave;
  }, [triggerAutoSave]);

  const handleToggleTemplate = async () => {
    if (!wheelId || !isAdmin) return;
    
    try {
      const newIsTemplate = !isTemplate;
      setIsTemplate(newIsTemplate);
      
      // Update in database
      await toggleTemplateStatus(wheelId, newIsTemplate);
      
      const message = newIsTemplate 
        ? t('common:template.enabled') 
        : t('common:template.disabled');
      
      showToast(message, 'success');
    } catch (error) {
      console.error('Error toggling template status:', error);
      setIsTemplate(!isTemplate); // Revert on error
      
      showToast('toast:template.updateError', 'error');
    }
  };

  // ========== PAGE MANAGEMENT FUNCTIONS ==========
  
  // Switch to a different page (PURE FRONTEND - no database calls)
  const handlePageChange = (pageId) => {
    if (pageId === currentPageId) return;
    
    const newPage = wheelState?.pages?.find(p => p.id === pageId);
    if (!newPage) {
      console.error('Page not found:', pageId);
      return;
    }
    
    // CRITICAL: Block all database operations during page navigation
    isNavigatingPagesRef.current = true;
    
    // Switch to the new page by updating currentPageId and year
    // Items are automatically computed from wheelState via currentPageItems selector
    setWheelState((prev) => ({
      ...prev,
      currentPageId: pageId,
      metadata: {
        ...prev.metadata,
        year: String(newPage.year || new Date().getFullYear())
      }
    }), { type: 'pageChange', params: { pageId } });
    
    // DON'T clear history - users should be able to undo actions from other pages
    // The undo callback preserves currentPageId so undo won't navigate away
    
    // Re-enable database operations after React finishes updating
    setTimeout(() => {
      isNavigatingPagesRef.current = false;
    }, 100);
  };

  // Navigate to an item on the wheel from calendar view
  // Handles page switching and tooltip opening in sequence
  const handleNavigateToItemOnWheel = useCallback((itemId) => {
    // Find which page contains this item
    let targetPageId = null;
    for (const page of (wheelState?.pages || [])) {
      const itemInPage = page.items?.find(i => i.id === itemId);
      if (itemInPage) {
        targetPageId = page.id;
        break;
      }
    }
    
    // Set pending tooltip to open after wheel is ready
    setPendingTooltipItemId(itemId);
    
    // Switch to wheel view
    setViewMode('wheel');
    
    // If item is on a different page, switch to that page
    if (targetPageId && targetPageId !== currentPageId) {
      handlePageChange(targetPageId);
    }
  }, [wheelState?.pages, currentPageId]);

  // Effect to open pending tooltip when wheel becomes ready
  useEffect(() => {
    if (pendingTooltipItemId && yearWheelRef && viewMode === 'wheel') {
      // Small delay to ensure wheel is fully rendered
      const timer = setTimeout(() => {
        if (yearWheelRef.openItemTooltip) {
          yearWheelRef.openItemTooltip(pendingTooltipItemId);
        }
        setPendingTooltipItemId(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingTooltipItemId, yearWheelRef, viewMode]);

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
      
      // CLEAN STRUCTURE: Don't pass items in structure - they're stored in items table
      const newPage = await createPage(wheelId, {
        year: newYear,
        title: `${newYear}`,
        structure: {
          rings: [], // Rings shared at wheel level
          activityGroups: [], // Groups shared at wheel level
          labels: [] // Labels shared at wheel level
          // No items - they're in the items table!
        }
      });
      
      // Add new page to wheelState and sort chronologically
      setWheelState((prev) => {
        const updatedPages = [...prev.pages, {
          id: newPage.id,
          year: newPage.year,
          pageOrder: newPage.page_order,
          title: newPage.title,
          items: []
        }].sort((a, b) => a.year - b.year);
        
        // Update page_order in database to match chronological order
        const pageOrders = updatedPages.map((page, index) => ({
          id: page.id,
          page_order: index + 1
        }));
        reorderPages(wheelId, pageOrders).catch(err => 
          console.error('Failed to reorder pages:', err)
        );
        
        return {
          ...prev,
          pages: updatedPages,
          currentPageId: newPage.id, // Switch to new page
          metadata: {
            ...prev.metadata,
            year: String(newYear)
          }
        };
      });
      
      setShowAddPageModal(false);
      
      showToast(t('common:page.created', { year: newYear }), 'success');
    } catch (error) {
      console.error('Error creating blank page:', error);
      showToast('toast:page.createError', 'error');
    }
  };

  // Create a page for next year
  const handleCreateNextYear = async () => {
    if (!wheelId) return;
    
    try {
      // Save current state before creating new page
      await enqueueFullSave('pre-create-page');
      
      // Find highest year from existing pages and add 1
      const maxYear = pages.length > 0 
        ? Math.max(...pages.map(p => p.year))
        : parseInt(year);
      const nextYear = maxYear + 1;
      
      // CLEAN STRUCTURE: Create blank page for next year
      // Rings/groups/labels are shared across wheel at database level
      const newPage = await createPage(wheelId, {
        year: nextYear,
        title: `${nextYear}`,
        structure: {
          rings: [], // Shared at wheel level
          activityGroups: [], // Shared at wheel level
          labels: [] // Shared at wheel level
          // No items - they're in the items table!
        }
      });
      
      // Add new page to wheelState and sort chronologically
      setWheelState((prev) => {
        const updatedPages = [...prev.pages, {
          id: newPage.id,
          year: newPage.year,
          pageOrder: newPage.page_order,
          title: newPage.title,
          items: []
        }].sort((a, b) => a.year - b.year);
        
        // Update page_order in database to match chronological order
        const pageOrders = updatedPages.map((page, index) => ({
          id: page.id,
          page_order: index + 1
        }));
        reorderPages(wheelId, pageOrders).catch(err => 
          console.error('Failed to reorder pages:', err)
        );
        
        return {
          ...prev,
          pages: updatedPages,
          currentPageId: newPage.id, // Switch to new page
          metadata: {
            ...prev.metadata,
            year: String(nextYear)
          }
        };
      });
      
      setShowAddPageModal(false);
      
      showToast(t('common:page.createdWithStructure', { year: nextYear }), 'success');
    } catch (error) {
      console.error('Error creating next year page:', error);
      showToast('toast:page.nextYearError', 'error');
    }
  };

  // SmartCopy: Create next year page with ALL activities copied and dates adjusted
  const handleSmartCopy = async () => {
    if (!wheelId) return;
    
    try {
      // Save current state before creating new page
      await enqueueFullSave('pre-smart-copy');
      
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
      const copiedItems = wheelStructure.items.map(item => ({
        ...item,
        id: crypto.randomUUID(), // Generate unique UUID
        startDate: adjustDateToNewYear(item.startDate, nextYear - currentYear),
        endDate: adjustDateToNewYear(item.endDate, nextYear - currentYear),
        pageId: null // Will be set when saving
        // ringId, activityId, labelId remain unchanged - they reference wheel-level structures
      }));
      
      
      // CLEAN STRUCTURE: Create new page without items in structure
      const newPage = await createPage(wheelId, {
        year: nextYear,
        title: `${nextYear}`,
        structure: {
          rings: [], // Shared at wheel level
          activityGroups: [], // Shared at wheel level
          labels: [] // Shared at wheel level
          // No items - they're in the items table!
        }
      });
      
      
      const itemsToSave = copiedItems.map(item => ({
        ...item,
        pageId: newPage.id
      }));

      // Add new page with copied items to wheelState
      setWheelState((prev) => {
        const updatedPages = [...prev.pages, {
          id: newPage.id,
          year: newPage.year,
          pageOrder: newPage.page_order,
          title: newPage.title,
          items: itemsToSave
        }].sort((a, b) => a.year - b.year);
        
        // Update page_order in database to match chronological order
        const pageOrders = updatedPages.map((page, index) => ({
          id: page.id,
          page_order: index + 1
        }));
        reorderPages(wheelId, pageOrders).catch(err => 
          console.error('Failed to reorder pages:', err)
        );
        
        return {
          ...prev,
          pages: updatedPages,
          currentPageId: newPage.id, // Switch to new page
          metadata: {
            ...prev.metadata,
            year: String(nextYear)
          }
        };
      });
      
      setShowAddPageModal(false);

      await enqueueFullSave('smart-copy');

      showToast(t('common:smartCopy.success', { count: itemsToSave.length, year: nextYear }), 'success');
    } catch (error) {
      showToast('toast:ai.smartCopyError', 'error', { error: error.message });
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
        const remoteStructure = normalizePageStructure(existingRemote);
        const hydratedRemote = {
          ...existingRemote,
          structure: remoteStructure,
        };

        // Add existing page to wheelState if not already there
        setWheelState((prev) => {
          if (prev.pages.some((page) => page.id === hydratedRemote.id)) {
            return prev;
          }

          const updatedPages = [...prev.pages, {
            id: hydratedRemote.id,
            year: hydratedRemote.year,
            pageOrder: hydratedRemote.page_order,
            title: hydratedRemote.title,
            items: remoteStructure.items || []
          }];
          updatedPages.sort((a, b) => toYearNumber(a.year) - toYearNumber(b.year));
          
          // Update page_order in database to match chronological order
          const pageOrders = updatedPages.map((page, index) => ({
            id: page.id,
            page_order: index + 1
          }));
          reorderPages(wheelId, pageOrders).catch(err => 
            console.error('Failed to reorder pages:', err)
          );
          
          return {
            ...prev,
            pages: updatedPages
          };
        });

        return { page: hydratedRemote, created: false };
      }

      const templateWheelStructure = options?.templateWheelStructure || {
        rings: [],
        activityGroups: [],
        labels: [],
        items: [],
      };

      try {
        const newPage = await createPage(wheelId, {
          year: normalizedTargetYear,
          title: `${normalizedTargetYear}`,
          structure: templateWheelStructure,
          overrideColors: options?.overrideColors || null,
          overrideShowWeekRing: options?.overrideShowWeekRing || null,
          overrideShowMonthRing: options?.overrideShowMonthRing || null,
          overrideShowRingNames: options?.overrideShowRingNames || null,
        });

        const hydratedNewPage = {
          ...newPage,
          structure: normalizePageStructure(newPage),
        };

        // Add new page to wheelState and sort chronologically
        setWheelState((prev) => {
          const updatedPages = [...prev.pages, {
            id: hydratedNewPage.id,
            year: hydratedNewPage.year,
            pageOrder: hydratedNewPage.page_order,
            title: hydratedNewPage.title,
            items: templateWheelStructure.items || []
          }];
          updatedPages.sort((a, b) => toYearNumber(a.year) - toYearNumber(b.year));
          
          // Update page_order in database to match chronological order
          const pageOrders = updatedPages.map((page, index) => ({
            id: page.id,
            page_order: index + 1
          }));
          reorderPages(wheelId, pageOrders).catch(err => 
            console.error('Failed to reorder pages:', err)
          );
          
          return {
            ...prev,
            pages: updatedPages
          };
        });

        return { page: hydratedNewPage, created: true };
      } catch (error) {
        // 23505 indicates duplicate page (likely due to concurrent creation)
        if (error?.code === '23505') {
          try {
            const refreshedPages = await fetchPages(wheelId);
            const pagesWithItems = refreshedPages.map((page) => ({
              id: page.id,
              year: page.year,
              pageOrder: page.page_order,
              title: page.title,
              items: normalizePageStructure(page).items || []
            })).sort((a, b) => toYearNumber(a.year) - toYearNumber(b.year));
            
            setWheelState((prev) => ({
              ...prev,
              pages: pagesWithItems
            }));
            
            const match = pagesWithItems.find(
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
      
      // Add duplicated page to wheelState
      setWheelState((prev) => {
        const updatedPages = [...prev.pages, {
          id: duplicatedPage.id,
          year: duplicatedPage.year,
          pageOrder: duplicatedPage.page_order,
          title: duplicatedPage.title,
          items: [] // Will be populated by database load
        }].sort((a, b) => a.year - b.year);
        
        return {
          ...prev,
          pages: updatedPages
        };
      });
      
      showToast('toast:page.duplicateSuccess', 'success');
    } catch (error) {
      console.error('Error duplicating page:', error);
      showToast('toast:page.duplicateError', 'error');
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
      
      // Remove page from wheelState
      setWheelState((prev) => {
        const updatedPages = prev.pages.filter(p => p.id !== pageId);
        
        // If deleted current page, switch to another
        let newCurrentPageId = prev.currentPageId;
        let newYear = prev.metadata.year;
        
        if (pageId === prev.currentPageId && updatedPages.length > 0) {
          const newCurrentPage = updatedPages[0];
          newCurrentPageId = newCurrentPage.id;
          newYear = String(newCurrentPage.year);
        }
        
        return {
          ...prev,
          pages: updatedPages,
          currentPageId: newCurrentPageId,
          metadata: {
            ...prev.metadata,
            year: newYear
          }
        };
      });
      
      // Clear undo history when switching pages
      if (pageId === currentPageId) {
        clearHistory();
      }
      
      showToast('toast:page.deleteSuccess', 'success');
    } catch (error) {
      console.error('Error deleting page:', error);
      showToast('toast:page.deleteError', 'error');
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
          buildWheelSnapshot(),
          'Före återställning',
          false
        );
      }

      // NORMALIZE: Handle both OLD format (wheelStructure) and NEW format (metadata + structure + pages)
      const isNewFormat = versionData.metadata && versionData.structure;
      
      let restoredTitle, restoredYear, restoredColors, restoredShowWeekRing, restoredShowMonthRing, restoredShowRingNames;
      let restoredStructure; // { rings, activityGroups, labels }
      let restoredPages; // [{ id, year, items }]
      
      if (isNewFormat) {
        // NEW FORMAT: { metadata, structure, pages }
        restoredTitle = versionData.metadata.title;
        restoredYear = versionData.metadata.year;
        restoredColors = versionData.metadata.colors;
        restoredShowWeekRing = versionData.metadata.showWeekRing;
        restoredShowMonthRing = versionData.metadata.showMonthRing;
        restoredShowRingNames = versionData.metadata.showRingNames;
        
        restoredStructure = {
          rings: [...(versionData.structure.rings || [])],
          activityGroups: [...(versionData.structure.activityGroups || [])],
          labels: [...(versionData.structure.labels || [])],
        };
        
        restoredPages = versionData.pages || [];
      } else {
        // OLD FORMAT: { title, year, colors, wheelStructure: { rings, activityGroups, labels, items } }
        restoredTitle = versionData.title;
        restoredYear = versionData.year;
        restoredColors = versionData.colors;
        restoredShowWeekRing = versionData.showWeekRing;
        restoredShowMonthRing = versionData.showMonthRing;
        restoredShowRingNames = versionData.showRingNames;
        
        const ws = versionData.wheelStructure || {};
        restoredStructure = {
          rings: [...(ws.rings || [])],
          activityGroups: [...(ws.activityGroups || [])],
          labels: [...(ws.labels || [])],
        };
        
        // Old format has items at wheelStructure level, assign to current page
        if (currentPageId && ws.items) {
          restoredPages = [{ id: currentPageId, year: restoredYear, items: [...ws.items] }];
        } else {
          restoredPages = [];
        }
      }

      // CRITICAL: Do ONE atomic state update with ALL restored data
      // This prevents race conditions where setWheelStructure overwrites page items
      const restoredPageMap = new Map(restoredPages.map(p => [p.id, p]));
      
      setWheelState((prev) => {
        const newMetadata = {
          ...prev.metadata,
          ...(restoredTitle && { title: restoredTitle }),
          ...(restoredYear && { year: restoredYear }),
          ...(restoredColors && { colors: restoredColors }),
          ...(typeof restoredShowWeekRing === 'boolean' && { showWeekRing: restoredShowWeekRing }),
          ...(typeof restoredShowMonthRing === 'boolean' && { showMonthRing: restoredShowMonthRing }),
          ...(typeof restoredShowRingNames === 'boolean' && { showRingNames: restoredShowRingNames }),
        };
        
        const newStructure = restoredStructure || prev.structure;
        
        const newPages = prev.pages.map((page) => {
          const restoredPage = restoredPageMap.get(page.id);
          if (restoredPage) {
            return {
              ...page,
              items: restoredPage.items || []
            };
          }
          return page;
        });
        
        return {
          ...prev,
          metadata: newMetadata,
          structure: newStructure,
          pages: newPages,
        };
      });

      // Update latestValuesRef for consistency
      const pageItemsById = {};
      restoredPages.forEach(p => {
        if (p.id && p.items) {
          pageItemsById[p.id] = [...p.items];
        }
      });
      
      latestValuesRef.current = {
        ...latestValuesRef.current,
        title: restoredTitle ?? latestValuesRef.current?.title,
        year: restoredYear ?? latestValuesRef.current?.year,
        colors: restoredColors ?? latestValuesRef.current?.colors,
        showWeekRing: restoredShowWeekRing ?? latestValuesRef.current?.showWeekRing,
        showMonthRing: restoredShowMonthRing ?? latestValuesRef.current?.showMonthRing,
        showRingNames: restoredShowRingNames ?? latestValuesRef.current?.showRingNames,
        structure: restoredStructure ?? latestValuesRef.current?.structure,
        pageItemsById: Object.keys(pageItemsById).length > 0
          ? { ...(latestValuesRef.current?.pageItemsById || {}), ...pageItemsById }
          : latestValuesRef.current?.pageItemsById,
      };

      clearHistory();

      await enqueueFullSave('restore-version');

      lastSaveTimestamp.current = Date.now();
      isSavingRef.current = false;
      isLoadingData.current = false;
      isRestoringVersion.current = false;

      showToast('toast:version.restoreSuccess', 'success');
      setShowVersionHistory(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      // Reset flags on error
      lastSaveTimestamp.current = Date.now();
      isSavingRef.current = false;
      isLoadingData.current = false;
      isRestoringVersion.current = false;
      
      showToast('toast:version.restoreError', 'error');
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
    setWheelStructure({
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
    showToast('toast:generic.resetSuccess', 'success');
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
      
      // Fetch template wheel data (includes structure: rings, activityGroups, labels)
      const templateData = await fetchWheel(templateId);
      const templatePagesRaw = await fetchPages(templateId);
      
      // Fetch items for each page from the items table
      const templatePages = await Promise.all((templatePagesRaw || []).map(async (page) => {
        const pageItems = await fetchPageData(page.id, page.year, templateId);
        return {
          ...page,
          items: pageItems || []
        };
      }));
      
      if (!templateData || !templatePages || templatePages.length === 0) {
        throw new Error('Template data not found');
      }

      console.log('[Editor] Loading template:', templateData.title);
      console.log('[Editor] Template structure:', {
        rings: templateData.structure?.rings?.length || 0,
        activityGroups: templateData.structure?.activityGroups?.length || 0,
        labels: templateData.structure?.labels?.length || 0
      });
      console.log('[Editor] Template pages:', templatePages.length);
      templatePages.forEach((page, idx) => {
        console.log(`[Editor] Template page ${idx + 1}: year=${page.year}, items=${page.items?.length || 0}`);
      });

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
      // Returns the converted data AND the ID mappings for consistent references across pages
      const convertTemplateStructure = (templateStructure) => {
        // Deep copy to avoid read-only property issues
        const orgData = JSON.parse(JSON.stringify(templateStructure || defaultPageStructure));
        
        // Create ID mapping for consistent references
        const ringIdMap = new Map();
        const groupIdMap = new Map();
        const labelIdMap = new Map();
        
        // CRITICAL: Generate new UUIDs for all IDs to avoid conflicts
        if (orgData.rings) {
          orgData.rings = orgData.rings.map((ring) => {
            const newId = crypto.randomUUID();
            ringIdMap.set(ring.id, newId);
            return { ...ring, id: newId };
          });
        }
        
        if (orgData.activityGroups) {
          orgData.activityGroups = orgData.activityGroups.map((group) => {
            const newId = crypto.randomUUID();
            groupIdMap.set(group.id, newId);
            return { ...group, id: newId };
          });
        }
        
        if (orgData.labels) {
          orgData.labels = orgData.labels.map((label) => {
            const newId = crypto.randomUUID();
            labelIdMap.set(label.id, newId);
            return { ...label, id: newId };
          });
        }
        
        return { orgData, ringIdMap, groupIdMap, labelIdMap };
      };
      
      // Helper to convert items using existing ID mappings
      const convertTemplateItems = (items, ringIdMap, groupIdMap, labelIdMap) => {
        if (!items || items.length === 0) return [];
        return items.map((item) => ({
          ...item,
          id: crypto.randomUUID(), // Use proper UUID for each item
          pageId: null, // Clear page reference - will be set per page
          // Update references using the mapping
          ringId: ringIdMap.get(item.ringId) || item.ringId,
          activityId: groupIdMap.get(item.activityId) || item.activityId,
          labelId: item.labelId ? (labelIdMap.get(item.labelId) || item.labelId) : null
        }));
      };

      // For multi-page wheels, load all pages with their items
      if (templatePages.length > 1) {
        // Convert structure from wheel data (rings, groups, labels are wheel-scoped)
        const { orgData, ringIdMap, groupIdMap, labelIdMap } = convertTemplateStructure(templateData.structure);
        
        // Load template pages into wheelState - each page gets its own items
        const pagesForState = templatePages.map((page, index) => {
          const pageItems = convertTemplateItems(
            page.items || [], // Items fetched from items table
            ringIdMap,
            groupIdMap,
            labelIdMap
          );
          return {
            id: crypto.randomUUID(), // Use proper UUID for page IDs
            year: page.year || (new Date().getFullYear() + index),
            pageOrder: index,
            title: page.title || `Sida ${index + 1}`,
            items: pageItems
          };
        });

        setWheelState((prev) => ({
          ...prev,
          structure: {
            rings: orgData.rings || [],
            activityGroups: orgData.activityGroups || [],
            labels: orgData.labels || []
          },
          pages: pagesForState,
          currentPageId: pagesForState[0]?.id || null // Auto-select first page
        }));
        
        // Update latestValuesRef for save operation (multi-page)
        latestValuesRef.current = {
          ...latestValuesRef.current,
          title: `${templateData.title} (Kopia)`,
          year: String(pagesForState[0]?.year || new Date().getFullYear()),
          colors: templateData.colors || colors,
          showWeekRing: templateData.show_week_ring,
          showMonthRing: templateData.show_month_ring,
          showRingNames: templateData.show_ring_names,
          showLabels: templateData.show_labels,
          currentPageId: pagesForState[0]?.id || null,
          structure: {
            rings: orgData.rings || [],
            activityGroups: orgData.activityGroups || [],
            labels: orgData.labels || [],
          },
          pages: pagesForState,
        };
      } else {
        // Single page template - load structure from wheel data
        const { orgData, ringIdMap, groupIdMap, labelIdMap } = convertTemplateStructure(templateData.structure);
        
        // Convert items for the single page (items come from separate table, not structure)
        const pageItems = convertTemplateItems(
          templatePages[0].items || [],
          ringIdMap,
          groupIdMap,
          labelIdMap
        );
        
        const firstPageId = crypto.randomUUID();
        
        setWheelState((prev) => ({
          ...prev,
          structure: {
            rings: orgData.rings || [],
            activityGroups: orgData.activityGroups || [],
            labels: orgData.labels || []
          },
          pages: [{
            id: firstPageId,
            year: templatePages[0].year || new Date().getFullYear(),
            pageOrder: 0,
            title: templatePages[0].title || 'Sida 1',
            items: pageItems
          }],
          currentPageId: firstPageId // Auto-select first page
        }));
        
        // Update latestValuesRef for save operation
        latestValuesRef.current = {
          ...latestValuesRef.current,
          title: `${templateData.title} (Kopia)`,
          year: String(templatePages[0].year || new Date().getFullYear()),
          colors: templateData.colors || colors,
          showWeekRing: templateData.show_week_ring,
          showMonthRing: templateData.show_month_ring,
          showRingNames: templateData.show_ring_names,
          showLabels: templateData.show_labels,
          currentPageId: firstPageId,
          structure: {
            rings: orgData.rings || [],
            activityGroups: orgData.activityGroups || [],
            labels: orgData.labels || [],
          },
          pages: [{
            id: firstPageId,
            year: templatePages[0].year || new Date().getFullYear(),
            pageOrder: 0,
            title: templatePages[0].title || 'Sida 1',
            items: pageItems
          }],
        };
      }

      // Update rings data for backward compatibility
      const rings = templateData.structure?.rings || [];
      const newRingsData = rings.map(ring => ({
        data: ring.data || Array.from({ length: 12 }, () => [""]),
        orientation: ring.orientation || "vertical"
      }));
      setRingsData(newRingsData);

      // Save to database
      if (wheelId) {
        await enqueueFullSave('template-import');
      }

      // Clear history and mark as saved
      clearHistory();
      markSaved();

      showToast('toast:template.loadSuccess', 'success', { name: templateData.title });

    } catch (error) {
      console.error('Error loading template:', error);
      showToast('toast:template.loadError', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToFile = () => {
    // Generate anonymous IDs for export (don't expose real database UUIDs)
    const generateAnonymousId = (prefix, index) => `${prefix}-${index + 1}`;
    
    // Map database UUIDs to anonymous IDs
    const ringIdMap = new Map();
    const groupIdMap = new Map();
    const labelIdMap = new Map();
    const pageIdMap = new Map();
    
    // Create anonymous structure (rings, activityGroups, labels)
    const exportRings = (structure.rings || []).map((ring, index) => {
      const anonymousId = generateAnonymousId('ring', index);
      ringIdMap.set(ring.id, anonymousId);
      return {
        id: anonymousId,
        name: ring.name,
        type: ring.type,
        visible: ring.visible,
        orientation: ring.orientation || 'vertical',
        ...(ring.color && { color: ring.color })
      };
    });
    
    const exportGroups = (structure.activityGroups || []).map((group, index) => {
      const anonymousId = generateAnonymousId('ag', index);
      groupIdMap.set(group.id, anonymousId);
      return {
        id: anonymousId,
        name: group.name,
        color: group.color,
        visible: group.visible
      };
    });
    
    const exportLabels = (structure.labels || []).map((label, index) => {
      const anonymousId = generateAnonymousId('label', index);
      labelIdMap.set(label.id, anonymousId);
      return {
        id: anonymousId,
        name: label.name,
        color: label.color,
        visible: label.visible
      };
    });
    
    // Create pages array with items (multi-year support)
    const exportPages = pages.map((page, pageIndex) => {
      const anonymousPageId = generateAnonymousId('page', pageIndex);
      pageIdMap.set(page.id, anonymousPageId);
      
      const exportItems = (page.items || []).map((item, itemIndex) => {
        const exportItem = {
          id: generateAnonymousId(`item-${page.year}`, itemIndex),
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          ringId: ringIdMap.get(item.ringId),
          activityId: groupIdMap.get(item.activityId)
        };
        
        // Add optional fields
        if (item.labelId) {
          exportItem.labelId = labelIdMap.get(item.labelId);
        }
        if (item.description) {
          exportItem.description = item.description;
        }
        if (item.time) {
          exportItem.time = item.time;
        }
        
        return exportItem;
      });
      
      return {
        id: anonymousPageId,
        year: page.year,
        pageOrder: page.pageOrder || pageIndex + 1,
        title: page.title || `${page.year}`,
        items: exportItems
      };
    });
    
    // Build v2.0 format (matches template structure)
    const dataToSave = {
      version: "2.0",
      metadata: {
        title,
        year: pages.length > 0 ? pages[0].year : year,
        createdAt: new Date().toISOString().split('T')[0],
        description: `Exported from YearWheel`
      },
      settings: {
        showWeekRing,
        showMonthRing,
        showRingNames,
        weekRingDisplayMode,
        showLabels,
        ...(colors && { colors })
      },
      structure: {
        rings: exportRings,
        activityGroups: exportGroups,
        labels: exportLabels
      },
      pages: exportPages
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
    showToast('toast:file.fileSaved', 'success');
  };

  const persistItemToDatabase = useCallback((item, options = {}) => {
    // DELTA SAVE: Don't trigger save here - let change tracker detect it
    // Save will be triggered manually by user or via debounced auto-save
    console.log('[persistItemToDatabase] Item updated in state, waiting for manual save');
    return Promise.resolve(null);
  }, []);

  const persistMultipleItems = useCallback((items, options = {}) => {
    // DELTA SAVE: Don't trigger save here - let change tracker detect it
    // Save will be triggered manually by user or via debounced auto-save
    console.log('[persistMultipleItems] Items updated in state, waiting for manual save');
    return Promise.resolve(Array.isArray(items) ? items : items ? [items] : []);
  }, []);

  const persistItemDeletion = useCallback((itemId, options = {}) => {
    // DELTA SAVE: Don't trigger save here - let change tracker detect it
    // Save will be triggered manually by user or via debounced auto-save
    console.log('[persistItemDeletion] Item deleted from state, waiting for manual save');
    return Promise.resolve();
  }, []);

  const handlePersistNewItems = useCallback((items) => {
    return persistMultipleItems(items, { reason: 'item-create' });
  }, [persistMultipleItems]);

  const handlePersistItemUpdate = useCallback((item) => {
    return persistItemToDatabase(item, { reason: 'item-update' });
  }, [persistItemToDatabase]);

  const handlePersistItemRemove = useCallback((itemId) => {
    return persistItemDeletion(itemId, { reason: 'item-delete' });
  }, [persistItemDeletion]);

  // Handle extending activity beyond current year - OPTION B: Linked items across pages
  // Since items are PAGE-SCOPED, we create linked items on each year's page
  // Items are linked via crossYearGroupId for synchronized updates
  const handleExtendActivityBeyondYear = useCallback(async ({ item, overflowEndDate, currentYearEnd, newStartDate, newRingId }) => {
    if (!wheelId || !item || !overflowEndDate || !currentYearEnd) {
      return;
    }

    const overflowDate = new Date(overflowEndDate);
    const currentYearEndDate = new Date(currentYearEnd);
    // Use newStartDate if provided (for move operations), otherwise keep original
    const actualStartDate = newStartDate ? new Date(newStartDate) : new Date(item.startDate);
    // Use newRingId if provided (when item was dragged to a different ring)
    const actualRingId = newRingId || item.ringId;

    if (!(overflowDate instanceof Date) || Number.isNaN(overflowDate.getTime())) {
      return;
    }

    if (overflowDate <= currentYearEndDate) {
      return;
    }

    // Calculate segments for each year the item spans into
    const segments = [];
    // Use UTC year to avoid timezone issues (currentYearEnd is in UTC)
    const currentYear = currentYearEndDate.getUTCFullYear();
    const nextYear = currentYear + 1;
    let segmentStart = new Date(Date.UTC(nextYear, 0, 1)); // Jan 1 of next year (UTC)

    // Safety limit counter
    let safetyCounter = 0;
    const MAX_YEARS = 10;

    while (segmentStart <= overflowDate) {
      safetyCounter++;
      if (safetyCounter > MAX_YEARS) {
        console.error('[handleExtendActivityBeyondYear] Safety limit reached - too many years');
        showToast(t('crossYear.maxYearsError', { count: safetyCounter }), 'error');
        return;
      }
      
      const segmentYear = segmentStart.getUTCFullYear();
      const segmentYearEnd = new Date(Date.UTC(segmentYear, 11, 31, 23, 59, 59));
      const segmentEnd = overflowDate <= segmentYearEnd ? overflowDate : segmentYearEnd;

      segments.push({
        year: segmentYear,
        startDate: formatDateOnly(segmentStart),
        endDate: formatDateOnly(segmentEnd),
      });

      if (segmentEnd >= overflowDate) break;
      segmentStart = new Date(Date.UTC(segmentYear + 1, 0, 1));
    }

    if (segments.length === 0) return;

    const targetYear = segments[segments.length - 1].year;
    const yearsSpanned = targetYear - currentYear;

    const confirmed = await showConfirmDialog({
      title: t('crossYear.extendForwardTitle'),
      message: yearsSpanned === 1
        ? t('crossYear.extendForwardMessageSingle', { name: item.name, date: formatDateOnly(overflowDate), year: targetYear })
        : t('crossYear.extendForwardMessageMultiple', { name: item.name, date: formatDateOnly(overflowDate), count: yearsSpanned }),
      confirmText: t('crossYear.extendConfirm'),
      cancelText: t('crossYear.extendCancel'),
      confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    });

    if (!confirmed) return;

    // Generate a cross-year group ID to link all segments
    const crossYearGroupId = item.crossYearGroupId || crypto.randomUUID();

    // First, update the current item with the group ID, new start date, new ringId, and clamp end to year end
    const updatedCurrentItem = {
      ...item,
      startDate: formatDateOnly(actualStartDate), // Use new start date for move operations
      endDate: formatDateOnly(currentYearEndDate),
      ringId: actualRingId, // Use new ringId if item was dragged to a different ring
      crossYearGroupId,
    };

    const generateItemId = () => crypto.randomUUID();

    // Create linked items for each segment (future years)
    const newItems = [];

    for (const segment of segments) {
      // Ensure page exists for this year
      const currentStructure = {
        rings: structure.rings || [],
        activityGroups: structure.activityGroups || [],
        labels: structure.labels || [],
        items: [],
      };

      const ensured = await ensurePageForYear(segment.year, {
        templateWheelStructure: currentStructure,
      });

      if (!ensured?.page) continue;

      const targetPageId = ensured.page.id;

      // Check if a linked item already exists on this page
      const latestPages = latestValuesRef.current?.pages || wheelState?.pages || [];
      const targetPage = latestPages.find(p => p.id === targetPageId);
      const existingLinked = (targetPage?.items || []).find(
        i => i.crossYearGroupId === crossYearGroupId && i.id !== item.id
      );

      if (existingLinked) {
        // Update existing linked item
        newItems.push({
          ...existingLinked,
          startDate: segment.startDate,
          endDate: segment.endDate,
          ringId: actualRingId, // Sync ringId across all linked items
          isUpdate: true,
        });
      } else {
        // Create new linked item
        newItems.push({
          id: generateItemId(),
          ringId: actualRingId, // Use the new ringId for all linked items
          activityId: item.activityId,
          labelId: item.labelId || null,
          name: item.name,
          startDate: segment.startDate,
          endDate: segment.endDate,
          time: item.time || null,
          description: item.description || null,
          pageId: targetPageId,
          linkedWheelId: item.linkedWheelId || null,
          linkType: item.linkType || null,
          crossYearGroupId,
          isUpdate: false,
        });
      }
    }

    // Update wheelState with current item update and new linked items
    setWheelState((prev) => {
      let updatedPages = prev.pages.map((page) => {
        // Update current item on its page
        if (page.id === item.pageId) {
          return {
            ...page,
            items: (page.items || []).map((pageItem) =>
              pageItem.id === item.id ? updatedCurrentItem : pageItem
            ),
          };
        }
        return page;
      });

      // Add/update linked items on their respective pages
      for (const newItem of newItems) {
        updatedPages = updatedPages.map((page) => {
          if (page.id !== newItem.pageId) return page;

          const currentItems = page.items || [];
          if (newItem.isUpdate) {
            // Update existing linked item
            return {
              ...page,
              items: currentItems.map((i) =>
                i.id === newItem.id ? { ...newItem, isUpdate: undefined } : i
              ),
            };
          } else {
            // Add new linked item
            const { isUpdate, ...itemToAdd } = newItem;
            return {
              ...page,
              items: [...currentItems, itemToAdd],
            };
          }
        });
      }

      return { ...prev, pages: updatedPages };
    }, { type: 'extendCrossYear' });

    // CRITICAL: Track changes for persistence to database
    changeTracker.trackItemChange(item.id, 'modified', updatedCurrentItem);
    
    newItems.forEach(newItem => {
      const { isUpdate, ...itemData } = newItem;
      if (isUpdate) {
        changeTracker.trackItemChange(itemData.id, 'modified', itemData);
      } else {
        changeTracker.trackItemChange(itemData.id, 'added', itemData);
      }
    });

    if (broadcastOperation) {
      broadcastOperation('update', item.id, updatedCurrentItem);
      newItems.filter(i => !i.isUpdate).forEach(newItem => {
        const { isUpdate, ...itemData } = newItem;
        broadcastOperation('create', newItem.id, itemData);
      });
    }

    showToast(t('crossYear.extendedToast', { date: formatDateOnly(overflowDate) }), 'success');
  }, [wheelId, setWheelState, broadcastOperation, showToast, showConfirmDialog, ensurePageForYear, structure, wheelState, latestValuesRef, changeTracker, t]);

  // Handle extending activity to PREVIOUS year(s) - OPTION B: Linked items across pages
  // Since items are PAGE-SCOPED, we create linked items on each year's page
  // Items are linked via crossYearGroupId for synchronized updates
  const handleExtendActivityToPreviousYear = useCallback(async ({ item, overflowStartDate, currentYearStart, newEndDate, newRingId }) => {
    if (!wheelId || !item || !overflowStartDate || !currentYearStart) {
      return;
    }

    const overflowDate = new Date(overflowStartDate);
    const currentYearStartDate = new Date(currentYearStart);
    // Use newEndDate if provided (for move operations), otherwise keep original
    const actualEndDate = newEndDate ? new Date(newEndDate) : new Date(item.endDate);
    // Use newRingId if provided (when item was dragged to a different ring)
    const actualRingId = newRingId || item.ringId;

    if (!(overflowDate instanceof Date) || Number.isNaN(overflowDate.getTime())) {
      return;
    }

    if (overflowDate >= currentYearStartDate) {
      return;
    }

    // Calculate segments for each year the item spans backward into
    const segments = [];
    // Use UTC year to avoid timezone issues (currentYearStart is in UTC)
    const currentYear = currentYearStartDate.getUTCFullYear();
    const prevYear = currentYear - 1;
    let segmentEnd = new Date(Date.UTC(prevYear, 11, 31, 23, 59, 59)); // Dec 31 of previous year (UTC)

    // Safety limit counter
    let safetyCounter = 0;
    const MAX_YEARS = 10;

    while (segmentEnd >= overflowDate) {
      safetyCounter++;
      if (safetyCounter > MAX_YEARS) {
        console.error('[handleExtendActivityToPreviousYear] Safety limit reached - too many years');
        showToast(t('crossYear.maxYearsError', { count: safetyCounter }), 'error');
        return;
      }
      
      const segmentYear = segmentEnd.getUTCFullYear();
      const segmentYearStart = new Date(Date.UTC(segmentYear, 0, 1));
      const segmentStart = overflowDate >= segmentYearStart ? overflowDate : segmentYearStart;

      segments.push({
        year: segmentYear,
        startDate: formatDateOnly(segmentStart),
        endDate: formatDateOnly(segmentEnd),
      });

      if (segmentStart <= overflowDate) break;
      segmentEnd = new Date(Date.UTC(segmentYear - 1, 11, 31, 23, 59, 59));
    }

    if (segments.length === 0) return;

    // Reverse segments so they go from earliest to latest year
    segments.reverse();

    const targetYear = segments[0].year;
    const yearsSpanned = currentYear - targetYear;

    const confirmed = await showConfirmDialog({
      title: t('crossYear.extendBackwardTitle'),
      message: yearsSpanned === 1
        ? t('crossYear.extendBackwardMessageSingle', { name: item.name, date: formatDateOnly(overflowDate), year: targetYear })
        : t('crossYear.extendBackwardMessageMultiple', { name: item.name, date: formatDateOnly(overflowDate), count: yearsSpanned }),
      confirmText: t('crossYear.extendConfirm'),
      cancelText: t('crossYear.extendCancel'),
      confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    });

    if (!confirmed) return;

    // Generate a cross-year group ID to link all segments
    const crossYearGroupId = item.crossYearGroupId || crypto.randomUUID();

    // First, update the current item with the group ID, new end date, new ringId, and clamp start to year start
    const updatedCurrentItem = {
      ...item,
      startDate: formatDateOnly(currentYearStartDate),
      endDate: formatDateOnly(actualEndDate), // Use new end date for move operations
      ringId: actualRingId, // Use new ringId if item was dragged to a different ring
      crossYearGroupId,
    };

    const generateItemId = () => crypto.randomUUID();

    // Create linked items for each segment (previous years)
    const newItems = [];

    for (const segment of segments) {
      // Ensure page exists for this year
      const currentStructure = {
        rings: structure.rings || [],
        activityGroups: structure.activityGroups || [],
        labels: structure.labels || [],
        items: [],
      };

      const ensured = await ensurePageForYear(segment.year, {
        templateWheelStructure: currentStructure,
      });

      if (!ensured?.page) continue;

      const targetPageId = ensured.page.id;

      // Check if a linked item already exists on this page
      const latestPages = latestValuesRef.current?.pages || wheelState?.pages || [];
      const targetPage = latestPages.find(p => p.id === targetPageId);
      const existingLinked = (targetPage?.items || []).find(
        i => i.crossYearGroupId === crossYearGroupId && i.id !== item.id
      );

      if (existingLinked) {
        // Update existing linked item
        newItems.push({
          ...existingLinked,
          startDate: segment.startDate,
          endDate: segment.endDate,
          ringId: actualRingId, // Sync ringId across all linked items
          isUpdate: true,
        });
      } else {
        // Create new linked item
        newItems.push({
          id: generateItemId(),
          ringId: actualRingId, // Use the new ringId for all linked items
          activityId: item.activityId,
          labelId: item.labelId || null,
          name: item.name,
          startDate: segment.startDate,
          endDate: segment.endDate,
          time: item.time || null,
          description: item.description || null,
          pageId: targetPageId,
          linkedWheelId: item.linkedWheelId || null,
          linkType: item.linkType || null,
          crossYearGroupId,
          isUpdate: false,
        });
      }
    }

    // Update wheelState with current item update and new linked items
    setWheelState((prev) => {
      let updatedPages = prev.pages.map((page) => {
        // Update current item on its page
        if (page.id === item.pageId) {
          return {
            ...page,
            items: (page.items || []).map((pageItem) =>
              pageItem.id === item.id ? updatedCurrentItem : pageItem
            ),
          };
        }
        return page;
      });

      // Add/update linked items on their respective pages
      for (const newItem of newItems) {
        updatedPages = updatedPages.map((page) => {
          if (page.id !== newItem.pageId) return page;

          const currentItems = page.items || [];
          if (newItem.isUpdate) {
            // Update existing linked item
            return {
              ...page,
              items: currentItems.map((i) =>
                i.id === newItem.id ? { ...newItem, isUpdate: undefined } : i
              ),
            };
          } else {
            // Add new linked item
            const { isUpdate, ...itemToAdd } = newItem;
            return {
              ...page,
              items: [...currentItems, itemToAdd],
            };
          }
        });
      }

      return { ...prev, pages: updatedPages };
    }, { type: 'extendCrossYear' });

    // CRITICAL: Track changes for persistence to database
    changeTracker.trackItemChange(item.id, 'modified', updatedCurrentItem);
    
    newItems.forEach(newItem => {
      const { isUpdate, ...itemData } = newItem;
      if (isUpdate) {
        changeTracker.trackItemChange(itemData.id, 'modified', itemData);
      } else {
        changeTracker.trackItemChange(itemData.id, 'added', itemData);
      }
    });

    if (broadcastOperation) {
      broadcastOperation('update', item.id, updatedCurrentItem);
      newItems.filter(i => !i.isUpdate).forEach(newItem => {
        const { isUpdate, ...itemData } = newItem;
        broadcastOperation('create', newItem.id, itemData);
      });
    }

    showToast(t('crossYear.startsFromToast', { date: formatDateOnly(overflowDate) }), 'success');
  }, [wheelId, setWheelState, broadcastOperation, showToast, showConfirmDialog, ensurePageForYear, structure, wheelState, latestValuesRef, changeTracker, t]);

  // Handle updating all items in a cross-year group when one is resized
  const handleUpdateCrossYearGroup = useCallback(({ groupId, itemId, newStartDate, newEndDate, ringId }) => {
    // Calculate segments for each year the activity spans
    const startDate = new Date(newStartDate);
    const endDate = new Date(newEndDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    // Validate year range
    if (startYear < 1900 || startYear > 2200 || endYear < 1900 || endYear > 2200) {
      console.error('[handleUpdateCrossYearGroup] Year out of reasonable range:', startYear, endYear);
      return;
    }
    
    // Safety limit: max 10 years span
    const yearsSpanned = endYear - startYear;
    if (yearsSpanned > 10) {
      console.error('[handleUpdateCrossYearGroup] Year span too large:', yearsSpanned);
      showToast(t('crossYear.maxYearsError', { count: yearsSpanned }), 'error');
      return;
    }
    
    const segments = [];
    for (let year = startYear; year <= endYear; year++) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      
      const segmentStart = year === startYear ? startDate : yearStart;
      const segmentEnd = year === endYear ? endDate : yearEnd;
      
      segments.push({
        year,
        startDate: formatDateOnly(segmentStart),
        endDate: formatDateOnly(segmentEnd),
      });
    }
    
    // Get current pages to pre-calculate changes BEFORE setWheelState
    const currentPages = latestValuesRef.current?.pages || wheelState?.pages || [];
    
    // Pre-calculate all changes synchronously
    const trackedChanges = { modified: [], added: [], deleted: [] };
    
    currentPages.forEach(page => {
      const currentItems = page.items || [];
      const linkedItems = currentItems.filter(i => i.crossYearGroupId === groupId);
      const pageYear = parseInt(page.year);
      const segment = segments.find(s => s.year === pageYear);
      
      if (linkedItems.length > 0) {
        if (!segment) {
          // Items will be deleted
          linkedItems.forEach(item => trackedChanges.deleted.push(item));
        } else {
          // Items will be modified
          linkedItems.forEach(item => {
            trackedChanges.modified.push({
              ...item,
              startDate: segment.startDate,
              endDate: segment.endDate,
              ringId: ringId !== undefined ? ringId : item.ringId,
            });
          });
        }
      }
    });
    
    // Check for new items needed
    for (const segment of segments) {
      const pageForYear = currentPages.find(p => parseInt(p.year) === segment.year);
      if (pageForYear) {
        const hasLinkedItem = (pageForYear.items || []).some(i => i.crossYearGroupId === groupId);
        if (!hasLinkedItem) {
          const templateItem = currentPages
            .flatMap(p => p.items || [])
            .find(i => i.crossYearGroupId === groupId);
          
          if (templateItem) {
            const newItem = {
              ...templateItem,
              id: crypto.randomUUID(),
              pageId: pageForYear.id,
              startDate: segment.startDate,
              endDate: segment.endDate,
              ringId: ringId !== undefined ? ringId : templateItem.ringId,
            };
            trackedChanges.added.push(newItem);
          }
        }
      }
    }
    
    // Track changes BEFORE state update (synchronously)
    trackedChanges.modified.forEach(item => {
      changeTracker.trackItemChange(item.id, 'modified', item);
    });
    trackedChanges.added.forEach(item => {
      changeTracker.trackItemChange(item.id, 'added', item);
    });
    trackedChanges.deleted.forEach(item => {
      changeTracker.trackItemChange(item.id, 'deleted', item);
    });
    
    // Now update state
    setWheelState((prev) => {
      let updatedPages = prev.pages.map((page) => {
        const currentItems = page.items || [];
        const linkedItems = currentItems.filter(i => i.crossYearGroupId === groupId);
        
        if (linkedItems.length === 0) return page;
        
        const pageYear = parseInt(page.year);
        const segment = segments.find(s => s.year === pageYear);
        
        if (!segment) {
          // Remove items from this year
          return {
            ...page,
            items: currentItems.filter(i => i.crossYearGroupId !== groupId),
          };
        }
        
        // Update items
        return {
          ...page,
          items: currentItems.map((item) => {
            if (item.crossYearGroupId !== groupId) return item;
            return {
              ...item,
              startDate: segment.startDate,
              endDate: segment.endDate,
              ringId: ringId !== undefined ? ringId : item.ringId,
            };
          }),
        };
      });
      
      // Add new items
      for (const newItem of trackedChanges.added) {
        updatedPages = updatedPages.map(p => {
          if (p.id !== newItem.pageId) return p;
          return {
            ...p,
            items: [...(p.items || []), newItem],
          };
        });
      }
      
      return { ...prev, pages: updatedPages };
    }, { type: 'updateCrossYearGroup' });
    
    // End drag mode and batch
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const hasActualChanges = trackedChanges.modified.length > 0 || 
                               trackedChanges.added.length > 0 || 
                               trackedChanges.deleted.length > 0;
      if (hasActualChanges) {
        endBatch();
      } else {
        cancelBatch();
      }
    }
    
  }, [setWheelState, changeTracker, wheelState, latestValuesRef, endBatch, cancelBatch, showToast, t]);

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
    if (!updatedItem?.id || !updatedItem?.pageId) {
      console.warn('[handleUpdateAktivitet] Missing id or pageId', updatedItem);
      return;
    }

    // CRITICAL FIX: Detect when item dates no longer match pageId's year
    // This can happen when dependency cascades push dates into a different year
    const itemPage = pages.find(p => p.id === updatedItem.pageId);
    if (itemPage && updatedItem.startDate) {
      const itemStartYear = new Date(updatedItem.startDate).getFullYear();
      const itemEndYear = updatedItem.endDate ? new Date(updatedItem.endDate).getFullYear() : itemStartYear;
      const pageYear = itemPage.year;
      
      // Check if item's dates fall completely outside its current page's year
      const fallsOutsidePageYear = itemEndYear < pageYear || itemStartYear > pageYear;
      
      if (fallsOutsidePageYear) {
        // Find correct page for the item based on start date
        const correctPage = pages.find(p => p.year === itemStartYear);
        
        if (correctPage && correctPage.id !== updatedItem.pageId) {
          console.log(`[handleUpdateAktivitet] Item "${updatedItem.name}" dates (${itemStartYear}) mismatch page year (${pageYear}). Moving to correct page.`);
          
          // Move item to correct page
          setWheelState((prev) => ({
            ...prev,
            pages: prev.pages.map(page => {
              // Remove from old page
              if (page.id === updatedItem.pageId) {
                return {
                  ...page,
                  items: (page.items || []).filter(item => item.id !== updatedItem.id)
                };
              }
              // Add to new page with updated pageId
              if (page.id === correctPage.id) {
                return {
                  ...page,
                  items: [...(page.items || []), { ...updatedItem, pageId: correctPage.id }]
                };
              }
              return page;
            })
          }), { type: 'moveItemBetweenPages' });
          
          // Track the change for save
          changeTracker.trackItemChange(updatedItem.id, 'modified', { ...updatedItem, pageId: correctPage.id });
          return;
        } else if (!correctPage) {
          console.warn(`[handleUpdateAktivitet] No page exists for year ${itemStartYear}. Item "${updatedItem.name}" may become orphaned.`);
          // TODO: Consider auto-creating the page or clamping dates back to page year
        }
      }
    }

    // Handle cross-year edits - delegate to handleUpdateCrossYearGroup
    if (updatedItem._isCrossYearEdit) {
      const { _isCrossYearEdit, ...cleanItem } = updatedItem;
      
      // If item already has crossYearGroupId, update the whole group
      if (cleanItem.crossYearGroupId) {
        handleUpdateCrossYearGroup({
          groupId: cleanItem.crossYearGroupId,
          itemId: cleanItem.id,
          newStartDate: cleanItem.startDate,
          newEndDate: cleanItem.endDate,
          ringId: cleanItem.ringId
        });
        // Also update the non-date fields
        setWheelState((prev) => ({
          ...prev,
          pages: prev.pages.map(page => ({
            ...page,
            items: (page.items || []).map(item => 
              item.crossYearGroupId === cleanItem.crossYearGroupId
                ? { ...item, name: cleanItem.name, activityId: cleanItem.activityId, labelId: cleanItem.labelId, description: cleanItem.description }
                : item
            )
          }))
        }), { type: 'updateCrossYearItem' });
        return;
      } else {
        // New cross-year item - ask user if they want to create linked items
        // For now, just update the single item (clamp to current year)
        // TODO: Show dialog asking if user wants to create multi-year item
        console.warn('[handleUpdateAktivitet] Cross-year edit detected but item has no crossYearGroupId - clamping to current year');
      }
    }

    const wasDragging = isDraggingRef.current;
    
    // Use ref to capture result from inside setWheelState callback
    const changeResultRef = { actuallyChanged: false, itemFound: false, updatedItem: null };

    // CRITICAL: Update optimistic state immediately (before save)
    setWheelState((prev) => {
      const nextPages = prev.pages.map((page) => {
        if (page.id !== updatedItem.pageId) return page;

        const currentItems = Array.isArray(page.items) ? page.items : [];
        const oldItem = currentItems.find((item) => item.id === updatedItem.id);

        if (!oldItem) {
          console.warn('[handleUpdateAktivitet] Item not found on page', updatedItem.id, 'page:', page.id);
          return page;
        }

        changeResultRef.itemFound = true;

        // Check what changed
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
        const dependencyChanged =
          (oldItem.dependsOn || null) !== (updatedItem.dependsOn || null) ||
          (oldItem.dependencyType || 'finish_to_start') !== (updatedItem.dependencyType || 'finish_to_start') ||
          (oldItem.lagDays || 0) !== (updatedItem.lagDays || 0);

        // CRITICAL: Assign to ref so it's available after setWheelState completes
        changeResultRef.actuallyChanged =
          ringChanged || datesChanged || activityChanged || labelChanged ||
          nameChanged || timeChanged || descriptionChanged || linkChanged || dependencyChanged;
        changeResultRef.updatedItem = updatedItem;

        if (!changeResultRef.actuallyChanged) return page;

        // Update item in page items (optimistic update)
        const nextItems = currentItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        );

        return {
          ...page,
          items: nextItems
        };
      });

      if (!changeResultRef.itemFound) {
        changeResultRef.actuallyChanged = false;
        console.warn('[handleUpdateAktivitet] Item not found in any page!', updatedItem.id);
      }

      // CRITICAL: Preserve all wheelState properties, only update pages
      return { 
        ...prev, 
        pages: nextPages 
      };
    }, wasDragging ? { type: 'dragItem', params: { itemId: updatedItem.id } } : { type: 'updateItem' });

    // Handle drag mode cleanup (use ref values)
    if (wasDragging) {
      isDraggingRef.current = false;
      if (changeResultRef.actuallyChanged) {
        const newHistoryIndex = endBatch();
        if (newHistoryIndex !== null) {
          // DON'T mark as saved yet - wait for save queue to complete
          // markSaved(newHistoryIndex);
        }
      } else {
        cancelBatch();
      }
    }

    // Track change for delta save
    if (changeResultRef.actuallyChanged && changeResultRef.updatedItem) {
      // Track item modification with the updated item
      changeTracker.trackItemChange(changeResultRef.updatedItem.id, 'modified', changeResultRef.updatedItem);
      
      // CROSS-YEAR SYNC: Propagate non-date changes to linked items
      // (Date changes are handled separately to maintain each segment's year bounds)
      const crossYearGroupId = changeResultRef.updatedItem.crossYearGroupId;
      if (crossYearGroupId) {
        const syncableFields = ['name', 'ringId', 'activityId', 'labelId', 'time', 'description', 'linkedWheelId', 'linkType'];
        
        setWheelState((prev) => {
          let hasLinkedUpdates = false;
          const nextPages = prev.pages.map((page) => {
            const currentItems = page.items || [];
            const linkedItems = currentItems.filter(
              i => i.crossYearGroupId === crossYearGroupId && i.id !== changeResultRef.updatedItem.id
            );
            
            if (linkedItems.length === 0) return page;
            
            hasLinkedUpdates = true;
            return {
              ...page,
              items: currentItems.map((item) => {
                if (item.crossYearGroupId !== crossYearGroupId || item.id === changeResultRef.updatedItem.id) {
                  return item;
                }
                // Sync non-date fields
                const updates = {};
                syncableFields.forEach(field => {
                  if (changeResultRef.updatedItem[field] !== undefined) {
                    updates[field] = changeResultRef.updatedItem[field];
                  }
                });
                return { ...item, ...updates };
              }),
            };
          });
          
          if (!hasLinkedUpdates) return prev;
          return { ...prev, pages: nextPages };
        }, { type: 'syncLinkedItems' });
      }
      
      if (wasDragging) {
        // Auto-save after drag end (immediate, not debounced)
        if (handleSaveRef.current) {
          handleSaveRef.current({ silent: true, reason: 'drag-end' });
        }
      } else {
        // Auto-save after regular update (debounced)
        if (triggerAutoSaveRef.current) {
          triggerAutoSaveRef.current();
        }
      }
    }
  }, [setWheelState, endBatch, cancelBatch, changeTracker, pages]);

  const handleAddItems = useCallback(async (newItems) => {
    if (!currentPageId) return;
    
    const itemsToAdd = Array.isArray(newItems) ? newItems : [newItems];
    
    // Check for cross-year items and create linked segments if needed
    const processedItems = [];
    const linkedItemsForOtherPages = [];
    
    // Helper to parse date string safely (avoids timezone issues)
    const parseDateString = (dateStr) => {
      if (!dateStr) return null;
      // Parse YYYY-MM-DD format directly to avoid timezone shifts
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return new Date(dateStr);
    };
    
    for (const item of itemsToAdd) {
      const startDate = parseDateString(item.startDate);
      const endDate = parseDateString(item.endDate);
      
      // Validate dates
      if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('[handleAddItems] Invalid dates:', item.startDate, item.endDate);
        processedItems.push(item); // Add as-is, let validation catch it later
        continue;
      }
      
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      // Validate year range is reasonable (between 1900 and 2200)
      if (startYear < 1900 || startYear > 2200 || endYear < 1900 || endYear > 2200) {
        console.error('[handleAddItems] Year out of reasonable range:', startYear, endYear);
        processedItems.push(item); // Add as-is
        continue;
      }
      
      if (startYear !== endYear) {
        // Cross-year item detected - ask user if they want to create linked items
        const yearsSpanned = endYear - startYear;
        
        // Safety limit: max 10 years span to prevent runaway page creation
        if (yearsSpanned > 10) {
          console.error('[handleAddItems] Year span too large:', yearsSpanned, 'years');
          showToast(t('crossYear.maxYearsError', { count: yearsSpanned }), 'error');
          continue;
        }
        
        const confirmed = await showConfirmDialog({
          title: t('crossYear.createTitle'),
          message: yearsSpanned === 1
            ? t('crossYear.createMessageSingle', { name: item.name, startYear, endYear })
            : t('crossYear.createMessageMultiple', { name: item.name, count: yearsSpanned + 1, startYear, endYear }),
          confirmText: t('crossYear.createConfirm'),
          cancelText: t('crossYear.extendCancel'),
          confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
        });
        
        if (confirmed) {
          // Generate cross-year group ID
          const crossYearGroupId = crypto.randomUUID();
          
          // Calculate segments for each year
          for (let year = startYear; year <= endYear; year++) {
            const yearStart = new Date(Date.UTC(year, 0, 1));
            const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
            
            const segmentStart = startDate > yearStart ? startDate : yearStart;
            const segmentEnd = endDate < yearEnd ? endDate : yearEnd;
            
            // Ensure page exists for this year
            const currentStructure = {
              rings: structure.rings || [],
              activityGroups: structure.activityGroups || [],
              labels: structure.labels || [],
              items: [],
            };
            
            const ensured = await ensurePageForYear(year, {
              templateWheelStructure: currentStructure,
            });
            
            if (!ensured?.page) continue;
            
            const targetPageId = ensured.page.id;
            
            const segmentItem = {
              id: crypto.randomUUID(),
              pageId: targetPageId,
              ringId: item.ringId,
              activityId: item.activityId,
              labelId: item.labelId || null,
              name: item.name,
              startDate: formatDateOnly(segmentStart),
              endDate: formatDateOnly(segmentEnd),
              time: item.time || null,
              description: item.description || null,
              linkedWheelId: item.linkedWheelId || null,
              linkType: item.linkType || null,
              crossYearGroupId,
            };
            
            if (targetPageId === currentPageId) {
              processedItems.push(segmentItem);
            } else {
              linkedItemsForOtherPages.push(segmentItem);
            }
          }
        } else {
          // User chose to keep only current year - clamp dates to current year
          const currentPage = wheelState?.pages?.find(p => p.id === currentPageId);
          const currentYear = currentPage?.year || new Date().getFullYear();
          const yearStart = new Date(Date.UTC(currentYear, 0, 1));
          const yearEnd = new Date(Date.UTC(currentYear, 11, 31));
          
          const clampedStart = startDate < yearStart ? yearStart : startDate;
          const clampedEnd = endDate > yearEnd ? yearEnd : endDate;
          
          processedItems.push({
            ...item,
            pageId: item.pageId || currentPageId,
            startDate: formatDateOnly(clampedStart),
            endDate: formatDateOnly(clampedEnd),
          });
        }
      } else {
        // Single year item - ensure pageId is set
        processedItems.push({
          ...item,
          pageId: item.pageId || currentPageId
        });
      }
    }
    
    // Add all items to their respective pages
    const allItemsToAdd = [...processedItems, ...linkedItemsForOtherPages];
    
    if (allItemsToAdd.length === 0) return;

    // Update wheelState.pages directly (source of truth)
    setWheelState((prev) => ({
      ...prev,
      pages: prev.pages.map((page) => {
        const itemsForThisPage = allItemsToAdd.filter(item => item.pageId === page.id);
        if (itemsForThisPage.length === 0) return page;

        const currentItems = Array.isArray(page.items) ? page.items : [];

        return {
          ...page,
          items: [...currentItems, ...itemsForThisPage],
        };
      })
    }), { type: 'addItem' });

    // Track changes for delta save
    allItemsToAdd.forEach(item => {
      changeTracker.trackItemChange(item.id, 'added', item);
    });
    
    // Show success message for cross-year items
    if (linkedItemsForOtherPages.length > 0) {
      const yearsCreated = new Set(allItemsToAdd.map(i => {
        const page = wheelState?.pages?.find(p => p.id === i.pageId);
        return page?.year;
      })).size;
      showToast(t('crossYear.createdToast', { count: yearsCreated }), 'success');
    }
    
    // Trigger auto-save after adding items
    if (triggerAutoSaveRef.current) {
      triggerAutoSaveRef.current();
    }
  }, [currentPageId, wheelId, setWheelState, changeTracker, showConfirmDialog, ensurePageForYear, structure, wheelState, showToast, t]);

  const handleDeleteAktivitet = useCallback(async (itemId) => {
    if (!itemId || !currentPageId) return;

    let itemName = '';
    let deletedItem = null;
    
    // Find the item first to check for cross-year links
    const currentPage = wheelState?.pages?.find(p => p.id === currentPageId);
    const itemToDelete = currentPage?.items?.find(i => i.id === itemId);
    
    // If item has cross-year links, ask user what to do
    if (itemToDelete?.crossYearGroupId) {
      const allLinkedItems = (wheelState?.pages || []).flatMap(page => 
        (page.items || []).filter(i => i.crossYearGroupId === itemToDelete.crossYearGroupId)
      );
      
      if (allLinkedItems.length > 1) {
        const deleteAll = await showConfirmDialog({
          title: 'Radera länkade aktiviteter?',
          message: `Denna aktivitet är länkad över ${allLinkedItems.length} år. En flerårsaktivitet måste raderas i sin helhet.`,
          confirmText: 'Radera alla',
          cancelText: 'Avbryt',
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white'
        });
        
        if (deleteAll) {
          // Delete all linked items across all pages
          setWheelState((prev) => ({
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              items: (page.items || []).filter(
                (item) => item.crossYearGroupId !== itemToDelete.crossYearGroupId
              ),
            })),
          }), { type: 'deleteLinkedItems' });
          
          // Track all deletions
          allLinkedItems.forEach(item => {
            changeTracker.trackItemChange(item.id, 'deleted', item);
          });
          
          if (triggerAutoSaveRef.current) {
            triggerAutoSaveRef.current();
          }
          
          showToast(`${itemToDelete.name} och ${allLinkedItems.length - 1} länkade delar raderade`, 'success');
          return;
        }
        // User cancelled - don't delete anything
        return;
      }
    }

    // Delete just this item (non-linked item or last remaining linked item)
    setWheelState((prev) => ({
      ...prev,
      pages: prev.pages.map((page) => {
        if (page.id !== currentPageId) return page;

        const currentItems = Array.isArray(page.items) ? page.items : [];
        const foundItem = currentItems.find((item) => item.id === itemId);

        if (foundItem) {
          itemName = foundItem.name;
          deletedItem = foundItem;
        }

        return {
          ...page,
          items: currentItems.filter((item) => item.id !== itemId)
        };
      })
    }), { type: 'deleteItem' });

    // Track deletion for delta save
    if (deletedItem) {
      changeTracker.trackItemChange(itemId, 'deleted', deletedItem);
      
      // Trigger auto-save after deletion
      if (triggerAutoSaveRef.current) {
        triggerAutoSaveRef.current();
      }
    }

    showToast(itemName ? `${itemName} raderad` : 'Aktivitet raderad', 'success');
  }, [currentPageId, wheelId, setWheelState, showToast, changeTracker, wheelState, showConfirmDialog]);

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
          
          // Support both NEW format (v2.0 with metadata/structure/pages) and OLD format (flat)
          const isNewFormat = data.version === "2.0" && data.metadata;
          
          let normalizedData;
          if (isNewFormat) {
            // NEW FORMAT: Convert to flat structure for processing
            // Handle colors - new format has object, old format has array
            let normalizedColors;
            if (data.settings?.colors) {
              if (Array.isArray(data.settings.colors)) {
                normalizedColors = data.settings.colors;
              } else {
                // Convert object format to array (backwards compatibility)
                normalizedColors = ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"]; // Default palette
              }
            } else {
              normalizedColors = ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"]; // Default palette
            }
            
            normalizedData = {
              title: data.metadata.title,
              year: String(data.metadata.year),
              colors: normalizedColors,
              showWeekRing: data.settings?.showWeekRing ?? true,
              showMonthRing: data.settings?.showMonthRing ?? true,
              showRingNames: data.settings?.showRingNames ?? true,
              showLabels: data.settings?.showLabels ?? false,
              weekRingDisplayMode: data.settings?.weekRingDisplayMode || 'week-numbers',
              organizationData: {
                rings: data.structure?.rings || [],
                activityGroups: data.structure?.activityGroups || [],
                labels: data.structure?.labels || [],
                items: [] // Will be populated from pages
              },
              pages: data.pages || []
            };
            
            // Collect all items from all pages
            if (data.pages && data.pages.length > 0) {
              data.pages.forEach(page => {
                if (page.items && page.items.length > 0) {
                  normalizedData.organizationData.items.push(...page.items);
                }
              });
            }
          } else {
            // OLD FORMAT: Use as-is
            normalizedData = data;
          }
          
          // Validate the normalized data structure
          const hasOrgData = normalizedData.organizationData || normalizedData.wheelStructure;
          if (normalizedData.title === undefined || !normalizedData.year || (!normalizedData.ringsData && !hasOrgData)) {
            throw new Error('Invalid file format');
          }

          // console.log('[FileImport] Starting file import...');
          
          // CRITICAL: Mark as loading to prevent realtime from overwriting
          isLoadingData.current = true;
          isRealtimeUpdate.current = true;

          // Process organization data BEFORE setting state
          // Support both organizationData (new) and wheelStructure (old) naming
          let processedOrgData;
          const sourceOrgData = normalizedData.organizationData || normalizedData.wheelStructure;
          
          if (sourceOrgData) {
            processedOrgData = { ...sourceOrgData };
            
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
                title: normalizedData.title,
                year: parseInt(normalizedData.year),
                colors: normalizedData.colors || colors,
                showWeekRing: normalizedData.showWeekRing ?? showWeekRing,
                showMonthRing: normalizedData.showMonthRing ?? showMonthRing,
                showRingNames: normalizedData.showRingNames ?? showRingNames,
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
              const mainYear = parseInt(normalizedData.year);
              if (itemsWithoutDate.length > 0) {
                if (!itemsByYear[mainYear]) {
                  itemsByYear[mainYear] = [];
                }
                itemsByYear[mainYear].push(...itemsWithoutDate);
              }
              
              const years = Object.keys(itemsByYear).sort();
              
              const preparedPages = [];
              const itemsByPageId = {};

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

                const nextStructure = {
                  rings: [...processedOrgData.rings],
                  activityGroups: [...processedOrgData.activityGroups],
                  labels: [...processedOrgData.labels],
                };
                // CRITICAL: Set pageId on each item to the target page's ID
                const pageItems = (itemsByYear[yearStr] || []).map(item => ({
                  ...item,
                  pageId: targetPage.id
                }));

                itemsByPageId[targetPage.id] = pageItems;

                preparedPages.push({
                  ...targetPage,
                  structure: nextStructure,
                  items: pageItems,
                });
              }

              if (preparedPages.length === 0) {
                throw new Error('Kunde inte skapa sidor för importerat innehåll.');
              }
              const sortedPreparedPages = [...preparedPages].sort((a, b) => a.year - b.year);

              const fileYear = Number.parseInt(normalizedData.year, 10);
              const pageForFileYear = sortedPreparedPages.find((page) => page.year === fileYear) || sortedPreparedPages[0];

              if (pageForFileYear) {
                // Update wheelState with imported data
                setWheelState((prev) => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    title: normalizedData.title,
                    year: String(pageForFileYear.year || fileYear),
                    colors: normalizedData.colors || prev.metadata.colors,
                    showWeekRing: normalizedData.showWeekRing ?? prev.metadata.showWeekRing,
                    showMonthRing: normalizedData.showMonthRing ?? prev.metadata.showMonthRing,
                    showRingNames: normalizedData.showRingNames ?? prev.metadata.showRingNames,
                    showLabels: normalizedData.showLabels ?? prev.metadata.showLabels,
                    weekRingDisplayMode: normalizedData.weekRingDisplayMode ?? prev.metadata.weekRingDisplayMode
                  },
                  structure: {
                    rings: [...processedOrgData.rings],
                    activityGroups: [...processedOrgData.activityGroups],
                    labels: [...processedOrgData.labels]
                  },
                  pages: sortedPreparedPages.map(page => ({
                    id: page.id,
                    year: page.year,
                    pageOrder: page.pageOrder,
                    title: page.title,
                    items: itemsByPageId[page.id] || []
                  })),
                  currentPageId: pageForFileYear.id
                }));

                // Update latestValuesRef for save operations
                latestValuesRef.current = {
                  ...latestValuesRef.current,
                  title: normalizedData.title,
                  colors: normalizedData.colors || colors,
                  showWeekRing: normalizedData.showWeekRing ?? showWeekRing,
                  showMonthRing: normalizedData.showMonthRing ?? showMonthRing,
                  showRingNames: normalizedData.showRingNames ?? showRingNames,
                  showLabels: normalizedData.showLabels ?? showLabels,
                  weekRingDisplayMode: normalizedData.weekRingDisplayMode ?? weekRingDisplayMode,
                  currentPageId: pageForFileYear.id,
                  structure: {
                    rings: [...processedOrgData.rings],
                    activityGroups: [...processedOrgData.activityGroups],
                    labels: [...processedOrgData.labels],
                  },
                  pages: sortedPreparedPages.map(page => ({
                    ...page,
                    items: itemsByPageId[page.id] || []
                  })),
                  year: String(pageForFileYear.year || fileYear),
                };
              }

              await enqueueFullSave('import-file');

              showToast(`Fil laddad! ${sortedPreparedPages.length} år importerade`, 'success');
            } catch (saveError) {
              saveFailed = true;
              showToast('toast:file.saveError', 'error');
              // Continue to update state even if save failed (user can see data, try to save manually)
            }
          }

          // Update state AFTER save attempt (always update so user can see the data)
          // Use setWheelState to update the wheel state (not setUndoableStates)
          if (!wheelId) {
            // localStorage mode - update state directly
            const fileUpdates = {
              metadata: {
                ...wheelState.metadata,
                title: normalizedData.title,
                year: normalizedData.year,
                colors: normalizedData.colors,
                showWeekRing: normalizedData.showWeekRing,
                showMonthRing: normalizedData.showMonthRing,
                showRingNames: normalizedData.showRingNames,
                showLabels: normalizedData.showLabels,
                weekRingDisplayMode: normalizedData.weekRingDisplayMode
              },
              structure: {
                rings: [...processedOrgData.rings],
                activityGroups: [...processedOrgData.activityGroups],
                labels: [...processedOrgData.labels],
              }
            };
            setWheelState(fileUpdates);
          }
          
          // Clear undo history after file import (new data context)
          clearHistory();
          
          // Set ringsData for backward compatibility with old format
          if (normalizedData.ringsData) setRingsData(normalizedData.ringsData);
          
          if (normalizedData.showYearEvents !== undefined) setShowYearEvents(normalizedData.showYearEvents);
          if (normalizedData.showSeasonRing !== undefined) setShowSeasonRing(normalizedData.showSeasonRing);

          if (!wheelId) {
            // localStorage mode - show success after state update
            showToast('toast:file.loadSuccess', 'success');
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
          
          showToast('toast:file.loadError', 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // Combined handler for palette changes - updates BOTH colors AND wheelStructure in ONE state update
  const handlePaletteChange = useCallback(async (newColors, newWheelStructure) => {
    // Update BOTH colors and structure in a SINGLE setWheelState call
    setWheelState((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        colors: newColors
      },
      structure: {
        ...newWheelStructure,
        items: newWheelStructure.items // Preserve items if any
      }
    }), { type: 'paletteChange' });
    
    // CRITICAL: Update refs IMMEDIATELY before save so handleSave reads the new data
    // Normally refs update on next render, but we need them NOW for immediate save
    latestValuesRef.current = {
      ...latestValuesRef.current,
      colors: newColors,
      wheelStructure: newWheelStructure
    };
    
    // Update timestamp to ignore realtime events
    lastSaveTimestamp.current = Date.now();
    
    // CRITICAL: Palette changes update activity group colors, which need to be saved to database
    // Auto-save only handles wheel metadata, so we need to explicitly call handleSave here
    await handleSave();
  }, [setWheelState, handleSave]);

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
    // CRITICAL: Check actual tracker state to avoid false positives
    // Also check if save is in progress - if saving, don't block navigation
    const actuallyHasChanges = changeTracker.hasChanges();
    const currentlySaving = isSavingRef.current;
    
    if (actuallyHasChanges && !currentlySaving) {
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
  }, [onBackToDashboard, t, changeTracker]);

  // Calculate actual unsaved changes count from changeTracker (not undo/redo)
  // MUST be called before any conditional returns to follow Rules of Hooks
  const actualUnsavedCount = useMemo(() => {
    const summary = changeTracker.getChangesSummary();
    return (
      summary.items.added + summary.items.modified + summary.items.deleted +
      summary.rings.added + summary.rings.modified + summary.rings.deleted +
      summary.activityGroups.added + summary.activityGroups.modified + summary.activityGroups.deleted +
      summary.labels.added + summary.labels.modified + summary.labels.deleted +
      summary.pages.modified
    );
  }, [changeTracker.version]); // Recalculate when changeTracker version changes (cleared or updated)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">{t('common:loading')}</div>
      </div>
    );
  }

  // Render mobile-optimized editor for mobile/tablet devices
  if (isMobileView) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-gray-600">{t('common:loading')}</div>
        </div>
      }>
        <MobileEditor
          wheelId={wheelId}
          wheelData={wheelData}
          wheelState={wheelState}
          setWheelState={setWheelState}
          wheelStructure={wheelStructure}
          setWheelStructure={setWheelStructure}
          title={title}
          setTitle={setTitle}
          year={year}
          colors={colors}
          setColors={setColors}
          pages={pages}
          currentPageId={currentPageId}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onAddPage={handleAddPage}
          showRingNames={showRingNames}
          setShowRingNames={setShowRingNames}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          showWeekRing={showWeekRing}
          setShowWeekRing={setShowWeekRing}
          showMonthRing={showMonthRing}
          setShowMonthRing={setShowMonthRing}
          weekRingDisplayMode={weekRingDisplayMode}
          setWeekRingDisplayMode={setWeekRingDisplayMode}
          onAddItems={handleAddItems}
          onUpdateItem={handleUpdateAktivitet}
          onDeleteItem={handleDeleteAktivitet}
          onSave={handleSave}
          isSaving={isSaving}
          hasUnsavedChanges={actualUnsavedCount > 0}
          onBackToDashboard={onBackToDashboard}
          isPremium={isPremium}
          allItems={allItems}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        onSave={handleSave}
        onSaveWithVersion={handleSaveWithVersion}
        isSaving={isSaving}
        onBackToDashboard={wheelId ? handleBackToDashboard : null}
        onSaveToFile={handleSaveToFile}
        onLoadFromFile={handleLoadFromFile}
        onExportData={() => setShowExportModal(true)}
        onSmartImport={() => setShowSmartImport(true)}
        onReset={handleReset}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        year={year}
        onYearChange={setYear}
        onDownloadImage={(toClipboard = false) => yearWheelRef && yearWheelRef.downloadImage(downloadFormat, toClipboard)}
        onDownloadPDFReport={() => setShowReportModal(true)}
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
        unsavedChangesCount={actualUnsavedCount}
        isPremium={isPremium}
        // View mode toggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
            showToast(t('subscription:upgradePrompt.aiAssistant'), 'info');
            return;
          }
          setIsAIOpen(!isAIOpen);
        } : null}
        // Onboarding
        onStartOnboarding={() => setShowOnboarding(true)}
        onStartAIOnboarding={() => {
          if (!isPremium) {
            // Show upgrade prompt for non-premium users
            showToast(t('subscription:upgradePrompt.aiAssistant'), 'info');
            return;
          }
          // Ensure AI window is open before starting guide
          if (!isAIOpen) setIsAIOpen(true);
          // Small delay to let AI window render
          setTimeout(() => setShowAIOnboarding(true), 300);
        }}
        // Wheel comments props
        wheelData={wheelData}
        wheelStructure={wheelStructure}
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
          <SidePanel
            wheelStructure={wheelStructure}
            onOrganizationChange={setWheelStructure}
            title={title}
            onTitleChange={setTitle}
            colors={colors}
            onColorsChange={handleColorsChange}
            onPaletteChange={handlePaletteChange}
            year={currentPage?.year || year}
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
            currentPageId={currentPageId}
            broadcastActivity={broadcastActivity}
            activeEditors={combinedActiveEditors}
            broadcastOperation={broadcastOperation}
            onAddItems={handleAddItems}
            onUpdateItem={handleUpdateAktivitet}
            onDeleteItem={handleDeleteAktivitet}
            onPersistItems={handlePersistNewItems}
            onPersistItem={handlePersistItemUpdate}
            onPersistItemDelete={handlePersistItemRemove}
          />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
          {viewMode === 'wheel' ? (
            <div className="w-full h-full flex items-center justify-center">
              <YearWheel
                key={currentPageId} // Force remount when page changes to clear cached data
                wheelId={wheelId}
                wheelData={wheelData}
                title={wheelState.metadata.title}
                year={wheelState.metadata.year}
                colors={wheelState.metadata.colors}
                ringsData={ringsData}
                wheelStructure={wheelStructure}
                allItemsAcrossPages={allItems}
                completeWheelSnapshot={completeWheelSnapshot}
                showYearEvents={showYearEvents}
                showSeasonRing={showSeasonRing}
                yearEventsCollection={yearEventsCollection}
                showWeekRing={wheelState.metadata.showWeekRing}
                showMonthRing={wheelState.metadata.showMonthRing}
                showRingNames={wheelState.metadata.showRingNames}
                showLabels={wheelState.metadata.showLabels}
                weekRingDisplayMode={wheelState.metadata.weekRingDisplayMode}
                zoomedMonth={zoomedMonth}
                zoomedQuarter={zoomedQuarter}
                onSetZoomedMonth={setZoomedMonth}
                onSetZoomedQuarter={setZoomedQuarter}
                initialRotation={wheelRotation}
                onRotationChange={setWheelRotation}
                onWheelReady={setYearWheelRef}
                onDragStart={handleDragStart}
                onUpdateAktivitet={handleUpdateAktivitet}
                onDeleteAktivitet={handleDeleteAktivitet}
                onExtendActivityBeyondYear={handleExtendActivityBeyondYear}
                onExtendActivityToPreviousYear={handleExtendActivityToPreviousYear}
                onUpdateCrossYearGroup={handleUpdateCrossYearGroup}
                broadcastActivity={broadcastActivity}
                activeEditors={combinedActiveEditors}
                broadcastOperation={broadcastOperation}
              />
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="w-full h-full">
              <WheelCalendarView
                key={`calendar-${Date.now()}`}
                wheelStructure={calendarWheelStructure}
                year={wheelState.metadata.year}
                onUpdateItem={handleUpdateAktivitet}
                onDeleteItem={handleDeleteAktivitet}
                onNavigateToItemOnWheel={handleNavigateToItemOnWheel}
              />
            </div>
          ) : (
            <div className="w-full h-full">
              <ListView
                key={`list-${Date.now()}`}
                wheelStructure={calendarWheelStructure}
                year={wheelState.metadata.year}
                pages={wheelState.pages || []}
                onUpdateItem={handleUpdateAktivitet}
                onDeleteItem={handleDeleteAktivitet}
                onAddItems={handleAddItems}
                onOrganizationChange={setWheelStructure}
                onNavigateToItemOnWheel={handleNavigateToItemOnWheel}
                currentWheelId={wheelId}
                currentPageId={currentPageId}
              />
            </div>
          )}
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
            currentPage={wheelState.pages.find(p => p.id === currentPageId)}
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
            wheelStructure={wheelStructure}
            pages={pages}
            year={year}
            title={title}
            onClose={() => setShowExportModal(false)}
            isPremium={isPremium}
          />
        </Suspense>
      )}

      {/* PDF Report Selection Modal */}
      {showReportModal && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <ReportSelectionModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            isPremium={isPremium}
            onGenerate={async (reportType, options) => {
              if (!yearWheelRef) return;
              
              await yearWheelRef.exportManager.generateReport(reportType, {
                ...options,
                wheelStructure,
                title,
                year,
                translations: { t, language: i18n.language }
              });
            }}
          />
        </Suspense>
      )}

      {/* Smart CSV Import Modal */}
      {showSmartImport && wheelId && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <SmartImportModal
            isOpen={showSmartImport}
            onClose={() => setShowSmartImport(false)}
            wheelId={wheelId}
            currentPageId={currentPageId}
            onImportComplete={async (result) => {
              try {
                // The batch-import Edge Function has already saved everything to the database
                // We just need to reload the wheel data and handle team invitations
                
                setIsSaving(true);
                console.log('[SmartImport] Import complete, reloading wheel data...');
                console.log('[SmartImport] Change tracker state BEFORE reload:', changeTracker.getChangesSummary());
                
                // CRITICAL: Clear change tracker BEFORE reload to prevent false positives
                changeTracker.clearChanges();
                hasUnsavedChangesRef.current = false;
                
                // Handle team invitations if any
                if (result.inviteEmails && result.inviteEmails.length > 0) {
                  const { data: wheel } = await supabase
                    .from('year_wheels')
                    .select('team_id')
                    .eq('id', wheelId)
                    .single();

                  if (wheel?.team_id) {
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    for (const email of result.inviteEmails) {
                      try {
                        await supabase
                          .from('team_invitations')
                          .insert({
                            team_id: wheel.team_id,
                            email: email.toLowerCase().trim(),
                            invited_by: user.id
                          });
                      } catch (inviteErr) {
                        console.warn('[SmartImport] Failed to invite:', email, inviteErr);
                      }
                    }
                  }
                }
                
                // Reload wheel data from database
                await loadWheelData();
                
                console.log('[SmartImport] Change tracker state AFTER reload:', changeTracker.getChangesSummary());
                
                // Ensure changes are cleared and marked as saved (redundant but safe)
                changeTracker.clearChanges();
                hasUnsavedChangesRef.current = false;
                markSaved();
                
                console.log('[SmartImport] Change tracker cleared after reload');
                
                setIsSaving(false);
                setShowSmartImport(false);
                
                const totalItems = result.stats?.createdItems || result.yrwData?.pages?.reduce((sum, p) => sum + p.items.length, 0) || 0;
                const pageCount = result.stats?.createdPages || result.yrwData?.pages?.length || 0;
                showToast(`CSV importerad! ${totalItems} aktiviteter över ${pageCount} år.`, 'success');
                
              } catch (err) {
                console.error('[SmartImport] Post-import error:', err);
                setIsSaving(false);
                showToast(err.message || 'Import misslyckades', 'error');
              }
            }}
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
                if (pageToLoad) {
                  setYear(String(pageToLoad.year || new Date().getFullYear()));

                  const normalized = normalizePageStructure(pageToLoad);
                  const mappedItems = Array.isArray(pageItemsRef.current?.[pageId])
                    ? pageItemsRef.current[pageId]
                    : normalized.items || [];

                  setWheelStructure(() => ({
                    rings: [...normalized.rings],
                    activityGroups: [...normalized.activityGroups],
                    labels: [...normalized.labels],
                    items: [...mappedItems],
                  }));
                }
              } catch (error) {
                console.error('[App] Error loading page:', error);
              }
            })();
          }}
          isOpen={isAIOpen}
          onToggle={() => setIsAIOpen(!isAIOpen)}
          isPremium={isPremium}
        />
        </Suspense>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictDetails && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
          <ConflictResolutionModal
            conflicts={conflictDetails}
            onResolve={async (resolution) => {
              if (resolution === 'remote') {
                // User chose to accept remote changes - reload from database
                await loadWheelData({ force: true, reason: 'conflict-resolution' });
                showToast(t('conflict:resolved', 'Konflikt löst - data laddades om'), 'success');
              } else {
                // User chose to keep local - our changes are already saved
                showToast(t('conflict:resolved', 'Konflikt löst - dina ändringar behölls'), 'success');
              }
              optimisticSync.resolveConflict(resolution, null);
            }}
            onClose={() => {
              setShowConflictModal(false);
              setConflictDetails(null);
            }}
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

export default WheelEditor;
