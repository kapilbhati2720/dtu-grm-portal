// client/src/components/admin/AssignRoleModal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AssignRoleModal = ({ user, onClose, onRoleAssigned }) => {
    const [roleId, setRoleId] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [allRoles, setAllRoles] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);

    useEffect(() => {
        // Fetch all available roles and departments
        const fetchData = async () => {
            try {
                const [rolesRes, deptsRes] = await Promise.all([
                    axios.get('/api/admin/roles'),
                    axios.get('/api/admin/departments')
                ]);
                setAllRoles(rolesRes.data);
                setAllDepartments(deptsRes.data);
            } catch (error) {
                toast.error('Failed to load roles or departments.');
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!roleId || !departmentId) {
            return toast.error('Please select both a role and a department.');
        }
        try {
            const res = await axios.post('/api/admin/assign-role', {
                userId: user.user_id,
                roleId,
                departmentId
            });
            toast.success(res.data.msg);
            onRoleAssigned(); // Refresh the user list
            onClose(); // Close the modal
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to assign role.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Assign Role to <span className="text-blue-600">{user.full_name}</span></h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">New Role</label>
                        <select value={roleId} onChange={e => setRoleId(e.target.value)} required className="w-full p-2 border rounded bg-white">
                            <option value="">Select Role</option>
                            {allRoles.map(role => <option key={role.role_id} value={role.role_id}>{role.role_name}</option>)}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">In Department</label>
                        <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} required className="w-full p-2 border rounded bg-white">
                            <option value="">Select Department</option>
                            {allDepartments.map(dept => <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Assign Role</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignRoleModal;