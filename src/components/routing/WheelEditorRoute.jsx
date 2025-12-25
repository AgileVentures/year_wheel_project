import { lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Lazy load WheelEditor - it's 5600+ lines and only needed when editing
const WheelEditor = lazy(() => import('../editor/WheelEditor'));

function WheelEditorRoute() {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile detection now happens inside WheelEditor - it renders MobileEditor for mobile devices

  // Use location.key as a reloadTrigger without forcing full remount
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Laddar...</p>
        </div>
      </div>
    }>
      <WheelEditor 
        wheelId={wheelId}
        reloadTrigger={location.key} // Trigger reload without remounting
        onBackToDashboard={() => navigate('/dashboard')} 
      />
    </Suspense>
  );
}

export default WheelEditorRoute;
