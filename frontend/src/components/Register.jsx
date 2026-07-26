import React, { useState, useRef } from 'react';
import loginBackground from '../assets/loginbackground2.png';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { groupSectionDefinitions, levelOptions as sharedLevelOptions } from '../config/groupSections';
import FilterMenu from './FilterMenu';
import { toast } from 'react-toastify';

const PRIVACY_NOTICE_VERSION = '2026-07-26';



const Register = () => {
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
    graduationYear: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // FilterMenu state for custom selects
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const levelMenuRef = useRef(null);
  const [showCourseMenu, setShowCourseMenu] = useState(false);
  const courseMenuRef = useRef(null);

  const getLevelLabel = (val) => {
    if (!val) return 'Select Level';
    const opt = sharedLevelOptions.find(o => o.value === val);
    return opt ? opt.label : 'Select Level';
  };

  const buildRegisterCourseSections = (selectedLevel) => groupSectionDefinitions
    .map((section) => {
      let items = section.items;
      if (selectedLevel === 'INTEGRATED_SCHOOL' && section.key === 'INTEGRATED_SCHOOL') {
        items = section.items.filter((item) => item.value !== 'Night High');
      } else if (selectedLevel === 'NIGHT_HIGH' && section.key === 'INTEGRATED_SCHOOL') {
        items = section.items.filter((item) => item.value === 'Night High');
      } else if (selectedLevel && section.key !== selectedLevel) {
        items = [];
      }

      if (section.key !== 'SENIOR_HIGH') {
        return { ...section, items };
      }

      return {
        ...section,
        items: items.map((item) => {
          const { description, ...rest } = item;
          return rest;
        })
      };
    })
    .filter((section) => section.items.length > 0);

  const registerCourseSections = buildRegisterCourseSections(formData.level);

  const toggleLevelMenu = (updater) => {
    setShowCourseMenu(false);
    setShowLevelMenu((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const toggleCourseMenu = (updater) => {
    setShowLevelMenu(false);
    setShowCourseMenu((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const getCourseLabel = (val) => {
    if (!val) return 'Select Program';
    for (const sec of groupSectionDefinitions) {
      const it = sec.items.find(i => i.value === val);
      if (it) return it.label;
    }
    return val;
  };

  const validateRegistrationForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.contactNumber || !formData.level || !formData.course || !formData.batch) {
      toast.error('Please fill in all required fields marked with *');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    const emailDomain = formData.email.split('@')[1];
    if (emailDomain !== 'gmail.com') {
      toast.error('Alumni registration is only available for Gmail accounts. Teachers should contact admin for @lccbonline.com accounts.');
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateRegistrationForm()) return;
    setIsConsentChecked(false);
    setShowConsentModal(true);
  };

  const submitRegistration = async () => {
    if (!validateRegistrationForm()) {
      setShowConsentModal(false);
      return;
    }
    if (!isConsentChecked) {
      toast.error('Please check the consent box before registering.');
      return;
    }

    setIsRegistering(true);

    try {

      // Log data being sent (for debugging)
      console.log('📤 Sending registration data:', {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        studentId: formData.studentId,
        contactNumber: formData.contactNumber,
        level: formData.level,
        course: formData.course,
        batch: formData.batch,
        graduationYear: formData.graduationYear
      });

      // Submit registration
      const response = await authService.register({
        ...formData,
        consent_core: true,
        consent_timestamp: new Date().toISOString(),
        privacy_notice_version: PRIVACY_NOTICE_VERSION,
        profile_visibility: {
          email: false,
          phone: false,
          address: false,
          employer: false
        }
      });
      console.log('✅ Registration response:', response);
      
      // Show success message - no token yet, account is pending
      if (response.status === 'PENDING' || response.message) {
        console.log('TOAST: Register submitted - ready to show toast');
        toast.success(response.message || 'Registration submitted! Your account is pending admin approval. You will be notified once approved.');
      } else {
        console.log('TOAST: Register success - ready to show toast');
        toast.success('Registration successful! Your account is pending admin approval. You will be notified once approved.');
      }
      
      // Clear form
      setFormData({ username: '', email: '', password: '', firstName: '', lastName: '', studentId: '', contactNumber: '', level: '', course: '', batch: '', graduationYear: '' });
      
      // Redirect to login page after 4 seconds
      setTimeout(() => {
        navigate('/login');
      }, 4000);

    } catch (err) {
      console.error('Registration error:', err);
      // Handle registration error
      if (typeof err === 'object' && err.error) {
        toast.error(err.error);
      } else if (err.message) {
        toast.error(err.message);
      } else if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsRegistering(false);
      setShowConsentModal(false);
      setIsConsentChecked(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 overflow-hidden flex items-stretch justify-stretch">
      <div className="w-full min-h-screen md:h-screen flex flex-col md:flex-row items-stretch overflow-hidden bg-white">
        {/* Left Panel - Form */}
          <div className="w-full md:w-1/2 md:h-screen p-6 md:p-10 bg-white flex flex-col overflow-y-auto scrollbar-hide md:min-h-0">
          <div className="mb-4">
            <h1 className="mt-3 text-3xl lg:text-4xl font-extrabold leading-tight text-slate-900">
              Welcome to
              <span className="block bg-gradient-to-r from-blue-900 to-cyan-600 bg-clip-text text-transparent">
                LCCB Alumni
              </span>
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              Create your account to reconnect with classmates and unlock events, achievements, and career opportunities.
            </p>
          </div>
        
        {/* Verification Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-800">
            <strong>📋 Verification Required:</strong> Please provide accurate information. Admin will verify your alumni status before approval.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="firstName">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                id="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="lastName">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                id="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition"
                placeholder="Last name"
                required
              />
            </div>
          </div>
          
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
              className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
              placeholder="Enter your username"
              required
            />
          </div>
          
          {/* School ID and Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="studentId">
                   School ID <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input 
                type="text" 
                name="studentId"
                id="studentId"
                value={formData.studentId}
                onChange={handleChange}
                className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
                placeholder="e.g., 21-0087-958"
              />
            </div>
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="contactNumber">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input 
                type="tel" 
                name="contactNumber"
                id="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
                placeholder="09XXXXXXXXX"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="email">
              Email <span className="text-red-500">*</span>
            </label>
            <input 
              type="email" 
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition" 
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="batch">
                Batch/Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="batch"
                id="batch"
                value={formData.batch}
                onChange={handleChange}
                className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition"
                placeholder="e.g., 2024"
                min="1990"
                max="2030"
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="level">
                Level <span className="text-red-500">*</span>
              </label>
              <FilterMenu
                menuRef={levelMenuRef}
                isOpen={showLevelMenu}
                setIsOpen={toggleLevelMenu}
                buttonLabel="Select Level"
                selectedLabel={getLevelLabel(formData.level)}
                selectedValue={formData.level}
                icon={<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 5-9 5-9-5 9-5zm0 8l7.5-4.167V15L12 20l-7.5-5.167V6.833L12 11zm0 2.25L7.5 12v2.5L12 17l4.5-2.5V12L12 13.25z" /></svg>}
                sections={[{ key: 'levels', title: 'Levels', items: sharedLevelOptions.filter(o => o.value).map(o => ({ value: o.value, label: o.label })) }]}
                onSelect={(v) => {
                  setFormData(prev => {
                    const nextLevel = prev.level === v ? '' : v;
                    const nextSections = buildRegisterCourseSections(nextLevel);
                    const courseStillAvailable = nextSections.some((section) =>
                      section.items.some((item) => item.value === prev.course)
                    );
                    return {
                      ...prev,
                      level: nextLevel,
                      course: courseStillAvailable ? prev.course : ''
                    };
                  });
                  setShowLevelMenu(false);
                }}
                panelTitle="Select Level"
                panelWidthClass="w-full"
                alignClass="right-0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition"
                placeholder="e.g., 2025"
                min="1990"
                max="2030"
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="course">
                Program <span className="text-red-500">*</span>
              </label>
              <FilterMenu
                menuRef={courseMenuRef}
                isOpen={showCourseMenu}
                setIsOpen={toggleCourseMenu}
                buttonLabel="Select Program"
                selectedLabel={getCourseLabel(formData.course)}
                selectedValue={formData.course}
                icon={<svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3h12v2H4V3zM4 7h12v2H4V7zM4 11h12v2H4v-2z"/></svg>}
                sections={registerCourseSections}
                onSelect={(v) => { setFormData(prev => ({ ...prev, course: prev.course === v ? '' : v })); setShowCourseMenu(false); }}
                panelTitle={formData.level ? `${getLevelLabel(formData.level)} Programs` : 'All Programs'}
                panelWidthClass="w-full"
                alignClass="right-0"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-medium mb-1" htmlFor="password">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full h-[50px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white transition pr-10" 
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 transition-all shadow-lg shadow-blue-900/30 mt-4"
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
          className="hidden md:sticky md:top-0 md:flex md:w-1/2 md:h-screen md:self-start p-10 lg:p-14 items-center justify-center relative overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(${loginBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-700/85 via-blue-900/80 to-teal-800/85"></div>
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

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <h3 className="text-sm font-bold text-slate-950">Key points</h3>
                <ul className="mt-3 space-y-3">
                  <li>
                    <span className="font-bold text-slate-900">Secure & limited access</span> — encrypted storage, visible only to authorized staff.
                  </li>
                  <li>
                    <span className="font-bold text-slate-900">Directory-safe by default</span> — directory listing shows only name, batch, and program; contact info, address, and other sensitive fields stay hidden unless the user opts to reveal them individually.
                  </li>
                  <li>
                    <span className="font-bold text-slate-900">No selling your data</span> — used only for alumni tracking, events, jobs, and donations; never shared with outside organizations.
                  </li>
                </ul>
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
                disabled={isRegistering}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRegistration}
                disabled={isRegistering || !isConsentChecked}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition ${
                  isConsentChecked && !isRegistering
                    ? 'bg-blue-900 shadow-blue-900/25 hover:bg-blue-800'
                    : 'cursor-not-allowed bg-slate-400 shadow-slate-400/10'
                }`}
              >
                {isRegistering && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {isRegistering ? 'Processing...' : 'I Agree & Register'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
