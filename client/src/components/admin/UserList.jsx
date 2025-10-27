import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import CreateUserModal from './CreateUserModal';
import AssignRoleModal from './AssignRoleModal';
import ConfirmationModal from '../common/ConfirmationModal';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [managingUser, setManagingUser] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

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



  const handleConfirmAction = async () => {
      const { action, user } = confirmation;
      try {
          switch (action) {
              case 'deactivate':
                  await axios.put(`/api/admin/users/${user.user_id}/deactivate`);
                  toast.success(`${user.full_name} has been deactivated.`);
                  break;
              case 'reactivate':
                  await axios.put(`/api/admin/users/${user.user_id}/reactivate`);
                  toast.success(`${user.full_name} has been re-activated.`);
                  break;
              case 'resendInvite':
                  await axios.post('/api/admin/resend-invite', { userId: user.user_id, email: user.email, fullName: user.full_name });
                  toast.success(`Invite resent to ${user.full_name}.`);
                  break;
              default:
                  return;
          }
          fetchUsers(); // Refresh the list on success
      } catch (err) {
          toast.error(`Failed to ${action}.`);
      } finally {
          setConfirmation(null); // Close the modal
      }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (loading) return <p>Loading users...</p>;

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
                                {(user.roles && user.roles.length > 0)
                                    ? user.roles.map(r => r.role_name.replace('_', ' ')).join(', ')
                                    : 'Student'
                                }
                            </td>
                            <td className="py-2 px-4">
                                {!user.is_active ? (
                                    <span className="text-red-600 font-semibold">Inactive</span>
                                ) : !user.is_verified ? (
                                    <span className="text-yellow-600 font-semibold">Invited</span>
                                ) : (
                                    <span className="text-green-600 font-semibold">Active</span>
                                )}
                            </td>
                            <td className="py-2 px-4 flex items-center gap-2">
                              <button
                                  onClick={() => setManagingUser(user)}
                                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs"
                              >
                                  Manage Roles
                              </button>
                              {user.is_active ? (
                                  <button
                                      onClick={() => setConfirmation({
                                            action: 'deactivate', user,
                                            title: 'Deactivate User',
                                            message: `Are you sure you want to deactivate ${user.full_name}?`,
                                            confirmText: 'Deactivate',
                                            confirmClass: 'bg-red-500 hover:bg-red-600'
                                      })}
                                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                                  >
                                      Deactivate
                                  </button>
                              ) : (
                                  <button
                                      onClick={() => setConfirmation({
                                            action: 'reactivate', user,
                                            title: 'Re-activate User',
                                            message: `Are you sure you want to re-activate ${user.full_name}?`,
                                            confirmText: 'Re-activate',
                                            confirmClass: 'bg-green-500 hover:bg-green-600'
                                      })}
                                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs"
                                  >
                                      Re-activate
                                  </button>
                              )}

                              {/* This button only appears if the user is not verified */}
                              {!user.is_verified && (
                                  <button
                                      onClick={() => setConfirmation({
                                            action: 'resendInvite', user,
                                            title: 'Resend Invite',
                                            message: `This will send a new "Set Your Password" email to ${user.full_name}. Proceed?`,
                                            confirmText: 'Resend',
                                            confirmClass: 'bg-purple-500 hover:bg-purple-600'
                                      })}
                                      className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-xs"
                                  >
                                      Resend Invite
                                  </button>
                              )}
                          </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {isCreateModalOpen && (
            <CreateUserModal
                onClose={() => setCreateModalOpen(false)}
                onUserCreated={fetchUsers}
            />
        )}

        {/* This renders the Assign Role modal when a user is selected */}
        {managingUser && (
            <AssignRoleModal
                user={managingUser}
                onClose={() => setManagingUser(null)}
                onRoleAssigned={fetchUsers}
            />
        )}

        {confirmation && (
            <ConfirmationModal
                {...confirmation}
                onCancel={() => setConfirmation(null)}
                onConfirm={handleConfirmAction}
            />
        )}
    </div>
);
};

export default UserList;