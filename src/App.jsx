import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import YearWheel from "./YearWheel";
import OrganizationPanel from "./components/OrganizationPanel";
import Header from "./components/Header";
import Toast from "./components/Toast";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth.jsx";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./components/dashboard/Dashboard";
import InviteAcceptPage from "./components/InviteAcceptPage";
import PreviewWheelPage from "./components/PreviewWheelPage";
import { fetchWheel, saveWheelData, updateWheel } from "./services/wheelService";
import { useRealtimeWheel } from "./hooks/useRealtimeWheel";
import { useWheelPresence } from "./hooks/useWheelPresence";
import { useThrottledCallback, useDebouncedCallback } from "./hooks/useCallbackUtils";
import calendarEvents from "./calendarEvents.json";
import sampleOrgData from "./sampleOrganizationData.json";

function WheelEditor({ wheelId, onBackToDashboard }) {
  const [title, setTitle] = useState("Organisation");
  const [year, setYear] = useState("2025");
  // Grayscale color scheme (improved contrast)
  const [colors, setColors] = useState(["#334155", "#475569", "#64748B", "#94A3B8"]);
  
  // Start with one initial inner ring and default activity group
  const [organizationData, setOrganizationData] = useState({
    rings: [
      {
        id: "ring-1",
        name: "Ring 1",
        type: "inner", // inner = between center and month ring, outer = outside month ring
        visible: true
      }
    ],
    activityGroups: [
      {
        id: "group-1",
        name: "Aktivitetsgrupp 1",
        color: "#334155",
        visible: true
      }
    ],
    labels: [],
    items: []
  });
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
    
    isLoadingData.current = true; // Prevent auto-save during load
    
    try {
      console.log('[WheelEditor] Loading wheel data:', wheelId);
      const wheelData = await fetchWheel(wheelId);
      
      if (wheelData) {
        setTitle(wheelData.title || "Organisation");
        setYear(String(wheelData.year || new Date().getFullYear()));
        setIsPublic(wheelData.is_public || false);
        
        if (wheelData.colors) setColors(wheelData.colors);
        
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
  }, [wheelId]);

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
      
      // Update wheel metadata
      await updateWheel(wheelId, {
        title,
        year: parseInt(year),
        colors,
        showWeekRing,
        showMonthRing,
        showRingNames,
      });
      
      // Save organization data
      await saveWheelData(wheelId, organizationData);
      
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

  // Initial load on mount
  useEffect(() => {
    if (!wheelId) {
      setIsLoading(false);
      isInitialLoad.current = false; // Not initial load anymore
      return;
    }

    setIsLoading(true);
    loadWheelData().finally(() => {
      setIsLoading(false);
      // After initial load completes, enable auto-save
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 500);
    });
  }, [wheelId, loadWheelData]);

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

  // Ensure activity groups always have colors assigned from the palette
  useEffect(() => {
    if (organizationData?.activityGroups) {
      const needsColors = organizationData.activityGroups.some(group => !group.color);
      if (needsColors) {
        setOrganizationData(prevData => {
          const groupsWithColors = prevData.activityGroups.map((group, index) => ({
            ...group,
            color: colors[index % colors.length]
          }));
          return { ...prevData, activityGroups: groupsWithColors };
        });
      }
    }
  }, [organizationData, colors]);

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
        
        // First, update wheel metadata (title, year, colors, settings)
        await updateWheel(wheelId, {
          title,
          year: parseInt(year),
          colors,
          showWeekRing,
          showMonthRing,
          showRingNames,
        });
        
        // Then, save organization data (rings, activity groups, labels, items)
        await saveWheelData(wheelId, organizationData);
        
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

  const handleReset = () => {
    if (!confirm('Är du säker på att du vill återställa allt? All data kommer att raderas.')) return;
    
    // Reset to clean state with one initial inner ring
    setTitle("Organisation");
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
