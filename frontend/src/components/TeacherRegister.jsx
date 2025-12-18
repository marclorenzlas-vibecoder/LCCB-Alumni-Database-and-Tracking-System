import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const TeacherRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!formData.username || !formData.email || !formData.password) {
        setError('Please fill in all required fields');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }
      const res = await authService.registerTeacher(formData);
      setSuccess('Teacher account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      console.error('Teacher registration error:', err);
      setError(err?.error || err?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800">Teacher Register</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">{error}</div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">{success}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="username">Full Name</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-gray-900 placeholder-gray-400 bg-white ring-1 ring-inset ring-gray-300 shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g., Juan Dela Cruz"
              required
            />
          </div>
          <div className="mb-5">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-gray-900 placeholder-gray-400 bg-white ring-1 ring-inset ring-gray-300 shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="teacher@example.com"
              required
            />
          </div>
          <div className="mb-7">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-gray-900 placeholder-gray-400 bg-white ring-1 ring-inset ring-gray-300 shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter a strong password"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            Create Teacher Account
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="/login" className="font-bold text-sm text-blue-500 hover:text-blue-700">Already have an account? Login</a>
        </div>
        <div className="mt-2 text-center">
          <a href="/register" className="text-xs text-gray-500 hover:text-gray-700">Go to Student/Alumni Register</a>
        </div>
      </div>
    </div>
  );
};

export default TeacherRegister;
