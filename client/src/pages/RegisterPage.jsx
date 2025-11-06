import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Destructure for easier access in the form
  const { email, password } = formData;

  // This single function handles typing in BOTH input fields
  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await axios.post('/api/auth/register', formData);
            setSuccess(true);
        } catch (err) {
            // Use toast for a consistent error notification style
            toast.error(err.response?.data?.msg || 'An error occurred. Please try again.');
        } finally { setIsSubmitting(false);
        }
  };

  if (success) {
        return (
            <div className="max-w-md mx-auto mt-10 p-8 text-center bg-white rounded-lg shadow-xl">
                <h1 className="text-2xl font-bold text-green-600 mb-4">Registration Successful!</h1>
                <p className="text-gray-700">
                    A verification link has been sent to <span className="font-semibold">{email}</span>.
                </p>
                <p className="text-gray-600 mt-2">Please check your inbox to activate your account.</p>
                <Link to="/login" className="inline-block mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Proceed to Login
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl">
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
                Create Your Account
            </h1>
            <form onSubmit={onSubmit}>
                {/* Error messages will now be handled by toast notifications */}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                        DTU Email Address
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                        id="email"
                        type="email"
                        placeholder="name_rollno@dtu.ac.in"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 ..."
                            id="password"
                            // Set type based on state
                            type={showPassword ? "text" : "password"} 
                            placeholder="******************"
                            name="password"
                            value={password}
                            onChange={onChange}
                            minLength="6"
                            required
                        />
                        
                        {/*The Toggle Button */}
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-gray-600"
                            style={{ marginBottom: '12px' }} // Adjust alignment due to mb-3 on input
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:bg-blue-300"
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Registering...' : 'Register'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterPage;