import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import RejectGrievanceModal from '../components/grievances/RejectGrievanceModal';
import RequestInfoModal from '../components/grievances/RequestInfoModal';
import ConfirmationModal from '../components/common/ConfirmationModal';

const GrievanceDetailPage = () => {
  const { ticketId } = useParams();
  const { user } = useContext(AuthContext);

  // State for data and modals
  const [grievance, setGrievance] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [isRequestInfoModalOpen, setRequestInfoModalOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null);

  // Fetch grievance details from the server
  const fetchGrievanceDetails = useCallback(async () => {
      try {
          setLoading(true);
          // With the proxy, we can use a relative URL
          const res = await axios.get(`/api/grievances/${ticketId}`);
          setGrievance(res.data.grievance);
          setUpdates(res.data.updates);
      } catch (err) {
          console.error("API Error fetching grievance:", err.response);
          toast.error(err.response?.data?.msg || 'Failed to fetch grievance details.');
      } finally {
          setLoading(false);
      }
  }, [ticketId]);

  useEffect(() => {
    if (user) {
        fetchGrievanceDetails();
    }
  }, [user, fetchGrievanceDetails]);

  const handleStatusUpdate = async (status, reason = null) => {
      try {
          const body = { status };
          if (reason) body.reason = reason; // Add reason/comment to the request if provided

          // Use the primary key `grievance_id` for API actions
          await axios.put(`/api/grievances/${grievance.ticket_id}/status`, body);
          toast.success(`Grievance status updated to ${status}!`);

          // Close modals and refresh the page data
          setConfirmation(null);
          setRejectModalOpen(false);
          setRequestInfoModalOpen(false);
          fetchGrievanceDetails();
      } catch (err) {
          toast.error(err.response?.data?.msg || 'Failed to update status.');
      }
    };

  // New function to open the confirmation modal
  const openConfirmation = (status, details) => {
      setConfirmation({ status, ...details });
  };

  const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        try {
            await axios.post(`/api/grievances/${grievance.ticket_id}/comments`, { comment });
            toast.success('Comment posted!');
            setComment('');
            fetchGrievanceDetails();
        } catch (err) {
            toast.error('Failed to post comment.');
        }
  };

  // Permission check logic
  const isSuperAdmin = user?.roles.some(r => r.role_name === 'super_admin');
  const isAssignedOfficer = isSuperAdmin || (user?.roles.some(r =>
      r.role_name === 'nodal_officer' && r.department_id === grievance?.department_id
  ));

  if (loading) return <p className="text-center mt-8">Loading grievance details...</p>;
  if (!grievance) return <p className="text-center mt-8">Grievance not found or you are not authorized to view it.</p>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4 md:p-8">
        {/* --- Grievance Details Card --- */}
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

        {/* --- Officer Actions Section --- */}
        {isAssignedOfficer && (
            <div className="bg-white p-6 rounded-lg shadow-xl mb-8">
                <h2 className="text-2xl font-bold mb-4">Officer Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <button onClick={() => openConfirmation('Resolved', { 
                            title: 'Resolve Grievance',
                            message: 'Are you sure you want to mark this grievance as resolved?',
                            confirmText: 'Resolve',
                            confirmClass: 'bg-green-500 hover:bg-green-600'
                        })} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                        Mark as Resolved
                    </button>
                    <button onClick={() => setRejectModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                        Reject
                    </button>
                    <button 
                        onClick={() => openConfirmation('Escalated', { 
                            title: 'Escalate Grievance',
                            message: 'This will notify the super admin. Are you sure you want to escalate?',
                            confirmText: 'Escalate',
                            confirmClass: 'bg-yellow-500 hover:bg-yellow-600'
                        })}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
                    >
                        Escalate
                    </button>
                    <button onClick={() => setRequestInfoModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                        Request Information
                    </button>
                </div>
            </div>
        )}

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

        {/* --- Conditional Back Link --- */}
        <Link
            to={isAssignedOfficer ? "/officer/dashboard" : "/my-grievances"}
            className="inline-block mt-8 text-blue-600 hover:underline"
        >
            &larr; Back to {isAssignedOfficer ? "Dashboard" : "My Grievances"}
        </Link>

        {/* --- Modals --- */}
        {confirmation && (
            <ConfirmationModal
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                confirmClass={confirmation.confirmClass}
                onCancel={() => setConfirmation(null)}
                onConfirm={() => handleStatusUpdate(confirmation.status)}
            />
        )}
        {isRejectModalOpen && (
            <RejectGrievanceModal
                onClose={() => setRejectModalOpen(false)}
                onSubmit={(reason) => handleStatusUpdate('Rejected', reason)}
            />
        )}
        {isRequestInfoModalOpen && (
            <RequestInfoModal
                onClose={() => setRequestInfoModalOpen(false)}
                onSubmit={(comment) => handleStatusUpdate('Awaiting Clarification', comment)}
            />
        )}
    </div>
);
};

export default GrievanceDetailPage;