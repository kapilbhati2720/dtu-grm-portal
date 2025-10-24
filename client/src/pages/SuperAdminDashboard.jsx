import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserList from '../components/admin/UserList'; // Ensure this path is correct
import CategoryPieChart from '../components/CategoryPieChart';
import StatusBarchart from '../components/StatusBarchart';

const SuperAdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('/api/admin/analytics');
        setAnalytics(res.data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <p className="p-8">Loading dashboard...</p>;

  return (
    <div className="p-4 sm:p-8 bg-gray-100 min-h-full">
      <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>
      
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md text-center min-w-[350px]">
          <h3 className="text-lg font-semibold text-gray-500">Total Grievances</h3>
          <p className="text-4xl font-bold mt-2">{analytics?.kpis.total || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center min-w-[350px]">
          <h3 className="text-lg font-semibold text-gray-500">Pending</h3>
          <p className="text-4xl font-bold mt-2 text-yellow-500">{analytics?.kpis.pending || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md text-center min-w-[350px]">
          <h3 className="text-lg font-semibold text-gray-500">Resolved</h3>
          <p className="text-4xl font-bold mt-2 text-green-500">{analytics?.kpis.resolved || 0}</p>
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Grievances by Category</h3>
          {analytics && <CategoryPieChart data={analytics.byCategory} />}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Grievances by Status</h3>
          {analytics && <StatusBarchart data={analytics.byStatus} />}
        </div>
      </div>

      {/* User Management Table */}
      <UserList />
    </div>
  );
};

export default SuperAdminDashboard;