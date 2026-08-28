import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const PRIVACY_NOTICE_VERSION = '2026-07-26';

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
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isConsentChecked, setIsConsentChecked] = useState(false);

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

    if (!isLogin) {
      setIsConsentChecked(false);
      setShowConsentModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
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
    } catch (err) {
      // Handle errors
      setError(err.response?.data?.message || 'An error occurred');
      console.error('Authentication error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRegistration = async () => {
    if (!isConsentChecked) {
      setError('Please check the consent box before registering.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
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
        graduationYear: formData.graduation,
        consent_core: true,
        consent_timestamp: new Date().toISOString(),
        privacy_notice_version: PRIVACY_NOTICE_VERSION,
        profile_visibility: {
          email: false,
          phone: false,
          address: false,
          employer: false
        }
      };

      const response = await authService.register(registrationData);
      setShowConsentModal(false);
      setSuccess('Registration successful! Redirecting to login...');
      try { console.log('TOAST: AuthForm registration success - ready to show toast'); toast.success(response.message || 'Registration successful!'); } catch (e) {}

      setTimeout(() => {
        toggleForm();
      }, 1500);
    } catch (err) {
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
      {showConsentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm" style={{ animation: 'privacyBackdropFadeIn 180ms ease-out both' }}>
          <style>{`
            @keyframes privacyBackdropFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes privacyModalFadeIn {
              from { opacity: 0; transform: translateY(12px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10" style={{ animation: 'privacyModalFadeIn 220ms ease-out both' }}>
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Data Privacy Consent Notice</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Before creating your account</h2>
            </div>
            <div className="max-h-[62vh] overflow-y-auto px-6 py-5 text-sm leading-6 text-slate-700">
              <p>
                Creating an account means LCCB will collect and process your personal, academic, and employment information
                as described in our{' '}
                <a href="/privacy-notice" className="font-bold text-blue-700 underline underline-offset-2">
                  full Privacy Notice
                </a>
                , per the Data Privacy Act of 2012 (RA 10173).
              </p>
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">Consent Details</h3>
                  <ul className="mt-2 space-y-2 text-slate-700">
                    <li>
                      <span className="font-bold text-slate-900">1. Data Needed:</span> We collect your personal info (name, email, birthday, phone), academic info (student ID, course, graduation year), and employment/career history.
                    </li>
                    <li>
                      <span className="font-bold text-slate-900">2. Where/How Used:</span> To verify alumni status, manage events, track employment alignment, facilitate donations, and maintain the alumni directory (where contact/sensitive details stay private by default).
                    </li>
                    <li>
                      <span className="font-bold text-slate-900">3. How long it is kept:</span> Your data will be kept securely as long as your alumni account is active or until you request its deletion.
                    </li>
                  </ul>
                </div>

                <div className="border-t border-blue-100 pt-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">Security & Privacy Key Points</h3>
                  <ul className="mt-2 space-y-2 text-slate-700">
                    <li>
                      <span className="font-bold text-slate-900">Secure storage</span> — encrypted database, visible only to authorized staff.
                    </li>
                    <li>
                      <span className="font-bold text-slate-900">No selling of data</span> — used only for alumni tracking, events, jobs, and donations; never shared with outside organizations.
                    </li>
                  </ul>
                </div>
              </div>
              <label className="mt-5 flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-blue-200 hover:bg-blue-50/40">
                <input
                  type="checkbox"
                  checked={isConsentChecked}
                  onChange={(event) => setIsConsentChecked(event.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                />
                <span className="text-sm leading-5 text-slate-700">
                  <span className="font-semibold text-slate-900">
                    I have read and agree to the Data Privacy Terms and Conditions.
                  </span>
                  <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                    Required
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Needed to create your account and enable core alumni tracking (records, events, employment history).
                  </span>
                </span>
              </label>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">Declining required consent means an account cannot be created.</p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsConsentChecked(false);
                  setShowConsentModal(false);
                }}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRegistration}
                disabled={isSubmitting || !isConsentChecked}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition ${
                  isConsentChecked && !isSubmitting
                    ? 'bg-blue-900 shadow-blue-900/25 hover:bg-blue-800'
                    : 'cursor-not-allowed bg-slate-400 shadow-slate-400/10'
                }`}
              >
                {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {isSubmitting ? 'Processing...' : 'I Agree & Register'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthForm;
