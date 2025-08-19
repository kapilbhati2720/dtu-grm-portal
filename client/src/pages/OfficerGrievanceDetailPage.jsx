import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const OfficerGrievanceDetailPage = () => {
  const { ticketId } = useParams();
  const { user } = useContext(AuthContext); // Get the logged-in user
  const [grievance, setGrievance] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');

  const fetchGrievanceDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/officer/grievances/${ticketId}`);
      setGrievance(res.data.grievance);
      setUpdates(res.data.updates);
      setNewStatus(res.data.grievance.status); // Set initial status
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievanceDetails();
  }, [ticketId]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/officer/grievances/${ticketId}/status`, { status: newStatus });
      alert('Status updated successfully!');
      fetchGrievanceDetails(); // Refresh details
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await axios.post(`http://localhost:5000/api/grievances/${grievance.grievance_id}/comments`, { comment });
      setComment('');
      fetchGrievanceDetails(); // Refresh details
    } catch (err) {
      alert('Failed to post comment.');
    }
  };

  if (loading) return <p className="text-center mt-8">Loading grievance details...</p>;
  if (!grievance) return <p className="text-center mt-8">Grievance not found.</p>;

  return (
    <div className="max-w-7xl mx-auto mt-10 p-4 md:p-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* --- Main Grievance Details (Left Column) --- */}
        <div className="lg:w-2/3">
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-800">{grievance.title}</h1>
              <span className="bg-blue-100 text-blue-800 text-lg font-semibold px-3 py-1 rounded">
                {grievance.status}
              </span>
            </div>
            <p className="text-md text-gray-500 mb-6">
              TICKET #{grievance.ticket_id} | Submitted by: {grievance.student_name}
            </p>
            <div className="bg-gray-50 p-6 rounded-md mb-6">
              <h3 className="font-semibold text-lg mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{grievance.description}</p>
            </div>
            <div className="border-t pt-4 text-gray-600">
              <p><span className="font-semibold text-gray-800">Category:</span> {grievance.category}</p>
              <p><span className="font-semibold text-gray-800">Submitted:</span> {new Date(grievance.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* --- Actions (Right Column) --- */}
        <div className="lg:w-1/3 space-y-8">
          {/* --- Update Status Card (Restored) --- */}
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Update Status</h2>
            <form onSubmit={handleStatusUpdate}>
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option>Submitted</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  <option>Rejected</option>
                </select>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  Update
                </button>
              </div>
            </form>
          </div>

          {/* --- Add Comment Card --- */}
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Add an Official Comment</h2>
            <form onSubmit={handleCommentSubmit}>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="4" className="w-full p-2 border rounded-md" placeholder="Type your comment here..."></textarea>
              <button type="submit" className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Submit Comment
              </button>
            </form>
          </div>
        </div>
      </div>
      <Link to="/officer/dashboard" className="inline-block mt-8 text-blue-600 hover:underline">
        &larr; Back to Dashboard
      </Link>
    </div>
  );
};

export default OfficerGrievanceDetailPage;