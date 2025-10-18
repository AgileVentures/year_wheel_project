import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';

function ManualEditorDemo() {
  const { t } = useTranslation(['landing']);
  const [demoStep, setDemoStep] = useState(0);
  const [restartKey, setRestartKey] = useState(0); // Key to trigger restart
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ringName, setRingName] = useState(t('landing:manualDemo.activities.ring1'));
  const [wheelTitle, setWheelTitle] = useState('New wheel');
  const [activityAdded, setActivityAdded] = useState(false);
  const [titleTypingText, setTitleTypingText] = useState('');
  const [isTypingTitle, setIsTypingTitle] = useState(false);
  const [ringTypingText, setRingTypingText] = useState('');
  const [isTypingRing, setIsTypingRing] = useState(false);
  const [activityTypingText, setActivityTypingText] = useState('');
  const [isTypingActivity, setIsTypingActivity] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activityEndDate, setActivityEndDate] = useState('2026-03-16');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateText, setEditDateText] = useState('');
  const [activityExtended, setActivityExtended] = useState(false);

  // Demo sequence - auto-advance through steps
  useEffect(() => {
    const timers = [];
    
    // Step 0: Show create modal after 1000ms
    timers.push(setTimeout(() => {
      setShowCreateModal(true);
      setDemoStep(0.5);
    }, 1000));
    
    // Start typing title at 1500ms
    timers.push(setTimeout(() => {
      setIsTypingTitle(true);
      const targetText = t('landing:demo.wheelTitle');
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= targetText.length) {
          setTitleTypingText(targetText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTypingTitle(false);
          setWheelTitle(t('landing:demo.wheelTitle'));
        }
      }, 90);
      
      timers.push(typingInterval);
    }, 1500));
    
    // Step 1: Close modal, show editor after 4200ms
    timers.push(setTimeout(() => {
      setShowCreateModal(false);
      setDemoStep(1);
      setWheelTitle(t('landing:demo.wheelTitle'));
      setTitleTypingText('');
    }, 4200));
    
    // Step 2: Show rename input after 6000ms (field will be empty)
    timers.push(setTimeout(() => {
      setShowRenameInput(true);
      setRingName(''); // Clear the name when starting to edit
      setDemoStep(2);
    }, 6000));
    
    // Start typing ring name at 6500ms
    timers.push(setTimeout(() => {
      setIsTypingRing(true);
      const targetText = t('landing:manualDemo.activities.campaigns');
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= targetText.length) {
          setRingTypingText(targetText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTypingRing(false);
        }
      }, 80);
      
      timers.push(typingInterval);
    }, 6500));
    
    // Step 3: Save renamed ring after 8200ms
    timers.push(setTimeout(() => {
      setRingName(t('landing:manualDemo.activities.campaigns'));
      setShowRenameInput(false);
      setDemoStep(3);
      setRingTypingText('');
    }, 8200));
    
    // Step 4: Show add modal after 10000ms
    timers.push(setTimeout(() => {
      setShowAddModal(true);
      setDemoStep(4);
    }, 10000));
    
    // Start typing activity name at 10500ms
    timers.push(setTimeout(() => {
      setIsTypingActivity(true);
      const targetText = t('landing:manualDemo.activities.firstActivity');
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= targetText.length) {
          setActivityTypingText(targetText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTypingActivity(false);
        }
      }, 80);
      
      timers.push(typingInterval);
    }, 10500));
    
    // Step 5: Add activity after 13500ms
    timers.push(setTimeout(() => {
      setShowAddModal(false);
      setActivityAdded(true);
      setDemoStep(5);
      setActivityTypingText('');
    }, 13500));
    
    // Step 6: Show edit modal after 15500ms
    timers.push(setTimeout(() => {
      setShowEditModal(true);
      setDemoStep(6);
    }, 15500));
    
    // Start editing end date at 16000ms
    timers.push(setTimeout(() => {
      setIsEditingDate(true);
      const targetText = '2026-03-30';
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= targetText.length) {
          setEditDateText(targetText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsEditingDate(false);
          setActivityEndDate('2026-03-30');
        }
      }, 80);
      
      timers.push(typingInterval);
    }, 16000));
    
    // Step 7: Extend activity after 18000ms
    timers.push(setTimeout(() => {
      setShowEditModal(false);
      setActivityExtended(true);
      setDemoStep(7);
      setEditDateText('');
    }, 18000));
    
    // Wait 3 seconds, then reset after 24000ms (21s + 3s pause) and trigger restart
    timers.push(setTimeout(() => {
      // Reset all states
      setShowCreateModal(false);
      setShowRenameInput(false);
      setShowAddModal(false);
      setShowEditModal(false);
      setRingName(t('landing:manualDemo.activities.ring1'));
      setWheelTitle('New wheel');
      setActivityAdded(false);
      setActivityExtended(false);
      setTitleTypingText('');
      setIsTypingTitle(false);
      setRingTypingText('');
      setIsTypingRing(false);
      setActivityTypingText('');
      setIsTypingActivity(false);
      setActivityEndDate('2026-03-16');
      setEditDateText('');
      setIsEditingDate(false);
      setDemoStep(0);
      
      // Trigger a new cycle by updating restart key
      setRestartKey(prev => prev + 1);
    }, 24000));
    
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [restartKey]); // Re-run when restartKey changes to loop the demo

  return (
    <div className="aspect-video bg-white p-4">
      {/* Dashboard View (Step 0) */}
      {demoStep === 0 && (
        <div className="h-full bg-gray-50 flex flex-col">
          {/* Dashboard Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-8 w-auto" />
              <span className="text-lg font-semibold text-gray-900">{t('landing:manualDemo.dashboardTitle')}</span>
            </div>
            <button className="bg-blue-600 text-white rounded-sm px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors">
              + {t('landing:manualDemo.createWheelButton')}
            </button>
          </div>

          {/* Dashboard Content */}
          <div className="flex-1 p-8">
            <div className="max-w-5xl mx-auto">
              {/* Page Title */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('landing:manualDemo.dashboardHeading')}</h2>
                <p className="text-gray-600">{t('landing:manualDemo.dashboardSubheading')}</p>
              </div>

              {/* Wheels Grid */}
              <div className="grid grid-cols-3 gap-6">
                {/* Sample Wheel Cards */}
                <div className="bg-white border border-gray-200 rounded-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="aspect-square bg-gray-100 rounded-sm mb-4 flex items-center justify-center">
                    <svg width="120" height="120" viewBox="0 0 360 360" className="transform -rotate-90">
                      <circle cx="180" cy="180" r="170" fill="#fafafa" />
                      <circle cx="180" cy="180" r="160" fill="none" stroke="#e0e7ff" strokeWidth="35" />
                      <circle cx="180" cy="180" r="120" fill="none" stroke="#dbeafe" strokeWidth="30" />
                      <circle cx="180" cy="180" r="85" fill="none" stroke="#e5e7eb" strokeWidth="15" />
                      <circle cx="180" cy="180" r="68" fill="white" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t('landing:manualDemo.sampleWheel1')}</h3>
                  <p className="text-sm text-gray-500">{t('landing:manualDemo.lastEdited')}: 8 okt 2025</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="aspect-square bg-gray-100 rounded-sm mb-4 flex items-center justify-center">
                    <svg width="120" height="120" viewBox="0 0 360 360" className="transform -rotate-90">
                      <circle cx="180" cy="180" r="170" fill="#fafafa" />
                      <circle cx="180" cy="180" r="160" fill="none" stroke="#fef3c7" strokeWidth="35" />
                      <circle cx="180" cy="180" r="120" fill="none" stroke="#fed7aa" strokeWidth="30" />
                      <circle cx="180" cy="180" r="85" fill="none" stroke="#e5e7eb" strokeWidth="15" />
                      <circle cx="180" cy="180" r="68" fill="white" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t('landing:manualDemo.sampleWheel2')}</h3>
                  <p className="text-sm text-gray-500">{t('landing:manualDemo.lastEdited')}: 5 okt 2025</p>
                </div>

                {/* Empty Card - Call to Action */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-sm p-5 flex flex-col items-center justify-center hover:border-blue-400 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <span className="text-3xl text-blue-600">+</span>
                  </div>
                  <h3 className="font-semibold text-blue-900 mb-1">{t('landing:manualDemo.createNew')}</h3>
                  <p className="text-sm text-blue-700 text-center">{t('landing:manualDemo.createNewSubtext')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="h-full bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('landing:manualDemo.modal.createTitle')}</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('landing:manualDemo.modal.titleLabel')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                </label>
                <input
                  type="text"
                  value={isTypingTitle ? titleTypingText : wheelTitle}
                  readOnly
                  className={`w-full px-4 py-2.5 border ${isTypingTitle ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'} rounded-sm text-base text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 transition-all`}
                  style={isTypingTitle ? { animation: 'none' } : {}}
                />
                {isTypingTitle && (
                  <span className="inline-block w-0.5 h-5 bg-blue-600 ml-1 animate-pulse" style={{
                    position: 'relative',
                    top: '-32px',
                    left: `${4 + titleTypingText.length * 8.5}px`
                  }}></span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('landing:manualDemo.modal.yearLabel')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                </label>
                <input
                  type="text"
                  value="2026"
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base text-gray-900 bg-gray-50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors">
                  {t('landing:manualDemo.modal.cancel')}
                </button>
                <button className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm shadow-sm transition-colors">
                  {t('landing:manualDemo.modal.create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Mockup (Steps 1-5) */}
      {demoStep >= 1 && (
      <div className="h-full flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-1">{t('landing:manualDemo.sidebar.manage')}</h3>
            <div className="flex gap-2 text-xs text-gray-600">
              <button className="px-3 py-1 bg-blue-50 text-blue-600 rounded-sm font-medium">{t('landing:manualDemo.sidebar.disc')}</button>
              <button className="px-3 py-1 hover:bg-gray-100 rounded-sm">{t('landing:manualDemo.sidebar.list')}</button>
              <button className="px-3 py-1 hover:bg-gray-100 rounded-sm">{t('landing:manualDemo.sidebar.calendar')}</button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Innerringar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase">{t('landing:manualDemo.sidebar.innerRings')}</h4>
                <button className="text-xs text-blue-600 hover:text-blue-700">{t('landing:manualDemo.sidebar.addButton')}</button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked readOnly className="w-4 h-4" />
                  <div className={`w-3 h-3 rounded-sm ${ringName === t('landing:manualDemo.activities.campaigns') ? 'bg-orange-300' : 'bg-gray-300'}`}></div>
                  {showRenameInput ? (
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={ringTypingText}
                        readOnly
                        placeholder={t('landing:manualDemo.modal.placeholder')}
                        className="text-xs text-gray-900 border border-blue-500 rounded px-1 py-0.5 w-full bg-white"
                      />
                      {isTypingRing && (
                        <span className="absolute top-1 bg-blue-600 w-0.5 h-2.5 animate-pulse" style={{
                          left: `${4 + ringTypingText.length * 5}px`
                        }}></span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-700">{ringName}</span>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">{activityAdded ? '1' : '0'}</span>
                </div>
              </div>
            </div>

            {/* Ytterringar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase">{t('landing:manualDemo.sidebar.outerRings')}</h4>
                <button className="text-xs text-blue-600 hover:text-blue-700">{t('landing:manualDemo.sidebar.addButton')}</button>
              </div>
              <div className="text-xs text-gray-500 italic">{t('landing:manualDemo.sidebar.noOuterRings')}</div>
            </div>

            {/* Aktivitetsgrupper */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase">{t('landing:manualDemo.sidebar.activityGroups')}</h4>
                <button className="text-xs text-blue-600 hover:text-blue-700">{t('landing:manualDemo.sidebar.addButton')}</button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked readOnly className="w-4 h-4" />
                  <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                  <span className="text-xs text-gray-700">{t('landing:manualDemo.activities.planning')}</span>
                  <span className="text-xs text-gray-500 ml-auto">{activityAdded ? '1' : '0'}</span>
                </div>
              </div>
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase">{t('landing:manualDemo.sidebar.labels')}</h4>
                <button className="text-xs text-blue-600 hover:text-blue-700">{t('landing:manualDemo.sidebar.addButton')}</button>
              </div>
              <div className="text-xs text-gray-500 italic">{t('landing:manualDemo.sidebar.noLabels')}</div>
            </div>
          </div>

          {/* Add Activity Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-blue-600 text-white rounded-sm px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + {t('landing:manualDemo.modal.addActivity')}
            </button>
          </div>
        </div>

        {/* Main Editor Area with Wheel */}
        <div className="flex-1 bg-gray-50 relative overflow-hidden">
          {/* Editor Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-7 w-auto" />
              <span className="text-base font-semibold text-gray-900">{wheelTitle}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {t('landing:manualDemo.modal.saved')}
              </span>
            </div>
          </div>

          {/* Wheel Display */}
          <div className="flex-1 flex items-center justify-center py-12 px-8">
            <div className="relative w-full max-w-lg">
              <svg viewBox="0 0 360 360" className="transform -rotate-90 drop-shadow-2xl w-full h-auto">
                {/* Background */}
                <circle cx="180" cy="180" r="175" fill="#fafafa" />

                {/* Outer ring */}
                <circle cx="180" cy="180" r="165" fill="none" stroke="#f1f5f9" strokeWidth="28" />

                {/* Middle ring - Ring 1 / Kampanjer (no background, just stroke) */}
                <circle cx="180" cy="180" r="132" fill="none" stroke="#f8fafc" strokeWidth="26" />

                {/* Inner ring */}
                <circle cx="180" cy="180" r="102" fill="none" stroke="#f1f5f9" strokeWidth="24" />

                {/* Month ring */}
                <circle cx="180" cy="180" r="86" fill="none" stroke="#e2e8f0" strokeWidth="12" />

                {/* Week ring */}
                <circle cx="180" cy="180" r="78" fill="none" stroke="#f3f4f6" strokeWidth="8" />

                {/* Center */}
                <circle cx="180" cy="180" r="72" fill="white" stroke="#e5e7eb" strokeWidth="2" />

                {/* Month dividers */}
                {Array.from({ length: 12 }, (_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const x1 = 180 + 74 * Math.cos(angle);
                  const y1 = 180 + 74 * Math.sin(angle);
                  const x2 = 180 + 179 * Math.cos(angle);
                  const y2 = 180 + 179 * Math.sin(angle);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="1" opacity="0.4" />
                  );
                })}

                {/* Added Activity - October 11 (1 week width) */}
                {activityAdded && (() => {
                  // Helper to create arc segment
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
                  
                  // March 10-16: March is month 2 (0-indexed), day 10-16
                  // Month angle = 2 * 30 = 60°, Day 10 = 60 + (9/31)*30 ≈ 68.7°
                  // Day 16 = 60 + (15/31)*30 ≈ 74.5° (1 week)
                  // Extended to day 30 = 60 + (29/31)*30 ≈ 88.1° (3 weeks)
                  const startAngle = 68.7;
                  const endAngle = activityExtended ? 88.1 : 74.5;
                  
                  return (
                    <path
                      d={createArcSegment(startAngle, endAngle, 119, 145)}
                      fill="#3b82f6"
                      opacity="0.95"
                      className={demoStep === 5 ? "animate-bounce-in" : activityExtended ? "animate-grow-segment" : ""}
                      style={{
                        animationDuration: '0.6s',
                        animationTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                        transition: activityExtended ? 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                      }}
                    />
                  );
                })()}
              </svg>

              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-lg font-semibold text-gray-900 shadow-sm">
                  2026
                </div>
              </div>
            </div>
          </div>

          {/* Add Activity Modal */}
          {showAddModal && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
              <div className="bg-white rounded-sm shadow-xl w-full max-w-md animate-fadeIn">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{t('landing:manualDemo.modal.addActivityTitle')}</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Content */}
                <div className="px-6 py-4 space-y-4">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('landing:manualDemo.modal.activityName')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={isTypingActivity ? activityTypingText : t('landing:manualDemo.activities.firstActivity')}
                        readOnly
                        className="w-full px-4 py-2.5 border border-blue-500 rounded-sm bg-white text-base font-medium text-gray-900"
                      />
                      {isTypingActivity && (
                        <span className="absolute top-3 bg-blue-600 w-0.5 h-5 animate-pulse" style={{
                          left: `${16 + activityTypingText.length * 8.5}px`
                        }}></span>
                      )}
                    </div>
                  </div>

                  {/* Ring */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('landing:manualDemo.modal.ring')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                    </label>
                    <select value={ringName} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-white">
                      <option>{ringName}</option>
                    </select>
                  </div>

                  {/* Activity Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('landing:manualDemo.modal.activityGroup')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                    </label>
                    <select className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-white">
                      <option>{t('landing:manualDemo.activities.planning')}</option>
                    </select>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('landing:manualDemo.modal.label')}</label>
                    <select className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-white">
                      <option value="">{t('landing:manualDemo.modal.noLabel')}</option>
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('landing:manualDemo.modal.startDate')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                      </label>
                      <input
                        type="date"
                        defaultValue="2026-03-10"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('landing:manualDemo.modal.endDate')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                      </label>
                      <input
                        type="date"
                        defaultValue="2026-03-16"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
                  >
                    {t('landing:manualDemo.modal.cancel')}
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm shadow-sm transition-colors"
                  >
                    {t('landing:manualDemo.modal.addActivity')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Activity Modal */}
          {showEditModal && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
              <div className="bg-white rounded-sm shadow-xl w-full max-w-md animate-fadeIn">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{t('landing:manualDemo.modal.editActivity')}</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Content */}
                <div className="px-6 py-4 space-y-4">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('landing:manualDemo.modal.activityName')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                    </label>
                    <input
                      type="text"
                      value={t('landing:manualDemo.activities.firstActivity')}
                      readOnly
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-sm bg-gray-50 text-base font-medium text-gray-900"
                    />
                  </div>

                  {/* Ring */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('landing:manualDemo.modal.ring')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                    </label>
                    <select value={ringName} readOnly className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-gray-50 text-gray-900">
                      <option>{ringName}</option>
                    </select>
                  </div>

                  {/* Activity Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('landing:manualDemo.modal.activityGroup')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                    </label>
                    <select className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base bg-gray-50 text-gray-900">
                      <option>{t('landing:manualDemo.activities.planning')}</option>
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('landing:manualDemo.modal.startDate')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                      </label>
                      <input
                        type="date"
                        defaultValue="2026-03-10"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-sm text-base text-gray-900 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('landing:manualDemo.modal.endDate')} <span className="text-red-500">{t('landing:manualDemo.modal.required')}</span>
                      </label>
                      <div className="relative">
                        {isEditingDate ? (
                          <input
                            type="text"
                            value={editDateText}
                            readOnly
                            placeholder="yyyy-mm-dd"
                            className="w-full px-4 py-2.5 border border-blue-500 rounded-sm text-base text-gray-900 bg-white"
                          />
                        ) : (
                          <input
                            type="date"
                            value={activityEndDate}
                            readOnly
                            className="w-full px-4 py-2.5 border border-blue-500 rounded-sm text-base text-gray-900 bg-white"
                          />
                        )}
                        {isEditingDate && (
                          <span className="absolute top-3 bg-blue-600 w-0.5 h-5 animate-pulse" style={{
                            left: `${16 + editDateText.length * 8.5}px`
                          }}></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
                  >
                    {t('landing:manualDemo.modal.cancel')}
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-sm shadow-sm transition-colors"
                  >
                    {t('landing:manualDemo.modal.save')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

export default memo(ManualEditorDemo);
