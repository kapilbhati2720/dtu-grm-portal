import React, { useContext } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Import all page and route components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MyGrievancesPage from './pages/MyGrievancesPage';
import GrievanceDetailPage from './pages/GrievanceDetailPage';
import SubmitGrievancePage from './pages/SubmitGrievancePage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import OfficerGrievanceDetailPage from './pages/OfficerGrievanceDetailPage';
import PrivateRoute from './components/PrivateRoute';
import OfficerRoute from './components/OfficerRoute';
import Notifications from './components/Notifications';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminRoute from './components/AdminRoute';

function App() {
  const { isAuthenticated, user, loading, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <nav className="bg-white shadow p-4 flex justify-center items-center gap-6">
        <Link to="/" className="text-gray-700 hover:text-blue-600 font-semibold">Home</Link>
        
        { !loading && isAuthenticated ? (
          <>
            <Link to={user?.role === 'nodal_officer' ? '/officer/dashboard' : '/dashboard'} className="text-gray-700 hover:text-blue-600 font-semibold">Dashboard</Link>
            <div className="flex items-center gap-6 ml-auto">
              <Notifications />
              <button onClick={handleLogout} className="text-gray-700 hover:text-blue-600 font-semibold">Logout</button>
            </div>
          </>
        ) : (
          !loading && (
            <div className="flex items-center gap-6 ml-auto">
              <Link to="/login" className="text-gray-700 hover:text-blue-600 font-semibold">Login</Link>
              <Link to="/register" className="text-gray-700 hover:text-blue-600 font-semibold">Register</Link>
            </div>
          )
        )}
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/my-grievances" element={<PrivateRoute><MyGrievancesPage /></PrivateRoute>} />
          <Route path="/grievance/:ticketId" element={<PrivateRoute><GrievanceDetailPage /></PrivateRoute>} />
          <Route path="/submit-grievance" element={<PrivateRoute><SubmitGrievancePage /></PrivateRoute>} />
          <Route path="/officer/dashboard" element={<OfficerRoute><OfficerDashboardPage /></OfficerRoute>} />
          <Route path="/officer/grievance/:ticketId" element={<OfficerRoute><OfficerGrievanceDetailPage /></OfficerRoute>} />
          <Route path="/admin/dashboard" element={<AdminRoute><SuperAdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;