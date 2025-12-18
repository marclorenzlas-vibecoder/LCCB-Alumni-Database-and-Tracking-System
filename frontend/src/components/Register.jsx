import React, { useState } from 'react';
import loginBackground from '../assets/loginbackground2.png';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    level: '',
    course: '',
    batch: '',
    graduationYear: ''
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
      // Validate inputs
      if (!formData.username || !formData.email || !formData.password || !formData.course || !formData.batch) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Check email domain - only allow gmail.com for self-registration
      const emailDomain = formData.email.split('@')[1];
      if (emailDomain !== 'gmail.com') {
        setError('Alumni registration is only available for Gmail accounts. Teachers should contact admin for @lccbonline.com accounts.');
        return;
      }

      // Validate username format (first and last name)
      const nameParts = formData.username.trim().split(' ');
      if (nameParts.length < 2) {
        setError('Please enter both first and last name');
        return;
      }

      // Submit registration
      const response = await authService.register(formData);
      
      // Show success message - no token yet, account is pending
      if (response.status === 'PENDING' || response.message) {
        setSuccess(response.message || 'Registration submitted! Your account is pending admin approval. You will be notified once approved.');
      } else {
        setSuccess('Registration successful! Your account is pending admin approval. You will be notified once approved.');
      }
      
      // Clear form
      setFormData({ username: '', email: '', password: '', level: '', course: '', batch: '', graduationYear: '' });
      
      // Redirect to login page after 4 seconds
      setTimeout(() => {
        navigate('/login');
      }, 4000);

    } catch (err) {
      console.error('Registration error:', err);
      // Handle registration error
      if (typeof err === 'object' && err.error) {
        setError(err.error);
      } else if (err.message) {
        setError(err.message);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center px-4 py-4">
      <div className="w-full max-w-6xl h-[90vh] max-h-[700px] flex flex-col md:flex-row items-stretch rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Panel - Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 bg-white flex flex-col justify-center overflow-y-auto scrollbar-hide">
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <div className="mb-4">
            <h2 className="text-2xl lg:text-3xl font-bold mb-1 text-gray-900">Welcome to</h2>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">LCCB Alumni</h1>
          </div>
          <p className="text-gray-500 text-xs mb-4">Create your account and join the alumni community.</p>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center" role="alert">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="username">
              Username
            </label>
            <input 
              type="text" 
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
              placeholder="Enter your username"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input 
              type="email" 
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="level">
              Level
            </label>
            <select
              name="level"
              id="level"
              value={formData.level}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-cyan-400 focus:bg-white transition"
              required
            >
              <option value="">Select Level</option>
              <option value="COLLEGE">College</option>
              <option value="SENIOR_HIGH_SCHOOL">Senior High School</option>
              <option value="HIGH_SCHOOL">High School</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="course">
              Course
            </label>
            <select
              name="course"
              id="course"
              value={formData.course}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-cyan-400 focus:bg-white transition"
              required
            >
              <option value="">Select Course</option>
              <optgroup label="College Programs">
                <option value="BSIT">BS Information Technology</option>
                <option value="BSCS">BS Computer Science</option>
                <option value="BSBA">BS Business Administration</option>
                <option value="BSA">BS Accountancy</option>
                <option value="BSED">BS Education</option>
                <option value="BEED">Bachelor of Elementary Education</option>
                <option value="BSN">BS Nursing</option>
                <option value="BSHM">BS Hospitality Management</option>
                <option value="BSTM">BS Tourism Management</option>
                <option value="BSPSYCH">BS Psychology</option>
                <option value="AB-COMM">AB Communication</option>
                <option value="AB-POLSCI">AB Political Science</option>
              </optgroup>
              <optgroup label="Senior High School Tracks">
                <option value="ABM">Accountancy, Business and Management (ABM)</option>
                <option value="STEM">Science, Technology, Engineering and Mathematics (STEM)</option>
                <option value="HUMSS">Humanities and Social Sciences (HUMSS)</option>
                <option value="GAS">General Academic Strand (GAS)</option>
                <option value="TVL-HE">TVL - Home Economics</option>
                <option value="TVL-ICT">TVL - Information and Communications Technology</option>
              </optgroup>
              <optgroup label="High School">
                <option value="HS">High School</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="batch">
              Batch/Year
            </label>
            <input 
              type="number" 
              name="batch"
              id="batch"
              value={formData.batch}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
              placeholder="e.g., 2024"
              min="1990"
              max="2030"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="graduationYear">
              Graduation Year
            </label>
            <input 
              type="number" 
              name="graduationYear"
              id="graduationYear"
              value={formData.graduationYear}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
              placeholder="e.g., 2025"
              min="1990"
              max="2030"
              required
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="password">
              Password
            </label>
            <input 
              type="password" 
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
              placeholder="Enter your password"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 transition-all shadow-lg shadow-blue-600/30 mt-4"
          >
            Sign up
          </button>
          
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <a 
              href="/login" 
              className="font-semibold text-cyan-500 hover:text-cyan-600 underline"
            >
              Login
            </a>
          </div>
        </form>
        </div>

        {/* Right panel - Background Image */}
        <div 
          className="hidden md:flex md:w-1/2 p-8 lg:p-12 items-center justify-center relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/85 via-blue-600/80 to-teal-700/85"></div>
          <div className="relative z-10 text-white max-w-md">
            <h2 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">Join the LCCB Alumni Network</h2>
            <p className="text-base lg:text-lg mb-8 text-white/95 leading-relaxed">Create your account to connect with fellow alumni, share achievements, and access exclusive opportunities.</p>
            
            {/* Stats/Features */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">Events & Reunions</p>
                  <p className="text-white/80 text-xs">Stay updated with alumni events</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                    <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">Career Opportunities</p>
                  <p className="text-white/80 text-xs">Explore job postings and opportunities</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
