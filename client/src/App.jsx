import React, { useContext, useEffect } from 'react'; // 1. Import useEffect
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'; // 1. Import useLocation
import { AuthContext } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  const location = useLocation(); // 2. Get the current browser location

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user || !user.roles || user.roles.length === 0) return '/dashboard';
    if (user.roles.some(r => r.role_name === 'super_admin')) return '/admin/dashboard';
    if (user.roles.some(r => r.role_name === 'nodal_officer')) return '/officer/dashboard';
    return '/dashboard';
  };
  
  // 3. Add the useEffect hook to handle post-login redirection
  useEffect(() => {
    // Wait until loading is false and the user is authenticated
    if (!loading && isAuthenticated && user) {
      // We only want to redirect if the user has just landed on the login page
      // after becoming authenticated.
      if (location.pathname === '/login') {
        const dashboardPath = getDashboardPath(); // Reuse your helper function!
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate, location]); // Dependencies for the effect

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <nav className="sticky top-0 z-50 bg-white shadow p-4 flex justify-between items-center px-8">
        <Link to="/" className="text-gray-800 hover:text-blue-600 font-bold text-lg">DTU GRM Portal</Link>
        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link to={getDashboardPath()} className="text-gray-700 hover:text-blue-600 font-semibold">Dashboard</Link>
              <Notifications />
              <button onClick={handleLogout} className="text-gray-700 hover:text-blue-600 font-semibold">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-700 hover:text-blue-600 font-semibold">Login</Link>
              <Link to="/register" className="text-gray-700 hover:text-blue-600 font-semibold">Register</Link>
            </>
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
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;