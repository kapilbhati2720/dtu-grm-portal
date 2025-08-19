import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const OfficerDashboardPage = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/officer/grievances');
        setGrievances(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrievances();
  }, []);

  if (loading) return <p className="text-center mt-8">Loading assigned grievances...</p>;

  return (
    <div className="max-w-6xl mx-auto mt-10 p-8">
      <h1 className="text-4xl font-bold mb-6">Officer Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h2 className="text-2xl font-semibold mb-4">Assigned Grievances</h2>
        <div className="space-y-4">
          {grievances.length > 0 ? (
            grievances.map((g) => (
              <Link key={g.ticket_id} to={`/officer/grievance/${g.ticket_id}`}className="block">
                   <div className="p-4 border rounded-md hover:bg-gray-50 hover:shadow-sm transition-shadow">
                     <p className="font-bold text-blue-700">{g.title}</p>
                     <p className="text-sm text-gray-600">From: {g.student_name} | Ticket: {g.ticket_id}</p>
                     <p className="text-sm">Status: <span className="font-semibold">{g.status}</span></p>    
                    </div>    
                </Link>
            ))
          ) : (
            <p>No grievances are currently assigned to your department.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboardPage;