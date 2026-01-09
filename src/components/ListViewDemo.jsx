import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Calendar, User, Eye, Target, List, Trello, Clock } from 'lucide-react';

function ListViewDemo() {
  const { t } = useTranslation(['landing']);
  const [demoStep, setDemoStep] = useState(0);
  const [expandedRings, setExpandedRings] = useState({ ring1: false, ring2: false });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isTypingSearch, setIsTypingSearch] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [isTypingActivity, setIsTypingActivity] = useState(false);
  const [allItems, setAllItems] = useState(null);

  // Demo data - initialize with base items
  const baseItems = {
    ring1: [
      { id: 'item1', name: t('landing:listDemo.items.campaign1', 'Spring Launch'), start: '2026-03-01', end: '2026-03-30', activity: t('landing:listDemo.activities.marketing', 'Marketing'), startAngle: 60, endAngle: 90 },
      { id: 'item2', name: t('landing:listDemo.items.campaign2', 'Summer Campaign'), start: '2026-06-01', end: '2026-08-31', activity: t('landing:listDemo.activities.marketing', 'Marketing'), startAngle: 150, endAngle: 240 },
      { id: 'item3', name: t('landing:listDemo.items.campaign3', 'Fall Promotion'), start: '2026-09-15', end: '2026-10-15', activity: t('landing:listDemo.activities.sales', 'Sales'), startAngle: 255, endAngle: 285 },
      { id: 'item4', name: t('landing:listDemo.items.campaign4', 'Holiday Campaign'), start: '2026-11-20', end: '2026-12-31', activity: t('landing:listDemo.activities.marketing', 'Marketing'), startAngle: 320, endAngle: 360 },
    ],
    ring2: [
      { id: 'item5', name: t('landing:listDemo.items.content1', 'Blog Posts Q1'), start: '2026-01-01', end: '2026-03-31', activity: t('landing:listDemo.activities.content', 'Content'), startAngle: 0, endAngle: 90 },
      { id: 'item6', name: t('landing:listDemo.items.content2', 'Video Series'), start: '2026-04-01', end: '2026-06-30', activity: t('landing:listDemo.activities.content', 'Content'), startAngle: 90, endAngle: 180 },
      { id: 'item7', name: t('landing:listDemo.items.content3', 'Webinar Prep'), start: '2026-05-15', end: '2026-05-30', activity: t('landing:listDemo.activities.events', 'Events'), startAngle: 125, endAngle: 140 },
      { id: 'item8', name: t('landing:listDemo.items.content4', 'Social Media Plan'), start: '2026-07-01', end: '2026-09-30', activity: t('landing:listDemo.activities.content', 'Content'), startAngle: 180, endAngle: 270 },
      { id: 'item9', name: t('landing:listDemo.items.content5', 'Newsletter Campaign'), start: '2026-10-01', end: '2026-12-31', activity: t('landing:listDemo.activities.content', 'Content'), startAngle: 270, endAngle: 360 },
    ],
  };

  // Use state for items so we can add to it
  const items = allItems || baseItems;

  const rings = [
    { id: 'ring1', name: t('landing:listDemo.rings.campaigns', 'Campaigns'), color: '#3b82f6', itemCount: items.ring1?.length || 0 },
    { id: 'ring2', name: t('landing:listDemo.rings.content', 'Content'), color: '#8b5cf6', itemCount: items.ring2?.length || 0 },
  ];

  // Demo sequence - enhanced with add activity and view switch
  useEffect(() => {
    const timers = [];

    // Step 1: Expand first ring after 1000ms
    timers.push(setTimeout(() => {
      setExpandedRings(prev => ({ ...prev, ring1: true }));
      setDemoStep(1);
    }, 1000));

    // Step 2: Show add modal at 2500ms
    timers.push(setTimeout(() => {
      setShowAddModal(true);
      setDemoStep(2);
    }, 2500));

    // Step 3: Start typing activity name at 3000ms
    timers.push(setTimeout(() => {
      setIsTypingActivity(true);
      const targetText = t('landing:listDemo.newActivity', 'Black Friday Sale');
      let currentIndex = 0;

      const typingInterval = setInterval(() => {
        if (currentIndex <= targetText.length) {
          setNewActivityName(targetText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTypingActivity(false);
        }
      }, 80);

      timers.push(typingInterval);
      setDemoStep(3);
    }, 3000));

    // Step 4: Add the activity at 5000ms
    timers.push(setTimeout(() => {
      const newActivity = {
        id: 'item-new',
        name: t('landing:listDemo.newActivity', 'Black Friday Sale'),
        start: '2026-11-25',
        end: '2026-11-29',
        activity: t('landing:listDemo.activities.sales', 'Sales'),
        startAngle: 325,
        endAngle: 330,
        isNew: true
      };
      setAllItems({
        ...baseItems,
        ring1: [...baseItems.ring1, newActivity]
      });
      setShowAddModal(false);
      setNewActivityName('');
      setExpandedRings({ ring1: true, ring2: false });
      setDemoStep(4);
    }, 5000));

    // Step 5: Highlight new item at 5500ms
    timers.push(setTimeout(() => {
      setHoveredItem('item-new');
      setDemoStep(5);
    }, 5500));

    // Step 6: Expand second ring and unhover at 7000ms
    timers.push(setTimeout(() => {
      setHoveredItem(null);
      setExpandedRings({ ring1: true, ring2: true });
      setDemoStep(6);
    }, 7000));

    // Step 7: Switch to wheel view at 9000ms
    timers.push(setTimeout(() => {
      setCurrentView('wheel');
      setDemoStep(7);
    }, 9000));

    // Step 8: Reset at 13000ms
    timers.push(setTimeout(() => {
      setCurrentView('list');
      setAllItems(null);
      setExpandedRings({ ring1: false, ring2: false });
      setHoveredItem(null);
      setShowAddModal(false);
      setNewActivityName('');
      setDemoStep(0);
    }, 13000));

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [t, demoStep]);

  return (
    <div className="aspect-video bg-white p-4">
      <div className="h-full flex flex-col">
        {/* Header with View Navigation */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-6 w-auto" />
            <span className="text-sm font-medium text-gray-700">{t('landing:demo.wheelTitle')}</span>
          </div>
          
          {/* View Navigation */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-sm p-1">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  currentView === 'wheel' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                {t('landing:views.wheel.title', 'Wheel')}
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  currentView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                {t('landing:views.list.title', 'List')}
              </button>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 text-gray-400"
                disabled
              >
                <Trello className="w-3.5 h-3.5" />
                {t('landing:views.kanban.title', 'Kanban')}
              </button>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 text-gray-400"
                disabled
              >
                <Clock className="w-3.5 h-3.5" />
                {t('landing:views.timeline.title', 'Timeline')}
              </button>
            </div>
          </div>
        </div>

        {/* Wheel View */}
        {currentView === 'wheel' && (
          <div className="flex-1 flex items-center justify-center bg-gray-50 py-8 px-4">
            <div className="relative w-full max-w-md">
              <svg viewBox="0 0 360 360" className="transform -rotate-90 drop-shadow-2xl w-full h-auto">
                {/* Background */}
                <circle cx="180" cy="180" r="175" fill="#fafafa" />

                {/* Outer ring - Campaigns (blue) */}
                <circle cx="180" cy="180" r="165" fill="none" stroke="#dbeafe" strokeWidth="28" />

                {/* Inner ring - Content (purple) */}
                <circle cx="180" cy="180" r="132" fill="none" stroke="#ede9fe" strokeWidth="26" />

                {/* Month ring */}
                <circle cx="180" cy="180" r="102" fill="none" stroke="#e2e8f0" strokeWidth="12" />

                {/* Center */}
                <circle cx="180" cy="180" r="94" fill="white" stroke="#e5e7eb" strokeWidth="2" />

                {/* Month dividers */}
                {Array.from({ length: 12 }, (_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const x1 = 180 + 96 * Math.cos(angle);
                  const y1 = 180 + 96 * Math.sin(angle);
                  const x2 = 180 + 179 * Math.cos(angle);
                  const y2 = 180 + 179 * Math.sin(angle);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="1" opacity="0.4" />
                  );
                })}

                {/* Campaign activities (outer ring - blue) */}
                {items.ring1?.map((item, idx) => {
                  const createArcSegment = (startAngle, endAngle, innerRadius, outerRadius) => {
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

                    const x1 = 180 + outerRadius * Math.cos(startRad);
                    const y1 = 180 + outerRadius * Math.sin(startRad);
                    const x2 = 180 + outerRadius * Math.cos(endRad);
                    const y2 = 180 + outerRadius * Math.sin(endRad);
                    const x3 = 180 + innerRadius * Math.cos(endRad);
                    const y3 = 180 + innerRadius * Math.sin(endRad);
                    const x4 = 180 + innerRadius * Math.cos(startRad);
                    const y4 = 180 + innerRadius * Math.sin(startRad);

                    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
                  };

                  return (
                    <path
                      key={item.id}
                      d={createArcSegment(item.startAngle, item.endAngle, 151, 179)}
                      fill="#3b82f6"
                      opacity={item.isNew ? 1 : 0.85}
                      className={item.isNew ? 'animate-pulse' : ''}
                    />
                  );
                })}

                {/* Content activities (inner ring - purple) */}
                {items.ring2?.map((item) => {
                  const createArcSegment = (startAngle, endAngle, innerRadius, outerRadius) => {
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

                    const x1 = 180 + outerRadius * Math.cos(startRad);
                    const y1 = 180 + outerRadius * Math.sin(startRad);
                    const x2 = 180 + outerRadius * Math.cos(endRad);
                    const y2 = 180 + outerRadius * Math.sin(endRad);
                    const x3 = 180 + innerRadius * Math.cos(endRad);
                    const y3 = 180 + innerRadius * Math.sin(endRad);
                    const x4 = 180 + innerRadius * Math.cos(startRad);
                    const y4 = 180 + innerRadius * Math.sin(startRad);

                    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
                  };

                  return (
                    <path
                      key={item.id}
                      d={createArcSegment(item.startAngle, item.endAngle, 119, 145)}
                      fill="#8b5cf6"
                      opacity="0.85"
                    />
                  );
                })}
              </svg>

              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-lg font-semibold text-gray-900 shadow-sm">
                  2026
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-4">
              {/* Stats bar */}
              <div className="bg-white rounded-sm border border-gray-200 px-4 py-3 mb-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">{t('landing:listDemo.totalActivities', 'Total:')}</span>
                  <span className="font-semibold text-gray-900">{items.ring1.length + items.ring2.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600">{t('landing:listDemo.rings', 'Rings:')}</span>
                  <span className="font-semibold text-gray-900">2</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal-600" />
                  <span className="text-gray-600">{t('landing:listDemo.year', 'Year:')}</span>
                  <span className="font-semibold text-gray-900">2026</span>
                </div>
              </div>

              {/* Ring groups */}
              {rings.map((ring) => {
                const ringItems = items[ring.id] || [];
                const isExpanded = expandedRings[ring.id];
                const filtered = searchText ? ringItems.filter(item => 
                  item.name.toLowerCase().includes(searchText.toLowerCase())
                ) : ringItems;

                if (searchText && filtered.length === 0) return null;

                return (
                  <div key={ring.id} className="mb-3">
                    {/* Ring header */}
                    <div
                      className="bg-white rounded-sm border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedRings(prev => ({ ...prev, [ring.id]: !prev[ring.id] }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ring.color }}></div>
                          <span className="font-medium text-gray-900">{ring.name}</span>
                          <span className="text-sm text-gray-500">({filtered.length})</span>
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 pl-4">
                        {filtered.map((item) => (
                          <div
                            key={item.id}
                            className={`bg-white rounded-sm border px-4 py-3 transition-all ${
                              item.isNew ? 'border-green-400 shadow-md animate-pulse' :
                              hoveredItem === item.id
                                ? 'border-blue-400 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                                  {item.name}
                                  {item.isNew && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {item.start} → {item.end}
                                  </span>
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                                    {item.activity}
                                  </span>
                                </div>
                              </div>
                              {hoveredItem === item.id && (
                                <div className="flex items-center gap-2">
                                  <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Activity Modal */}
        {showAddModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-sm shadow-2xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('landing:listDemo.addButton', 'Add Activity')}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('landing:manualDemo.modal.activityName', 'Activity name')}
                  </label>
                  <input
                    type="text"
                    value={newActivityName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm"
                  />
                  {isTypingActivity && (
                    <span className="inline-block w-0.5 h-4 bg-blue-600 ml-1 animate-pulse"></span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('landing:manualDemo.modal.ring', 'Ring')}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm" disabled>
                    <option>{t('landing:listDemo.rings.campaigns', 'Campaigns')}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('landing:manualDemo.modal.startDate', 'Start date')}
                    </label>
                    <input
                      type="text"
                      value="2026-11-25"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('landing:manualDemo.modal.endDate', 'End date')}
                    </label>
                    <input
                      type="text"
                      value="2026-11-29"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors">
                  {t('landing:manualDemo.modal.cancel', 'Cancel')}
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm transition-colors">
                  {t('landing:manualDemo.modal.save', 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ListViewDemo);
