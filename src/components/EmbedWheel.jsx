import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import YearWheel from '../YearWheel';
import { supabase } from '../lib/supabase';

export default function EmbedWheel() {
  const { wheelId } = useParams();
  const [wheelData, setWheelData] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWheel();
  }, [wheelId]);

  const loadWheel = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch wheel data with pages
      const { data: wheel, error: wheelError } = await supabase
        .from('year_wheels')
        .select(`
          *,
          wheel_pages (
            *,
            wheel_rings (*),
            activity_groups (*),
            labels (*)
          )
        `)
        .eq('id', wheelId)
        .single();

      if (wheelError) throw wheelError;

      if (!wheel) {
        setError('Hjul hittades inte');
        return;
      }

      // Check if wheel is public
      if (!wheel.is_public) {
        setError('Detta hjul är inte publikt tillgängligt');
        return;
      }

      setWheelData(wheel);

      // Select first page by default
      if (wheel.wheel_pages && wheel.wheel_pages.length > 0) {
        const sortedPages = [...wheel.wheel_pages].sort((a, b) => a.page_order - b.page_order);
        setSelectedPage(sortedPages[0]);
      }
    } catch (err) {
      console.error('Error loading wheel:', err);
      setError('Kunde inte ladda hjulet');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar hjul...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ett fel uppstod</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!wheelData || !selectedPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Ingen data tillgänglig</p>
      </div>
    );
  }

  // Calculate canvas size based on viewport
  const viewportSize = Math.min(window.innerWidth, window.innerHeight);
  const canvasSize = Math.floor(viewportSize * 0.95);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Title and year info */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{wheelData.title}</h1>
        <p className="text-sm text-gray-600">{selectedPage.year}</p>
      </div>

      {/* Year Wheel Canvas */}
      <div className="relative" style={{ width: canvasSize, height: canvasSize }}>
        <YearWheel
          year={selectedPage.year}
          title={wheelData.title}
          colors={selectedPage.override_colors || wheelData.colors}
          size={canvasSize * 2} // High resolution for sharp rendering
          organizationData={selectedPage.organization_data}
          options={{
            showWeekRing: selectedPage.override_show_week_ring ?? wheelData.show_week_ring,
            showMonthRing: selectedPage.override_show_month_ring ?? wheelData.show_month_ring,
            showRingNames: selectedPage.override_show_ring_names ?? wheelData.show_ring_names,
            showLabels: wheelData.show_labels,
            weekRingDisplayMode: wheelData.week_ring_display_mode,
            zoomedMonth: null,
            zoomedQuarter: null,
            readonly: true, // Disable interactions in embed
          }}
        />
      </div>

      {/* Page navigation if multiple pages */}
      {wheelData.wheel_pages.length > 1 && (
        <div className="mt-4 flex gap-2">
          {[...wheelData.wheel_pages]
            .sort((a, b) => a.page_order - b.page_order)
            .map((page) => (
              <button
                key={page.id}
                onClick={() => setSelectedPage(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPage.id === page.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page.year}
              </button>
            ))}
        </div>
      )}

      {/* Footer with branding */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Skapat med <a href="https://yearwheel.se" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">YearWheel</a></p>
      </div>
    </div>
  );
}
