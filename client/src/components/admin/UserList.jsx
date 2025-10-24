import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import CreateUserModal from './CreateUserModal';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeactivateUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to deactivate ${userName}? Their account will be disabled.`)) {
      try {
        await axios.put(`/api/admin/users/${userId}/deactivate`);
        toast.success(`${userName} has been deactivated.`);
        fetchUsers(); // Refresh the user list
      } catch (err) {
        toast.error(err.response?.data?.msg || 'Failed to deactivate user.');
      }
    }
  };

  const handleReactivateUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to re-activate ${userName}?`)) {
      try {
        await axios.put(`/api/admin/users/${userId}/reactivate`);
        toast.success(`${userName} has been re-activated.`);
        fetchUsers(); // Refresh the list
      } catch (err) {
        toast.error('Failed to re-activate user.');
      }
    }
  };

  if (loading) return <p>Loading users...</p>;

  console.log('Users state before rendering:', users);

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">User Management</h2>
            <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                + Create New User
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="text-left py-2 px-4">Name</th>
                        <th className="text-left py-2 px-4">Email</th>
                        <th className="text-left py-2 px-4">Roles</th>
                        <th className="text-left py-2 px-4">Status</th>
                        <th className="text-left py-2 px-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.user_id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-4">{user.full_name}</td>
                            <td className="py-2 px-4">{user.email}</td>
                            <td className="py-2 px-4 capitalize">
                                {/* This safely handles users with zero, one, or multiple roles */}
                                {(user.roles && user.roles.length > 0)
                                    ? user.roles.map(r => r.role_name.replace('_', ' ')).join(', ')
                                    : 'Student'
                                }
                            </td>
                            <td className="py-2 px-4">
                                {user.is_active
                                    ? <span className="text-green-600 font-semibold">Active</span>
                                    : <span className="text-red-600 font-semibold">Inactive</span>}
                            </td>
                            <td className="py-2 px-4">
                                {user.is_active ? (
                                    <button
                                        onClick={() => handleDeactivateUser(user.user_id, user.full_name)}
                                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                                    >
                                        Deactivate
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleReactivateUser(user.user_id, user.full_name)}
                                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
                                    >
                                        Re-activate
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* This part for the modal is perfect */}
        {isCreateModalOpen && (
            <CreateUserModal
                onClose={() => setCreateModalOpen(false)}
                onUserCreated={fetchUsers}
            />
        )}
    </div>
);
};

export default UserList;