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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header 
        onSave={handleSave} 
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
