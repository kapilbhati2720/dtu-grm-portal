import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const DashboardPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div className="text-center mt-10"><p>Loading user data...</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl">
      <h1 className="text-4xl font-bold mb-4">User Dashboard</h1>

      <div className="bg-gray-100 p-6 rounded-md">
        <h2 className="text-2xl font-semibold mb-4">Welcome, {user.full_name}!</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
          <p><span className="font-semibold">Email:</span> {user.email}</p>
          <p><span className="font-semibold">Roll Number:</span> {user.roll_number}</p>
          <p><span className="font-semibold">Branch Code:</span> {user.branch_code}</p>
          <p><span className="font-semibold">Admission Year:</span> {user.admission_year}</p>
          <p><span className="font-semibold">Role:</span> <span className="capitalize">{user.role}</span></p>
        </div>
      </div>

      {/* --- ADD THIS LINK --- */}
      <Link 
        to="/my-grievances" 
        className="mt-8 mr-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        View My Grievances
      </Link>
      <Link 
        to="/submit-grievance" 
        className="mt-8 mr-4 inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Submit New Grievance
      </Link>
      {/* --- END OF ADDITION --- */}

      {/* <button
        onClick={handleLogout}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Logout
      </button> */}
    </div>
  );
};

export default DashboardPage;