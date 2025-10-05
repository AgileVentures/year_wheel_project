import { useState, useEffect } from "react";
import YearWheel from "./YearWheel";
import EditorPanel from "./components/EditorPanel";
import Header from "./components/Header";
import Toast from "./components/Toast";
import calendarEvents from "./calendarEvents.json";

function App() {
  const [title, setTitle] = useState("Kampanjplanering");
  const [year, setYear] = useState("2025");
  const [colors, setColors] = useState(["#0D4D73", "#42A5F5", "#BDBDBD", "#FFCA28"]);
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
      if (data.showWeekRing !== undefined) setShowWeekRing(data.showWeekRing);
      if (data.showMonthRing !== undefined) setShowMonthRing(data.showMonthRing);
      if (data.showYearEvents !== undefined) setShowYearEvents(data.showYearEvents);
      if (data.showSeasonRing !== undefined) setShowSeasonRing(data.showSeasonRing);
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
      showWeekRing,
      showMonthRing,
      showYearEvents,
      showSeasonRing,
    };
    localStorage.setItem("yearWheelData", JSON.stringify(dataToSave));
    
    // Show success feedback
    const event = new CustomEvent('showToast', { 
      detail: { message: 'Årshjulet har sparats!', type: 'success' } 
    });
    window.dispatchEvent(event);
  };

  const handleReset = () => {
    if (!confirm('Är du säker på att du vill återställa allt?')) return;
    
    setTitle("Kampanjplanering");
    setYear("2025");
    setColors(["#0D4D73", "#42A5F5", "#BDBDBD", "#FFCA28"]);
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
      detail: { message: 'Filen har sparats!', type: 'success' } 
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
            throw new Error('Ogiltig filformat');
          }

          // Load the data
          setTitle(data.title);
          setYear(data.year);
          if (data.colors) setColors(data.colors);
          setRingsData(data.ringsData);
          if (data.showWeekRing !== undefined) setShowWeekRing(data.showWeekRing);
          if (data.showMonthRing !== undefined) setShowMonthRing(data.showMonthRing);
          if (data.showYearEvents !== undefined) setShowYearEvents(data.showYearEvents);
          if (data.showSeasonRing !== undefined) setShowSeasonRing(data.showSeasonRing);

          // Show success feedback
          const toastEvent = new CustomEvent('showToast', { 
            detail: { message: 'Filen har laddats!', type: 'success' } 
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header 
        onSave={handleSave}
        onSaveToFile={handleSaveToFile}
        onLoadFromFile={handleLoadFromFile}
        onReset={handleReset}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Editor Sidebar */}
        <div className={`
          ${isSidebarOpen ? 'w-96' : 'w-0'}
          transition-all duration-300 ease-in-out
          bg-white border-r border-gray-200 overflow-hidden
        `}>
          <div className="h-full overflow-y-auto">
            <EditorPanel
              title={title}
              year={year}
              colors={colors}
              ringsData={ringsData}
              showYearEvents={showYearEvents}
              showSeasonRing={showSeasonRing}
              showWeekRing={showWeekRing}
              showMonthRing={showMonthRing}
              onTitleChange={setTitle}
              onYearChange={setYear}
              onColorChange={setColors}
              onRingsChange={setRingsData}
              onShowYearEventsChange={setShowYearEvents}
              onShowSeasonRingChange={setShowSeasonRing}
              onShowWeekRingChange={setShowWeekRing}
              onShowMonthRingChange={setShowMonthRing}
            />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-start p-8 overflow-auto">
          <div className="w-full flex flex-col items-center justify-start">
            <YearWheel
              title={title}
              year={year}
              colors={colors}
              ringsData={ringsData}
              showYearEvents={showYearEvents}
              showSeasonRing={showSeasonRing}
              yearEventsCollection={yearEventsCollection}
              showWeekRing={showWeekRing}
              showMonthRing={showMonthRing}
            />
          </div>
        </div>
      </div>
      
      <Toast />
    </div>
  );
}

export default App;
