import { lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../Toast';

const Dashboard = lazy(() => import("../dashboard/Dashboard"));

function DashboardRoute() {
  const navigate = useNavigate();

  return (
    <>
      <Dashboard onSelectWheel={(wheelId) => navigate(`/wheel/${wheelId}`)} />
      <Toast />
    </>
  );
}

export default DashboardRoute;
