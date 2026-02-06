import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TemplateManager from '../components/TemplateManager';
import { fetchUserWheels, fetchTeamWheels, fetchWheel, fetchPageData } from '../services/wheelService';
import { supabase } from '../lib/supabase';

/**
 * ReportTemplatesPage - Standalone page for managing report templates
 * Accessible via /templates route
 */
export default function ReportTemplatesPage() {
  const navigate = useNavigate();
  const [wheels, setWheels] = useState([]);
  const [selectedWheelId, setSelectedWheelId] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [pages, setPages] = useState([]);
  const [wheelData, setWheelData] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [organizationData, setOrganizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingWheel, setLoadingWheel] = useState(false);

  // Load user's wheels on mount
  useEffect(() => {
    const loadWheels = async () => {
      try {
        const [userWheels, teamWheels] = await Promise.all([
          fetchUserWheels(),
          fetchTeamWheels()
        ]);
        const allWheels = [...userWheels, ...teamWheels];
        setWheels(allWheels);
        
        // Auto-select first wheel if available
        if (allWheels.length > 0) {
          setSelectedWheelId(allWheels[0].id);
        }
      } catch (error) {
        console.error('Failed to load wheels:', error);
      } finally {
        setLoading(false);
      }
    };
    loadWheels();
  }, []);

  // Load wheel data when selection changes
  useEffect(() => {
    const loadWheelData = async () => {
      if (!selectedWheelId) {
        setWheelData(null);
        setPageData(null);
        setOrganizationData(null);
        setPages([]);
        return;
      }

      setLoadingWheel(true);
      try {
        // Fetch wheel and its pages
        const wheel = await fetchWheel(selectedWheelId);
        
        // Fetch pages for this wheel
        const { data: wheelPages, error: pagesError } = await supabase
          .from('wheel_pages')
          .select('*')
          .eq('wheel_id', selectedWheelId)
          .order('page_order');
        
        if (pagesError) throw pagesError;
        
        setWheelData(wheel);
        setPages(wheelPages || []);
        
        // Auto-select first page
        if (wheelPages.length > 0) {
          const firstPage = wheelPages[0];
          setSelectedPageId(firstPage.id);
          
          // Load page items
          const items = await fetchPageData(firstPage.id, firstPage.year, selectedWheelId);
          setPageData(firstPage);
          setOrganizationData({
            rings: wheel.structure?.rings || [],
            activityGroups: wheel.structure?.activityGroups || [],
            labels: wheel.structure?.labels || [],
            items: items
          });
        }
      } catch (error) {
        console.error('Failed to load wheel data:', error);
      } finally {
        setLoadingWheel(false);
      }
    };
    loadWheelData();
  }, [selectedWheelId]);

  // Load page data when page selection changes
  useEffect(() => {
    const loadPageData = async () => {
      if (!selectedPageId || !selectedWheelId || !wheelData) return;
      
      const page = pages.find(p => p.id === selectedPageId);
      if (!page) return;

      setLoadingWheel(true);
      try {
        const items = await fetchPageData(selectedPageId, page.year, selectedWheelId);
        setPageData(page);
        setOrganizationData({
          rings: wheelData.structure?.rings || [],
          activityGroups: wheelData.structure?.activityGroups || [],
          labels: wheelData.structure?.labels || [],
          items: items
        });
      } catch (error) {
        console.error('Failed to load page data:', error);
      } finally {
        setLoadingWheel(false);
      }
    };
    loadPageData();
  }, [selectedPageId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Tillbaka till Dashboard</span>
              </Link>
            </div>
            
            {/* Wheel selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Hjul:</label>
                <select
                  value={selectedWheelId}
                  onChange={(e) => setSelectedWheelId(e.target.value)}
                  disabled={loading}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                >
                  {loading ? (
                    <option>Laddar...</option>
                  ) : wheels.length === 0 ? (
                    <option value="">Inga hjul hittades</option>
                  ) : (
                    <>
                      <option value="">Välj ett hjul...</option>
                      {wheels.map(wheel => (
                        <option key={wheel.id} value={wheel.id}>
                          {wheel.title} ({wheel.year})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              
              {/* Page selector (if wheel has multiple pages) */}
              {pages.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sida:</label>
                  <select
                    value={selectedPageId}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    disabled={loadingWheel}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {pages.map(page => (
                      <option key={page.id} value={page.id}>
                        {page.title || page.year}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {loadingWheel && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
            </div>
            
            <h1 className="text-lg font-semibold text-gray-900">Rapportmallar</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <TemplateManager
            wheelData={wheelData}
            pageData={pageData}
            organizationData={organizationData}
            onClose={() => navigate('/dashboard')}
          />
        </div>
      </main>
    </div>
  );
}
