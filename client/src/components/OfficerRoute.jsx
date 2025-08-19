import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const OfficerRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);

  // Show a loading message while we verify the user and their role
  if (loading) {
    return <div className="text-center mt-20">Loading...</div>;
  }
  
  // After loading, check for authentication and the correct role
  if (isAuthenticated && user && user.role === 'nodal_officer') {
    return children;
  } 
  
  // If not authenticated or not an officer, redirect to login
  return <Navigate to="/login" />;
};

export default OfficerRoute;