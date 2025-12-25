import { useParams, useNavigate, useLocation } from 'react-router-dom';
import WheelEditor from '../editor/WheelEditor';

function WheelEditorRoute() {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile detection now happens inside WheelEditor - it renders MobileEditor for mobile devices

  // Use location.key as a reloadTrigger without forcing full remount
  return (
    <WheelEditor 
      wheelId={wheelId}
      reloadTrigger={location.key} // Trigger reload without remounting
      onBackToDashboard={() => navigate('/dashboard')} 
    />
  );
}

export default WheelEditorRoute;
