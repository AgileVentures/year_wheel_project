import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ZoomIn, ZoomOut } from 'lucide-react';

function TimelineDemo() {
  const { t } = useTranslation(['landing']);
  const [demoStep, setDemoStep] = useState(0);
  const [zoomLevel, setZoomLevel] = useState('month');
  const [hoveredBar, setHoveredBar] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Timeline bars grouped by ring with individual rows per activity
  const ringData = [
    {
      ring: t('landing:timelineDemo.rings.campaigns', 'Campaigns'),
      color: '#3b82f6',
      activities: [
        { id: 'bar1', name: t('landing:timelineDemo.items.campaign1', 'Spring Launch'), startMonth: 2, widthMonths: 1 },
        { id: 'bar2', name: t('landing:timelineDemo.items.campaign2', 'Summer Campaign'), startMonth: 5, widthMonths: 3 },
        { id: 'bar5', name: t('landing:timelineDemo.items.campaign3', 'Fall Promotion'), startMonth: 8, widthMonths: 1.5 },
      ]
    },
    {
      ring: t('landing:timelineDemo.rings.content', 'Content'),
      color: '#8b5cf6',
      activities: [
        { id: 'bar3', name: t('landing:timelineDemo.items.content1', 'Blog Posts Q1'), startMonth: 0, widthMonths: 3 },
        { id: 'bar4', name: t('landing:timelineDemo.items.content2', 'Video Series'), startMonth: 3, widthMonths: 3 },
        { id: 'bar6', name: t('landing:timelineDemo.items.content3', 'Social Media Plan'), startMonth: 6, widthMonths: 3 },
      ]
    },
  ];

  const months = [
    t('landing:timelineDemo.months.jan', 'Jan'),
    t('landing:timelineDemo.months.feb', 'Feb'),
    t('landing:timelineDemo.months.mar', 'Mar'),
    t('landing:timelineDemo.months.apr', 'Apr'),
    t('landing:timelineDemo.months.may', 'May'),
    t('landing:timelineDemo.months.jun', 'Jun'),
    t('landing:timelineDemo.months.jul', 'Jul'),
    t('landing:timelineDemo.months.aug', 'Aug'),
    t('landing:timelineDemo.months.sep', 'Sep'),
    t('landing:timelineDemo.months.oct', 'Oct'),
    t('landing:timelineDemo.months.nov', 'Nov'),
    t('landing:timelineDemo.months.dec', 'Dec'),
  ];

  // Calculate total row height based on activities per ring
  const ACTIVITY_ROW_HEIGHT = 50;
  const RING_HEADER_HEIGHT = 40;

  // Demo sequence
  useEffect(() => {
    const timers = [];

    // Step 1: Hover over first bar at 1500ms
    timers.push(setTimeout(() => {
      setHoveredBar('bar1');
      setDemoStep(1);
    }, 1500));

    // Step 2: Unhover at 3000ms
    timers.push(setTimeout(() => {
      setHoveredBar(null);
      setDemoStep(2);
    }, 3000));

    // Step 3: Scroll timeline slightly at 4000ms
    timers.push(setTimeout(() => {
      let pos = 0;
      const scrollInterval = setInterval(() => {
        pos += 2;
        setScrollPosition(pos);
        if (pos >= 100) {
          clearInterval(scrollInterval);
        }
      }, 20);
      timers.push(scrollInterval);
      setDemoStep(3);
    }, 4000));

    // Step 4: Zoom in at 7000ms
    timers.push(setTimeout(() => {
      setZoomLevel('week');
      setDemoStep(4);
    }, 7000));

    // Step 5: Reset at 10000ms
    timers.push(setTimeout(() => {
      setZoomLevel('month');
      setScrollPosition(0);
      setHoveredBar(null);
      setDemoStep(0);
    }, 10000));

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [demoStep]);

  // Calculate widths based on zoom level
  const monthWidth = zoomLevel === 'week' ? 120 : 80;
  const timelineWidth = months.length * monthWidth;

  return (
    <div className="aspect-video bg-white p-4">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-6 w-auto" />
            <span className="text-sm font-medium text-gray-700">{t('landing:demo.wheelTitle')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className={`p-1.5 rounded transition-colors ${zoomLevel === 'month' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              onClick={() => setZoomLevel('month')}
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <button 
              className={`p-1.5 rounded transition-colors ${zoomLevel === 'week' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              onClick={() => setZoomLevel('week')}
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <div className="ml-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-sm font-medium">
              2026
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Ring names */}
          <div className="w-48 border-r border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-4 py-3">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('landing:timelineDemo.rings.title', 'Rings')}
              </span>
            </div>
            <div>
              {ringData.map((ringGroup, idx) => (
                <div key={idx}>
                  {/* Ring header */}
                  <div className="border-b border-gray-300 px-4 py-2 bg-gray-50" style={{ height: RING_HEADER_HEIGHT }}>
                    <div className="text-sm font-semibold text-gray-900">{ringGroup.ring}</div>
                  </div>
                  {/* Activity rows */}
                  {ringGroup.activities.map((activity, actIdx) => (
                    <div key={activity.id} className="border-b border-gray-200 px-4 py-2 bg-white" style={{ height: ACTIVITY_ROW_HEIGHT }}>
                      <div className="text-xs text-gray-700 truncate">{activity.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {Math.round(activity.widthMonths * 30)} {t('landing:timelineDemo.days', 'days')}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline area */}
          <div className="flex-1 overflow-hidden">
            {/* Month headers */}
            <div className="bg-gray-100 border-b border-gray-200 overflow-hidden">
              <div 
                className="flex"
                style={{ 
                  transform: `translateX(-${scrollPosition}px)`,
                  transition: 'transform 0.3s ease-out',
                  width: timelineWidth
                }}
              >
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="border-r border-gray-200 px-2 py-3 text-center flex-shrink-0"
                    style={{ width: monthWidth }}
                  >
                    <div className="text-xs font-semibold text-gray-700">{month}</div>
                    {zoomLevel === 'week' && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        W{idx * 4 + 1}-{idx * 4 + 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline bars with ring groups */}
            <div className="overflow-hidden bg-white relative" style={{ height: 'calc(100% - 60px)' }}>
              <div 
                className="absolute inset-0"
                style={{ 
                  transform: `translateX(-${scrollPosition}px)`,
                  transition: 'transform 0.3s ease-out',
                  width: timelineWidth
                }}
              >
                {ringData.map((ringGroup, ringIdx) => (
                  <div key={ringIdx}>
                    {/* Ring header row */}
                    <div
                      className="border-b border-gray-300 bg-gray-50 relative flex items-center"
                      style={{ height: RING_HEADER_HEIGHT }}
                    >
                      {/* Month grid lines */}
                      {months.map((_, monthIdx) => (
                        <div
                          key={monthIdx}
                          className="absolute top-0 bottom-0 border-r border-gray-100"
                          style={{ left: monthIdx * monthWidth, width: monthWidth }}
                        />
                      ))}
                      <div className="px-3 text-sm font-semibold text-gray-700 relative z-10">
                        {ringGroup.ring}
                      </div>
                    </div>

                    {/* Activity rows for this ring */}
                    {ringGroup.activities.map((activity, actIdx) => (
                      <div
                        key={activity.id}
                        className="border-b border-gray-200 relative"
                        style={{ height: ACTIVITY_ROW_HEIGHT }}
                      >
                        {/* Month grid lines */}
                        {months.map((_, monthIdx) => (
                          <div
                            key={monthIdx}
                            className="absolute top-0 bottom-0 border-r border-gray-100"
                            style={{ left: monthIdx * monthWidth, width: monthWidth }}
                          />
                        ))}

                        {/* Activity bar */}
                        {(() => {
                          const left = activity.startMonth * monthWidth;
                          const width = activity.widthMonths * monthWidth;
                          const isHovered = hoveredBar === activity.id;

                          return (
                            <div
                              className={`absolute rounded-sm shadow-sm transition-all cursor-pointer ${
                                isHovered ? 'shadow-lg z-10' : ''
                              }`}
                              style={{
                                left: left + 8,
                                top: 8,
                                width: width - 16,
                                height: ACTIVITY_ROW_HEIGHT - 16,
                                backgroundColor: ringGroup.color,
                                opacity: isHovered ? 0.95 : 0.85,
                                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                              }}
                              onMouseEnter={() => setHoveredBar(activity.id)}
                              onMouseLeave={() => setHoveredBar(null)}
                            >
                              <div className="px-3 py-2 h-full flex items-center">
                                <span className="text-white text-xs font-medium truncate">
                                  {activity.name}
                                </span>
                              </div>

                              {/* Tooltip on hover */}
                              {isHovered && (
                                <div className="absolute left-0 -top-16 bg-gray-900 text-white px-3 py-2 rounded-sm text-xs whitespace-nowrap z-20 shadow-xl">
                                  <div className="font-semibold mb-1">{activity.name}</div>
                                  <div className="text-gray-300 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {Math.round(activity.widthMonths * 30)} {t('landing:timelineDemo.days', 'days')}
                                  </div>
                                  <div className="absolute left-4 -bottom-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(TimelineDemo);
