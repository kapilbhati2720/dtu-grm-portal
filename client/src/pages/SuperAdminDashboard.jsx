import React from 'react';
import DataGenerator from '../components/admin/DataGenerator';
import TriageTool from '../components/admin/TriageTool';
import UserList from '../components/admin/UserList'; // <-- Import UserList

const SuperAdminDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto mt-10 p-8 space-y-8">
      <h1 className="text-4xl font-bold mb-6">Super Admin Dashboard</h1>
      
      {/* AI Tools Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DataGenerator />
        <TriageTool />
      </div>
      
      {/* User Management Section */}
      <div>
        <UserList /> 
      </div>

    </div>
  );
};

export default SuperAdminDashboard;