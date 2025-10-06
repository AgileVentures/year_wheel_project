import { useState, useEffect } from "react";
import YearWheel from "./YearWheel";
import OrganizationPanel from "./components/OrganizationPanel";
import Header from "./components/Header";
import Toast from "./components/Toast";
import calendarEvents from "./calendarEvents.json";
import sampleOrgData from "./sampleOrganizationData.json";

function App() {
  const [title, setTitle] = useState("Organization");
  const [year, setYear] = useState("2025");
  // Plandisc color scheme from screenshot: beige/cream, mint green, coral, light blue
  const [colors, setColors] = useState(["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"]);
  
  // New organization data structure with sample data
  const [organizationData, setOrganizationData] = useState(sampleOrgData);
  const [zoomedMonth, setZoomedMonth] = useState(null);
  
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

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("yearWheelData"));
    if (data) {
      setRingsData(data.ringsData);
      setTitle(data.title);
      setYear(data.year);
      if (data.colors) setColors(data.colors);
      if (data.organizationData) setOrganizationData(data.organizationData);
      if (data.showWeekRing !== undefined) setShowWeekRing(data.showWeekRing);
      if (data.showMonthRing !== undefined) setShowMonthRing(data.showMonthRing);
      if (data.showYearEvents !== undefined) setShowYearEvents(data.showYearEvents);
      if (data.showSeasonRing !== undefined) setShowSeasonRing(data.showSeasonRing);
    }
  }, []);

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

  const handleSave = () => {
    const dataToSave = {
      title,
      year,
      colors,
      ringsData,
      organizationData,
      showWeekRing,
      showMonthRing,
      showYearEvents,
      showSeasonRing,
    };
    localStorage.setItem("yearWheelData", JSON.stringify(dataToSave));
    
    // Show success feedback
    const event = new CustomEvent('showToast', { 
      detail: { message: 'Data har sparats!', type: 'success' } 
    });
    window.dispatchEvent(event);
  };

  const handleReset = () => {
    if (!confirm('Är du säker på att du vill återställa allt?')) return;
    
    setTitle("Organisation");
    setYear("2025");
    setColors(["#F5E6D3", "#A8DCD1", "#F4A896", "#B8D4E8"]);
    setOrganizationData(sampleOrgData);
    setRingsData([
      {
        data: Array.from({ length: 12 }, () => [""]),
        orientation: "vertical"
      }
    ]);
    setShowYearEvents(false);
    setShowWeekRing(true);
    setShowMonthRing(true);
    localStorage.removeItem("yearWheelData");
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
      showYearEvents,
      showSeasonRing,
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
          // Then set organizationData (use empty structure if not present in file)
          setOrganizationData(data.organizationData || { rings: [], activities: [], labels: [], items: [] });
          if (data.showWeekRing !== undefined) setShowWeekRing(data.showWeekRing);
          if (data.showMonthRing !== undefined) setShowMonthRing(data.showMonthRing);
          if (data.showYearEvents !== undefined) setShowYearEvents(data.showYearEvents);
          if (data.showSeasonRing !== undefined) setShowSeasonRing(data.showSeasonRing);

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

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onSave={handleSave}
        onSaveToFile={handleSaveToFile}
        onLoadFromFile={handleLoadFromFile}
        onReset={handleReset}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
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
              zoomedMonth={zoomedMonth}
              onUpdateItem={(updatedItem) => {
                const updatedItems = organizationData.items.map(item =>
                  item.id === updatedItem.id ? updatedItem : item
                );
                setOrganizationData({ ...organizationData, items: updatedItems });
              }}
              onDeleteItem={(itemId) => {
                const updatedItems = organizationData.items.filter(item => item.id !== itemId);
                setOrganizationData({ ...organizationData, items: updatedItems });
              }}
            />
          </div>
        </div>

      </div>
      
      <Toast />
    </div>
  );
}

export default App;
