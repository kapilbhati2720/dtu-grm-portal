import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);

  // 1. While we're checking the token and loading data, show a loading message.
  if (loading) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  // 2. After loading, if the user is authenticated AND has the correct role, show the page.
  if (isAuthenticated && user && user.role === 'super_admin') {
    return children;
  }

  // 3. Otherwise, redirect them to the login page.
  return <Navigate to="/login" />;
};

export default AdminRoute;