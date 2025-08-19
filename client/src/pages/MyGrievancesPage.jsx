import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const MyGrievancesPage = () => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/grievances/my-grievances');
        setGrievances(res.data);
      } catch (err) {
        setError('Could not fetch grievances.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrievances();
  }, []);

  if (loading) {
    return <p className="text-center mt-8">Loading your grievances...</p>;
  }

  if (error) {
    return <p className="text-center mt-8 text-red-500">{error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8">
      <h1 className="text-4xl font-bold mb-6">My Submitted Grievances</h1>
      <div className="space-y-4">
        {grievances.length > 0 ? (
          grievances.map((grievance) => (
            <Link 
              key={grievance.ticket_id} 
              to={`/grievance/${grievance.ticket_id}`}
              className="block hover:bg-gray-50"
            >
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{grievance.title}</h2>
                    <p className="text-sm text-gray-500">TICKET #{grievance.ticket_id}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                    {grievance.status}
                  </span>
                </div>
                <p className="text-gray-600 mt-2">Category: {grievance.category}</p>
                <p className="text-gray-500 text-sm mt-4">
                Submitted on: {new Date(grievance.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))
  
        ) : (
          <p>You have not submitted any grievances yet.</p>
        )}
      </div>
    </div>
  );
};

export default MyGrievancesPage;