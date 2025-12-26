import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import WheelLoader from '../WheelLoader';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <WheelLoader size="sm" className="mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default ProtectedRoute;
