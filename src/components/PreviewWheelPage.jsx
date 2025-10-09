import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWheel } from '../services/wheelService';
import YearWheel from './YearWheel';
import { Eye, Lock } from 'lucide-react';

/**
 * PreviewWheelPage - Public read-only view of a wheel
 * Accessible at /preview-wheel/:wheelId
 * No authentication required for public wheels
 */
function PreviewWheelPage() {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wheelData, setWheelData] = useState(null);

  useEffect(() => {
    const loadWheel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch wheel data (RLS policies will handle access control)
        const data = await fetchWheel(wheelId);
        
        if (!data) {
          setError('Hjulet hittades inte eller är inte publikt delat.');
          return;
        }

        setWheelData(data);
      } catch (err) {
        console.error('Error loading public wheel:', err);
        
        if (err.code === 'PGRST116') {
          // No rows returned - wheel doesn't exist or isn't public
          setError('Hjulet hittades inte eller är inte publikt delat.');
        } else {
          setError('Ett fel uppstod vid laddning av hjulet.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (wheelId) {
      loadWheel();
    }
  }, [wheelId]);

  if (isLoading) {
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
        <div className="text-center max-w-md">
          <Lock size={48} className="text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Åtkomst nekad</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
          >
            Gå till startsidan
          </button>
        </div>
      </div>
    );
  }

  if (!wheelData) {
    return null;
  }

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
                Publikt delat årshjul - Skrivskyddat läge
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
          >
            Gå till startsidan
          </button>
        </div>
      </div>

      {/* Wheel Display */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <YearWheel
            year={wheelData.year}
            title={wheelData.title}
            colors={wheelData.colors}
            showWeekRing={wheelData.show_week_ring}
            showMonthRing={wheelData.show_month_ring}
            showRingNames={wheelData.show_ring_names}
            organizationData={wheelData.organizationData}
            readonly={true}
          />
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Detta är en skrivskyddad förhandsgranskning. 
            <a href="/" className="text-blue-600 hover:text-blue-700 ml-1">
              Skapa ditt eget årshjul
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PreviewWheelPage;
