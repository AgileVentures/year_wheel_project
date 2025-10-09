import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import YearWheel from "./YearWheel";
import OrganizationPanel from "./components/OrganizationPanel";
import Header from "./components/Header";
import Toast from "./components/Toast";
import VersionHistoryModal from "./components/VersionHistoryModal";
import PageNavigator from "./components/PageNavigator";
import AddPageModal from "./components/AddPageModal";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth.jsx";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./components/dashboard/Dashboard";
import InviteAcceptPage from "./components/InviteAcceptPage";
import PreviewWheelPage from "./components/PreviewWheelPage";
import { fetchWheel, saveWheelData, updateWheel, createVersion, fetchPages, createPage, updatePage, deletePage, duplicatePage } from "./services/wheelService";
import { supabase } from "./lib/supabase";
import { useRealtimeWheel } from "./hooks/useRealtimeWheel";
import { useWheelPresence } from "./hooks/useWheelPresence";
import { useThrottledCallback, useDebouncedCallback } from "./hooks/useCallbackUtils";
import { useMultiStateUndoRedo } from "./hooks/useUndoRedo";
import calendarEvents from "./calendarEvents.json";
import sampleOrgData from "./sampleOrganizationData.json";

function WheelEditor({ wheelId, onBackToDashboard }) {
  // Undo/Redo for main editable states
  const {
    states: undoableStates,
    setStates: setUndoableStates,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearHistory
  } = useMultiStateUndoRedo({
    title: "Nytt hjul",
    year: "2025",
    colors: ["#334155", "#475569", "#64748B", "#94A3B8"],
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
    limit: 100, // Keep 100 undo steps
    debounceMs: 500 // Group rapid changes
  });

  // Extract states from undo-managed object
  const title = undoableStates.title;
  const year = undoableStates.year;
  const colors = undoableStates.colors;
  const organizationData = undoableStates.organizationData;
  
  // Wrapper functions for setting undo-tracked state
  const setTitle = useCallback((value) => {
    setUndoableStates({ title: typeof value === 'function' ? value(title) : value });
  }, [setUndoableStates, title]);
  
  const setYear = useCallback((value) => {
    setUndoableStates({ year: typeof value === 'function' ? value(year) : value });
  }, [setUndoableStates, year]);
  
  const setColors = useCallback((value) => {
    setUndoableStates({ colors: typeof value === 'function' ? value(colors) : value });
  }, [setUndoableStates, colors]);
  
  const setOrganizationData = useCallback((value) => {
    setUndoableStates({ organizationData: typeof value === 'function' ? value(organizationData) : value });
  }, [setUndoableStates, organizationData]);
  
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
  const [downloadFormat, setDownloadFormat] = useState("png");
  const [yearWheelRef, setYearWheelRef] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // For UI feedback in Header
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isPublic, setIsPublic] = useState(false); // Public sharing toggle
  const [showVersionHistory, setShowVersionHistory] = useState(false); // Version history modal
  
  // Multi-page state
  const [pages, setPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  
  // Track if we're currently loading data to prevent auto-save during load
  const isLoadingData = useRef(false);
  // Track if this is the initial load to prevent auto-save on mount
  const isInitialLoad = useRef(true);
  // Track if data came from realtime update to prevent save loop
  const isRealtimeUpdate = useRef(false);
  // Track recent save timestamp to ignore own broadcasts (within 3 seconds)
  const lastSaveTimestamp = useRef(0);
  // Track if we're currently saving to prevent realtime reload during save (ref for logic, state for UI)
  const isSavingRef = useRef(false);

  // Load wheel data function (memoized to avoid recreating)
  const loadWheelData = useCallback(async () => {
    if (!wheelId) return;
    
    console.log('[WheelEditor] Starting loadWheelData for wheel:', wheelId);
    isLoadingData.current = true; // Prevent auto-save during load
    
    try {
      console.log('[WheelEditor] Fetching wheel data:', wheelId);
      const wheelData = await fetchWheel(wheelId);
      
      if (wheelData) {
        // IMPORTANT: Only use default if title is truly empty/null/undefined
        if (wheelData.title) {
          setTitle(wheelData.title);
        }
        setIsPublic(wheelData.is_public || false);
        
        if (wheelData.colors) setColors(wheelData.colors);
        
        // Load pages for this wheel
        const pagesData = await fetchPages(wheelId);
        setPages(pagesData);
        
        // If we have pages, load data from first page (or current page if set)
        if (pagesData.length > 0) {
          const pageToLoad = currentPageId 
            ? pagesData.find(p => p.id === currentPageId) || pagesData[0]
            : pagesData[0];
          
          setCurrentPageId(pageToLoad.id);
          setYear(String(pageToLoad.year || new Date().getFullYear()));
          
          if (pageToLoad.organization_data) {
            const orgData = pageToLoad.organization_data;
            
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
                color: wheelData.colors?.[0] || "#334155",
                visible: true
              }];
            }
            
            setOrganizationData(orgData);
          }
        } else {
          // Fallback: Load from wheel's organization data (legacy support)
          setYear(String(wheelData.year || new Date().getFullYear()));
          
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
                color: wheelData.colors?.[0] || "#334155",
                visible: true
              }];
            }
            
            setOrganizationData(orgData);
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
      }
    } catch (error) {
      console.error('Error loading wheel:', error);
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Kunde inte ladda hjul', type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      // Reset flags after load completes
      isLoadingData.current = false;
      isRealtimeUpdate.current = false;
      console.log('[WheelEditor] Load complete, flags reset');
    }
  }, [wheelId]); // Only depend on wheelId - NOT on currentPageId

  // Throttled reload for realtime updates (max once per second)
  const throttledReload = useThrottledCallback(() => {
    console.log('[Realtime] Reloading wheel data due to remote changes');
    loadWheelData();
    
    // NO TOAST - too many notifications annoy users
    // Users will see the changes appear on the wheel directly
  }, 1000);

  // Handle realtime data changes from other users
  const handleRealtimeChange = useCallback((eventType, tableName, payload) => {
    console.log(`[Realtime] ${tableName} ${eventType}:`, payload);
    
    // Ignore broadcasts from our own recent saves (within 3 seconds)
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 3000) {
      console.log('[Realtime] Ignoring own broadcast (saved', timeSinceLastSave, 'ms ago)');
      return;
    }
    
    // Don't reload during active save operation
    if (isSavingRef.current) {
      console.log('[Realtime] Ignoring update during active save');
      return;
    }
    
    // Mark as realtime update to prevent auto-save loop
    // This flag will be reset in loadWheelData's finally block
    isRealtimeUpdate.current = true;
    
    // Reload the wheel data when any change occurs
    // Throttled to prevent too many reloads
    throttledReload();
  }, [throttledReload]);

  // Enable realtime sync for this wheel
  useRealtimeWheel(wheelId, handleRealtimeChange);

  // Handle realtime page changes
  const handlePageRealtimeChange = useCallback((eventType, payload) => {
    console.log(`[Realtime] wheel_pages ${eventType}:`, payload);
    
    // Ignore our own recent changes
    const timeSinceLastSave = Date.now() - lastSaveTimestamp.current;
    if (timeSinceLastSave < 3000) {
      console.log('[Realtime] Ignoring own page broadcast');
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
      
      // If this is the current page, reload its data and apply template colors
      if (payload.new.id === currentPageId) {
        const dataWithColors = applyTemplateColors(payload.new.organization_data);
        console.log('[Realtime] Applying template colors to updated page data');
        setOrganizationData(dataWithColors);
        setYear(String(payload.new.year));
      }
    } else if (eventType === 'DELETE') {
      // Page deleted by another user
      setPages(prevPages => {
        const filtered = prevPages.filter(p => p.id !== payload.old.id);
        
        // If deleted current page, switch to first remaining page and apply colors
        if (payload.old.id === currentPageId && filtered.length > 0) {
          const newCurrentPage = filtered[0];
          setCurrentPageId(newCurrentPage.id);
          const dataWithColors = applyTemplateColors(newCurrentPage.organization_data);
          console.log('[Realtime] Applying template colors after page deletion');
          setOrganizationData(dataWithColors);
          setYear(String(newCurrentPage.year));
        }
        
        return filtered;
      });
    }
  }, [currentPageId, lastSaveTimestamp, applyTemplateColors]);

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

  // Auto-save function (debounced to prevent excessive saves)
  const autoSave = useDebouncedCallback(async () => {
    // Don't auto-save if:
    // 1. No wheelId (localStorage mode)
    // 2. Currently loading data
    // 3. This is the initial load
    // 4. Data came from realtime update
    // 5. Auto-save is disabled
    if (!wheelId || isLoadingData.current || isInitialLoad.current || isRealtimeUpdate.current || !autoSaveEnabled) {
      console.log('[AutoSave] Skipped - wheelId:', !!wheelId, 
                  'loading:', isLoadingData.current, 
                  'initial:', isInitialLoad.current,
                  'realtime:', isRealtimeUpdate.current,
                  'enabled:', autoSaveEnabled);
      return;
    }

    try {
      console.log('[AutoSave] Saving changes...');
      
      // Mark as saving to prevent realtime interference
      // NOTE: Don't update isSaving state - auto-save should be invisible
      isSavingRef.current = true;
      
      // Update wheel metadata (NOT including year - it's per-page now)
      await updateWheel(wheelId, {
        title,
        colors,
        showWeekRing,
        showMonthRing,
        showRingNames,
      });
      
      // Save current page data if we have pages
      if (currentPageId) {
        await updatePage(currentPageId, {
          organization_data: organizationData,
          year: parseInt(year)
        });
      } else {
        // Fallback: save organization data to wheel (legacy)
        await saveWheelData(wheelId, organizationData);
      }
      
      // Mark the save timestamp to ignore our own broadcasts
      lastSaveTimestamp.current = Date.now();
      
      console.log('[AutoSave] Changes saved successfully (silent)');
      
      // NO TOAST - auto-save should be completely invisible to user
    } catch (error) {
      console.error('[AutoSave] Error:', error);
      // Show error toast only on failure (user needs to know about problems)
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Auto-sparning misslyckades', type: 'error' } 
      });
      window.dispatchEvent(event);
    } finally {
      // Re-enable realtime after save completes
      isSavingRef.current = false;
      // Don't update isSaving state - keep UI unchanged
    }
  }, 2000); // Wait 2 seconds after last change before saving

  // Auto-save when organizationData changes
  useEffect(() => {
    autoSave();
  }, [organizationData, autoSave]);

  // Auto-save when wheel settings change
  useEffect(() => {
    if (!isInitialLoad.current) {
      autoSave();
    }
  }, [title, year, colors, showWeekRing, showMonthRing, showRingNames, autoSave]);

  // Initial load on mount AND cleanup when wheelId changes
  useEffect(() => {
    console.log('[WheelEditor] useEffect triggered, wheelId:', wheelId);
    
    if (!wheelId) {
      setIsLoading(false);
      isInitialLoad.current = false; // Not initial load anymore
      return;
    }

    // IMPORTANT: Set initial load flag BEFORE loading data
    isInitialLoad.current = true;
    setIsLoading(true);
    
    loadWheelData().finally(() => {
      setIsLoading(false);
      // After initial load completes, enable auto-save
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    });

    // CLEANUP: Reset all state when wheelId changes or component unmounts
    return () => {
      console.log('[WheelEditor] CLEANUP - Leaving wheel:', wheelId, '- Resetting all state');
      
      // Reset ALL state to defaults to prevent data leakage between wheels
      setOrganizationData({
        rings: [],
        activityGroups: [],
        labels: [],
        items: []
      });
      setPages([]);
      setCurrentPageId(null);
      // DON'T reset title - let new wheel data overwrite it to avoid flicker
      // setTitle("Organisation"); 
      setYear(String(new Date().getFullYear()));
      setColors(["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"]);
      setShowWeekRing(true);
      setShowMonthRing(true);
      setShowRingNames(true);
      setRingsData([]);
      
      // Reset ALL flags
      isInitialLoad.current = true;
      isLoadingData.current = false;
      isRealtimeUpdate.current = false;
      isSavingRef.current = false;
      lastSaveTimestamp.current = 0;
      
      // Clear undo/redo history
      clearHistory();
      
      console.log('[WheelEditor] CLEANUP complete - State and history cleared');
    };
  }, [wheelId]); // Only depend on wheelId - clearHistory is stable but we don't need it here

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
  }, [wheelId]);

  // Helper function to apply template colors to organization data
  const applyTemplateColors = useCallback((data) => {
    if (!data) return data;
    
    const updatedData = { ...data };
    
    // Apply colors to activity groups
    if (data.activityGroups && data.activityGroups.length > 0) {
      updatedData.activityGroups = data.activityGroups.map((group, index) => ({
        ...group,
        color: colors[index % colors.length]
      }));
    }
    
    // Apply colors to OUTER rings only (inner rings don't use template colors)
    if (data.rings && data.rings.length > 0) {
      updatedData.rings = data.rings.map((ring) => {
        // Only apply template colors to outer rings
        if (ring.type === 'outer') {
          const outerRings = data.rings.filter(r => r.type === 'outer');
          const outerIndex = outerRings.findIndex(r => r.id === ring.id);
          return {
            ...ring,
            color: colors[outerIndex % colors.length]
          };
        }
        return ring; // Keep inner rings as-is
      });
    }
    
    return updatedData;
  }, [colors]);

  // Apply template colors when colors change
  useEffect(() => {
    if (!organizationData || isLoadingData.current || isInitialLoad.current) return;
    
    const updatedData = applyTemplateColors(organizationData);
    
    // Only update if colors actually changed
    const hasChanges = 
      JSON.stringify(updatedData.activityGroups) !== JSON.stringify(organizationData.activityGroups) ||
      JSON.stringify(updatedData.rings) !== JSON.stringify(organizationData.rings);
    
    if (hasChanges) {
      console.log('[Colors] Applying template colors to rings and activity groups');
      setOrganizationData(updatedData);
    }
  }, [colors]); // Only trigger when colors array changes

  useEffect(() => {
    // Filter events that overlap with the selected year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    
    const yearEvents = calendarEvents.events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      
      // Include event if it overlaps with the selected year at all
      return eventEnd >= yearStart && eventStart <= yearEnd;
    });
    
    setYearEventsCollection(yearEvents);
  }, [year]);

  const handleSave = async () => {
    // If we have a wheelId, save to database
    if (wheelId) {
      // Temporarily disable auto-save during manual save
      const wasAutoSaveEnabled = autoSaveEnabled;
      setAutoSaveEnabled(false);
      isSavingRef.current = true;
      setIsSaving(true); // Update UI
      
      try {
        console.log('[ManualSave] Saving wheel data...', {
          wheelId,
          title,
          year,
          organizationData: {
            rings: organizationData.rings?.length || 0,
            activityGroups: organizationData.activityGroups?.length || 0,
            labels: organizationData.labels?.length || 0,
            items: organizationData.items?.length || 0,
          }
        });
        console.log('Full organizationData:', organizationData);
        
        // First, update wheel metadata (title, colors, settings)
        await updateWheel(wheelId, {
          title,
          colors,
          showWeekRing,
          showMonthRing,
          showRingNames,
        });
        
        // Save current page data if we have pages
        if (currentPageId) {
          await updatePage(currentPageId, {
            organization_data: organizationData,
            year: parseInt(year)
          });
        } else {
          // Fallback: save organization data directly to wheel (legacy support)
          await saveWheelData(wheelId, organizationData);
        }
        
        // Create version snapshot after successful save
        try {
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
            null, // No manual description
            false // Not an auto-save
          );
          console.log('[ManualSave] Version snapshot created');
        } catch (versionError) {
          console.error('[ManualSave] Error creating version:', versionError);
          // Don't fail the save if version creation fails
        }
        
        // Mark the save timestamp to ignore our own broadcasts
        lastSaveTimestamp.current = Date.now();
        
        console.log('[ManualSave] Wheel data saved successfully');
        
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
      
      // Show success feedback
      const event = new CustomEvent('showToast', { 
        detail: { message: 'Data har sparats!', type: 'success' } 
      });
      window.dispatchEvent(event);
    }
  };

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

  // ========== PAGE MANAGEMENT FUNCTIONS ==========
  
  // Load all pages for current wheel
  const loadPages = useCallback(async () => {
    if (!wheelId) return;
    
    try {
      const pagesData = await fetchPages(wheelId);
      // Sort pages by year
      const sortedPages = pagesData.sort((a, b) => a.year - b.year);
      setPages(sortedPages);
      
      // Set current page to first page if none selected
      if (sortedPages.length > 0 && !currentPageId) {
        setCurrentPageId(sortedPages[0].id);
        // Load first page's data and apply template colors
        if (sortedPages[0].organization_data) {
          const dataWithColors = applyTemplateColors(sortedPages[0].organization_data);
          console.log('[LoadPages] Applying template colors to loaded page data');
          setOrganizationData(dataWithColors);
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
  }, [wheelId, currentPageId, applyTemplateColors]);

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
      
      // Load new page data and apply template colors
      const newPage = pages.find(p => p.id === pageId);
      if (newPage) {
        setCurrentPageId(pageId);
        if (newPage.organization_data) {
          const dataWithColors = applyTemplateColors(newPage.organization_data);
          console.log('[PageChange] Applying template colors to page data');
          setOrganizationData(dataWithColors);
        }
        if (newPage.year) {
          setYear(String(newPage.year));
        }
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
            color: colors[0] || "#334155",
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
      // Find highest year from existing pages and add 1
      const maxYear = pages.length > 0 
        ? Math.max(...pages.map(p => p.year))
        : parseInt(year);
      const nextYear = maxYear + 1;
      
      // Duplicate current structure but with next year
      const newPage = await createPage(wheelId, {
        year: nextYear,
        title: `${nextYear}`,
        organization_data: organizationData // Copy current structure
      });
      
      // Sort pages by year after adding
      const updatedPages = [...pages, newPage].sort((a, b) => a.year - b.year);
      setPages(updatedPages);
      setShowAddPageModal(false);
      
      const event = new CustomEvent('showToast', {
        detail: { message: `Ny sida för ${nextYear} skapad!`, type: 'success' }
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
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kan inte radera sista sidan', type: 'error' }
      });
      window.dispatchEvent(event);
      return;
    }
    
    if (!confirm('Är du säker på att du vill radera denna sida?')) return;
    
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
      if (versionData.title) setTitle(versionData.title);
      if (versionData.year) setYear(versionData.year.toString());
      if (versionData.colors) setColors(versionData.colors);
      if (typeof versionData.showWeekRing === 'boolean') setShowWeekRing(versionData.showWeekRing);
      if (typeof versionData.showMonthRing === 'boolean') setShowMonthRing(versionData.showMonthRing);
      if (typeof versionData.showRingNames === 'boolean') setShowRingNames(versionData.showRingNames);
      if (versionData.organizationData) setOrganizationData(versionData.organizationData);

      // Save the restored state
      await handleSave();
      
      setShowVersionHistory(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Kunde inte återställa version', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const handleReset = () => {
    if (!confirm('Är du säker på att du vill återställa allt? All data kommer att raderas.')) return;
    
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

  // Memoize callbacks to prevent infinite loops
  const handleUpdateAktivitet = useCallback((updatedItem) => {
    setOrganizationData(prevData => ({
      ...prevData,
      items: prevData.items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      )
    }));
  }, []);

  const handleDeleteAktivitet = useCallback((itemId) => {
    setOrganizationData(prevData => ({
      ...prevData,
      items: prevData.items.filter(item => item.id !== itemId)
    }));
  }, []);

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
          if (data.title === undefined || !data.year || !data.ringsData) {
            throw new Error('Invalid file format');
          }

          console.log('[FileImport] Starting file import...');
          
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
            
            console.log('[FileImport] Processed organization data from file:', {
              rings: processedOrgData.rings.length,
              activityGroups: processedOrgData.activityGroups.length,
              labels: processedOrgData.labels.length,
              items: processedOrgData.items.length,
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
              console.log('[FileImport] Saving imported data to database...');
              
              // Save immediately to prevent realtime from overwriting
              await updateWheel(wheelId, {
                title: data.title,
                year: parseInt(data.year),
                colors: data.colors || colors,
                showWeekRing: data.showWeekRing ?? showWeekRing,
                showMonthRing: data.showMonthRing ?? showMonthRing,
                showRingNames: data.showRingNames ?? showRingNames,
              });
              
              // Save organization data using the PROCESSED data
              await saveWheelData(wheelId, processedOrgData);
              
              console.log('[FileImport] Successfully saved to database');
              
              // Show success feedback
              const toastEvent = new CustomEvent('showToast', { 
                detail: { message: 'Fil laddad och sparad!', type: 'success' } 
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
          setTitle(data.title);
          setYear(data.year);
          if (data.colors) setColors(data.colors);
          // Set ringsData first (for backward compatibility with old format)
          if (data.ringsData) setRingsData(data.ringsData);
          setOrganizationData(processedOrgData);
          
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
            console.log('[FileImport] Import complete, realtime re-enabled');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Laddar hjul...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onSave={handleSave}
        isSaving={isSaving}
        onBackToDashboard={wheelId ? onBackToDashboard : null}
        onSaveToFile={handleSaveToFile}
        onLoadFromFile={handleLoadFromFile}
        onReset={handleReset}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        year={year}
        onYearChange={setYear}
        onDownloadImage={() => yearWheelRef && yearWheelRef.downloadImage(downloadFormat)}
        downloadFormat={downloadFormat}
        onDownloadFormatChange={setDownloadFormat}
        activeUsers={activeUsers}
        isPublic={isPublic}
        wheelId={wheelId}
        onTogglePublic={handleTogglePublic}
        onVersionHistory={wheelId ? () => setShowVersionHistory(true) : null}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        // Page navigation props
        pages={pages}
        currentPageId={currentPageId}
        onPageChange={handlePageChange}
        onAddPage={handleAddPage}
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
            onColorsChange={setColors}
            onZoomToMonth={setZoomedMonth}
            onZoomToQuarter={setZoomedQuarter}
            showRingNames={showRingNames}
            onShowRingNamesChange={setShowRingNames}
          />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
          <div className="w-full h-full flex items-center justify-center">
            <YearWheel
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
              zoomedMonth={zoomedMonth}
              zoomedQuarter={zoomedQuarter}
              onSetZoomedMonth={setZoomedMonth}
              onSetZoomedQuarter={setZoomedQuarter}
              onWheelReady={setYearWheelRef}
              onUpdateAktivitet={handleUpdateAktivitet}
              onDeleteAktivitet={handleDeleteAktivitet}
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
        <AddPageModal
          currentPage={pages.find(p => p.id === currentPageId)}
          onClose={() => setShowAddPageModal(false)}
          onCreateBlank={handleCreateBlankPage}
          onDuplicate={() => handleDuplicatePage(currentPageId)}
          onCreateNextYear={handleCreateNextYear}
        />
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

  return (
    <WheelEditor 
      wheelId={wheelId} 
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
    console.log('getAuthRedirect - pendingToken:', pendingToken);
    if (pendingToken) {
      console.log('Redirecting to invite page:', `/invite/${pendingToken}`);
      return `/invite/${pendingToken}`;
    }
    return '/dashboard';
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={user ? <Navigate to={getAuthRedirect()} replace /> : <AuthPage />} />
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
      <Route path="/preview-wheel/:wheelId" element={<PreviewWheelPage />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardRoute />
        </ProtectedRoute>
      } />
      <Route path="/wheel/:wheelId" element={
        <ProtectedRoute>
          <WheelEditorRoute />
        </ProtectedRoute>
      } />

      {/* Redirect root to dashboard or auth */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
      
      {/* 404 redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
