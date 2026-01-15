import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Check, Calendar, Users, Share2, Eye, Sparkles, BarChart, Target, Layout, MousePointer2, Move, Grid3x3 } from 'lucide-react';

/**
 * YearLine How-To Guide
 * Iframe-embeddable page with no header/footer for monday.com marketplace
 * Accessible at: /yearline/how-to
 * 
 * Simple Timeline Visualization for monday.com
 */
function YearLineHowToGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const contentRef = useRef(null);

  // Scroll to top when step changes
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

  const steps = [
    {
      title: "Install YearLine",
      time: "1 minute",
      icon: Sparkles,
      image: "/docs/yearline/images/01-timeline-overview.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-[#FF5A5F] to-[#E63946] text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Transform Your Boards Into Visual Timelines</h3>
            <p className="text-lg opacity-95">
              Add YearLine to any monday.com board and instantly see your work as a clear Gantt timeline. 
              No configuration, no learning curve—just visual clarity in seconds.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Installation (30 seconds)</h3>
          
          <ol className="space-y-4 mb-6">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#FF5A5F] text-white rounded-full font-semibold mr-3 mt-0.5">1</span>
              <div className="flex-1">
                <p className="font-medium">Open monday.com Marketplace</p>
                <p className="text-gray-600 text-sm mt-1">Click your profile → "Apps Marketplace"</p>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#FF5A5F] text-white rounded-full font-semibold mr-3 mt-0.5">2</span>
              <div className="flex-1">
                <p className="font-medium">Search "YearLine"</p>
                <p className="text-gray-600 text-sm mt-1">Find and click the Install button</p>
              </div>
            </li>
            
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#FF5A5F] text-white rounded-full font-semibold mr-3 mt-0.5">3</span>
              <div className="flex-1">
                <p className="font-medium">Add to Your Board</p>
                <p className="text-gray-600 text-sm mt-1">Open any board → Click "+" next to views → Select "YearLine"</p>
              </div>
            </li>
          </ol>

          <img 
            src="/docs/yearline/images/01-timeline-overview.png" 
            alt="YearLine timeline showing project overview with groups and color-coded tasks" 
            className="w-full rounded-sm shadow-2xl border border-gray-200"
          />
          <p className="text-center text-sm text-gray-600 mt-3 italic">
            Your monday.com board transformed into a visual timeline—see everything at a glance
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-sm border-l-4 border-blue-500">
              <div className="flex items-start">
                <Check className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Works Instantly</p>
                  <p className="text-sm text-blue-800">No configuration needed</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-sm border-l-4 border-green-500">
              <div className="flex items-start">
                <Check className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Real-Time Sync</p>
                  <p className="text-sm text-green-800">Changes update monday.com instantly</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Switch Between Views",
      time: "1 minute",
      icon: Layout,
      image: "/docs/yearline/images/02-color-themes.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">See Your Work from Different Angles</h3>
            <p className="text-lg opacity-95">
              Instantly reorganize your timeline by groups, status, or team members with one click. 
              Each view reveals different insights about your project.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">View Options</h3>

          <div className="space-y-6 mb-6">
            <div className="flex items-start bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-sm border-l-4 border-blue-500">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white mr-4 flex-shrink-0">
                <Grid3x3 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Groups View</h5>
                <p className="text-gray-700 mb-2">See tasks organized by your board's group structure</p>
                <p className="text-sm text-gray-600">Perfect for: Projects, departments, or categories</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-sm border-l-4 border-green-500">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mr-4 flex-shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Status View</h5>
                <p className="text-gray-700 mb-2">Filter by status labels (Working on it, Done, Stuck, etc.)</p>
                <p className="text-sm text-gray-600">Perfect for: Tracking progress across all work</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-orange-50 to-orange-100 p-5 rounded-sm border-l-4 border-orange-500">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white mr-4 flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Members View</h5>
                <p className="text-gray-700 mb-2">See who's working on what and when</p>
                <p className="text-sm text-gray-600">Perfect for: Team capacity planning and workload balancing</p>
              </div>
            </div>
          </div>

          <img 
            src="/docs/yearline/images/02-color-themes.png" 
            alt="YearLine color theme picker with preset options" 
            className="w-full rounded-sm shadow-lg border border-gray-200"
          />
          <p className="text-center text-sm text-gray-600 mt-3 italic">
            Personalize your timeline with themes—from professional Monday Colors to vibrant palettes
          </p>

          <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <Eye className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  Tip: Switch views using the dropdown at the top
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your timeline view changes instantly - no reloading needed
                </p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Drag to Reschedule",
      time: "2 minutes",
      icon: Move,
      image: "/docs/yearline/images/03-edit-item.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-[#FF5A5F] to-[#E63946] text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Edit Tasks Visually</h3>
            <p className="text-lg opacity-95">
              Drag tasks to new dates or resize them to adjust duration—all changes sync to monday.com instantly. 
              No forms to fill, just intuitive visual editing.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Editing Tasks</h3>

          <div className="space-y-6 mb-6">
            <div className="flex items-start bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-sm border-l-4 border-blue-500">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 text-lg">
                1
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Click to Edit Details</h5>
                <p className="text-gray-700 mb-2">Click any task bar to open the edit dialog</p>
                <p className="text-sm text-gray-600">Update name, group, assignments, dates, and status</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-sm border-l-4 border-purple-500">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 text-lg">
                2
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Drag to Move</h5>
                <p className="text-gray-700 mb-2">Drag task bars left or right to change dates</p>
                <p className="text-sm text-gray-600">Duration stays the same, only dates shift</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-sm border-l-4 border-green-500">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 text-lg">
                3
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Resize to Adjust Duration</h5>
                <p className="text-gray-700 mb-2">Drag the edges of task bars to extend or shorten them</p>
                <p className="text-sm text-gray-600">Changes start or end dates while keeping the task in place</p>
              </div>
            </div>
          </div>

          <img 
            src="/docs/yearline/images/03-edit-item.png" 
            alt="YearLine task editor with name, group, dates, status, and member assignment" 
            className="w-full rounded-sm shadow-lg border border-gray-200"
          />
          <p className="text-center text-sm text-gray-600 mt-3 italic">
            Click any task to quickly update details—changes save automatically to monday.com
          </p>

          <div className="mt-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  All changes sync to monday.com automatically
                </p>
                <p className="text-xs text-green-700 mt-1">
                  No save button needed - updates happen in real-time
                </p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Zoom In and Out",
      time: "1 minute",
      icon: Calendar,
      image: "/docs/yearline/images/04-week-view.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Focus on Details or Big Picture</h3>
            <p className="text-lg opacity-95">
              Zoom in for week-by-week planning with precise week numbers, or zoom out to see months at a glance. 
              Navigate quickly to any date with the "Today" button.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Zoom Levels</h3>

          <div className="space-y-6 mb-6">
            <div className="flex items-start bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-sm border-l-4 border-blue-500">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white mr-4 flex-shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Month View</h5>
                <p className="text-gray-700 mb-2">See several months at once for big-picture planning</p>
                <p className="text-sm text-gray-600">Great for quarterly reviews and long-term strategy</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-sm border-l-4 border-green-500">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mr-4 flex-shrink-0">
                <BarChart className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-lg mb-2">Week View</h5>
                <p className="text-gray-700 mb-2">Zoom in to see individual weeks with ISO week numbers</p>
                <p className="text-sm text-gray-600">Perfect for sprint planning and day-to-day management</p>
              </div>
            </div>
          </div>

          <img 
            src="/docs/yearline/images/04-week-view.png" 
            alt="YearLine zoomed to week view with ISO week numbers and grouped tasks" 
            className="w-full rounded-sm shadow-lg border border-gray-200"
          />
          <p className="text-center text-sm text-gray-600 mt-3 italic">
            Zoom to week view for detailed sprint planning with ISO week numbers (W44, W45...)
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-sm border-l-4 border-blue-500">
              <div className="flex items-start">
                <MousePointer2 className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Zoom Controls</p>
                  <p className="text-sm text-blue-800">Use + / - buttons or mouse wheel to zoom</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-sm border-l-4 border-purple-500">
              <div className="flex items-start">
                <Target className="w-5 h-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-purple-900">Jump to Today</p>
                  <p className="text-sm text-purple-800">Click "Today" button to instantly focus on current date</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Filter by Status",
      time: "1 minute",
      icon: Target,
      image: "/docs/yearline/images/05-status-filter.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Show Only What Needs Attention</h3>
            <p className="text-lg opacity-95">
              Filter by status to highlight stuck tasks, active work, or completed items. 
              Perfect for standups, reviews, and keeping your team focused.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Using Status Filters</h3>

          <div className="space-y-4 mb-6">
            <div className="flex items-start bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-sm border-l-4 border-orange-500">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-full font-semibold mr-3 mt-0.5">1</div>
              <div className="flex-1">
                <p className="font-medium">Click the Status Dropdown</p>
                <p className="text-gray-600 text-sm mt-1">Located in the top toolbar next to view options</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-sm border-l-4 border-blue-500">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full font-semibold mr-3 mt-0.5">2</div>
              <div className="flex-1">
                <p className="font-medium">Select Status Labels</p>
                <p className="text-gray-600 text-sm mt-1">Choose one or multiple statuses to filter by</p>
              </div>
            </div>

            <div className="flex items-start bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-sm border-l-4 border-green-500">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-full font-semibold mr-3 mt-0.5">3</div>
              <div className="flex-1">
                <p className="font-medium">Timeline Updates Instantly</p>
                <p className="text-gray-600 text-sm mt-1">See only tasks matching your selected statuses</p>
              </div>
            </div>
          </div>

          <img 
            src="/docs/yearline/images/05-status-filter.png" 
            alt="YearLine timeline filtered by status showing only selected work states" 
            className="w-full rounded-sm shadow-lg border border-gray-200"
          />
          <p className="text-center text-sm text-gray-600 mt-3 italic">
            Use status filters to focus on blocked tasks or celebrate completed work
          </p>

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  Combine filters with different views
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Filter by status AND organize by groups or members for powerful insights
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-sm text-center border-2 border-red-200">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">!</span>
              </div>
              <p className="font-semibold text-red-900 text-sm">Stuck Tasks</p>
              <p className="text-xs text-red-700 mt-1">Show blockers</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-sm text-center border-2 border-yellow-200">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-bold">⚡</span>
              </div>
              <p className="font-semibold text-yellow-900 text-sm">Working On It</p>
              <p className="text-xs text-yellow-700 mt-1">Active work</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-sm text-center border-2 border-green-200">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-green-900 text-sm">Done</p>
              <p className="text-xs text-green-700 mt-1">Completed</p>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Tips & Use Cases",
      time: "2 minutes",
      icon: Sparkles,
      image: "/docs/yearline/images/01-timeline-overview.png",
      content: (
        <>
          <div className="bg-gradient-to-r from-[#FF5A5F] to-[#E63946] text-white p-6 rounded-sm mb-6">
            <h3 className="text-2xl font-bold mb-3">Make YearLine Work for You</h3>
            <p className="text-lg opacity-95">
              Quick tips to maximize your timeline view and common ways teams use YearLine every day.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-4">Tips for Success</h3>

          <div className="space-y-6 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-sm border-l-4 border-blue-500">
              <h5 className="font-semibold text-lg mb-2 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Always Set Dates
              </h5>
              <p className="text-gray-700 mb-2">Make sure your monday.com items have start and end dates</p>
              <p className="text-sm text-gray-600">Items without dates won't appear on the timeline</p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-sm border-l-4 border-purple-500">
              <h5 className="font-semibold text-lg mb-2 flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600" />
                Use Status Labels Consistently
              </h5>
              <p className="text-gray-700 mb-2">Keep status columns updated for accurate filtering</p>
              <p className="text-sm text-gray-600">Status filters only work when statuses are set</p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-sm border-l-4 border-green-500">
              <h5 className="font-semibold text-lg mb-2 flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-600" />
                Organize with Groups
              </h5>
              <p className="text-gray-700 mb-2">Use monday.com groups to structure your timeline views</p>
              <p className="text-sm text-gray-600">Groups become swimlanes in your timeline</p>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-5 rounded-sm border-l-4 border-orange-500">
              <h5 className="font-semibold text-lg mb-2 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-orange-600" />
                Switch Views Regularly
              </h5>
              <p className="text-gray-700 mb-2">Different views reveal different insights</p>
              <p className="text-sm text-gray-600">Try Groups for projects, Status for progress, Members for workload</p>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-5 rounded-sm border-l-4 border-pink-500">
              <h5 className="font-semibold text-lg mb-2 flex items-center">
                <MousePointer2 className="w-5 h-5 mr-2 text-pink-600" />
                Drag to Reschedule Quickly
              </h5>
              <p className="text-gray-700 mb-2">Drag tasks directly on the timeline instead of editing date fields</p>
              <p className="text-sm text-gray-600">Faster for adjusting multiple tasks during planning sessions</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-sm border-2 border-gray-200 mb-6">
            <h4 className="font-bold text-lg mb-4 text-center">Common Use Cases</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-sm shadow-sm">
                <p className="font-semibold text-gray-900 mb-2">📋 Project Management</p>
                <p className="text-sm text-gray-600">Track deliverables, milestones, and dependencies across multiple projects</p>
              </div>
              <div className="bg-white p-4 rounded-sm shadow-sm">
                <p className="font-semibold text-gray-900 mb-2">📢 Marketing Campaigns</p>
                <p className="text-sm text-gray-600">Coordinate campaign launches, content schedules, and promotional events</p>
              </div>
              <div className="bg-white p-4 rounded-sm shadow-sm">
                <p className="font-semibold text-gray-900 mb-2">🚀 Product Releases</p>
                <p className="text-sm text-gray-600">Plan sprints, track features, and manage release timelines</p>
              </div>
              <div className="bg-white p-4 rounded-sm shadow-sm">
                <p className="font-semibold text-gray-900 mb-2">👥 Team Coordination</p>
                <p className="text-sm text-gray-600">Visualize team capacity, prevent overload, and balance workload</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-400 p-5 rounded-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-base font-semibold text-green-800 mb-2">
                  You're Ready to Go!
                </p>
                <p className="text-sm text-green-700">
                  YearLine is now part of your monday.com workflow. Start visualizing your timelines 
                  and adjusting schedules with drag and drop. Your changes sync automatically.
                </p>
              </div>
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

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#FF5A5F] to-[#E63946] text-white py-12 px-4 sm:px-6 lg:px-8 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <BarChart className="w-12 h-12" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-4">
            YearLine for monday.com
          </h1>
          <p className="text-xl md:text-2xl text-center opacity-95 max-w-3xl mx-auto">
            Simple Timeline Visualization for Your Boards
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <div className="bg-[#FF5A5F] text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                {currentStep + 1}
              </div>
              <span className="text-sm text-gray-600 hidden sm:inline">of {steps.length} steps</span>
            </div>
            <div className="flex-1 mx-6">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF5A5F] to-[#E63946] transition-all duration-300 ease-out"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-600 hidden sm:inline">{steps[currentStep].time}</span>
          </div>
        </div>
      </div>

      {/* Step Navigation Pills */}
      <div className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    index === currentStep
                      ? 'bg-[#FF5A5F] text-white shadow-md'
                      : index < currentStep
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index < currentStep ? (
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
      <div ref={contentRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-sm shadow-xl p-8 md:p-12 border border-gray-200">
          {/* Step Header */}
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-br from-[#FF5A5F] to-[#E63946] text-white rounded-full p-4 mr-4">
              <StepIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{steps[currentStep].title}</h2>
              <p className="text-gray-600 mt-1">{steps[currentStep].time} to complete</p>
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
                className="flex items-center px-6 py-3 bg-[#FF5A5F] text-white rounded-sm font-medium hover:bg-[#E63946] transition-colors shadow-md hover:shadow-lg"
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

      {/* Legal Links Footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-8 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-600">
          <a href="/yearline/legal/terms" className="hover:text-[#FF5A5F] transition-colors">
            Terms of Service
          </a>
          <span className="hidden sm:inline text-gray-400">•</span>
          <a href="/yearline/legal/privacy" className="hover:text-[#FF5A5F] transition-colors">
            Privacy Policy
          </a>
          <span className="hidden sm:inline text-gray-400">•</span>
          <a href="mailto:hey@communitaslabs.io" className="hover:text-[#FF5A5F] transition-colors">
            hey@communitaslabs.io
          </a>
        </div>
      </div>

    </div>
  );
}

export default YearLineHowToGuide;
