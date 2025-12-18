import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const TeacherLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }
  await authService.loginTeacher(email, password);
  setSuccess('Welcome, teacher! Redirecting...');
  // Force a full reload to ensure Navbar/auth state picks up immediately
  setTimeout(() => { window.location.href = '/home'; }, 800);
    } catch (err) {
      console.error('Teacher login error:', err);
      setError(err?.error || err?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800">Teacher Login</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">{error}</div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">{success}</div>
        )}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-5">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-gray-900 placeholder-gray-400 bg-white ring-1 ring-inset ring-gray-300 shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="teacher@example.com"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-gray-900 placeholder-gray-400 bg-white ring-1 ring-inset ring-gray-300 shadow-sm transition focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            Sign In as Teacher
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="/teacher/register" className="font-bold text-sm text-blue-500 hover:text-blue-700">Need an account? Register as Teacher</a>
        </div>
        <div className="mt-2 text-center">
          <a href="/login" className="text-xs text-gray-500 hover:text-gray-700">Go to Student/Alumni Login</a>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin;
