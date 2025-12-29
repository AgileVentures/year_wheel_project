import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Check, Download, Calendar, Users, Share2, Eye, Sparkles, Palette, Zap, BarChart, Target, Layout } from 'lucide-react';

/**
 * Monday.com How-To Guide
 * Iframe-embeddable page with no header/footer for Monday.com marketplace
 * Accessible at: /monday/how-to
 * 
 * Transform Your Year into a Visual Masterpiece
 * The circular calendar that changes everything for Monday.com users
 */
function MondayHowToGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const contentRef = useRef(null);

  // Scroll to top when step changes
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

  const steps = [
    {
      title: "See Everything, Miss Nothing",
      time: "2 minutes",
      icon: Sparkles,
      image: "/docs/monday/images/01-wheel-view-overview.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-[#00A4A6] to-[#008B8D] text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Stop scrolling through endless lists</h3>
            <p className="text-lg opacity-95">
              Year Wheel turns your monday.com boards into stunning circular calendars that display your entire year in one view, 
              revealing patterns, preventing conflicts, and making annual planning effortless.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Installation (30 seconds)</h3>
          
          <ol className="space-y-4 mb-6">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-semibold mr-3 mt-0.5">1</span>
              <div className="flex-1">
                <p className="font-medium">Open Monday.com Marketplace</p>
                <p className="text-gray-600 text-sm mt-1">Click your profile → "Apps Marketplace"</p>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-semibold mr-3 mt-0.5">2</span>
              <div className="flex-1">
                <p className="font-medium">Search "YearWheel"</p>
                <p className="text-gray-600 text-sm mt-1">Find and click the Install button</p>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#00A4A6] text-white rounded-full font-semibold mr-3 mt-0.5">3</span>
              <div className="flex-1">
                <p className="font-medium">Add to Your Board</p>
                <p className="text-gray-600 text-sm mt-1">Open any board → Click "+" next to views → Select "YearWheel"</p>
              </div>
            </li>
          </ol>

          <img 
            src="/docs/monday/images/01-wheel-view-overview.png" 
            alt="YearWheel circular calendar showing full year view" 
            className="w-full rounded-sm shadow-2xl border border-gray-200"
          />
          <p className="text-center text-sm text-gray-600 mt-3 italic">
            Your entire annual plan displayed in one elegant circular calendar
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-sm border-l-4 border-blue-500">
              <div className="flex items-start">
                <Check className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Zero Setup</p>
                  <p className="text-sm text-blue-800">Connect and visualize in seconds</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-sm border-l-4 border-green-500">
              <div className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Auto-Sync</p>
                  <p className="text-sm text-green-800">Updates as your board changes</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Your Groups, Your Colors",
      time: "3 minutes",
      icon: Palette,
      image: "/docs/monday/images/03-structure-panel.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Your Structure Stays Intact</h3>
            <p className="text-lg opacity-95">
              Each board group automatically becomes a concentric ring, preserving your organization and color coding. 
              Your structure stays intact, just more beautiful and insightful.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Understanding Your Wheel Structure</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <img 
              src="/docs/monday/images/02-board-table-view.png" 
              alt="Monday.com board table view" 
              className="w-full rounded-sm shadow-lg border border-gray-200"
            />
            <img 
              src="/docs/monday/images/03-structure-panel.png" 
              alt="YearWheel structure panel showing rings and groups" 
              className="w-full rounded-sm shadow-lg border border-gray-200"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-start bg-gradient-to-r from-orange-50 to-orange-100 p-5 rounded-sm border-l-4 border-orange-500">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 text-lg">
                1
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Outer Rings</h5>
                <p className="text-gray-700 mb-2">Board groups become outer rings that show high-level structure</p>
                <p className="text-sm text-gray-600">Perfect for: Departments, Categories, Projects</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-sm border-l-4 border-blue-500">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 text-lg">
                2
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Inner Rings</h5>
                <p className="text-gray-700 mb-2">Groups display closer to the center for detailed planning</p>
                <p className="text-sm text-gray-600">Perfect for: Teams, Streams, Work types</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-sm border-l-4 border-green-500">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 text-lg">
                3
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Activity Groups</h5>
                <p className="text-gray-700 mb-2">Color-code items by status, priority, or custom categories</p>
                <p className="text-sm text-gray-600">Perfect for: Status tracking, Priority levels, Categories</p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-amber-50 border-l-4 border-amber-500 p-5 rounded-sm">
            <div className="flex items-start">
              <Sparkles className="w-6 h-6 text-amber-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-2">Flexible Mapping</h4>
                <p className="text-amber-800 text-sm">
                  Use any date column from your Monday.com board - single dates, timelines, start/end dates. 
                  YearWheel automatically detects and positions your items perfectly on the circular calendar.
                </p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Beautiful by Design",
      time: "4 minutes",
      icon: Palette,
      image: "/docs/monday/images/04-wheel-colors-settings.png",
      content: (
        <>
          <h3 className="text-2xl font-bold mb-4">Professional Design That Impresses Immediately</h3>
          
          <p className="text-lg text-gray-700 mb-6">
            YearWheel includes carefully crafted color themes that match Monday.com's design language while adding 
            visual polish that makes your planning wheels presentation-ready from day one.
          </p>

          <img 
            src="/docs/monday/images/04-wheel-colors-settings.png" 
            alt="YearWheel color theme settings" 
            className="w-full rounded-sm shadow-2xl border border-gray-200 mb-6"
          />

          <h4 className="text-xl font-semibold mb-4">Choose Your Theme</h4>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="border border-gray-200 rounded-sm p-5 hover:shadow-lg transition-shadow bg-white">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-lg">Monday Colors</h5>
                <div className="flex gap-1">
                  {['#579bfc', '#9acd32', '#e44258', '#ff642e', '#fdab3d', '#00c875', '#0086c0', '#175a63'].map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">Monday.com's default color palette - familiar and professional</p>
            </div>

            <div className="border border-gray-200 rounded-sm p-5 hover:shadow-lg transition-shadow bg-white">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-lg">Nordic Cool</h5>
                <div className="flex gap-1">
                  {['#88c0d0', '#81a1c1', '#5e81ac', '#b48ead', '#a3be8c', '#ebcb8b', '#d08770', '#bf616a'].map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">Scandinavian-inspired muted tones - calm and sophisticated</p>
            </div>

            <div className="border border-gray-200 rounded-sm p-5 hover:shadow-lg transition-shadow bg-white">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-lg">Vibrant Energy</h5>
                <div className="flex gap-1">
                  {['#ff6b6b', '#4ecdc4', '#a8e6cf', '#c77dff', '#ffcc00', '#38b6ff', '#ff66c4', '#7c3aed'].map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">Bold, energetic colors - perfect for creative teams</p>
            </div>

            <div className="border border-gray-200 rounded-sm p-5 hover:shadow-lg transition-shadow bg-white">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-lg">Modern Minimalist</h5>
                <div className="flex gap-1">
                  {['#2d3748', '#4a5568', '#718096', '#a0aec0', '#6366f1', '#a78bfa', '#fbbf24', '#f97316'].map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">Clean professional grays with accent colors</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <img 
              src="/docs/monday/images/01-wheel-view-overview.png" 
              alt="Light mode YearWheel" 
              className="w-full rounded-sm shadow-lg border border-gray-200"
            />
            <img 
              src="/docs/monday/images/07-dark-mode-theme.png" 
              alt="Dark mode YearWheel" 
              className="w-full rounded-sm shadow-lg border border-gray-200"
            />
          </div>
          <p className="text-center text-sm text-gray-600 italic mb-6">
            Light and dark mode support - matches your Monday.com theme automatically
          </p>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-sm p-5">
            <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Customize Everything
            </h4>
            <ul className="space-y-2 text-purple-800 text-sm">
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Item Colors:</strong> Map to Monday.com group colors or choose custom themes</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Month/Week Rings:</strong> Select from 8 beautiful color palettes</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Dark Mode:</strong> Automatically follows your Monday.com theme preference</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Ring Visibility:</strong> Show/hide elements to focus on what matters</span>
              </li>
            </ul>
          </div>
        </>
      )
    },
    {
      title: "From Data to Decisions",
      time: "5 minutes",
      icon: BarChart,
      image: "/docs/monday/images/01-wheel-view-overview.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Immediately Spot What Traditional Views Hide</h3>
            <p className="text-lg opacity-95">
              Overloaded quarters. Scheduling conflicts. Seasonal patterns. Resource gaps. 
              Make better decisions faster with insights that jump out at you.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Interactive Features That Drive Insights</h3>

          <div className="space-y-5 mb-6">
            <div className="bg-white border-2 border-blue-200 rounded-sm p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-blue-500 rounded-sm flex items-center justify-center mr-4 flex-shrink-0">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-lg mb-2">Hover for Instant Details</h5>
                  <p className="text-gray-700 text-sm">
                    Move your mouse over any item to see its name, dates, assigned team members, and current status. 
                    No clicking required - just hover and absorb information.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-green-200 rounded-sm p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-green-500 rounded-sm flex items-center justify-center mr-4 flex-shrink-0">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-lg mb-2">Click to Open in Monday</h5>
                  <p className="text-gray-700 text-sm">
                    Click any item segment to jump directly to that item in your Monday.com board. 
                    Seamless navigation between circular view and detailed editing.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-purple-200 rounded-sm p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-purple-500 rounded-sm flex items-center justify-center mr-4 flex-shrink-0">
                  <Layout className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-lg mb-2">Rotate to Focus</h5>
                  <p className="text-gray-700 text-sm">
                    Click and drag the wheel to rotate it. Position any month at the top to focus your team's attention 
                    during planning sessions or presentations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <img 
            src="/docs/monday/images/01-wheel-view-overview.png" 
            alt="Interactive YearWheel with hover and navigation" 
            className="w-full rounded-sm shadow-2xl border border-gray-200 mb-6"
          />

          <h4 className="text-xl font-semibold mb-4">Patterns That Emerge Instantly</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-sm">
              <h5 className="font-semibold text-red-900 mb-2">🔥 Overloaded Quarters</h5>
              <p className="text-sm text-red-800">
                See at a glance which quarters have too many initiatives. Prevent burnout before it happens.
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-sm">
              <h5 className="font-semibold text-yellow-900 mb-2">⚡ Scheduling Conflicts</h5>
              <p className="text-sm text-yellow-800">
                Overlapping campaigns? Competing launches? The wheel reveals conflicts that lists hide.
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-sm">
              <h5 className="font-semibold text-blue-900 mb-2">📊 Seasonal Patterns</h5>
              <p className="text-sm text-blue-800">
                Understand when your team is busiest. Plan around holidays and traditional slow periods.
              </p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-sm">
              <h5 className="font-semibold text-green-900 mb-2">🎯 Resource Gaps</h5>
              <p className="text-sm text-green-800">
                Identify months with too little activity. Optimize resource allocation throughout the year.
              </p>
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-5 rounded-sm">
            <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Perfect For Strategic Planning
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start text-indigo-800">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-indigo-600" />
                <span><strong>Marketing Teams:</strong> Campaigns, launches, seasonal promotions</span>
              </div>
              <div className="flex items-start text-indigo-800">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-indigo-600" />
                <span><strong>Project Managers:</strong> Timelines, milestones, resource allocation</span>
              </div>
              <div className="flex items-start text-indigo-800">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-indigo-600" />
                <span><strong>HR Departments:</strong> Recruitment, training, performance reviews</span>
              </div>
              <div className="flex items-start text-indigo-800">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-indigo-600" />
                <span><strong>Product Teams:</strong> Roadmaps, release cycles, development phases</span>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Customize Your View",
      time: "3 minutes",
      icon: Layout,
      image: "/docs/monday/images/05-display-settings.png",
      content: (
        <>
          <h3 className="text-2xl font-bold mb-4">Tailor the Wheel to Your Workflow</h3>
          
          <p className="text-lg text-gray-700 mb-6">
            Fine-tune your YearWheel display to show exactly what you need. From week number formats to ring visibility, 
            every detail is customizable.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <img 
              src="/docs/monday/images/05-display-settings.png" 
              alt="Display settings panel" 
              className="w-full rounded-sm shadow-lg border border-gray-200"
            />
            <img 
              src="/docs/monday/images/06-edit-item-dialog.png" 
              alt="Edit item dialog" 
              className="w-full rounded-sm shadow-lg border border-gray-200"
            />
          </div>

          <h4 className="text-xl font-semibold mb-4">Display Options</h4>

          <div className="space-y-4 mb-6">
            <div className="border border-gray-200 rounded-sm p-5 bg-white">
              <h5 className="font-semibold text-lg mb-3 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-[#00A4A6]" />
                Week Ring Display
              </h5>
              <div className="space-y-2 text-sm text-gray-700 ml-7">
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-[#00A4A6] rounded-full mr-3"></div>
                  <strong>Week Numbers (1-53):</strong> Show ISO standard week numbers
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-[#00A4A6] rounded-full mr-3"></div>
                  <strong>Dates:</strong> Display actual date ranges for each week
                </div>
                <p className="text-gray-600 mt-2">Choose the format that best matches your team's planning style</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-sm p-5 bg-white">
              <h5 className="font-semibold text-lg mb-3 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-[#00A4A6]" />
                Ring Visibility
              </h5>
              <div className="space-y-2 text-sm text-gray-700 ml-7">
                <div className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Show/Hide Week Ring:</strong> Toggle the inner week number ring on or off</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Show/Hide Ring Names:</strong> Display group names on the outer edge of rings</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Individual Ring Toggle:</strong> Show/hide specific rings from the Structure panel</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-sm p-5 bg-white">
              <h5 className="font-semibold text-lg mb-3 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-[#00A4A6]" />
                Reset Configuration
              </h5>
              <p className="text-sm text-gray-700 ml-7">
                Made too many changes? Click "Reset Ring Configuration" to restore the default structure based on 
                your Monday.com board groups. All your items stay intact - only the ring organization resets.
              </p>
            </div>
          </div>

          <h4 className="text-xl font-semibold mb-4">Managing Items</h4>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-sm p-5 mb-6">
            <h5 className="font-semibold text-blue-900 mb-3">Edit Items Directly</h5>
            <p className="text-blue-800 text-sm mb-3">
              Click any item on the wheel to open the edit dialog. Update the name, change groups, reassign team members, 
              or adjust dates - all without leaving the YearWheel view.
            </p>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Changes sync instantly to your Monday.com board</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Team members see updates in real-time</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>The wheel repositions items automatically as you adjust dates</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-sm">
            <h5 className="font-semibold text-amber-900 mb-2 flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              Pro Tip: Structure Panel
            </h5>
            <p className="text-amber-800 text-sm">
              Use the Structure panel on the right to quickly show/hide entire groups. Perfect for focusing on specific 
              departments during planning meetings or filtering out completed items to see what's coming next.
            </p>
          </div>
        </>
      )
    },
    {
      title: "Present Like a Pro",
      time: "3 minutes",
      icon: Share2,
      image: "/docs/monday/images/01-wheel-view-overview.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Export Publication-Ready Visuals</h3>
            <p className="text-lg opacity-95">
              Walk into stakeholder meetings with stunning wheels that communicate your strategy instantly. 
              No design skills required - YearWheel makes you look like a pro.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Export in Multiple Formats</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border-2 border-blue-200 bg-blue-50 rounded-sm p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-blue-500 rounded-sm flex items-center justify-center mr-3">
                  <span className="text-2xl">🖼️</span>
                </div>
                <div>
                  <h5 className="font-bold text-lg">PNG Image</h5>
                  <p className="text-xs text-blue-700">Presentations & Documents</p>
                </div>
              </div>
              <p className="text-sm text-blue-900">
                High-resolution raster format perfect for PowerPoint, Keynote, Google Slides, and Word documents.
              </p>
            </div>

            <div className="border-2 border-green-200 bg-green-50 rounded-sm p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-green-500 rounded-sm flex items-center justify-center mr-3">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h5 className="font-bold text-lg">SVG Vector</h5>
                  <p className="text-xs text-green-700">Web & Print Design</p>
                </div>
              </div>
              <p className="text-sm text-green-900">
                Scalable vector format that stays crisp at any size - ideal for websites, print materials, and design tools.
              </p>
            </div>

            <div className="border-2 border-red-200 bg-red-50 rounded-sm p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-red-500 rounded-sm flex items-center justify-center mr-3">
                  <span className="text-2xl">📄</span>
                </div>
                <div>
                  <h5 className="font-bold text-lg">PDF Document</h5>
                  <p className="text-xs text-red-700">Professional Reports</p>
                </div>
              </div>
              <p className="text-sm text-red-900">
                Universal document format with high quality - perfect for annual reports, board presentations, and archiving.
              </p>
            </div>

            <div className="border-2 border-purple-200 bg-purple-50 rounded-sm p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-purple-500 rounded-sm flex items-center justify-center mr-3">
                  <span className="text-2xl">📸</span>
                </div>
                <div>
                  <h5 className="font-bold text-lg">JPG Image</h5>
                  <p className="text-xs text-purple-700">Web & Social Media</p>
                </div>
              </div>
              <p className="text-sm text-purple-900">
                Compressed format for smaller file sizes - great for email attachments and social media sharing.
              </p>
            </div>
          </div>

          <h4 className="text-xl font-semibold mb-4">Real-World Use Cases</h4>

          <div className="space-y-4 mb-6">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-5 rounded-sm">
              <h5 className="font-semibold text-orange-900 mb-2">📊 Quarterly Business Reviews</h5>
              <p className="text-sm text-orange-800 mb-2">
                Export high-res PNG or PDF to include in executive presentations. Show leadership the entire year's plan 
                with patterns and potential conflicts clearly visible.
              </p>
              <p className="text-xs text-orange-700 italic">
                "Our CMO was blown away - she could finally see all campaigns in context" - Sarah, Marketing Director
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-5 rounded-sm">
              <h5 className="font-semibold text-blue-900 mb-2">🖨️ Office Wall Planning</h5>
              <p className="text-sm text-blue-800 mb-2">
                Export large-format SVG or PDF for printing team planning posters. Keep everyone aligned with a physical 
                reference in your workspace.
              </p>
              <p className="text-xs text-blue-700 italic">
                "We printed a 3-foot wheel poster - it's become our team's north star" - Mike, Product Manager
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-500 p-5 rounded-sm">
              <h5 className="font-semibold text-green-900 mb-2">📧 Client & Stakeholder Updates</h5>
              <p className="text-sm text-green-800 mb-2">
                Export as JPG for email attachments showing project timelines. Communicate complex schedules in one 
                visual that clients instantly understand.
              </p>
              <p className="text-xs text-green-700 italic">
                "Clients love the circular view - it makes our planning look sophisticated" - Alex, Agency Owner
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-5 rounded-sm">
              <h5 className="font-semibold text-purple-900 mb-2">🎤 Conference Presentations</h5>
              <p className="text-sm text-purple-800 mb-2">
                Use SVG exports in presentation software for pixel-perfect displays on any screen size. Professional 
                quality that scales beautifully.
              </p>
              <p className="text-xs text-purple-700 italic">
                "Got more questions about our planning wheel than our actual product!" - Jordan, Startup Founder
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#00A4A6] to-[#008B8D] text-white p-6 rounded-sm">
            <h4 className="font-semibold text-xl mb-3">How to Export</h4>
            <ol className="space-y-2 text-sm opacity-95">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Click the <strong>Export</strong> button in the YearWheel view toolbar</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>Select your format (PNG, SVG, PDF, or JPG)</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>Choose quality: Standard (fast) or High-Resolution (best quality)</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">4.</span>
                <span>Click <strong>Download</strong> - file saves instantly to your device</span>
              </li>
            </ol>
          </div>
        </>
      )
    },
    {
      title: "Get Started Today",
      time: "1 minute",
      icon: Sparkles,
      image: "/docs/monday/images/01-wheel-view-overview.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-8 rounded-sm mb-6 text-center">
            <h3 className="text-3xl font-bold mb-4">Stop Managing Your Year in Rows</h3>
            <h3 className="text-3xl font-bold mb-4">Start Seeing It in Circles</h3>
            <p className="text-xl opacity-95">
              When patterns emerge and conflicts reveal themselves, the path forward becomes clear.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border-2 border-[#00A4A6] rounded-sm p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#00A4A6] rounded-full flex items-center justify-center mr-3">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold">Quick Setup</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Install from Monday.com Marketplace</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Add YearWheel view to any board</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Your data appears instantly - zero configuration</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border-2 border-[#00A4A6] rounded-sm p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#00A4A6] rounded-full flex items-center justify-center mr-3">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold">Team Ready</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Uses Monday.com permissions - no extra setup</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Real-time sync across all team members</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Changes in Monday update the wheel instantly</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-sm p-6 mb-8">
            <h4 className="text-2xl font-bold text-green-900 mb-4 text-center">Why Teams Choose YearWheel</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-4xl font-bold text-green-600 mb-1">30sec</div>
                <p className="text-sm text-green-800">Average setup time</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-600 mb-1">360°</div>
                <p className="text-sm text-green-800">View of your entire year</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-600 mb-1">∞</div>
                <p className="text-sm text-green-800">Insights you'll discover</p>
              </div>
            </div>
          </div>

          <img 
            src="/docs/monday/images/01-wheel-view-overview.png" 
            alt="YearWheel full year view" 
            className="w-full rounded-sm shadow-2xl border-2 border-gray-200 mb-8"
          />

          <div className="space-y-6">
            <div className="bg-white border-2 border-gray-200 rounded-sm p-6">
              <h4 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="w-6 h-6 mr-2 text-[#00A4A6]" />
                Perfect For Your Team
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">📢</span>
                  <div>
                    <p className="font-semibold text-gray-900">Marketing Teams</p>
                    <p className="text-gray-600">Campaigns, launches, seasonal promotions</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-2xl mr-3">🚀</span>
                  <div>
                    <p className="font-semibold text-gray-900">Project Managers</p>
                    <p className="text-gray-600">Timelines, milestones, resource allocation</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-2xl mr-3">👥</span>
                  <div>
                    <p className="font-semibold text-gray-900">HR Departments</p>
                    <p className="text-gray-600">Recruitment, training, performance reviews</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-2xl mr-3">💡</span>
                  <div>
                    <p className="font-semibold text-gray-900">Product Teams</p>
                    <p className="text-gray-600">Roadmaps, release cycles, development</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#00A4A6] to-[#008B8D] text-white rounded-sm p-8 text-center">
              <h4 className="text-2xl font-bold mb-4">Need Help?</h4>
              <p className="text-lg opacity-95 mb-6">
                Our team is here to ensure you get the most out of YearWheel
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:support@yearwheel.se"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#00A4A6] rounded-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  📧 Email Support
                </a>
                <a 
                  href="https://yearwheel.se/support" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#00A4A6] rounded-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  📚 Documentation
                </a>
              </div>
              <p className="text-sm opacity-75 mt-4">Response within 24 hours on business days</p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border-2 border-purple-200 rounded-sm p-6 text-center">
              <h4 className="text-2xl font-bold text-gray-900 mb-3">
                🎉 You're All Set to Transform Your Planning!
              </h4>
              <p className="text-gray-700 mb-4">
                YearWheel helps you understand your annual plan in a way spreadsheets and lists never allow.
              </p>
              <p className="text-lg font-semibold text-[#00A4A6]">
                Start seeing your year in circles today.
              </p>
            </div>
          </div>
        </>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (index) => {
    setCurrentStep(index);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Minimal for iframe embedding */}
      <div className="bg-gradient-to-r from-[#00A4A6] via-[#008B8D] to-[#00A4A6] text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">Transform Your Year into a Visual Masterpiece</h1>
          <p className="text-xl sm:text-2xl opacity-95 font-light">The circular calendar that changes everything</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your Journey</span>
            <span className="text-sm text-gray-600">{currentStep + 1} of {steps.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#00A4A6] to-[#008B8D] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto py-3 gap-2 scrollbar-hide">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <button
                  key={index}
                  onClick={() => goToStep(index)}
                  className={`flex items-center px-4 py-2 rounded-sm font-medium whitespace-nowrap transition-all ${
                    currentStep === index
                      ? 'bg-[#00A4A6] text-white shadow-md'
                      : currentStep > index
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {currentStep > index ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Icon className="w-4 h-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{index + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-sm">
          {/* Step Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {steps[currentStep].title}
                </h2>
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{steps[currentStep].time}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="prose prose-lg max-w-none">
            {steps[currentStep].content}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center px-6 py-3 rounded-sm font-medium transition-colors ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center px-6 py-3 bg-[#00A4A6] text-white rounded-sm font-medium hover:bg-[#008B8D] transition-colors shadow-md hover:shadow-lg"
              >
                Next: {steps[currentStep + 1].title}
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(0)}
                className="flex items-center px-6 py-3 bg-green-600 text-white rounded-sm font-medium hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
              >
                <Check className="w-5 h-5 mr-2" />
                Review Guide
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg font-medium text-gray-800 mb-2">
            Questions? We're here to help!
          </p>
          <p className="mb-3">
            <a href="mailto:support@yearwheel.se" className="text-[#00A4A6] hover:underline font-medium text-lg">
              support@yearwheel.se
            </a>
          </p>
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} YearWheel. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default MondayHowToGuide;
