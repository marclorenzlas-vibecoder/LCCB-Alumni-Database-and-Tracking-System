import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const AuthForm = ({ isLogin, toggleForm }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    course: '',
    batch: '',
    graduation: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        // Login logic
        const response = await authService.login(formData.email, formData.password);
        setSuccess('Login successful! Redirecting...');
        
        // Optional: Store user info in localStorage or context
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Redirect to home or dashboard
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        // Registration logic
        const registrationData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          course: formData.course,
          batch: formData.batch,
          graduation: formData.graduation
        };

        const response = await authService.register(registrationData);
        setSuccess('Registration successful! Redirecting to login...');
        
        // Redirect to login after successful registration
        setTimeout(() => {
          toggleForm(); // Switch to login form
        }, 1500);
      }
    } catch (err) {
      // Handle errors
      setError(err.response?.data?.message || 'An error occurred');
      console.error('Authentication error:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Login' : 'Register'}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input 
                type="text" 
                name="username"
                id="username"
                value={formData.username}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                placeholder="Enter your username"
                required={!isLogin}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="course">
                Course
              </label>
              <input 
                type="text" 
                name="course"
                id="course"
                value={formData.course}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                placeholder="Enter your course"
                required={!isLogin}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="batch">
                Batch
              </label>
              <input 
                type="text" 
                name="batch"
                id="batch"
                value={formData.batch}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                placeholder="Enter your batch"
                required={!isLogin}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="graduation">
                Graduation Year
              </label>
              <input 
                type="text" 
                name="graduation"
                id="graduation"
                value={formData.graduation}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                placeholder="Enter your graduation year"
                required={!isLogin}
              />
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input 
            type="email" 
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input 
            type="password" 
            name="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" 
            placeholder="Enter your password"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button 
            type="submit" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {isLogin ? 'Sign In' : 'Register'}
          </button>
          
          <button 
            type="button"
            onClick={toggleForm}
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
          >
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthForm;
