import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchWheel, fetchPages, fetchPageData } from '../services/wheelService';
import YearWheel from '../YearWheel';
import { Eye, Lock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * PreviewWheelPage - Public read-only view of a wheel
 * Accessible at /preview-wheel/:wheelId
 * No authentication required for public wheels
 */
function PreviewWheelPage() {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wheelData, setWheelData] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPageItems, setCurrentPageItems] = useState([]);

  useEffect(() => {
    const loadWheel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch wheel data (RLS policies will handle access control)
        const data = await fetchWheel(wheelId);
        
        if (!data) {
          setError(t('common:previewWheelPage.wheelNotFound'));
          return;
        }

        console.log('[PreviewWheelPage] Wheel loaded:', { 
          id: data.id, 
          title: data.title, 
          is_public: data.is_public,
          rings: data.organizationData.rings.length,
          activityGroups: data.organizationData.activityGroups.length,
          items: data.organizationData.items.length 
        });
        setWheelData(data);
        
        // Fetch all pages for this wheel
        try {
          const pagesData = await fetchPages(wheelId);
          console.log('[PreviewWheelPage] Pages loaded:', pagesData.length);
          const sortedPages = pagesData.sort((a, b) => a.year - b.year);
          setPages(sortedPages);
          
          // If we have pages, load the first page's items
          if (sortedPages.length > 0) {
            console.log('[PreviewWheelPage] Loading items for first page:', sortedPages[0].id);
            setCurrentPageIndex(0);
            const items = await fetchPageData(sortedPages[0].id);
            console.log('[PreviewWheelPage] Items loaded for first page:', items.length);
            setCurrentPageItems(items);
          }
        } catch (pageErr) {
          console.error('Error loading pages:', pageErr);
          // If pages fail to load, just use the main wheel data
          setPages([]);
        }
      } catch (err) {
        console.error('Error loading public wheel:', err);
        
        if (err.code === 'PGRST116') {
          // No rows returned - wheel doesn't exist or isn't public
          setError(t('common:previewWheelPage.wheelNotFound'));
        } else {
          setError(t('common:previewWheelPage.errorLoading'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (wheelId) {
      loadWheel();
    }
  }, [wheelId]);

  // Load items when page changes
  useEffect(() => {
    const loadPageItems = async () => {
      if (pages.length > 0 && pages[currentPageIndex]) {
        try {
          console.log('[PreviewWheelPage] Loading items for page:', pages[currentPageIndex].id);
          const items = await fetchPageData(pages[currentPageIndex].id);
          console.log('[PreviewWheelPage] Loaded items:', items.length);
          setCurrentPageItems(items);
        } catch (err) {
          console.error('[PreviewWheelPage] Error loading page items:', err);
          setCurrentPageItems([]);
        }
      }
    };

    loadPageItems();
  }, [currentPageIndex, pages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:previewWheelPage.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Lock size={48} className="text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t('common:previewWheelPage.accessDenied')}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            {t('common:previewWheelPage.goToHome')}
          </button>
        </div>
      </div>
    );
  }

  if (!wheelData) {
    return null;
  }

  // Use current page data if available, otherwise fall back to wheel data
  const currentPage = pages[currentPageIndex];
  const displayYear = currentPage?.year || wheelData.year;
  
  // Merge wheel-level data with page-specific items
  const displayOrgData = {
    rings: wheelData.organizationData.rings,
    activityGroups: wheelData.organizationData.activityGroups,
    labels: wheelData.organizationData.labels,
    items: currentPageItems, // Use items fetched separately
  };
  
  const canGoPrev = currentPageIndex > 0;
  const canGoNext = currentPageIndex < pages.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-gray-500" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {wheelData.title}
              </h1>
              <p className="text-sm text-gray-500">
                {t('common:previewWheelPage.publicShared')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Page Navigator (only show if multiple pages) */}
            {pages.length > 1 && (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                <button
                  onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                  disabled={!canGoPrev}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('common:previewWheelPage.previousYear')}
                >
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-sm min-w-[120px]">
                  <Calendar size={16} className="text-gray-500" />
                  <span className="font-semibold text-gray-900">{displayYear}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {currentPageIndex + 1}/{pages.length}
                  </span>
                </div>
                
                <button
                  onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                  disabled={!canGoNext}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={t('common:previewWheelPage.nextYear')}
                >
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
            >
              {t('common:previewWheelPage.goToHome')}
            </button>
          </div>
        </div>
      </div>

      {/* Wheel Display */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <YearWheel
            year={String(displayYear)}
            title={wheelData.title}
            colors={wheelData.colors}
            showWeekRing={wheelData.showWeekRing}
            showMonthRing={wheelData.showMonthRing}
            showRingNames={wheelData.showRingNames}
            showLabels={wheelData.showLabels !== undefined ? wheelData.showLabels : false}
            weekRingDisplayMode={wheelData.weekRingDisplayMode || 'week-numbers'}
            organizationData={displayOrgData}
            readonly={true}
          />
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            {t('common:previewWheelPage.readOnlyInfo')}
            <Link to="/" className="text-blue-600 hover:text-blue-700 ml-1">
              {t('common:previewWheelPage.createYourOwn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PreviewWheelPage;
