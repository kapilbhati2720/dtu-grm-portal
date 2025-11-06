// client/src/pages/OfficerDashboardPage.jsx
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { useSortableTable } from '../hooks/useSortableTable';

const OfficerDashboardPage = () => {
    const { user } = useContext(AuthContext); // Get user data
    const [grievances, setGrievances] = useState([]);

    const [analytics, setAnalytics] = useState({
        newlySubmitted: 0,
        awaitingClarification: 0,
        totalPending: 0,
        resolved: 0,
        rejected: 0,
        escalated: 0
    });

    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Pending');

    // Set initial sort config
    const initialSortConfig = { key: 'created_at', direction: 'descending' };

    useEffect(() => {
        const fetchGrievances = async () => {
            try {
                setLoading(true);
                const res = await axios.get('/api/officer/grievances');
                setAnalytics(res.data.analytics);
                setGrievances(res.data.grievances);
            } catch (err) {
                toast.error('Failed to load assigned grievances.');
            } finally {
                setLoading(false);
            }
        };
        if (user) { // Only fetch if the user object is available
            fetchGrievances();
        }
    }, [user]);

   // Updated filter logic
    const filteredGrievances = useMemo(() => {
        if (filterStatus === 'All') return grievances;
        if (filterStatus === 'Pending') {
            return grievances.filter(g => g.status === 'Submitted' || g.status === 'Awaiting Clarification');
        }
        return grievances.filter(g => g.status === filterStatus);
    }, [grievances, filterStatus]);

    const { items: sortedAndFilteredGrievances, requestSort, sortConfig } = useSortableTable(filteredGrievances, initialSortConfig);

    const departmentCount = user?.roles.filter(r => r.role_name !== 'student').length;
    const shouldShowCategory = user?.roles.some(r => r.role_name === 'super_admin') || departmentCount > 1;

    if (loading) return <p className="p-8">Loading dashboard...</p>;

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Officer Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div onClick={() => setFilterStatus('Pending')} className="bg-red-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-red-600 transition-all">
                    <h3 className="opacity-90">Total Pending</h3>
                    <p className="text-4xl font-bold ">{analytics.totalPending}</p>
                </div>
                <div onClick={() => setFilterStatus('Submitted')} className="bg-blue-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-blue-600 transition-all">
                    <h3 className="opacity-90">New (Submitted)</h3>
                    <p className="text-4xl font-bold ">{analytics.newlySubmitted}</p>
                </div>
                <div onClick={() => setFilterStatus('Awaiting Clarification')} className="bg-yellow-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-yellow-600 transition-all">
                    <h3 className="opacity-90">Awaiting Clarification</h3>
                    <p className="text-4xl font-bold ">{analytics.awaitingClarification}</p>
                </div>
                <div onClick={() => setFilterStatus('Resolved')} className="bg-green-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-green-600 transition-all">
                    <h3 className="opacity-90">Resolved</h3>
                    <p className="text-4xl font-bold ">{analytics.resolved}</p>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={() => setFilterStatus('Pending')} className={`px-4 py-2 rounded font-medium ${filterStatus === 'Pending' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Pending</button>
                <button onClick={() => setFilterStatus('Resolved')} className={`px-4 py-2 rounded font-medium ${filterStatus === 'Resolved' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Resolved</button>
                <button onClick={() => setFilterStatus('Rejected')} className={`px-4 py-2 rounded font-medium ${filterStatus === 'Rejected' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Rejected</button>
                <button onClick={() => setFilterStatus('Escalated')} className={`px-4 py-2 rounded font-medium ${filterStatus === 'Escalated' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Escalated</button>
                <button onClick={() => setFilterStatus('All')} className={`px-4 py-2 rounded font-medium ${filterStatus === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Show All</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-xl">
                <h2 className="text-2xl font-semibold mb-4">Assigned Grievances Queue</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('ticket_id')}>
                                    Ticket ID {sortConfig.key === 'ticket_id' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                                </th>
                                <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('title')}>
                                    Title {sortConfig.key === 'title' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                                </th>
                                {shouldShowCategory && (
                                    <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('category')}>
                                        Category {sortConfig.key === 'category' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                                    </th>
                                )}
                                <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('status')}>
                                    Status {sortConfig.key === 'status' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                                </th>
                                <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('created_at')}>
                                    Submitted {sortConfig.key === 'created_at' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredGrievances.length > 0 ? sortedAndFilteredGrievances.map(g => (
                                <tr key={g.grievance_id} className="border-b hover:bg-gray-50">
                                    <td className="py-2 px-4">
                                        <Link to={`/grievance/${g.ticket_id}`} className="text-blue-600 hover:underline font-medium">{g.ticket_id}</Link>
                                    </td>
                                    <td className="py-2 px-4">{g.title}</td>
                                    {shouldShowCategory && <td className="py-2 px-4">{g.category}</td>}
                                    <td className="py-2 px-4">{g.status}</td>
                                    <td className="py-2 px-4">{new Date(g.created_at).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={shouldShowCategory ? 5 : 4} className="text-center py-4">No grievances match the current filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OfficerDashboardPage;