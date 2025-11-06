import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { email, password } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      // Just call login and pass it everything it needs.
      // The context will now handle the navigation.
      await login(email, password, navigate);
    } catch (err) {
      // console.log("Full error response from server:", err.response); 
      const errorMessage = err.response?.data?.msg || 'An error occurred during login.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        Sign In to Your Account
      </h1>
      <form onSubmit={onSubmit}>
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
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="password"
                  type={showPassword ? "text" : "password"} // Set type based on state
                  placeholder="******************"
                  name="password" value={password} onChange={onChange} required
              />
              {/* The Toggle Button */}
              <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-gray-600"
                  style={{ marginBottom: '12px' }} // Adjust alignment
              >
                  {showPassword ? "Hide" : "Show"}
              </button>
          </div>
          <div className="text-right mt-2">
                        <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline" >
                            Forgot Password?
                        </Link>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            type="submit"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;