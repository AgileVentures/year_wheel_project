import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import YearWheel from "./YearWheel";
import SidePanel from "./components/SidePanel";
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

const defaultPageStructure = Object.freeze({
  rings: [],
  activityGroups: [],
  labels: [],
  items: [],
});

const normalizePageStructure = (pageLike) => {
  if (!pageLike) {
    return { ...defaultPageStructure };
  }

  const source = pageLike.structure ?? {};
  return {
    rings: Array.isArray(source.rings) ? source.rings : [],
    activityGroups: Array.isArray(source.activityGroups) ? source.activityGroups : [],
    labels: Array.isArray(source.labels) ? source.labels : [],
    items: Array.isArray(source.items) ? source.items : [],
  };
};

function WheelEditor({ wheelId, reloadTrigger, onBackToDashboard }) {
  const { t } = useTranslation(['common']);
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  
  // Helper: Filter items to only those belonging to a specific year
  // CRITICAL for maintaining page isolation in wheel_pages.structure JSONB
  const filterItemsByYear = useCallback((items, yearNum) => {
    return (items || []).filter(item => {
      const itemStartYear = new Date(item.startDate).getFullYear();
      const itemEndYear = new Date(item.endDate).getFullYear();
      // Include item if it overlaps with the year
      return itemStartYear <= yearNum && itemEndYear >= yearNum;
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

  const handleUndoRedoStateRestored = useCallback((restoredState) => {
    console.log('[Debug][UndoRestore] State restored:', {
      hasStructure: !!restoredState?.structure,
      hasPageItemsById: !!restoredState?.pageItemsById,
      pageItemsByIdKeys: Object.keys(restoredState?.pageItemsById || {})
    });
    
    // CRITICAL: Restore items to pages from undo state
    // Note: setPages is not in dependencies to avoid initialization order issues
    if (restoredState?.pageItemsById) {
      setPages((prevPages) => {
        return prevPages.map(page => {
          const itemsForPage = restoredState.pageItemsById[page.id];
          if (!itemsForPage) return page;
          
          const currentStructure = normalizePageStructure(page);
          return {
            ...page,
            structure: {
              ...currentStructure,
              items: itemsForPage
            }
          };
        });
      });

      console.log('[Debug][UndoRestore] Restored items to pages from undo state');
    }
    
    if (yearWheelRef && typeof yearWheelRef.clearPendingItemUpdates === 'function') {
      yearWheelRef.clearPendingItemUpdates();
    }
    const broadcastFn = broadcastOperationRef.current;
    if (broadcastFn && restoredState?.structure) {
      broadcastFn('restore', null, {
        structure: restoredState.structure,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    structure: {
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
      labels: []
    },
    pageItemsById: {} // CRITICAL: Include items in undo state to prevent disappearance
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
  // Memoize wheelStructure to prevent unnecessary re-renders of YearWheel
  // Only create new object reference when actual data changes (using JSON comparison)
  const structure = useMemo(() => {
    const data = undoableStates?.structure || {
      rings: [],
      activityGroups: [],
      labels: []
    };
    return data;
  }, [
    // Use JSON.stringify to create stable dependency for deep comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(undoableStates?.structure)
  ]);
  const [zoomedMonth, setZoomedMonth] = useState(null);
  const [zoomedQuarter, setZoomedQuarter] = useState(null);
  const latestValuesRef = useRef({});
  const [allItems, setAllItems] = useState([]);
  const allItemsRef = useRef(allItems);
  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);

  const [pageItemsById, setPageItemsById] = useState({});
  const pageItemsRef = useRef(pageItemsById);
  useEffect(() => {
    pageItemsRef.current = pageItemsById;
  }, [pageItemsById]);

  const computePageItems = useCallback((items, pagesList) => {
    if (!Array.isArray(pagesList) || pagesList.length === 0) {
      return {};
    }

    const result = {};
    pagesList.forEach((page) => {
      if (!page?.id) {
        return;
      }
      const pageYear = toYearNumber(page.year) ?? new Date().getFullYear();
      result[page.id] = filterItemsByYear(items, pageYear);
    });

    return result;
  }, [filterItemsByYear]);

  // Multi-page state
  const [pages, setPages] = useState([]);
  const pagesRef = useRef(pages);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [wheelData, setWheelData] = useState(null); // Store full wheel object including team_id

  const currentPageItems = useMemo(() => {
    if (!currentPageId) {
      return [];
    }

    const items = pageItemsById[currentPageId];
    return Array.isArray(items) ? items : [];
  }, [currentPageId, pageItemsById]);

  const wheelStructure = useMemo(() => ({
    ...structure,
    items: currentPageItems,
  }), [structure, currentPageItems]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  // Sync pageItemsById from pages (source of truth)
  useEffect(() => {
    if (!Array.isArray(pages) || pages.length === 0) {
      return;
    }

    const itemsByPage = {};
    pages.forEach((page) => {
      const structure = normalizePageStructure(page);
      itemsByPage[page.id] = Array.isArray(structure.items) ? structure.items : [];
    });

    setPageItemsById(itemsByPage);
  }, [pages]);

  const setTitle = useCallback((value, historyLabel = { type: CHANGE_TYPES.CHANGE_TITLE }) => {
    const currentTitle = undoableStates?.title || "Nytt hjul";
    const nextTitle = typeof value === 'function' ? value(currentTitle) : value;

    if (nextTitle === currentTitle) {
      return;
    }

    setUndoableStates((prevStates) => ({
      ...prevStates,
      title: nextTitle,
    }), historyLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      title: nextTitle,
    };
  }, [setUndoableStates, undoableStates]);

  const setYear = useCallback((value, historyLabel = { type: CHANGE_TYPES.CHANGE_YEAR }) => {
    const currentYear = undoableStates?.year || "2025";
    const resolved = typeof value === 'function' ? value(currentYear) : value;
    const nextYear = resolved != null ? String(resolved) : currentYear;

    if (nextYear === currentYear) {
      return;
    }

    setUndoableStates((prevStates) => ({
      ...prevStates,
      year: nextYear,
    }), historyLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      year: nextYear,
    };
  }, [setUndoableStates, undoableStates]);

  const setColors = useCallback((value, historyLabel = { type: CHANGE_TYPES.CHANGE_COLORS }) => {
    const currentColors = undoableStates?.colors || ["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"];
    const nextColors = typeof value === 'function' ? value(currentColors) : value;

    if (!Array.isArray(nextColors) || (nextColors.length === currentColors.length && nextColors.every((color, index) => color === currentColors[index]))) {
      return;
    }

    setUndoableStates((prevStates) => ({
      ...prevStates,
      colors: nextColors,
    }), historyLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      colors: nextColors,
    };
  }, [setUndoableStates, undoableStates]);

  const setWheelStructure = useCallback((value, historyLabel) => {
    const defaultStructure = {
      rings: [],
      activityGroups: [],
      labels: [],
    };

    const currentStructure = undoableStates?.structure || defaultStructure;
    const currentItems = currentPageId && Array.isArray(pageItemsRef.current?.[currentPageId])
      ? pageItemsRef.current[currentPageId]
      : [];

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

    console.log('[Debug][setWheelStructure] Items decision:', {
      hasNextRawItems: Array.isArray(nextRaw?.items),
      nextRawItemsLength: nextRaw?.items?.length,
      currentItemsLength: currentItems?.length,
      finalItemsLength: nextItems?.length,
      historyLabel: historyLabel?.type || historyLabel
    });

    const nextCombined = {
      ...nextStructure,
      items: nextItems,
    };

    const updatedItemIds = new Set(nextItems.map((item) => item?.id).filter(Boolean));
    const changeType = detectOrganizationChange(currentCombined, nextCombined);
    const structureChanged = JSON.stringify(currentStructure) !== JSON.stringify(nextStructure);
    const itemsChanged = JSON.stringify(currentItems) !== JSON.stringify(nextItems);

    if (updatedItemIds.size > 0) {
      console.log('[Debug][setWheelStructure] nextCombined snapshot', {
        changeType,
        nextItemCount: nextItems.length,
        sample: nextItems.slice(0, 3).map((item) =>
          item
            ? {
                id: item.id,
                pageId: item.pageId,
                startDate: item.startDate,
                endDate: item.endDate,
              }
            : null
        ),
      });
    }

    if (!structureChanged && !itemsChanged && !historyLabel) {
      return;
    }

    const finalLabel = historyLabel || { type: changeType };

    // Update both structure and pageItemsById in undo state
    setUndoableStates((prevStates) => ({
      ...prevStates,
      structure: nextStructure,
      pageItemsById: {
        ...prevStates.pageItemsById,
        [currentPageId]: nextItems
      }
    }), finalLabel);

    latestValuesRef.current = {
      ...latestValuesRef.current,
      structure: nextStructure,
    };

    const prevItems = Array.isArray(currentItems) ? currentItems : [];
  const prevItemIds = new Set(prevItems.map((item) => item?.id).filter(Boolean));
  const nextItemIds = new Set(nextItems.map((item) => item?.id).filter(Boolean));
    const removedIds = [];
    prevItemIds.forEach((id) => {
      if (!nextItemIds.has(id)) {
        removedIds.push(id);
      }
    });

    if (removedIds.length > 0 || nextItems.length > 0) {
      setAllItems((prevAll) => {
        if (!Array.isArray(prevAll)) {
          return prevAll;
        }

        const map = new Map(prevAll.map((item) => [item.id, item]));
        let changed = false;

        removedIds.forEach((id) => {
          if (id && map.has(id)) {
            map.delete(id);
            changed = true;
          }
        });

        nextItems.forEach((item) => {
          if (!item) {
            return;
          }

          const itemId = item.id;
          if (!itemId) {
            return;
          }

          const existing = map.get(itemId);
          const merged = existing ? { ...existing, ...item } : { ...item };

          // Only mark changed if data actually differs
          if (!existing || existing !== merged) {
            changed = true;
          }

          map.set(itemId, merged);
        });

        if (!changed) {
          return prevAll;
        }

        if (updatedItemIds.size > 0) {
          console.log('[Debug][setWheelStructure] setAllItems applied', {
            total: map.size,
            containsTracked: Array.from(updatedItemIds).every((id) => map.has(id)),
          });
        }

        return Array.from(map.values());
      });
    }

    if (currentPageId) {
      let updatedItemsMap = null;

      setPageItemsById((prev) => {
        const nextMap = { ...(prev || {}) };
        nextMap[currentPageId] = nextItems;

        nextItems.forEach((item) => {
          if (!item || !item.id || !item.pageId) {
            return;
          }

          const targetPageId = item.pageId;
          if (!nextMap[targetPageId]) {
            const fallback = Array.isArray(prev?.[targetPageId]) ? prev[targetPageId] : [];
            nextMap[targetPageId] = [...fallback];
          }

          const list = nextMap[targetPageId];
          if (!Array.isArray(list)) {
            return;
          }

          const index = list.findIndex((entry) => entry?.id === item.id);
          if (index >= 0) {
            const clone = [...list];
            clone[index] = item;
            nextMap[targetPageId] = clone;
          } else {
            nextMap[targetPageId] = [...list, item];
          }
        });

        if (removedIds.length > 0) {
          Object.keys(nextMap).forEach((pageKey) => {
            const list = nextMap[pageKey];
            if (!Array.isArray(list) || list.length === 0) {
              return;
            }

            const filtered = list.filter((entry) => !removedIds.includes(entry?.id));
            if (filtered.length !== list.length) {
              nextMap[pageKey] = filtered;
            }
          });
        }

        updatedItemsMap = nextMap;

        if (updatedItemIds.size > 0) {
          const trackedPages = {};
          nextItems.forEach((item) => {
            if (item?.pageId && Array.isArray(nextMap[item.pageId])) {
              const ids = nextMap[item.pageId].map((entry) => entry?.id).filter(Boolean);
              trackedPages[item.pageId] = {
                count: ids.length,
                containsUpdated: ids.includes(item.id),
              };
            }
          });

          const currentPageSnapshot = Array.isArray(nextMap[currentPageId])
            ? nextMap[currentPageId]
                .filter((entry) => updatedItemIds.has(entry?.id))
                .map((entry) => ({
                  id: entry?.id,
                  pageId: entry?.pageId,
                  startDate: entry?.startDate,
                  endDate: entry?.endDate,
                }))
            : [];

          console.log('[Debug][setWheelStructure] pageItemsById update', {
            currentPageId,
            currentPageTracked: currentPageSnapshot,
            trackedPages,
          });
        }

        return nextMap;
      });

      setPages((prevPages) => {
        if (!Array.isArray(prevPages) || prevPages.length === 0) {
          return prevPages;
        }

        const mapRef = updatedItemsMap || pageItemsRef.current || {};
        let changed = false;

        const nextPages = prevPages.map((page) => {
          const prevStructure = page.structure || {};
          const { items: prevItems = [] } = prevStructure;
          const mappedItems = mapRef[page.id];
          const shouldUpdateItems = Array.isArray(mappedItems);

          const nextStructureForPage = {
            ...prevStructure,
            rings: nextStructure.rings || prevStructure.rings || [],
            activityGroups: nextStructure.activityGroups || prevStructure.activityGroups || [],
            labels: nextStructure.labels || prevStructure.labels || [],
            items: shouldUpdateItems
              ? mappedItems
              : page.id === currentPageId
                ? nextItems
                : prevItems,
          };

          const itemsReference = shouldUpdateItems
            ? mappedItems
            : page.id === currentPageId
              ? nextItems
              : prevItems;

          const isSame =
            prevStructure.items === itemsReference &&
            prevStructure.rings === nextStructureForPage.rings &&
            prevStructure.activityGroups === nextStructureForPage.activityGroups &&
            prevStructure.labels === nextStructureForPage.labels;

          if (isSame) {
            return page;
          }

          changed = true;
          return {
            ...page,
            structure: nextStructureForPage,
          };
        });

        return changed ? nextPages : prevPages;
      });
    }
  }, [setUndoableStates, undoableStates, currentPageId, setAllItems, setPageItemsById, setPages]);
  
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false); // DISABLED: All saves are direct to DB
  const [isPublic, setIsPublic] = useState(false); // Public sharing toggle
  const [isTemplate, setIsTemplate] = useState(false); // Template status (admin only)
  const [isAdmin, setIsAdmin] = useState(false); // Admin status
  const [showVersionHistory, setShowVersionHistory] = useState(false); // Version history modal
  const [showExportModal, setShowExportModal] = useState(false); // Export data modal
  
  
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
  // Queue item persistence operations to avoid race conditions

  // Complete wheel snapshot in the format: { metadata, structure, pages }
  // This is what YearWheel.jsx should receive for full visibility
  const completeWheelSnapshot = useMemo(() => ({
    metadata: {
      wheelId,
      title,
      year,
      colors,
      showWeekRing,
      showMonthRing,
      showRingNames,
      showLabels,
      weekRingDisplayMode,
    },
    structure: {
      rings: structure.rings || [],
      activityGroups: structure.activityGroups || [],
      labels: structure.labels || [],
    },
    pages: pages.map(page => ({
      id: page.id,
      year: page.year,
      pageOrder: page.page_order,
      title: page.title,
      items: pageItemsById[page.id] || [],
      isActive: page.id === currentPageId,
    })),
  }), [wheelId, title, year, colors, showWeekRing, showMonthRing, showRingNames, showLabels, weekRingDisplayMode, structure, pages, pageItemsById, currentPageId]);

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
        
        // Prepare data to update
        let structureToSet = null;
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
          
          // Fetch all items for the wheel once; per-page filtering happens locally
          const { data: allItems, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .eq('wheel_id', wheelId);

          if (itemsError) throw itemsError;

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
          }));
          
          setAllItems(normalizedItems);
          const itemsByPage = computePageItems(normalizedItems, pagesData);
          setPageItemsById(itemsByPage);

          const pageItems = itemsByPage?.[pageToLoad.id] || [];
          console.log(`[loadWheelData] Prepared ${pageItems.length} items for page ${pageToLoad.id}`);
          
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

          // Update pages with latest per-page data and shared structures
          const enrichedPages = pagesData.map((page) => {
            const baseStructure = page.structure || {};
            const nextStructureForPage = {
              ...baseStructure,
              rings: structureData.rings,
              activityGroups: structureData.activityGroups,
              labels: structureData.labels,
              items: itemsByPage?.[page.id] || [],
            };

            return {
              ...page,
              structure: nextStructureForPage,
            };
          });

          setPages(enrichedPages);
        } else {
          // Fallback: Load from wheel's organization data (legacy support)
          setPages([]);
          setPageItemsById({});
          const legacyItems = Array.isArray(wheelData.wheelStructure?.items)
            ? wheelData.wheelStructure.items
            : Array.isArray(wheelData.structure?.items)
              ? wheelData.structure.items
              : [];
          setAllItems(legacyItems);
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
        
        // CRITICAL: Update title, colors, year AND structure together in ONE call to prevent race condition
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
        if (structureToSet) {
          updates.structure = structureToSet;
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
    // CRITICAL: Block ALL realtime updates during page navigation
    if (isNavigatingPagesRef.current) {
      console.log('[Realtime] Ignoring update - page navigation in progress');
      return;
    }
    
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
    
    // Ignore our own recent changes (within 5 seconds - increased to allow auto-save to complete)
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 5000) {
      return;
    }
    
    const buildPageWithItems = (page, items) => ({
      ...page,
      structure: {
        ...(page?.structure || {}),
        items: Array.isArray(items) ? items : [],
      },
    });

    if (eventType === 'INSERT') {
      const existingItems = Array.isArray(pageItemsRef.current?.[payload.new.id])
        ? pageItemsRef.current[payload.new.id]
        : [];

      setPages((prevPages) => {
        const exists = prevPages.some((p) => p.id === payload.new.id);
        if (exists) {
          return prevPages;
        }

        const nextPages = [...prevPages, buildPageWithItems(payload.new, existingItems)];
        return nextPages.sort((a, b) => a.page_order - b.page_order);
      });

      setPageItemsById((prev) => ({
        ...(prev || {}),
        [payload.new.id]: existingItems,
      }));
    } else if (eventType === 'UPDATE') {
      const currentItems = Array.isArray(pageItemsRef.current?.[payload.new.id])
        ? pageItemsRef.current[payload.new.id]
        : [];

      setPages((prevPages) =>
        prevPages
          .map((page) => (page.id === payload.new.id ? buildPageWithItems(payload.new, currentItems) : page))
          .sort((a, b) => a.page_order - b.page_order)
      );

      // Items are handled via dedicated realtime subscriptions; no update needed here
    } else if (eventType === 'DELETE') {
      // Page deleted by another user
      setPages(prevPages => {
        const filtered = prevPages.filter(p => p.id !== payload.old.id);
        
        // If deleted current page, switch to first remaining page
        if (payload.old.id === currentPageId && filtered.length > 0) {
          const newCurrentPage = filtered[0];
          setCurrentPageId(newCurrentPage.id);
          const pageYear = newCurrentPage.year || new Date().getFullYear();
          const mappedItems = pageItemsRef.current?.[newCurrentPage.id] || filterItemsByYear(allItemsRef.current, pageYear);
          setPageItemsById((prev) => ({
            ...(prev || {}),
            [newCurrentPage.id]: mappedItems,
          }));

          setWheelStructure((prev) => ({
            ...prev,
            rings: newCurrentPage.structure?.rings || prev.rings || [],
            activityGroups: newCurrentPage.structure?.activityGroups || prev.activityGroups || [],
            labels: newCurrentPage.structure?.labels || prev.labels || [],
            items: mappedItems,
          }));
          setYear(String(pageYear));
        }
        
        return filtered;
      });

      setPageItemsById((prev) => {
        if (!prev || !(payload.old.id in prev)) {
          return prev;
        }
        const { [payload.old.id]: _removed, ...rest } = prev;
        return rest;
      });
      const removedItems = Array.isArray(pageItemsRef.current?.[payload.old.id])
        ? pageItemsRef.current[payload.old.id]
        : [];
      if (removedItems.length > 0) {
        const removedIds = removedItems
          .map((item) => item?.id)
          .filter(Boolean);
        if (removedIds.length > 0) {
          setAllItems((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) {
              return prev;
            }
            const filtered = prev.filter((item) => !removedIds.includes(item?.id));
            return filtered.length === prev.length ? prev : filtered;
          });
        }
      }
    }
  }, [currentPageId, lastSaveTimestamp, filterItemsByYear]);

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
    title,
    colors,
    showWeekRing,
    showMonthRing,
    showRingNames,
    showLabels,
    weekRingDisplayMode,
    structure,
    currentItems: currentPageItems,
    wheelStructure,
    year,
    currentPageId,
    hasUnsavedChanges,
    pages,
    allItems,
    pageItemsById,
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

    const allPages = pagesRef.current || [];

    // CLEAN STRUCTURE: Pages only contain id, year, and items
    const pagesSnapshot = allPages
      .map((page) => {
        if (!page) {
          return null;
        }

        const pageYear = toYearNumber(page.year);
        const mappedItems = latest.pageItemsById?.[page.id];
        const rawItems = Array.isArray(mappedItems)
          ? mappedItems
          : page.id === latest.currentPageId
            ? Array.isArray(latest.currentItems)
              ? latest.currentItems
              : []
            : Array.isArray(page.structure?.items)
              ? page.structure.items
              : Array.isArray(latest.allItems) && pageYear != null
                ? filterItemsByYear(latest.allItems, pageYear)
                : [];

        console.log(`[buildWheelSnapshot] page ${page.id?.substring(0,8)} year=${pageYear}: mappedItems=${Array.isArray(mappedItems) ? mappedItems.length : 'N/A'}, currentItems=${page.id === latest.currentPageId ? (Array.isArray(latest.currentItems) ? latest.currentItems.length : 'N/A') : 'skip'}, page.structure.items=${Array.isArray(page.structure?.items) ? page.structure.items.length : 'N/A'}, allItems=${Array.isArray(latest.allItems) ? latest.allItems.length : 'N/A'} → rawItems=${rawItems.length}`);
        
        if (rawItems.length > 0) {
          console.log(`[buildWheelSnapshot] page ${page.id?.substring(0,8)} rawItems sample:`, rawItems.slice(0, 2).map(i => ({
            id: i.id?.substring(0, 8),
            name: i.name,
            pageId: i.pageId?.substring(0, 8) || 'UNDEFINED',
            startDate: i.startDate,
            endDate: i.endDate
          })));
        }

        const pageItems = rawItems
          .filter((item) => {
            if (!item) {
              console.log(`[buildWheelSnapshot] Filtering out null/undefined item`);
              return false;
            }

            if (item.pageId && item.pageId !== page.id) {
              console.log(`[buildWheelSnapshot] Filtering out item ${item.id?.substring(0,8)} - pageId mismatch: ${item.pageId?.substring(0,8)} !== ${page.id?.substring(0,8)}`);
              return false;
            }

            if (pageYear == null) {
              return true;
            }

            const startYear = item.startDate ? new Date(item.startDate).getFullYear() : null;
            const endYear = item.endDate ? new Date(item.endDate).getFullYear() : startYear;

            if (startYear == null || endYear == null) {
              console.log(`[buildWheelSnapshot] Filtering out item ${item.id?.substring(0,8)} - invalid dates: ${item.startDate} to ${item.endDate}`);
              return false;
            }

            const yearMatch = startYear <= pageYear && endYear >= pageYear;
            if (!yearMatch) {
              console.log(`[buildWheelSnapshot] Filtering out item ${item.id?.substring(0,8)} - year mismatch: ${startYear}-${endYear} vs page year ${pageYear}`);
            }
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

        console.log(`[buildWheelSnapshot] page ${page.id?.substring(0,8)} FINAL: ${pageItems.length} items → ${pageItems.map(i => `${i.name}(${i.id?.substring(0,8)})`).join(', ')}`);

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
      console.warn('[FullSave] ❌ BLOCKED - page navigation in progress');
      return null;
    }

    // CRITICAL: Block saves during data loading
    if (isLoadingData.current) {
      console.warn('[FullSave] ❌ BLOCKED - data loading in progress');
      return null;
    }

    console.log(`[FullSave] ✅ STARTING save (reason: ${reason || 'auto'})`);
    
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
          console.error('[FullSave] ❌ Snapshot builder returned 0 pages, but editor state has', knownPages.length);
          const event = new CustomEvent('showToast', {
            detail: {
              message: 'Kunde inte spara eftersom siddata saknas. Ladda om hjulet och försök igen.',
              type: 'error',
            },
          });
          window.dispatchEvent(event);
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
          console.error('[FullSave] Failed to verify existing pages before fallback creation:', pageLookupError);
          const event = new CustomEvent('showToast', {
            detail: {
              message: 'Kunde inte verifiera siddata före sparning. Försök igen senare.',
              type: 'error',
            },
          });
          window.dispatchEvent(event);
          return null;
        }

        if (existingPagesCount > 0) {
          console.error('[FullSave] ❌ Aborting fallback page creation - database already has', existingPagesCount, 'pages');
          const event = new CustomEvent('showToast', {
            detail: {
              message: 'Kunde inte spara eftersom befintliga sidor saknas i snapshotet. Ladda om hjulet.',
              type: 'error',
            },
          });
          window.dispatchEvent(event);
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
              console.log(`[FullSave] Created emergency page with ${pageItems.length} items to sync`);
            }
          }

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

      validation = validateSnapshotPages(snapshot, latest);

      if (!validation?.valid) {
        console.warn('[FullSave] ❌ Snapshot validation failed', validation?.problems);
        if (reason === 'manual') {
          showToast('Sparning stoppad: vissa sidor saknar eller duplicerar aktiviteter.', 'error');
          throw new Error('Snapshot validation failed');
        } else {
          console.warn('[FullSave] Proceeding despite validation issues (auto-save)');
        }
      } else {
        const validatedPageCount = validation?.details?.length || 0;
        console.log(`[FullSave] ✅ Snapshot validation passed (${validatedPageCount} pages checked)`);
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
        console.log('[FullSave] ✅ Updating state with database UUIDs from itemsByPage:', Object.keys(itemsByPage).map(pageId => `${pageId.substring(0,8)}: ${itemsByPage[pageId].length} items`));
        
        // Log sample of ID mappings
        const sampleItems = Object.values(itemsByPage).flat().slice(0, 3);
        if (sampleItems.length > 0) {
          console.log('[FullSave] Sample items with database IDs:', sampleItems.map(i => ({
            id: i.id?.substring(0, 8),
            name: i.name,
            pageId: i.pageId?.substring(0, 8)
          })));
        }
        
        setPageItemsById({ ...itemsByPage });
        setAllItems(
          Object.values(itemsByPage).reduce((acc, list) => {
            if (Array.isArray(list)) {
              acc.push(...list);
            }
            return acc;
          }, [])
        );
        setPages((prevPages) => {
          if (!Array.isArray(prevPages)) {
            return prevPages;
          }

          let changed = false;

          const nextPages = prevPages.map((page) => {
            const prevStructure = page.structure || {};
            const prevItems = Array.isArray(page.items)
              ? page.items
              : Array.isArray(prevStructure.items)
                ? prevStructure.items
                : [];

            const mappedItems = itemsByPage[page.id];
            const nextItems = Array.isArray(mappedItems)
              ? mappedItems
              : prevItems;

            const nextStructureForPage = {
              rings: normalizedRings,
              activityGroups: normalizedActivityGroups,
              labels: normalizedLabels,
            };

            const structureChanged =
              prevStructure.rings !== nextStructureForPage.rings ||
              prevStructure.activityGroups !== nextStructureForPage.activityGroups ||
              prevStructure.labels !== nextStructureForPage.labels;

            const itemsChanged = prevItems !== nextItems;

            if (!structureChanged && !itemsChanged) {
              return page;
            }

            changed = true;
            return {
              ...page,
              structure: nextStructureForPage,
              items: nextItems,
            };
          });

          return changed ? nextPages : prevPages;
        });

        latestValuesRef.current = {
          ...latestValuesRef.current,
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
          console.error('[FullSave] Failed to create version snapshot:', versionError);
        }
      }

      // Mark as saved in undo/redo stack
      markSaved();

      return {
        ...result,
        validation,
      };
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
      try {
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
      } catch (error) {
        console.error('[ManualSave] Error saving wheel:', error);
        showToast('Kunde inte spara', 'error');
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
  }, [wheelId, autoSaveEnabled, enqueueFullSave, showToast, title, year, colors, ringsData, wheelStructure, showWeekRing, showMonthRing, showRingNames, showLabels, weekRingDisplayMode, markSaved]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

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
  
  // Switch to a different page (PURE FRONTEND - no database calls)
  const handlePageChange = (pageId) => {
    if (pageId === currentPageId) return;
    
    const newPage = pages.find(p => p.id === pageId);
    if (!newPage) {
      console.error('Page not found:', pageId);
      return;
    }
    
    // Simply switch to the new page's data (already loaded)
    const pageYear = newPage.year || new Date().getFullYear();
    let pageItems = pageItemsRef.current?.[pageId];
    if (!pageItems) {
      const computedItems = filterItemsByYear(allItemsRef.current, pageYear);
      pageItems = computedItems;
      setPageItemsById((prev) => ({
        ...(prev || {}),
        [pageId]: computedItems,
      }));
    }

    setWheelStructure(prev => ({
      ...prev,
      items: pageItems
    }), { type: 'pageChange', params: { pageId } });
    
    setYear(String(pageYear));
    setCurrentPageId(pageId);
    clearHistory();
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
      
      // Sort pages by year after adding
      const updatedPages = [...pages, newPage].sort((a, b) => a.year - b.year);
      setPages(updatedPages);
      setPageItemsById((prev) => ({
        ...(prev || {}),
        [newPage.id]: [],
      }));
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
      
      // Sort pages by year after adding
      const updatedPages = [...pages, newPage].sort((a, b) => a.year - b.year);
      setPages(updatedPages);
      setPageItemsById((prev) => ({
        ...(prev || {}),
        [newPage.id]: [],
      }));
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
        id: `item-copy-${nextYear}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique temporary ID
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

      const hydratedPage = {
        ...newPage,
        structure: {
          rings: [...(wheelStructure.rings || [])],
          activityGroups: [...(wheelStructure.activityGroups || [])],
          labels: [...(wheelStructure.labels || [])],
          items: itemsToSave, // Only in memory, not saved to structure JSONB
        },
      };

      setPages(prevPages => {
        const nextPages = Array.isArray(prevPages) ? [...prevPages, hydratedPage] : [hydratedPage];
        return nextPages.sort((a, b) => a.year - b.year);
      });
      setPageItemsById((prev) => ({
        ...(prev || {}),
        [hydratedPage.id]: itemsToSave,
      }));
      setShowAddPageModal(false);

      setCurrentPageId(hydratedPage.id);
      setYear(String(nextYear));

      setWheelStructure(prevData => ({
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
        const remoteStructure = normalizePageStructure(existingRemote);
        const hydratedRemote = {
          ...existingRemote,
          structure: remoteStructure,
        };

        setPages((prevPages) => {
          if (prevPages.some((page) => page.id === hydratedRemote.id)) {
            return prevPages;
          }

          const merged = [...prevPages, hydratedRemote];
          merged.sort((a, b) => toYearNumber(a.year) - toYearNumber(b.year));
          return merged;
        });

        setPageItemsById((prev) => ({
          ...(prev || {}),
          [hydratedRemote.id]: remoteStructure.items || [],
        }));

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

        setPages((prevPages) => {
          const merged = [...prevPages, hydratedNewPage];
          merged.sort((a, b) => toYearNumber(a.year) - toYearNumber(b.year));
          return merged;
        });

        setPageItemsById((prev) => ({
          ...(prev || {}),
          [hydratedNewPage.id]: templateWheelStructure.items || [],
        }));

        return { page: hydratedNewPage, created: true };
      } catch (error) {
        // 23505 indicates duplicate page (likely due to concurrent creation)
        if (error?.code === '23505') {
          try {
            const refreshedPages = await fetchPages(wheelId);
            const normalizedPages = (refreshedPages || []).map((page) => ({
              ...page,
              structure: normalizePageStructure(page),
            }));
            const sortedPages = normalizedPages.sort(
              (a, b) => toYearNumber(a.year) - toYearNumber(b.year)
            );
            setPages(sortedPages);
            const match = sortedPages.find(
              (p) => toYearNumber(p.year) === normalizedTargetYear
            );

            if (match) {
              setPageItemsById((prev) => ({
                ...(prev || {}),
                [match.id]: match.structure?.items || [],
              }));
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
        const normalizedStructure = normalizePageStructure(newCurrentPage);
        setWheelStructure(normalizedStructure);
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
            wheelStructure
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

      const restoredOrgData = cloneOrgData(versionData.wheelStructure);

      if (currentPageId && restoredOrgData) {
        setPages((prevPages) => {
          if (!Array.isArray(prevPages)) {
            return prevPages;
          }

          return prevPages.map((page) => {
            if (page.id !== currentPageId) {
              return page;
            }

            const currentStructure = normalizePageStructure(page);
            const nextStructure = {
              ...currentStructure,
              ...restoredOrgData,
            };

            return {
              ...page,
              structure: nextStructure,
            };
          });
        });

        setPageItemsById((prev) => ({
          ...(prev || {}),
          [currentPageId]: restoredOrgData.items || [],
        }));

        setAllItems((prev) => {
          const nextItems = restoredOrgData.items || [];
          if (!Array.isArray(nextItems)) {
            return prev;
          }

          const map = new Map();
          nextItems.forEach((item) => {
            if (item?.id) {
              map.set(item.id, item);
            }
          });

          (Array.isArray(prev) ? prev : []).forEach((item) => {
            if (item?.id && !map.has(item.id)) {
              map.set(item.id, item);
            }
          });

          return Array.from(map.values());
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
        versionUpdates.structure = {
          rings: [...(restoredOrgData.rings || [])],
          activityGroups: [...(restoredOrgData.activityGroups || [])],
          labels: [...(restoredOrgData.labels || [])],
        };
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
        structure: restoredOrgData
          ? {
              rings: [...(restoredOrgData.rings || [])],
              activityGroups: [...(restoredOrgData.activityGroups || [])],
              labels: [...(restoredOrgData.labels || [])],
            }
          : latestValuesRef.current?.structure,
        pageItemsById: restoredOrgData?.items && currentPageId
          ? {
              ...(latestValuesRef.current?.pageItemsById || {}),
              [currentPageId]: [...(restoredOrgData.items || [])],
            }
          : latestValuesRef.current?.pageItemsById,
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
      const templatePagesRaw = await fetchPages(templateId);
      const templatePages = (templatePagesRaw || []).map((page) => ({
        ...page,
        structure: normalizePageStructure(page),
      }));
      
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
      const convertTemplateData = (templateStructure) => {
        // Deep copy to avoid read-only property issues
        const orgData = JSON.parse(JSON.stringify(templateStructure || defaultPageStructure));
        
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
        const orgData = convertTemplateData(firstPage.structure);
        
        setWheelStructure(orgData);
        setCurrentPageId(null); // Will create new pages when saved
        
        // Store template pages for reference but clear current page ID
        setPages(templatePages);
      } else {
        // Single page template - load organization data from first page
        const templateStructure = templatePages[0].structure;
        const orgData = convertTemplateData(templateStructure);
        
        setWheelStructure(orgData);
        setPages([]);
        setCurrentPageId(null);
      }

      // Update rings data for backward compatibility
      const rings = templatePages[0].structure?.rings || [];
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
      wheelStructure,
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
        // Pass current page's structure (rings, activityGroups, labels) to new page
        const currentStructure = {
          rings: structure.rings || [],
          activityGroups: structure.activityGroups || [],
          labels: structure.labels || [],
          items: [], // New page starts with no items
        };
        
        const ensured = await ensurePageForYear(segment.year, {
          templateWheelStructure: currentStructure,
        });
        const targetPage = ensured?.page;
        if (!targetPage) {
          continue;
        }

        const pageId = targetPage.id;

  const latestPages = pagesRef.current || [];
  const pageEntry = latestPages.find((page) => page.id === pageId);
  const pageStructure = normalizePageStructure(pageEntry);
  const existingItems = ensureArray(pageStructure.items);
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

            const currentStructure = normalizePageStructure(page);
            const nextStructure = {
              ...currentStructure,
              items: [...ensureArray(currentStructure.items), newItem],
            };

            return {
              ...page,
              structure: nextStructure,
            };
          });
        });

        if ((latestValuesRef.current?.currentPageId || currentPageId) === pageId) {
          setWheelStructure((prev) => ({
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
  }, [wheelId, ensurePageForYear, pagesRef, currentPageId, setPages, setWheelStructure, enqueueFullSave, broadcastOperation, showToast, showConfirmDialog]);

  // Handle drag start - begin batch mode for undo/redo
  const handleDragStart = useCallback((item) => {
    console.log('[Debug][handleDragStart] Starting drag', item?.name);
    isDraggingRef.current = true;
    const label = item 
      ? { type: 'dragItem', params: { name: item.name } }
      : { type: 'dragActivity' };
    startBatch(label);
    console.log('[Debug][handleDragStart] Batch started');
  }, [startBatch]);

  // Memoize callbacks to prevent infinite loops
  const handleUpdateAktivitet = useCallback((updatedItem) => {
    if (!updatedItem?.id || !updatedItem?.pageId) {
      console.warn('[handleUpdateAktivitet] Missing id or pageId', updatedItem);
      return;
    }

    console.log('[handleUpdateAktivitet] Called with:', {
      id: updatedItem.id,
      name: updatedItem.name,
      pageId: updatedItem.pageId,
      startDate: updatedItem.startDate,
      endDate: updatedItem.endDate,
      wasDragging: isDraggingRef.current
    });

    const wasDragging = isDraggingRef.current;
    
    // Use ref to capture result from inside setPages callback
    const changeResultRef = { actuallyChanged: false, itemFound: false };

    // Update pages state directly (source of truth)
    setPages((prevPages) => {
      if (!Array.isArray(prevPages)) return prevPages;

      const nextPages = prevPages.map((page) => {
        if (page.id !== updatedItem.pageId) return page;

        const currentStructure = normalizePageStructure(page);
        const currentItems = Array.isArray(currentStructure.items) ? currentStructure.items : [];
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

        // CRITICAL: Assign to ref so it's available after setPages completes
        changeResultRef.actuallyChanged =
          ringChanged || datesChanged || activityChanged || labelChanged ||
          nameChanged || timeChanged || descriptionChanged || linkChanged;

        console.log('[handleUpdateAktivitet] Changes detected:', {
          itemFound: changeResultRef.itemFound,
          actuallyChanged: changeResultRef.actuallyChanged,
          ringChanged,
          datesChanged,
          oldDates: `${oldItem.startDate} → ${oldItem.endDate}`,
          newDates: `${updatedItem.startDate} → ${updatedItem.endDate}`
        });

        if (!changeResultRef.actuallyChanged) return page;

        // Update item in page structure
        const nextItems = currentItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        );

        console.log('[handleUpdateAktivitet] Updated items for page', page.id, 'count:', nextItems.length);

        return {
          ...page,
          structure: {
            ...currentStructure,
            items: nextItems,
          },
        };
      });

      if (!changeResultRef.itemFound) {
        changeResultRef.actuallyChanged = false;
        console.warn('[handleUpdateAktivitet] Item not found in any page!', updatedItem.id);
      }

      return nextPages;
    });

    console.log('[handleUpdateAktivitet] After setPages:', { 
      actuallyChanged: changeResultRef.actuallyChanged, 
      itemFound: changeResultRef.itemFound, 
      wasDragging 
    });

    // Handle drag mode cleanup (use ref values)
    if (wasDragging) {
      isDraggingRef.current = false;
      if (changeResultRef.actuallyChanged) {
        console.log('[handleUpdateAktivitet] Calling endBatch()');
        const newHistoryIndex = endBatch();
        if (newHistoryIndex !== null) {
          markSaved(newHistoryIndex);
        }
      } else {
        console.log('[handleUpdateAktivitet] Calling cancelBatch()');
        cancelBatch();
      }
    }

    // Persist to database (use ref values)
    if (changeResultRef.actuallyChanged) {
      console.log('[handleUpdateAktivitet] Persisting to database');
      persistItemToDatabase(updatedItem, {
        reason: wasDragging ? 'drag-update' : 'edit-update',
        delay: wasDragging ? 120 : 0,
      }).catch(() => {});
    }
  }, [setPages, endBatch, cancelBatch, markSaved, persistItemToDatabase]);

  const handleAddItems = useCallback((newItems) => {
    if (!currentPageId) return;
    
    const itemsToAdd = Array.isArray(newItems) ? newItems : [newItems];
    console.log('[handleAddItems] Adding items to page', currentPageId, ':', itemsToAdd.map(i => i.name));

    // Update pages state directly (source of truth)
    setPages((prevPages) => {
      if (!Array.isArray(prevPages)) return prevPages;

      return prevPages.map((page) => {
        if (page.id !== currentPageId) return page;

        const currentStructure = normalizePageStructure(page);
        const currentItems = Array.isArray(currentStructure.items) ? currentStructure.items : [];

        return {
          ...page,
          structure: {
            ...currentStructure,
            items: [...currentItems, ...itemsToAdd],
          },
        };
      });
    });

    // Persist to database
    persistMultipleItems(itemsToAdd, { reason: 'item-create' }).catch(() => {});
  }, [currentPageId, setPages, persistMultipleItems]);

  const handleDeleteAktivitet = useCallback((itemId) => {
    if (!itemId || !currentPageId) return;

    let itemName = '';

    // Update pages state directly
    setPages((prevPages) => {
      if (!Array.isArray(prevPages)) return prevPages;

      return prevPages.map((page) => {
        if (page.id !== currentPageId) return page;

        const currentStructure = normalizePageStructure(page);
        const currentItems = Array.isArray(currentStructure.items) ? currentStructure.items : [];
        const itemToDelete = currentItems.find((item) => item.id === itemId);

        if (itemToDelete) {
          itemName = itemToDelete.name;
        }

        return {
          ...page,
          structure: {
            ...currentStructure,
            items: currentItems.filter((item) => item.id !== itemId),
          },
        };
      });
    });

    persistItemDeletion(itemId, { reason: 'delete-item' }).catch(() => {});
  }, [currentPageId, setPages, persistItemDeletion]);

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
          // Support both old format (ringsData) and new format (wheelStructure)
          if (data.title === undefined || !data.year || (!data.ringsData && !data.wheelStructure)) {
            throw new Error('Invalid file format');
          }

          // console.log('[FileImport] Starting file import...');
          
          // CRITICAL: Mark as loading to prevent realtime from overwriting
          isLoadingData.current = true;
          isRealtimeUpdate.current = true;

          // Process organization data BEFORE setting state
          let processedOrgData;
          if (data.wheelStructure) {
            processedOrgData = { ...data.wheelStructure };
            
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
                const pageItems = [...(itemsByYear[yearStr] || [])];

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

              setPages(sortedPreparedPages);
              pagesRef.current = sortedPreparedPages;
              setPageItemsById(itemsByPageId);
              pageItemsRef.current = itemsByPageId;

              const fileYear = Number.parseInt(data.year, 10);
              const pageForFileYear = sortedPreparedPages.find((page) => page.year === fileYear) || sortedPreparedPages[0];

              if (pageForFileYear) {
                setCurrentPageId(pageForFileYear.id);
                setYear(String(pageForFileYear.year || fileYear));

                const normalizedStructure = normalizePageStructure(pageForFileYear);
                const pageItems = Array.isArray(itemsByPageId[pageForFileYear.id])
                  ? itemsByPageId[pageForFileYear.id]
                  : [];

                setWheelStructure(() => ({
                  rings: [...normalizedStructure.rings],
                  activityGroups: [...normalizedStructure.activityGroups],
                  labels: [...normalizedStructure.labels],
                  items: [...pageItems],
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
                  structure: {
                    rings: [...normalizedStructure.rings],
                    activityGroups: [...normalizedStructure.activityGroups],
                    labels: [...normalizedStructure.labels],
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
          // BATCH title, colors, and wheelStructure together to prevent race condition
          const fileUpdates = {};
          if (data.title) fileUpdates.title = data.title;
          if (data.colors) fileUpdates.colors = data.colors;
          fileUpdates.structure = {
            rings: [...processedOrgData.rings],
            activityGroups: [...processedOrgData.activityGroups],
            labels: [...processedOrgData.labels],
          };
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

  // Combined handler for palette changes - updates BOTH colors AND wheelStructure in ONE state update
  const handlePaletteChange = useCallback(async (newColors, newWheelStructure) => {
    // Update BOTH colors and wheelStructure in a SINGLE setUndoableStates call
    setUndoableStates({ 
      colors: newColors,
      wheelStructure: newWheelStructure
    });
    
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
          <div className="w-full h-full flex items-center justify-center">
            <YearWheel
              key={currentPageId} // Force remount when page changes to clear cached data
              wheelId={wheelId}
              wheelData={wheelData}
              title={title}
              year={year}
              colors={colors}
              ringsData={ringsData}
              wheelStructure={wheelStructure}
              completeWheelSnapshot={completeWheelSnapshot}
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
            wheelStructure={wheelStructure}
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
