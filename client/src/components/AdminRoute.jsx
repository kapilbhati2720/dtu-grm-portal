import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  if (isAuthenticated && user && user.role === 'super_admin') {
    return children;
  }

  return <Navigate to="/login" />;
};

export default AdminRoute;