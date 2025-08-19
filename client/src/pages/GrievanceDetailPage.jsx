import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const GrievanceDetailPage = () => {
  const { ticketId } = useParams();
  const [grievance, setGrievance] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGrievanceDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/grievances/${ticketId}`);
      setGrievance(res.data.grievance);
      setUpdates(res.data.updates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievanceDetails();
  }, [ticketId]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
        await axios.post(`http://localhost:5000/api/grievances/${grievance.grievance_id}/comments`, { comment });
        setComment('');
        fetchGrievanceDetails(); // Refresh details to show new comment
    } catch (err) {
        console.error('Failed to post comment', err);
        alert('Failed to post comment.');
    }
  };

  if (loading) return <p className="text-center mt-8">Loading grievance details...</p>;
  if (!grievance) return <p className="text-center mt-8">Grievance not found.</p>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4 md:p-8">
      {/* --- Grievance Details Card (Restored) --- */}
      <div className="bg-white p-8 rounded-lg shadow-xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">{grievance.title}</h1>
          <span className="bg-blue-100 text-blue-800 text-lg font-semibold px-3 py-1 rounded">
            {grievance.status}
          </span>
        </div>
        <p className="text-md text-gray-500 mb-6">TICKET #{grievance.ticket_id}</p>
        <div className="bg-gray-50 p-6 rounded-md mb-6">
          <h3 className="font-semibold text-lg mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{grievance.description}</p>
        </div>
        <div className="border-t pt-4 text-gray-600">
          <p><span className="font-semibold text-gray-800">Category:</span> {grievance.category}</p>
          <p><span className="font-semibold text-gray-800">Submitted:</span> {new Date(grievance.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* --- Grievance History / Comments --- */}
      <div className="bg-white p-8 rounded-lg shadow-xl mb-8">
        <h2 className="text-2xl font-bold mb-4">Grievance History</h2>
        <div className="space-y-6">
          {updates.length > 0 ? (
            updates.map((update, index) => (
              <div key={index} className="border-l-4 border-gray-200 pl-4">
                <p className="font-semibold text-gray-800">{update.author_name} <span className="text-sm text-gray-500 capitalize">({update.role})</span></p>
                <p className="text-gray-700 my-1">{update.comment}</p>
                <p className="text-xs text-gray-400">{new Date(update.created_at).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No updates or comments yet.</p>
          )}
        </div>
      </div>
      
      {/* --- Add Comment Form --- */}
      <div className="bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-4">Add a Comment</h2>
        <form onSubmit={handleCommentSubmit}>
          <textarea 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            rows="4" 
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" 
            placeholder="Type your comment here..."
            required
          ></textarea>
          <button 
            type="submit" 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Submit Comment
          </button>
        </form>
      </div>

      <Link to="/my-grievances" className="inline-block mt-8 text-blue-600 hover:underline">
        &larr; Back to My Grievances
      </Link>
    </div>
  );
};

export default GrievanceDetailPage;