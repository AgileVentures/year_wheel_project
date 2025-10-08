import { useState, useEffect, useCallback } from "react";
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
import { fetchWheel, saveWheelData, updateWheel } from "./services/wheelService";
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
  const [isSaving, setIsSaving] = useState(false);

  // Load wheel data from database
  useEffect(() => {
    if (!wheelId) {
      setIsLoading(false);
      return;
    }

    const loadWheel = async () => {
      setIsLoading(true);
      try {
        const wheelData = await fetchWheel(wheelId);
        
        if (wheelData) {
          setTitle(wheelData.title || "Organisation");
          setYear(String(wheelData.year || new Date().getFullYear()));
          
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
        setIsLoading(false);
      }
    };

    loadWheel();
  }, [wheelId]);

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
      setIsSaving(true);
      try {
        console.log('Saving wheel data...', {
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
        
        console.log('Wheel data saved successfully');
        
        // Show success feedback
        const event = new CustomEvent('showToast', { 
          detail: { message: 'Data har sparats!', type: 'success' } 
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Error saving wheel:', error);
        const event = new CustomEvent('showToast', { 
          detail: { message: 'Kunde inte spara', type: 'error' } 
        });
        window.dispatchEvent(event);
      } finally {
        setIsSaving(false);
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
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        try {
          const data = JSON.parse(readerEvent.target.result);
          
          // Validate the data structure (allow empty title)
          if (data.title === undefined || !data.year || !data.ringsData) {
            throw new Error('Invalid file format');
          }

          // Load the data
          setTitle(data.title);
          setYear(data.year);
          if (data.colors) setColors(data.colors);
          // Set ringsData first (for backward compatibility with old format)
          if (data.ringsData) setRingsData(data.ringsData);
          
          // Handle organizationData with backward compatibility
          if (data.organizationData) {
            const orgData = { ...data.organizationData };
            
            // Backward compatibility: convert old 'activities' to 'activityGroups'
            if (orgData.activities && !orgData.activityGroups) {
              orgData.activityGroups = orgData.activities;
              delete orgData.activities;
            }
            
            // Ensure required arrays exist
            orgData.rings = orgData.rings || [];
            orgData.activityGroups = orgData.activityGroups || [];
            orgData.labels = orgData.labels || [];
            orgData.items = orgData.items || [];
            
            console.log('Loaded organization data from file:', {
              rings: orgData.rings.length,
              activityGroups: orgData.activityGroups.length,
              labels: orgData.labels.length,
              items: orgData.items.length,
            });
            
            setOrganizationData(orgData);
          } else {
            // Use default structure if not present in file
            setOrganizationData({ 
              rings: [], 
              activityGroups: [], 
              labels: [], 
              items: [] 
            });
          }
          
          if (data.showWeekRing !== undefined) setShowWeekRing(data.showWeekRing);
          if (data.showMonthRing !== undefined) setShowMonthRing(data.showMonthRing);
          if (data.showYearEvents !== undefined) setShowYearEvents(data.showYearEvents);
          if (data.showSeasonRing !== undefined) setShowSeasonRing(data.showSeasonRing);
          if (data.showRingNames !== undefined) setShowRingNames(data.showRingNames);

          // Show success feedback
          const toastEvent = new CustomEvent('showToast', { 
            detail: { message: 'Fil laddad!', type: 'success' } 
          });
          window.dispatchEvent(toastEvent);
        } catch (error) {
          console.error('Error loading file:', error);
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
