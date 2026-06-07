import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';

const TeacherLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        setError('Please enter both email and password');
        setIsSubmitting(false);
        return;
      }

      await authService.loginTeacher(normalizedEmail, password);
      console.log('TOAST: teacher login success - ready to show toast');
      toast.success('Login successful! Redirecting...');
      await delay(3800);
      window.history.replaceState(null, '', '/dashboard');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Teacher login error:', err);
      if (err?.code === 'SERVER_AT_CAPACITY' || (typeof err?.error === 'string' && err.error.toLowerCase().includes('at capacity'))) {
        setError('Server is full right now. Please try again in a few minutes.');
        setIsSubmitting(false);
        return;
      }

      setError(err?.error || err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50">
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900" />
            <div className="text-lg font-semibold text-slate-900">Signing in...</div>
            <div className="text-sm text-slate-500">Please wait while we finish signing you in.</div>
          </div>
        </div>
      )}
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800">Teacher Login</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">{error}</div>
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
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In as Teacher'}
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
