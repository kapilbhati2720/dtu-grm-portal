import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-2 px-4">Name</th>
              <th className="text-left py-2 px-4">Email</th>
              <th className="text-left py-2 px-4">Role</th>
              <th className="text-left py-2 px-4">Status</th>
              <th className="text-left py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id} className="border-b">
                <td className="py-2 px-4">{user.full_name}</td>
                <td className="py-2 px-4">{user.email}</td>
                <td className="py-2 px-4 capitalize">
                  {user.roles && user.roles.length > 0
                    ? user.roles[0].role_name.replace('_', ' ')
                    : 'Student'}
                </td>
                {/* 2. Add Status cell to display if user is active */}
                <td className="py-2 px-4">
                  {user.is_active 
                    ? <span className="text-green-600 font-semibold">Active</span> 
                    : <span className="text-red-600 font-semibold">Inactive</span>}
                </td>
                {/* 3. Add the Deactivate button in the Actions cell */}
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
    </div>
  );
};

export default UserList;