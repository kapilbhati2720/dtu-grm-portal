// client/src/pages/FilteredGrievancesPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useSortableTable } from '../hooks/useSortableTable';

const FilteredGrievancesPage = () => {
    const { filterType, filterValue } = useParams();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    // Use the hook on the data fetched from the API
    const { items: sortedGrievances, requestSort, sortConfig } = useSortableTable(grievances);

    useEffect(() => {
        const fetchFilteredGrievances = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/admin/grievances/filter?type=${filterType}&value=${filterValue}`);
                setGrievances(res.data);
            } catch (err) {
                console.error("Failed to fetch filtered grievances:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFilteredGrievances();
    }, [filterType, filterValue]);

    if (loading) return <p>Loading grievances...</p>;

    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-4">
                {filterType === 'all' ? (
                    'All Grievances'
                ) : (
                    <>
                        Grievances Filtered by {filterType}: <span className="text-blue-600">{decodeURIComponent(filterValue)}</span>
                    </>
                )}
            </h1>
            <div className="bg-white p-6 rounded-lg shadow-xl">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('ticket_id')}>
                                Ticket ID {sortConfig.key === 'ticket_id' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                            </th>
                            <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('title')}>
                                Title {sortConfig.key === 'title' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                            </th>
                            <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('status')}>
                                Status {sortConfig.key === 'status' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                            </th>
                            <th className="text-left py-2 px-4 font-semibold cursor-pointer" onClick={() => requestSort('created_at')}>
                                Date Submitted {sortConfig.key === 'created_at' ? (sortConfig.direction === 'ascending' ? '🔼' : '🔽') : null}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedGrievances.length > 0 ? sortedGrievances.map(g => (
                                <tr key={g.grievance_id} className="border-b hover:bg-gray-50">
                                    <td className="py-2 px-4">
                                        <Link to={`/grievance/${g.ticket_id}`} className="text-blue-600 hover:underline font-medium">{g.ticket_id}</Link>
                                    </td>
                                    <td className="py-2 px-4">{g.title}</td>
                                    <td className="py-2 px-4">{g.status}</td>
                                    <td className="py-2 px-4">{new Date(g.created_at).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-4">No grievances found for this filter.</td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FilteredGrievancesPage;