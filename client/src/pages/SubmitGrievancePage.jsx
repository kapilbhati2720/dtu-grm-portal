import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; 

const SubmitGrievancePage = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '', // Default category
  });
  const [departments, setDepartments] = useState([]); // State to hold categories from the API
  const navigate = useNavigate();

  // Fetch available departments/categories when the component loads
  useEffect(() => {
      const fetchDepartments = async () => {
          try {
              const res = await axios.get('/api/departments');
              setDepartments(res.data);
          } catch (err) {
              toast.error("Failed to load grievance categories.");
          }
      };
      fetchDepartments();
  }, []);

  const { title, description, category } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
        e.preventDefault();
        try {
            await axios.post('/api/grievances', formData);
            toast.success('Grievance submitted successfully!');
            navigate('/my-grievances');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to submit grievance.');
        }
    };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Submit a New Grievance
      </h1>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
            Category
          </label>
          <select
            name="category"
            id="category"
            value={category}
            onChange={onChange}
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a Category...</option>
                        {/* ✅ FIX: Dropdown is now dynamically generated from the API */}
                        {departments.map(dept => (
                            <option key={dept.department_id} value={dept.name}>{dept.name}</option>
                        ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
            Title
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="title"
            type="text"
            placeholder="e.g., Issue with Wi-Fi in Hostel"
            name="title"
            value={title}
            onChange={onChange}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="description"
            rows="5"
            placeholder="Please provide a detailed description of the issue."
            name="description"
            value={description}
            onChange={onChange}
            required
          />
        </div>
        <div className="flex items-center justify-center">
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            type="submit"
          >
            Submit Grievance
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmitGrievancePage;