import React, { useContext } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Import all pages and components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import MyGrievancesPage from './pages/MyGrievancesPage';
import GrievanceDetailPage from './pages/GrievanceDetailPage';
import SubmitGrievancePage from './pages/SubmitGrievancePage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import OfficerGrievanceDetailPage from './pages/OfficerGrievanceDetailPage';
import PrivateRoute from './components/PrivateRoute';
import OfficerRoute from './components/OfficerRoute';
import AdminRoute from './components/AdminRoute';
import Notifications from './components/Notifications';

function App() {
  const { isAuthenticated, user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper function to get the correct dashboard path based on role
  const getDashboardPath = () => {
    if (!user) return '/dashboard'; // Default fallback
    switch (user.role) {
      case 'super_admin':
        return '/admin/dashboard';
      case 'nodal_officer':
        return '/officer/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <nav className="bg-white shadow p-4 flex justify-between items-center px-8">
        <Link to="/" className="text-gray-800 hover:text-blue-600 font-bold text-lg">DTU GRM Portal</Link>
        
        <div className="flex items-center gap-6">
          { !loading && isAuthenticated ? (
            <>
              <Link to={getDashboardPath()} className="text-gray-700 hover:text-blue-600 font-semibold">Dashboard</Link>
              <Notifications />
              <button onClick={handleLogout} className="text-gray-700 hover:text-blue-600 font-semibold">Logout</button>
            </>
          ) : (
            !loading && (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600 font-semibold">Login</Link>
                <Link to="/register" className="text-gray-700 hover:text-blue-600 font-semibold">Register</Link>
              </>
            )
          )}
        </div>
      </nav>
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Student Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/my-grievances" element={<PrivateRoute><MyGrievancesPage /></PrivateRoute>} />
          <Route path="/grievance/:ticketId" element={<PrivateRoute><GrievanceDetailPage /></PrivateRoute>} />
          <Route path="/submit-grievance" element={<PrivateRoute><SubmitGrievancePage /></PrivateRoute>} />

          {/* Officer Protected Routes */}
          <Route path="/officer/dashboard" element={<OfficerRoute><OfficerDashboardPage /></OfficerRoute>} />
          <Route path="/officer/grievance/:ticketId" element={<OfficerRoute><OfficerGrievanceDetailPage /></OfficerRoute>} />

          {/* Admin Protected Route */}
          <Route path="/admin/dashboard" element={<AdminRoute><SuperAdminDashboard /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;