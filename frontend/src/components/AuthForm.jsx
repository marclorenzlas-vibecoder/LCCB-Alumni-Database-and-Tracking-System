import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const levelOptions = [
  { value: 'INTEGRATED_SCHOOL', label: 'Integrated School' },
  { value: 'NIGHT_HIGH', label: 'Night High' },
  { value: 'SENIOR_HIGH', label: 'Senior High' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'ETEEAP', label: 'ETEEAP' },
  { value: 'GRAD_SCHOOL', label: 'Grad School' }
];

const AuthForm = ({ isLogin, toggleForm }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    studentId: '',
    contactNumber: '',
    level: '',
    course: '',
    batch: '',
    graduation: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    try {
      if (isLogin) {
        // Login logic
        const response = await authService.login(formData.email, formData.password);
        setSuccess('Login successful! Redirecting...');
        try { console.log('TOAST: AuthForm login success - ready to show toast'); toast.success('Login successful! Redirecting...'); } catch (e) {}

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
          firstName: formData.firstName,
          lastName: formData.lastName,
          studentId: formData.studentId,
          contactNumber: formData.contactNumber,
          level: formData.level,
          course: formData.course,
          batch: formData.batch,
          graduationYear: formData.graduation
        };

        const response = await authService.register(registrationData);
        setSuccess('Registration successful! Redirecting to login...');
        try { console.log('TOAST: AuthForm registration success - ready to show toast'); toast.success(response.message || 'Registration successful!'); } catch (e) {}
        
        // Redirect to login after successful registration
        setTimeout(() => {
          toggleForm(); // Switch to login form
        }, 1500);
      }
    } catch (err) {
      // Handle errors
      setError(err.response?.data?.message || 'An error occurred');
      console.error('Authentication error:', err);
    } finally {
      setIsSubmitting(false);
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
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Verification Required</h3>
              <p className="text-xs text-blue-800">To verify your alumni status, please provide accurate information. Admin will review your registration.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="firstName"
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  placeholder="Your first name"
                  required={!isLogin}
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="lastName"
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  placeholder="Your last name"
                  required={!isLogin}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="username"
                id="username"
                value={formData.username}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                placeholder="Choose a username"
                required={!isLogin}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                 <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="studentId">
                  School ID / Student Number <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <input 
                  type="text" 
                  name="studentId"
                  id="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  placeholder="e.g., 21-0087-958"
                />
                 <p className="text-xs text-gray-500 mt-1">Enter your School ID if you have one (school started using IDs in 2018)</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="contactNumber">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel" 
                  name="contactNumber"
                  id="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                  placeholder="e.g., 09123456789"
                  required={!isLogin}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="level">
                Educational Level <span className="text-red-500">*</span>
              </label>
              <select
                name="level"
                id="level"
                value={formData.level}
                onChange={handleChange}
                className="app-select"
                required={!isLogin}
              >
                <option value="">Select your level</option>
                {levelOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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
                Graduation Year <span className="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                name="graduation"
                id="graduation"
                value={formData.graduation}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                placeholder="e.g., 2020"
                min="1950"
                max="2030"
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
            className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {isLogin ? 'Sign In' : 'Register'}
          </button>
          
          <button 
            type="button"
            onClick={toggleForm}
            className="inline-block align-baseline font-bold text-sm text-blue-900 hover:text-blue-800"
          >
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthForm;
